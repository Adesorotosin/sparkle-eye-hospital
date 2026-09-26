"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { saveConsultationEncounter } from "@/app/actions/consultation";
import {
  createDiagnosticOrder,
  createPrescription,
} from "@/app/actions/clinical-orders";
import {
  Calendar,
  Check,
  ClipboardList,
  History,
  Pill,
} from "lucide-react";

type Refraction = {
  sphere: string;
  cylinder: string;
  axis: string;
};

type PatientVitals = {
  visualAcuityOD: string;
  visualAcuityOS: string;
  visualAcuityOU?: string;
  withCorrection?: boolean;

  iop?: number;
  iopOD?: number;
  iopOS?: number;
  iopInstrument?: string;

  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;

  primaryComplaint: string;
  symptoms?: string[];
  severity?: "Mild" | "Moderate" | "Severe";
  durationText?: string;

  recordedAt: string;
};

type PatientEncounter = {
  id: string;
  slitLampOD?: string;
  slitLampOS?: string;
  refractionOD?: Refraction;
  refractionOS?: Refraction;
  diagnosis?: string;
  status: "draft" | "completed";
  createdAt: string;
};

type PatientDiagnostic = {
  id: string;
  name: string;
  price: number;
  status: "ordered" | "ready_for_test" | "completed";
  findings?: string;
  interpretation?: string;
  completedAt?: string;
};

type PatientHistoryItem = {
  date: string;
  title: string;
  details: string;
};

type PatientRecord = {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  allergies: string[];

  vitals?: PatientVitals;
  diagnostics: PatientDiagnostic[];

  history: PatientHistoryItem[];

  imaging: {
    id: string;
    type: string;
    date: string;
    color: string;
    path: string;
  }[];

  slitLamp: {
    od: string;
    os: string;
  };

  refraction: {
    od: Refraction;
    os: Refraction;
  };

  previousRefraction?: {
    date: string;
    od: Refraction;
    os: Refraction;
  };

  diagnosis: string;
};

type DiagnosticTest = {
  name: string;
  price: number;
};

const DIAGNOSTIC_TESTS: DiagnosticTest[] = [
  {
    name: "Visual Field Test (Humphrey)",
    price: 12000,
  },
  {
    name: "Optical Coherence Tomography (OCT)",
    price: 18000,
  },
  {
    name: "Pachymetry (Corneal Thickness)",
    price: 7000,
  },
  {
    name: "Gonioscopy",
    price: 6000,
  },
  {
    name: "Fundus Photography",
    price: 9000,
  },
];

const SURGERY_OPTIONS = [
  "Cataract (Phacoemulsification + IOL)",
  "Glaucoma Trabeculectomy",
  "Pterygium Excision with Graft",
  "Intravitreal Injection",
];

function formatEncounterDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function safeRefraction(
  value?: Partial<Refraction> | null
): Refraction {
  return {
    sphere: value?.sphere ?? "",
    cylinder: value?.cylinder ?? "",
    axis: value?.axis ?? "",
  };
}

