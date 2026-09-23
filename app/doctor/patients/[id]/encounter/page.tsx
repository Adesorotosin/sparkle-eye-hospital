"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { getPatientById, PatientRecord } from "@/lib/patients";
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

function TriageSummary({
  vitals,
}: {
  vitals?: PatientRecord["vitals"];
}) {
  if (!vitals) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Nurse Triage
            </p>

            <p className="text-sm font-semibold text-slate-700 mt-1">
              No triage record available
            </p>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
            NOT RECORDED
          </span>
        </div>
      </div>
    );
  }

  const symptoms = vitals.symptoms ?? [];

  const vitalItems = [
    {
      label: "Visual Acuity",
      value: `OD ${vitals.visualAcuityOD || "—"} • OS ${
        vitals.visualAcuityOS || "—"
      }`,
    },
    {
      label: "IOP",
      value:
        vitals.iopOD !== undefined || vitals.iopOS !== undefined
          ? `OD ${vitals.iopOD ?? "—"} • OS ${
              vitals.iopOS ?? "—"
            } mmHg`
          : "—",
    },
    {
      label: "Blood Pressure",
      value:
        vitals.bpSystolic !== undefined ||
        vitals.bpDiastolic !== undefined
          ? `${vitals.bpSystolic ?? "—"} / ${
              vitals.bpDiastolic ?? "—"
            } mmHg`
          : "—",
    },
    {
      label: "Pulse",
      value:
        vitals.pulse !== undefined ? `${vitals.pulse} bpm` : "—",
    },
    {
      label: "Temperature",
      value:
        vitals.temperature !== undefined
          ? `${vitals.temperature} °C`
          : "—",
    },
    {
      label: "SpO₂",
      value:
        vitals.spo2 !== undefined ? `${vitals.spo2}%` : "—",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
            Nurse Triage
          </p>

          <h3 className="text-sm font-bold text-slate-900 mt-1">
            Initial Assessment
          </h3>

          <p className="text-[10px] text-slate-400 mt-1">
            Recorded{" "}
            {vitals.recordedAt
              ? new Date(vitals.recordedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        </div>

        {vitals.severity && (
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              vitals.severity === "Severe"
                ? "bg-rose-100 text-rose-700"
                : vitals.severity === "Moderate"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {vitals.severity.toUpperCase()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {vitalItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-slate-50 border border-slate-100 p-3"
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              {item.label}
            </p>

            <p className="text-xs font-bold text-slate-800 mt-1">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Chief Complaint
          </p>

          <p className="text-xs font-semibold text-slate-800 mt-1">
            {vitals.primaryComplaint || "Not recorded"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Duration
          </p>

          <p className="text-xs font-semibold text-slate-800 mt-1">
            {vitals.durationText || "Not recorded"}
          </p>
        </div>
      </div>

      {symptoms.length > 0 && (
        <div className="mt-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-2">
            Reported Symptoms
          </p>

          <div className="flex flex-wrap gap-2">
            {symptoms.map((symptom) => (
              <span
                key={symptom}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100"
              >
                {symptom}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-500">
          Correction:{" "}
          <span className="font-bold text-slate-700">
            {vitals.withCorrection === undefined
              ? "Not specified"
              : vitals.withCorrection
                ? "With correction"
                : "Without correction"}
          </span>
        </p>

        {vitals.iopInstrument && (
          <p className="text-[10px] text-slate-500">
            IOP Instrument:{" "}
            <span className="font-bold text-slate-700">
              {vitals.iopInstrument}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function OphthalmologyConsultation() {
  const params = useParams();

  const id = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "slit-lamp" | "refraction" | "diagnosis"
  >("refraction");

  const [slitLampOD, setSlitLampOD] = useState("");
  const [slitLampOS, setSlitLampOS] = useState("");

  const [refractionOD, setRefractionOD] = useState<Refraction>({
    sphere: "",
    cylinder: "",
    axis: "",
  });

  const [refractionOS, setRefractionOS] = useState<Refraction>({
    sphere: "",
    cylinder: "",
    axis: "",
  });

  const [diagnosis, setDiagnosis] = useState("");

  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);

  const [activeModal, setActiveModal] = useState<
    "diagnostics" | "surgery" | "prescription" | null
  >(null);

  const [selectedDiagnostics, setSelectedDiagnostics] = useState<string[]>(
    []
  );

  const [surgeryDetails, setSurgeryDetails] = useState({
    procedure: SURGERY_OPTIONS[0],
    date: "",
    notes: "",
  });

  const [prescriptionDetails, setPrescriptionDetails] = useState({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: "1",
    pricePerUnit: "",
  });

  const [isPending, startTransition] = useTransition();

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(
    null
  );

  const [feedbackType, setFeedbackType] = useState<
    "success" | "error" | "info"
  >("success");

  const showFeedback = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setFeedbackMessage(message);
    setFeedbackType(type);

    window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadPatientData() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await getPatientById(id);

        if (cancelled) {
          return;
        }

        if (data) {
          setPatient(data);

          setSlitLampOD(data.slitLamp?.od ?? "");
          setSlitLampOS(data.slitLamp?.os ?? "");

          setRefractionOD({
            sphere: data.refraction?.od?.sphere ?? "",
            cylinder: data.refraction?.od?.cylinder ?? "",
            axis: data.refraction?.od?.axis ?? "",
          });

          setRefractionOS({
            sphere: data.refraction?.os?.sphere ?? "",
            cylinder: data.refraction?.os?.cylinder ?? "",
            axis: data.refraction?.os?.axis ?? "",
          });

          setDiagnosis(data.diagnosis ?? "");
        }
      } catch (error) {
        console.error("Failed to load patient record:", error);

        if (!cancelled) {
          showFeedback(
            "Unable to load this patient record. Please try again.",
            "error"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPatientData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const snapToQuarter = (value: string): string => {
    const cleaned = value.trim();

    if (!cleaned || Number.isNaN(Number(cleaned))) {
      return cleaned;
    }

    const num = Number(cleaned);
    const snapped = Math.round(num * 4) / 4;

    return `${snapped > 0 ? "+" : ""}${snapped.toFixed(2)}`;
  };

  const validateAndFormatAxis = (value: string): string => {
    const cleaned = value.trim();

    if (!cleaned || Number.isNaN(Number(cleaned))) {
      return cleaned;
    }

    let num = Number.parseInt(cleaned, 10);

    if (num < 0) {
      num = 0;
    }

    if (num > 180) {
      num = 180;
    }

    return num.toString();
  };

  const handleRefractionBlur = (
    eye: "od" | "os",
    field: keyof Refraction
  ) => {
    if (eye === "od") {
      setRefractionOD((previous) => ({
        ...previous,
        [field]:
          field === "axis"
            ? validateAndFormatAxis(previous[field])
            : snapToQuarter(previous[field]),
      }));

      return;
    }

    setRefractionOS((previous) => ({
      ...previous,
      [field]:
        field === "axis"
          ? validateAndFormatAxis(previous[field])
          : snapToQuarter(previous[field]),
    }));
  };

  const handleSave = (status: "draft" | "completed") => {
    if (!id) {
      showFeedback("Patient ID is missing.", "error");
      return;
    }

    if (status === "completed" && !diagnosis.trim()) {
      showFeedback(
        "Please enter a diagnosis before completing the encounter.",
        "error"
      );

      setActiveTab("diagnosis");
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveConsultationEncounter({
          patientId: id,
          slitLampOD,
          slitLampOS,
          refractionOD,
          refractionOS,
          diagnosis,
          status,
        });

        showFeedback(
          result.message,
          result.success ? "success" : "error"
        );
      } catch (error) {
        console.error("Failed to save consultation:", error);

        showFeedback(
          "Failed to save the consultation. Please try again.",
          "error"
        );
      }
    });
  };

  const toggleDiagnostic = (
    testName: string,
    checked: boolean
  ) => {
    setSelectedDiagnostics((previous) => {
      if (checked) {
        return previous.includes(testName)
          ? previous
          : [...previous, testName];
      }

      return previous.filter((test) => test !== testName);
    });
  };

  const handleSubmitDiagnostics = () => {
    if (!id) {
      showFeedback("Patient ID is missing.", "error");
      return;
    }

    if (selectedDiagnostics.length === 0) {
      showFeedback(
        "Select at least one diagnostic test before submitting.",
        "error"
      );
      return;
    }

    startTransition(async () => {
      try {
        const selectedTests = DIAGNOSTIC_TESTS.filter((test) =>
          selectedDiagnostics.includes(test.name)
        );

        for (const test of selectedTests) {
          const result = await createDiagnosticOrder({
            patientCode: id,
            name: test.name,
            price: test.price,
          });

          if (!result.success) {
            throw new Error(result.message);
          }
        }

        showFeedback(
          `${selectedTests.length} diagnostic ${
            selectedTests.length === 1 ? "order" : "orders"
          } added to the patient's bill.`,
          "success"
        );

        setSelectedDiagnostics([]);
        setActiveModal(null);
      } catch (error) {
        console.error("Failed to add diagnostic orders:", error);

        showFeedback(
          error instanceof Error
            ? error.message
            : "Unable to add the diagnostic orders. Please try again.",
          "error"
        );
      }
    });
  };

  const handleSavePrescription = () => {
    if (!id) {
      showFeedback("Patient ID is missing.", "error");
      return;
    }

    const medication = prescriptionDetails.medication.trim();
    const dosage = prescriptionDetails.dosage.trim();
    const frequency = prescriptionDetails.frequency.trim();
    const duration = prescriptionDetails.duration.trim();

    const quantity = Number(prescriptionDetails.quantity);
    const pricePerUnit = Number(
      prescriptionDetails.pricePerUnit
    );

    if (!medication) {
      showFeedback("Enter the medication name.", "error");
      return;
    }

    if (!dosage) {
      showFeedback("Enter the dosage/instructions.", "error");
      return;
    }

    if (!frequency) {
      showFeedback("Enter the medication frequency.", "error");
      return;
    }

    if (!duration) {
      showFeedback(
        "Enter the duration of treatment.",
        "error"
      );
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      showFeedback(
        "Quantity must be a whole number greater than zero.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(pricePerUnit) ||
      pricePerUnit < 0
    ) {
      showFeedback(
        "Enter a valid price per unit.",
        "error"
      );
      return;
    }

    startTransition(async () => {
      try {
        const fullDosage = [
          dosage,
          frequency,
          duration,
        ]
          .filter(Boolean)
          .join(", ");

        const result = await createPrescription({
          patientCode: id,
          drugName: medication,
          dosage: fullDosage,
          quantity,
          pricePerUnit,
        });

        if (!result.success) {
          throw new Error(result.message);
        }

        showFeedback(
          `${medication} has been added to the patient's prescription and bill.`,
          "success"
        );

        setPrescriptionDetails({
          medication: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: "1",
          pricePerUnit: "",
        });

        setActiveModal(null);
      } catch (error) {
        console.error("Failed to save prescription:", error);

        showFeedback(
          error instanceof Error
            ? error.message
            : "Unable to save the prescription. Please try again.",
          "error"
        );
      }
    });
  };

  const handleScheduleSurgery = () => {
    if (!surgeryDetails.date) {
      showFeedback(
        "Select a preferred surgery date and time.",
        "error"
      );
      return;
    }

    showFeedback(
      "Surgery scheduling is not connected to the hospital scheduling system yet. No appointment was created.",
      "info"
    );

    setActiveModal(null);
  };

  if (loading) {
    return (
      <div className="p-8 text-xs text-slate-500 bg-[#F4F6FB] min-h-screen">
        Loading patient record...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-xs text-rose-500 font-bold bg-[#F4F6FB] min-h-screen">
        Patient record not found for ID: {id}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F4F6FB] selection:bg-purple-100 selection:text-purple-900 relative">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px] w-full mx-auto">
          {/* LEFT COLUMN */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="mb-4">
                <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                  Patient History
                </h2>

                <p className="text-[11px] text-slate-400 font-medium">
                  {patient.name} — MRN: {patient.mrn}
                </p>
              </div>

              <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {patient.history.map((hist, idx) => (
                  <div
                    key={idx}
                    className="relative pl-6"
                  >
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-purple-50 border-2 border-[#6B21A8] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6B21A8]" />
                    </div>

                    <div className="text-[11px]">
                      <span className="font-bold text-[#6B21A8] block">
                        {hist.date}
                      </span>

                      <h3 className="font-bold text-slate-900 text-xs mt-0.5">
                        {hist.title}
                      </h3>

                      <p className="text-slate-600 leading-relaxed mt-1">
                        {hist.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IMAGING */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="mb-4">
                <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                  Recent Imaging
                </h2>

                <p className="text-[11px] text-slate-400 font-medium">
                  OCT Scans & Diagnostic Imaging
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {patient.imaging.map((img) => (
                  <div
                    key={img.id}
                    className="border border-slate-200/80 rounded-xl p-2.5 bg-slate-50/50 hover:border-slate-300 transition cursor-pointer group"
                  >
                    <div className="aspect-video bg-[#0A0E1A] rounded-lg overflow-hidden relative border border-slate-800 flex items-center justify-center">
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-slate-300 bg-slate-900/80 px-1.5 py-0.5 rounded">
                        OCT SCAN
                      </span>

                      <svg
                        className={`w-full h-full p-2 ${img.color} opacity-80`}
                        viewBox="0 0 100 50"
                      >
                        <path
                          d={img.path}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>

                    <div className="mt-2 text-left">
                      <strong className="text-xs font-bold text-slate-900 block group-hover:text-[#6B21A8]">
                        {img.type}
                      </strong>

                      <span className="text-[10px] text-slate-400 font-medium block">
                        {img.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              {/* TABS */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
                <div className="flex items-center gap-8">
                  <button
                    onClick={() =>
                      setActiveTab("slit-lamp")
                    }
                    className={`font-bold text-sm transition relative pb-2 -mb-3.5 ${
                      activeTab === "slit-lamp"
                        ? "text-[#6B21A8] border-b-2 border-[#6B21A8]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Slit Lamp Exam
                  </button>

                  <button
                    onClick={() =>
                      setActiveTab("refraction")
                    }
                    className={`font-bold text-sm transition relative pb-2 -mb-3.5 ${
                      activeTab === "refraction"
                        ? "text-[#6B21A8] border-b-2 border-[#6B21A8]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Refraction & Prescription
                  </button>

                  <button
                    onClick={() =>
                      setActiveTab("diagnosis")
                    }
                    className={`font-bold text-sm transition relative pb-2 -mb-3.5 ${
                      activeTab === "diagnosis"
                        ? "text-[#6B21A8] border-b-2 border-[#6B21A8]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Diagnosis & Assessment
                  </button>
                </div>

                {activeTab === "refraction" && (
                  <button
                    onClick={() =>
                      setShowHistoryOverlay(
                        (previous) => !previous
                      )
                    }
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                      showHistoryOverlay
                        ? "bg-purple-100 border-purple-300 text-purple-900"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-[#6B21A8]" />

                    {showHistoryOverlay
                      ? "Hide Previous Exam"
                      : "Compare Previous Exam"}
                  </button>
                )}
              </div>

              {/* TRIAGE SUMMARY */}
              <TriageSummary vitals={patient.vitals} />

              {/* SLIT LAMP */}
              {activeTab === "slit-lamp" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      eye: "OD",
                      label: "Right Eye",
                      value: slitLampOD,
                      setValue: setSlitLampOD,
                    },
                    {
                      eye: "OS",
                      label: "Left Eye",
                      value: slitLampOS,
                      setValue: setSlitLampOS,
                    },
                  ].map((eye) => (
                    <div
                      key={eye.eye}
                      className="border border-slate-200/80 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-purple-700" />

                        <h3 className="font-extrabold text-sm text-slate-900">
                          {eye.eye} ({eye.label})
                        </h3>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Cornea & Lens Observations
                        </label>

                        <textarea
                          rows={4}
                          value={eye.value}
                          onChange={(event) =>
                            eye.setValue(event.target.value)
                          }
                          className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* REFRACTION */}
              {activeTab === "refraction" && (
                <div className="space-y-6">
                  {showHistoryOverlay &&
                    patient.previousRefraction && (
                      <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 border border-slate-800 space-y-3 animate-in fade-in duration-200 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-purple-400" />

                            <h4 className="font-bold text-xs tracking-wide">
                              Previous Record (
                              {patient.previousRefraction.date})
                            </h4>
                          </div>

                          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            Verified Baseline
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] font-sans font-bold text-purple-300 block mb-1">
                              OD (Right Eye)
                            </span>

                            Sphere:{" "}
                            {
                              patient.previousRefraction.od
                                .sphere
                            }{" "}
                            | Cyl:{" "}
                            {
                              patient.previousRefraction.od
                                .cylinder
                            }{" "}
                            | Axis:{" "}
                            {
                              patient.previousRefraction.od
                                .axis
                            }
                            °
                          </div>

                          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[10px] font-sans font-bold text-purple-300 block mb-1">
                              OS (Left Eye)
                            </span>

                            Sphere:{" "}
                            {
                              patient.previousRefraction.os
                                .sphere
                            }{" "}
                            | Cyl:{" "}
                            {
                              patient.previousRefraction.os
                                .cylinder
                            }{" "}
                            | Axis:{" "}
                            {
                              patient.previousRefraction.os
                                .axis
                            }
                            °
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      {
                        eye: "OD",
                        label: "Right Eye",
                        value: refractionOD,
                        setValue: setRefractionOD,
                      },
                      {
                        eye: "OS",
                        label: "Left Eye",
                        value: refractionOS,
                        setValue: setRefractionOS,
                      },
                    ].map((eye) => (
                      <div
                        key={eye.eye}
                        className="border border-slate-200/80 rounded-2xl p-5 space-y-4"
                      >
                        <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">
                          {eye.eye} Refraction ({eye.label})
                        </h3>

                        <div className="grid grid-cols-3 gap-3">
                          {(
                            [
                              [
                                "sphere",
                                "SPHERE (0.25)",
                                "-2.00",
                              ],
                              [
                                "cylinder",
                                "CYLINDER",
                                "-0.50",
                              ],
                              [
                                "axis",
                                "AXIS (0-180°)",
                                "90",
                              ],
                            ] as const
                          ).map(
                            ([
                              field,
                              label,
                              placeholder,
                            ]) => (
                              <div key={field}>
                                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                                  {label}
                                </label>

                                <input
                                  type="text"
                                  placeholder={
                                    placeholder
                                  }
                                  value={
                                    eye.value[field]
                                  }
                                  onChange={(event) =>
                                    eye.setValue({
                                      ...eye.value,
                                      [field]:
                                        event.target.value,
                                    })
                                  }
                                  onBlur={() =>
                                    handleRefractionBlur(
                                      eye.eye === "OD"
                                        ? "od"
                                        : "os",
                                      field
                                    )
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DIAGNOSIS */}
              {activeTab === "diagnosis" && (
                <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">
                    Clinical Assessment & ICD-10 Coding
                  </h3>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Primary Impression
                    </label>

                    <textarea
                      rows={6}
                      value={diagnosis}
                      onChange={(event) =>
                        setDiagnosis(event.target.value)
                      }
                      placeholder="Enter clinical diagnosis / primary impression..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="bg-[#0B132B] text-white px-6 py-3 flex flex-wrap items-center justify-between border-t border-slate-800 sticky bottom-0 z-20 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave("draft")}
              disabled={isPending}
              className="px-4 py-2 border border-slate-700 text-slate-200 hover:bg-slate-800 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Saving..." : "Save Draft"}
            </button>

            {feedbackMessage && (
              <span
                className={`text-[11px] font-semibold ${
                  feedbackType === "success"
                    ? "text-emerald-400"
                    : feedbackType === "error"
                      ? "text-rose-400"
                      : "text-amber-300"
                }`}
              >
                {feedbackMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() =>
                setActiveModal("diagnostics")
              }
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-300" />
              Order Diagnostics
            </button>

            <button
              onClick={() =>
                setActiveModal("surgery")
              }
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              Schedule Surgery
            </button>

            <button
              onClick={() =>
                setActiveModal("prescription")
              }
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <Pill className="w-3.5 h-3.5 text-slate-300" />
              Issue Prescription
            </button>

            <button
              onClick={() => handleSave("completed")}
              disabled={isPending}
              className="px-5 py-2.5 bg-[#6B21A8] hover:bg-[#581c87] text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />

              {isPending
                ? "Processing..."
                : "Complete Encounter"}
            </button>
          </div>
        </footer>
      </div>

      {/* MODALS */}
      {activeModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isPending
            ) {
              setActiveModal(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* DIAGNOSTICS */}
            {activeModal === "diagnostics" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Order Diagnostic Scans & Tests
                    </h3>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Selected tests will be added to the patient&apos;s bill.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setActiveModal(null)
                    }
                    disabled={isPending}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2.5">
                  {DIAGNOSTIC_TESTS.map((test) => (
                    <label
                      key={test.name}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDiagnostics.includes(
                            test.name
                          )}
                          onChange={(event) =>
                            toggleDiagnostic(
                              test.name,
                              event.target.checked
                            )
                          }
                          disabled={isPending}
                          className="rounded border-slate-300 text-[#6B21A8] focus:ring-purple-500"
                        />

                        <span>{test.name}</span>
                      </div>

                      <span className="text-[11px] font-bold text-slate-500">
                        ₦{test.price.toLocaleString()}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() =>
                      setActiveModal(null)
                    }
                    disabled={isPending}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSubmitDiagnostics}
                    disabled={isPending}
                    className="px-4 py-2 bg-[#6B21A8] text-white rounded-xl text-xs font-bold hover:bg-[#581c87] cursor-pointer disabled:opacity-50"
                  >
                    {isPending
                      ? "Submitting..."
                      : `Submit ${
                          selectedDiagnostics.length
                            ? `(${selectedDiagnostics.length})`
                            : ""
                        }`}
                  </button>
                </div>
              </>
            )}

            {/* SURGERY */}
            {activeModal === "surgery" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Schedule Surgical Procedure
                    </h3>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Scheduling integration is not connected yet.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setActiveModal(null)
                    }
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Procedure Type
                    </label>

                    <select
                      value={
                        surgeryDetails.procedure
                      }
                      onChange={(event) =>
                        setSurgeryDetails(
                          (previous) => ({
                            ...previous,
                            procedure:
                              event.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                    >
                      {SURGERY_OPTIONS.map(
                        (procedure) => (
                          <option key={procedure}>
                            {procedure}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Preferred Date & Time
                    </label>

                    <input
                      type="datetime-local"
                      value={surgeryDetails.date}
                      onChange={(event) =>
                        setSurgeryDetails(
                          (previous) => ({
                            ...previous,
                            date: event.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Clinical Notes
                    </label>

                    <textarea
                      rows={3}
                      value={surgeryDetails.notes}
                      onChange={(event) =>
                        setSurgeryDetails(
                          (previous) => ({
                            ...previous,
                            notes: event.target.value,
                          })
                        )
                      }
                      placeholder="Optional surgical notes..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() =>
                      setActiveModal(null)
                    }
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleScheduleSurgery}
                    className="px-4 py-2 bg-[#6B21A8] text-white rounded-xl text-xs font-bold hover:bg-[#581c87] cursor-pointer"
                  >
                    Request Schedule
                  </button>
                </div>
              </>
            )}

            {/* PRESCRIPTION */}
            {activeModal === "prescription" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Issue Medication Prescription
                    </h3>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Saved prescriptions are also added to the patient bill.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setActiveModal(null)
                    }
                    disabled={isPending}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Eye Drop / Medication Name
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Latanoprost 0.005%"
                      value={
                        prescriptionDetails.medication
                      }
                      onChange={(event) =>
                        setPrescriptionDetails(
                          (previous) => ({
                            ...previous,
                            medication:
                              event.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Dosage / Instructions
                      </label>

                      <input
                        type="text"
                        placeholder="e.g. 1 drop"
                        value={
                          prescriptionDetails.dosage
                        }
                        onChange={(event) =>
                          setPrescriptionDetails(
                            (previous) => ({
                              ...previous,
                              dosage:
                                event.target.value,
                            })
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Frequency
                      </label>

                      <input
                        type="text"
                        placeholder="e.g. Twice daily"
                        value={
                          prescriptionDetails.frequency
                        }
                        onChange={(event) =>
                          setPrescriptionDetails(
                            (previous) => ({
                              ...previous,
                              frequency:
                                event.target.value,
                            })
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Duration
                      </label>

                      <input
                        type="text"
                        placeholder="e.g. 7 days"
                        value={
                          prescriptionDetails.duration
                        }
                        onChange={(event) =>
                          setPrescriptionDetails(
                            (previous) => ({
                              ...previous,
                              duration:
                                event.target.value,
                            })
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Quantity
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          prescriptionDetails.quantity
                        }
                        onChange={(event) =>
                          setPrescriptionDetails(
                            (previous) => ({
                              ...previous,
                              quantity:
                                event.target.value,
                            })
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Price Per Unit (₦)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="e.g. 6200"
                      value={
                        prescriptionDetails.pricePerUnit
                      }
                      onChange={(event) =>
                        setPrescriptionDetails(
                          (previous) => ({
                            ...previous,
                            pricePerUnit:
                              event.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() =>
                      setActiveModal(null)
                    }
                    disabled={isPending}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSavePrescription}
                    disabled={isPending}
                    className="px-4 py-2 bg-[#6B21A8] text-white rounded-xl text-xs font-bold hover:bg-[#581c87] cursor-pointer disabled:opacity-50"
                  >
                    {isPending
                      ? "Saving..."
                      : "Save Prescription"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}