function mapApiPatientToRecord(
  apiPatient: any
): PatientRecord {
  const encounters: PatientEncounter[] =
    Array.isArray(apiPatient?.encounters)
      ? apiPatient.encounters
      : [];

  const latestEncounter = encounters[0];
  const previousEncounter = encounters[1];

  const currentSlitLamp = {
    od: latestEncounter?.slitLampOD ?? "",
    os: latestEncounter?.slitLampOS ?? "",
  };

  const currentRefraction = {
    od: safeRefraction(
      latestEncounter?.refractionOD
    ),
    os: safeRefraction(
      latestEncounter?.refractionOS
    ),
  };

  const previousRefraction = previousEncounter
    ? {
        date: formatEncounterDate(
          previousEncounter.createdAt
        ),
        od: safeRefraction(
          previousEncounter.refractionOD
        ),
        os: safeRefraction(
          previousEncounter.refractionOS
        ),
      }
    : undefined;

  const diagnostics: PatientDiagnostic[] =
    Array.isArray(apiPatient?.diagnostics)
      ? apiPatient.diagnostics.map(
          (
            diagnostic: any
          ): PatientDiagnostic => ({
            id: diagnostic.id,
            name: diagnostic.name ?? "",
            price: Number(
              diagnostic.price ?? 0
            ),
            status:
              diagnostic.status ===
              "completed"
                ? "completed"
                : diagnostic.status ===
                  "ready_for_test"
                ? "ready_for_test"
                : "ordered",
            findings:
              diagnostic.findings ??
              undefined,
            interpretation:
              diagnostic.interpretation ??
              undefined,
            completedAt:
              diagnostic.completedAt ??
              undefined,
          })
        )
      : [];

  const history: PatientHistoryItem[] =
    encounters.map(
      (
        encounter: PatientEncounter
      ): PatientHistoryItem => {
        const details = [
          encounter.diagnosis
            ? `Diagnosis: ${encounter.diagnosis}`
            : "No diagnosis recorded.",

          encounter.slitLampOD ||
          encounter.slitLampOS
            ? "Slit lamp findings recorded."
            : null,

          encounter.refractionOD ||
          encounter.refractionOS
            ? "Refraction recorded."
            : null,
        ]
          .filter(Boolean)
          .join(" ");

        return {
          date: formatEncounterDate(
            encounter.createdAt
          ),
          title:
            encounter.status ===
            "completed"
              ? "Completed Consultation"
              : "Consultation Draft",
          details:
            details ||
            "Consultation record saved.",
        };
      }
    );

  if (apiPatient?.vitals) {
    const vitals =
      apiPatient.vitals as PatientVitals;

    const triageDetails = [
      vitals.primaryComplaint
        ? `Complaint: ${vitals.primaryComplaint}`
        : null,

      `VA: OD ${
        vitals.visualAcuityOD || "—"
      }, OS ${
        vitals.visualAcuityOS || "—"
      }`,

      vitals.iopOD !== undefined ||
      vitals.iopOS !== undefined
        ? `IOP: OD ${
            vitals.iopOD ?? "—"
          } / OS ${
            vitals.iopOS ?? "—"
          } mmHg`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");

    history.push({
      date: formatEncounterDate(
        vitals.recordedAt
      ),
      title: "Triage & Vitals",
      details:
        triageDetails ||
        "Triage information recorded.",
    });
  }

  history.sort(
    (
      a: PatientHistoryItem,
      b: PatientHistoryItem
    ) => {
      const parseDate = (
        value: string
      ): number => {
        const [day, month, year] = value
          .split("/")
          .map(Number);

        if (!day || !month || !year) {
          return Number.NaN;
        }

        return new Date(
          year,
          month - 1,
          day
        ).getTime();
      };

      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);

      if (
        Number.isNaN(dateA) ||
        Number.isNaN(dateB)
      ) {
        return 0;
      }

      return dateB - dateA;
    }
  );

  return {
    id: apiPatient.patientId,
    name: apiPatient.fullName ?? "",
    age: apiPatient.age ?? 0,
    gender: apiPatient.gender ?? "",
    mrn: apiPatient.patientId,

    allergies:
      typeof apiPatient.allergies ===
      "string"
        ? apiPatient.allergies
            .split(",")
            .map(
              (item: string) =>
                item.trim()
            )
            .filter(Boolean)
        : Array.isArray(
            apiPatient.allergies
          )
        ? apiPatient.allergies
        : [],

    vitals: apiPatient.vitals,
    diagnostics,
    history,
    imaging: [],

    slitLamp: currentSlitLamp,
    refraction: currentRefraction,
    previousRefraction,

    diagnosis:
      latestEncounter?.diagnosis ?? "",
  };
}

function TriageSummary({
  vitals,
}: {
  vitals?: PatientRecord["vitals"];
}) {
  if (!vitals) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm text-gray-500">
          No triage information available.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Triage & Vitals
          </h3>

          <p className="text-xs text-gray-500">
            Recorded{" "}
            {formatEncounterDate(
              vitals.recordedAt
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Visual Acuity OD
          </p>

          <p className="mt-1 font-medium">
            {vitals.visualAcuityOD || "—"}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Visual Acuity OS
          </p>

          <p className="mt-1 font-medium">
            {vitals.visualAcuityOS || "—"}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            IOP OD
          </p>

          <p className="mt-1 font-medium">
            {vitals.iopOD ?? "—"} mmHg
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            IOP OS
          </p>

          <p className="mt-1 font-medium">
            {vitals.iopOS ?? "—"} mmHg
          </p>
        </div>
      </div>

      {vitals.primaryComplaint && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-700">
            Primary Complaint
          </p>

          <p className="mt-1 text-sm text-blue-900">
            {vitals.primaryComplaint}
          </p>
        </div>
      )}
    </div>
  );
}

function DiagnosticResults({
  diagnostics,
}: {
  diagnostics: PatientDiagnostic[];
}) {
  if (!diagnostics.length) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gray-400" />

          <h3 className="font-semibold text-gray-900">
            Diagnostic Results
          </h3>
        </div>

        <p className="mt-3 text-sm text-gray-500">
          No diagnostic tests have been
          ordered.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-gray-500" />

        <h3 className="font-semibold text-gray-900">
          Diagnostic Results
        </h3>
      </div>

      <div className="mt-4 space-y-3">
        {diagnostics.map((diagnostic) => (
          <div
            key={diagnostic.id}
            className="rounded-lg border p-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">
                  {diagnostic.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  ₦
                  {diagnostic.price.toLocaleString()}
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  diagnostic.status ===
                  "completed"
                    ? "bg-green-100 text-green-700"
                    : diagnostic.status ===
                      "ready_for_test"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {diagnostic.status ===
                "ready_for_test"
                  ? "Ready for Test"
                  : diagnostic.status
                      .charAt(0)
                      .toUpperCase() +
                    diagnostic.status.slice(1)}
              </span>
            </div>

            {diagnostic.findings && (
              <p className="mt-3 text-sm text-gray-700">
                <strong>
                  Findings:
                </strong>{" "}
                {diagnostic.findings}
              </p>
            )}

            {diagnostic.interpretation && (
              <p className="mt-2 text-sm text-gray-700">
                <strong>
                  Interpretation:
                </strong>{" "}
                {diagnostic.interpretation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OphthalmologyConsultation() {
  const params = useParams();

  const patientId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [patient, setPatient] =
    useState<PatientRecord | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState<
      "slitLamp" | "refraction" | "diagnosis"
    >("slitLamp");

  const [slitLampOD, setSlitLampOD] =
    useState("");

  const [slitLampOS, setSlitLampOS] =
    useState("");

  const [refractionOD, setRefractionOD] =
    useState<Refraction>({
      sphere: "",
      cylinder: "",
      axis: "",
    });

  const [refractionOS, setRefractionOS] =
    useState<Refraction>({
      sphere: "",
      cylinder: "",
      axis: "",
    });

  const [diagnosis, setDiagnosis] =
    useState("");

  const [showHistory, setShowHistory] =
    useState(false);

  const [activeModal, setActiveModal] =
    useState<
      | "diagnostics"
      | "surgery"
      | "prescription"
      | null
    >(null);

  const [
    selectedDiagnostics,
    setSelectedDiagnostics,
  ] = useState<string[]>([]);

  const [surgeryType, setSurgeryType] =
    useState("");

  const [surgeryNotes, setSurgeryNotes] =
    useState("");

  const [medication, setMedication] =
    useState("");

  const [dosage, setDosage] =
    useState("");

  const [frequency, setFrequency] =
    useState("");

  const [duration, setDuration] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [pricePerUnit, setPricePerUnit] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

  const [feedback, setFeedback] =
    useState("");

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadPatient() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/patients/${encodeURIComponent(
            patientId
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (response.status === 401) {
          throw new Error(
            "You are not authorized to view this patient."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to view this patient."
          );
        }

        if (response.status === 404) {
          throw new Error(
            "Patient record was not found."
          );
        }

        if (!response.ok) {
          throw new Error(
            "Failed to load patient record."
          );
        }

        const result =
          await response.json();

        if (!result?.patient) {
          throw new Error(
            "Patient record was not returned."
          );
        }

        const mappedPatient =
          mapApiPatientToRecord(
            result.patient
          );

        if (cancelled) return;

        setPatient(mappedPatient);

        setSlitLampOD(
          mappedPatient.slitLamp.od
        );

        setSlitLampOS(
          mappedPatient.slitLamp.os
        );

        setRefractionOD(
          mappedPatient.refraction.od
        );

        setRefractionOS(
          mappedPatient.refraction.os
        );

        setDiagnosis(
          mappedPatient.diagnosis
        );
      } catch (error) {
        console.error(
          "Failed to load patient:",
          error
        );

        if (!cancelled) {
          setPatient(null);

          setFeedback(
            error instanceof Error
              ? error.message
              : "Failed to load patient."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPatient();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  function snapToQuarter(
    value: string
  ): string {
    if (!value.trim()) return "";

    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return value;
    }

    const snapped =
      Math.round(numeric * 4) / 4;

    return snapped.toFixed(2);
  }

  function validateAndFormatAxis(
    value: string
  ): string {
    if (!value.trim()) return "";

    const numeric = Number(value);

    if (
      Number.isNaN(numeric) ||
      numeric < 0 ||
      numeric > 180
    ) {
      return value;
    }

    return String(Math.round(numeric));
  }

  function handleRefractionBlur(
    eye: "OD" | "OS",
    field: keyof Refraction
  ) {
    const setter =
      eye === "OD"
        ? setRefractionOD
        : setRefractionOS;

    const current =
      eye === "OD"
        ? refractionOD
        : refractionOS;

    const value = current[field];

    let formatted = value;

    if (field === "axis") {
      formatted =
        validateAndFormatAxis(value);
    } else {
      formatted = snapToQuarter(value);
    }

    setter({
      ...current,
      [field]: formatted,
    });
  }

  function handleSave(
    status: "draft" | "completed"
  ) {
    if (!patientId) return;

    if (
      status === "completed" &&
      !diagnosis.trim()
    ) {
      setFeedback(
        "Please enter a diagnosis before completing the encounter."
      );
      return;
    }

    startTransition(async () => {
      try {
        const result =
          await saveConsultationEncounter({
            patientId,
            slitLampOD,
            slitLampOS,
            refractionOD,
            refractionOS,
            diagnosis,
            status,
          });

        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          result.error
        ) {
          throw new Error(
            String(result.error)
          );
        }

        setFeedback(
          status === "completed"
            ? "Consultation completed successfully."
            : "Consultation draft saved successfully."
        );
      } catch (error) {
        console.error(
          "Failed to save consultation:",
          error
        );

        setFeedback(
          error instanceof Error
            ? error.message
            : "Failed to save consultation."
        );
      }
    });
  }

  function toggleDiagnostic(
    name: string
  ) {
    setSelectedDiagnostics((current) =>
      current.includes(name)
        ? current.filter(
            (item) => item !== name
          )
        : [...current, name]
    );
  }

  function handleSubmitDiagnostics() {
    if (!patientId) return;

    if (!selectedDiagnostics.length) {
      setFeedback(
        "Please select at least one diagnostic test."
      );
      return;
    }

    startTransition(async () => {
      try {
        for (const testName of selectedDiagnostics) {
          const test =
            DIAGNOSTIC_TESTS.find(
              (item) =>
                item.name === testName
            );

          if (!test) continue;

          const result =
            await createDiagnosticOrder({
              patientCode: patientId,
              name: test.name,
              price: test.price,
            });

          if (
            result &&
            typeof result === "object" &&
            "error" in result &&
            result.error
          ) {
            throw new Error(
              String(result.error)
            );
          }
        }

        setFeedback(
          "Diagnostic orders created successfully."
        );

        setSelectedDiagnostics([]);
        setActiveModal(null);
      } catch (error) {
        console.error(
          "Failed to create diagnostic orders:",
          error
        );

        setFeedback(
          error instanceof Error
            ? error.message
            : "Failed to create diagnostic orders."
        );
      }
    });
  }

  function handleSavePrescription() {
    if (!patientId) return;

    if (!medication.trim()) {
      setFeedback(
        "Please enter the medication name."
      );
      return;
    }

    if (!dosage.trim()) {
      setFeedback(
        "Please enter the dosage."
      );
      return;
    }

    if (!frequency.trim()) {
      setFeedback(
        "Please enter the frequency."
      );
      return;
    }

    if (!duration.trim()) {
      setFeedback(
        "Please enter the duration."
      );
      return;
    }

    if (!quantity.trim()) {
      setFeedback(
        "Please enter the quantity."
      );
      return;
    }

    if (!pricePerUnit.trim()) {
      setFeedback(
        "Please enter the price per unit."
      );
      return;
    }

    const parsedQuantity =
      Number(quantity);

    const parsedPrice =
      Number(pricePerUnit);

    if (
      Number.isNaN(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setFeedback(
        "Quantity must be a valid number."
      );
      return;
    }

    if (
      Number.isNaN(parsedPrice) ||
      parsedPrice < 0
    ) {
      setFeedback(
        "Price per unit must be a valid number."
      );
      return;
    }

    startTransition(async () => {
      try {
        const result =
          await createPrescription({
            patientCode: patientId,
            drugName: medication,
            dosage: `${dosage} • ${frequency} • ${duration}`,
            quantity: parsedQuantity,
            pricePerUnit: parsedPrice,
          });

        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          result.error
        ) {
          throw new Error(
            String(result.error)
          );
        }

        setFeedback(
          "Prescription issued successfully."
        );

        setMedication("");
        setDosage("");
        setFrequency("");
        setDuration("");
        setQuantity("");
        setPricePerUnit("");

        setActiveModal(null);
      } catch (error) {
        console.error(
          "Failed to create prescription:",
          error
        );

        setFeedback(
          error instanceof Error
            ? error.message
            : "Failed to issue prescription."
        );
      }
    });
  }

  function handleScheduleSurgery() {
    setFeedback(
      "Surgery scheduling is not connected yet. No appointment was created."
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />

          <p className="mt-3 text-sm text-gray-500">
            Loading patient record...
          </p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Patient unavailable
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {feedback ||
              "The patient record could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                Ophthalmology Consultation
              </h1>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {patient.mrn}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {patient.name} • {patient.age}{" "}
              years • {patient.gender}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowHistory(true)
            }
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <History className="h-4 w-4" />
            History
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6">
        <TriageSummary
          vitals={patient.vitals}
        />

        <DiagnosticResults
          diagnostics={patient.diagnostics}
        />

        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-4">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() =>
                  setActiveTab("slitLamp")
                }
                className={`border-b-2 py-4 text-sm font-medium ${
                  activeTab === "slitLamp"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                Slit Lamp
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab("refraction")
                }
                className={`border-b-2 py-4 text-sm font-medium ${
                  activeTab === "refraction"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                Refraction
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab("diagnosis")
                }
                className={`border-b-2 py-4 text-sm font-medium ${
                  activeTab === "diagnosis"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                Diagnosis & Plan
              </button>
            </div>
          </div>

          <div className="p-5">
            {activeTab === "slitLamp" && (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Right Eye (OD)
                  </label>

                  <textarea
                    value={slitLampOD}
                    onChange={(event) =>
                      setSlitLampOD(
                        event.target.value
                      )
                    }
                    rows={8}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter right eye slit lamp findings..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Left Eye (OS)
                  </label>

                  <textarea
                    value={slitLampOS}
                    onChange={(event) =>
                      setSlitLampOS(
                        event.target.value
                      )
                    }
                    rows={8}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter left eye slit lamp findings..."
                  />
                </div>
              </div>
            )}

            {activeTab === "refraction" && (
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    {
                      eye: "OD" as const,
                      value: refractionOD,
                      setValue: setRefractionOD,
                    },
                    {
                      eye: "OS" as const,
                      value: refractionOS,
                      setValue: setRefractionOS,
                    },
                  ].map(
                    ({
                      eye,
                      value,
                      setValue,
                    }) => (
                      <div
                        key={eye}
                        className="rounded-xl border p-4"
                      >
                        <h3 className="mb-4 font-semibold text-gray-900">
                          {eye === "OD"
                            ? "Right Eye (OD)"
                            : "Left Eye (OS)"}
                        </h3>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                              Sphere
                            </label>

                            <input
                              value={
                                value.sphere
                              }
                              onChange={(
                                event
                              ) =>
                                setValue({
                                  ...value,
                                  sphere:
                                    event.target
                                      .value,
                                })
                              }
                              onBlur={() =>
                                handleRefractionBlur(
                                  eye,
                                  "sphere"
                                )
                              }
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                              Cylinder
                            </label>

                            <input
                              value={
                                value.cylinder
                              }
                              onChange={(
                                event
                              ) =>
                                setValue({
                                  ...value,
                                  cylinder:
                                    event.target
                                      .value,
                                })
                              }
                              onBlur={() =>
                                handleRefractionBlur(
                                  eye,
                                  "cylinder"
                                )
                              }
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                              Axis
                            </label>

                            <input
                              value={
                                value.axis
                              }
                              onChange={(
                                event
                              ) =>
                                setValue({
                                  ...value,
                                  axis:
                                    event.target
                                      .value,
                                })
                              }
                              onBlur={() =>
                                handleRefractionBlur(
                                  eye,
                                  "axis"
                                )
                              }
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {patient.previousRefraction && (
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <h3 className="font-semibold text-gray-900">
                      Previous Refraction
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {
                        patient
                          .previousRefraction
                          .date
                      }
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-sm font-medium">
                          Right Eye (OD)
                        </p>

                        <p className="text-sm text-gray-600">
                          Sphere:{" "}
                          {
                            patient
                              .previousRefraction
                              .od.sphere
                          }{" "}
                          • Cylinder:{" "}
                          {
                            patient
                              .previousRefraction
                              .od.cylinder
                          }{" "}
                          • Axis:{" "}
                          {
                            patient
                              .previousRefraction
                              .od.axis
                          }
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium">
                          Left Eye (OS)
                        </p>

                        <p className="text-sm text-gray-600">
                          Sphere:{" "}
                          {
                            patient
                              .previousRefraction
                              .os.sphere
                          }{" "}
                          • Cylinder:{" "}
                          {
                            patient
                              .previousRefraction
                              .os.cylinder
                          }{" "}
                          • Axis:{" "}
                          {
                            patient
                              .previousRefraction
                              .os.axis
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "diagnosis" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Diagnosis
                </label>

                <textarea
                  value={diagnosis}
                  onChange={(event) =>
                    setDiagnosis(
                      event.target.value
                    )
                  }
                  rows={8}
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter diagnosis and clinical plan..."
                />
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Recent History
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowHistory(true)
                }
                className="text-sm font-medium text-blue-600"
              >
                View all
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {patient.history
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={`${item.date}-${item.title}-${index}`}
                    className="rounded-lg bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>

                      <span className="text-xs text-gray-500">
                        {item.date}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-gray-600">
                      {item.details}
                    </p>
                  </div>
                ))}

              {!patient.history.length && (
                <p className="text-sm text-gray-500">
                  No history available.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold text-gray-900">
              Allergies
            </h3>

            {patient.allergies.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {patient.allergies.map(
                  (allergy) => (
                    <span
                      key={allergy}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
                    >
                      {allergy}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                No known allergies recorded.
              </p>
            )}

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900">
                Diagnostic Status
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                {patient.diagnostics.length
                  ? `${
                      patient.diagnostics.length
                    } diagnostic order${
                      patient.diagnostics
                        .length === 1
                        ? ""
                        : "s"
                    } on record.`
                  : "No diagnostic orders on record."}
              </p>
            </div>
          </div>
        </section>
      </main>

      {feedback && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
          <div className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4 shadow-lg">
            <p className="text-sm text-gray-700">
              {feedback}
            </p>

            <button
              type="button"
              onClick={() =>
                setFeedback("")
              }
              className="text-gray-400 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() =>
              handleSave("draft")
            }
            disabled={isPending}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Draft
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveModal(
                  "diagnostics"
                )
              }
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ClipboardList className="h-4 w-4" />
              Order Diagnostics
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModal("surgery")
              }
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              Schedule Surgery
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModal(
                  "prescription"
                )
              }
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Pill className="h-4 w-4" />
              Issue Prescription
            </button>

            <button
              type="button"
              onClick={() =>
                handleSave("completed")
              }
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Complete Encounter
            </button>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Patient History
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {patient.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowHistory(false)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              <div className="space-y-4">
                {patient.history.map(
                  (item, index) => (
                    <div
                      key={`${item.date}-${item.title}-${index}`}
                      className="relative rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {item.title}
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.date}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {item.details}
                      </p>
                    </div>
                  )
                )}

                {!patient.history.length && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No patient history available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "diagnostics" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Order Diagnostics
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select the tests required for this patient.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 p-5">
              {DIAGNOSTIC_TESTS.map(
                (test) => {
                  const selected =
                    selectedDiagnostics.includes(
                      test.name
                    );

                  return (
                    <button
                      key={test.name}
                      type="button"
                      onClick={() =>
                        toggleDiagnostic(
                          test.name
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {test.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          ₦
                          {test.price.toLocaleString()}
                        </p>
                      </div>

                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {selected && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSubmitDiagnostics
                }
                disabled={
                  isPending ||
                  !selectedDiagnostics.length
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending
                  ? "Ordering..."
                  : "Order Selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "surgery" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Schedule Surgery
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select the planned procedure.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Surgery Type
                </label>

                <select
                  value={surgeryType}
                  onChange={(event) =>
                    setSurgeryType(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="">
                    Select surgery
                  </option>

                  {SURGERY_OPTIONS.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  value={surgeryNotes}
                  onChange={(event) =>
                    setSurgeryNotes(
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="Add surgery planning notes..."
                />
              </div>

              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                Surgery scheduling is not connected to the appointment system yet.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  handleScheduleSurgery();
                  setActiveModal(null);
                }}
                disabled={!surgeryType}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "prescription" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Issue Prescription
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the medication details.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Medication
                </label>

                <input
                  value={medication}
                  onChange={(event) =>
                    setMedication(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="e.g. Timolol Eye Drops"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Dosage
                  </label>

                  <input
                    value={dosage}
                    onChange={(event) =>
                      setDosage(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="e.g. 1 drop"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Frequency
                  </label>

                  <input
                    value={frequency}
                    onChange={(event) =>
                      setFrequency(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="e.g. Twice daily"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Duration
                  </label>

                  <input
                    value={duration}
                    onChange={(event) =>
                      setDuration(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="e.g. 7 days"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Price per Unit
                </label>

                <input
                  type="number"
                  min="0"
                  value={pricePerUnit}
                  onChange={(event) =>
                    setPricePerUnit(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSavePrescription
                }
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending
                  ? "Saving..."
                  : "Issue Prescription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}