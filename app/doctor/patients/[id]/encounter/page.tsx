"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Hospital,
  Loader2,
  Pill,
  Send,
  Stethoscope,
  TestTube2,
  UserRound,
  Wallet,
} from "lucide-react";
import { saveConsultationEncounter } from "@/app/actions/consultation";
import { referPatientToOptometry } from "@/app/actions/optometry-referral";
import { createLabOrder } from "@/app/actions/lab-orders";
import { createDiagnosticOrder, createPrescription } from "@/app/actions/clinical-orders";
import { createOpticalOrder } from "@/app/actions/optician";
import { getOptometryPatient } from "@/app/actions/optometry";

type Refraction = {
  sphere: string;
  cylinder: string;
  axis: string;
};

type Encounter = {
  id: string;
  presentingComplaint?: string;
  historyOfPresentingComplaint?: string;
  pastMedicalHistory?: string;
  pastOcularHistory?: string;
  familyOcularHistory?: string;
  ocularExamOD?: string;
  ocularExamOS?: string;
  slitLampOD?: string;
  slitLampOS?: string;
  otherExaminationFindings?: string;
  iopOD?: number;
  iopOS?: number;
  iopInstrument?: string;
  refractionOD?: Refraction;
  refractionOS?: Refraction;
  diagnosis?: string;
  treatmentPlan?: string;
  status: "draft" | "completed";
  createdAt: string;
};

type Diagnostic = {
  id: string;
  name: string;
  price: number;
  status: string;
  findings?: string;
  interpretation?: string;
  completedAt?: string;
};

type LabResult = {
  id: string;
  testName: string;
  status: string;
  resultData: unknown;
  laboratoryComments?: string;
  verifiedAt?: string;
  createdAt?: string;
};

type Patient = {
  patientId: string;
  fullName: string;
  age?: number;
  gender?: string;
  phone?: string;
  allergies?: string;
  coveragePlan?: string;
  vitals?: {
    visualAcuityOD: string;
    visualAcuityOS: string;
    visualAcuityOU?: string;
    visualAcuityODPinhole?: string;
    visualAcuityOSPinhole?: string;
    visualAcuityODNote?: string;
    visualAcuityOSNote?: string;
    visualAcuityOUNote?: string;
    withCorrection?: boolean;
    gonioscopyOD?: string;
    gonioscopyOS?: string;
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
    severity?: string;
    durationText?: string;
    recordedAt: string;
  };
  diagnostics: Diagnostic[];
  laboratoryResults: LabResult[];
  encounters?: Encounter[];
  invoice?: {
    invoiceNo: string;
    status: string;
    grandTotal: number;
    items: Array<{ id: string; category: string; name: string; quantity: number; totalPrice: number }>;
  };
};

type LabRequest = {
  code: string;
  name: string;
  specimenType: string;
};

type DiagnosticRequest = {
  name: string;
  price: number;
};

const LAB_REQUESTS: LabRequest[] = [
  { code: "RVS", name: "RVS", specimenType: "Blood" },
  { code: "HCV", name: "HCV", specimenType: "Blood" },
  { code: "HBSAG", name: "HBsAg", specimenType: "Blood" },
  { code: "FBS", name: "Fasting Blood Sugar", specimenType: "Blood" },
  { code: "PPBS2H", name: "2 Hours Post-Prandial Blood Sugar", specimenType: "Blood" },
];

const INVESTIGATION_REQUESTS: DiagnosticRequest[] = [
  { name: "Perimetry", price: 12000 },
  { name: "Optical Coherence Tomography (OCT)", price: 18000 },
  { name: "Keratometry K1/K2", price: 0 },
  { name: "B-scan", price: 0 },
  { name: "A-scan", price: 0 },
  { name: "Fundus Photograph", price: 9000 },
  { name: "Autorefraction", price: 0 },
];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const sectionClass =
  "scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm";

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={sectionClass}>
      <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="rounded-xl bg-blue-50 p-2 text-blue-600">{icon}</div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function resultText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function DoctorEncounterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientCode = params?.id ?? "";
  const [isPending, startTransition] = useTransition();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedStatus, setSavedStatus] = useState<"draft" | "completed">("draft");

  const [presentingComplaint, setPresentingComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [pastOcularHistory, setPastOcularHistory] = useState("");
  const [familyOcularHistory, setFamilyOcularHistory] = useState("");
  const [ocularExamOD, setOcularExamOD] = useState("");
  const [ocularExamOS, setOcularExamOS] = useState("");
  const [slitLampOD, setSlitLampOD] = useState("");
  const [slitLampOS, setSlitLampOS] = useState("");
  const [otherFindings, setOtherFindings] = useState("");
  const [gonioscopyOD, setGonioscopyOD] = useState("");
  const [gonioscopyOS, setGonioscopyOS] = useState("");
  const [savingGonioscopy, setSavingGonioscopy] = useState(false);
  const [iopOD, setIopOD] = useState("");
  const [iopOS, setIopOS] = useState("");
  const [iopInstrument, setIopInstrument] = useState("Goldmann");
  const [refractionOD, setRefractionOD] = useState<Refraction>({ sphere: "", cylinder: "", axis: "" });
  const [refractionOS, setRefractionOS] = useState<Refraction>({ sphere: "", cylinder: "", axis: "" });
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");

  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pricePerUnit, setPricePerUnit] = useState("0");

  const [requesting, setRequesting] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [optometryResult, setOptometryResult] = useState<any>(null);

  const latestEncounter = patient?.encounters?.[0];

  useEffect(() => {
    if (!patientCode) return;

    let cancelled = false;
    setLoading(true);
    fetch(`/api/patients/${encodeURIComponent(patientCode)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? "Unable to load patient.");
        return data.patient as Patient;
      })
      .then(async (data) => {
        if (cancelled) return;
        setPatient(data);
        setGonioscopyOD(data.vitals?.gonioscopyOD ?? "");
        setGonioscopyOS(data.vitals?.gonioscopyOS ?? "");

        try {
          const optometry = await getOptometryPatient(patientCode);
          if (optometry.success) {
            setOptometryResult(optometry.patient ?? null);
          }
        } catch {
          setOptometryResult(null);
        }

        const encounter = data.encounters?.[0];
        if (encounter) {
          setPresentingComplaint(encounter.presentingComplaint ?? "");
          setHpi(encounter.historyOfPresentingComplaint ?? "");
          setPastMedicalHistory(encounter.pastMedicalHistory ?? "");
          setPastOcularHistory(encounter.pastOcularHistory ?? "");
          setFamilyOcularHistory(encounter.familyOcularHistory ?? "");
          setOcularExamOD(encounter.ocularExamOD ?? "");
          setOcularExamOS(encounter.ocularExamOS ?? "");
          setSlitLampOD(encounter.slitLampOD ?? "");
          setSlitLampOS(encounter.slitLampOS ?? "");
          setOtherFindings(encounter.otherExaminationFindings ?? "");
          setIopOD(encounter.iopOD !== undefined ? String(encounter.iopOD) : "");
          setIopOS(encounter.iopOS !== undefined ? String(encounter.iopOS) : "");
          setIopInstrument(encounter.iopInstrument ?? "Goldmann");
          setRefractionOD(encounter.refractionOD ?? { sphere: "", cylinder: "", axis: "" });
          setRefractionOS(encounter.refractionOS ?? { sphere: "", cylinder: "", axis: "" });
          setDiagnosis(encounter.diagnosis ?? "");
          setTreatmentPlan(encounter.treatmentPlan ?? "");
          setSavedStatus(encounter.status);
        } else if (data.vitals?.primaryComplaint) {
          setPresentingComplaint(data.vitals.primaryComplaint);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load patient.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientCode]);

  const save = (status: "draft" | "completed") => {
    setMessage("");
    setError("");

    if (status === "completed" && !diagnosis.trim()) {
      setError("Enter a diagnosis before completing the consultation.");
      document.getElementById("diagnosis")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    startTransition(async () => {
      const response = await saveConsultationEncounter({
        patientId: patientCode,
        presentingComplaint,
        historyOfPresentingComplaint: hpi,
        pastMedicalHistory,
        pastOcularHistory,
        familyOcularHistory,
        ocularExamOD,
        ocularExamOS,
        slitLampOD,
        slitLampOS,
        otherExaminationFindings: otherFindings,
        iopOD: iopOD.trim() ? Number(iopOD) : null,
        iopOS: iopOS.trim() ? Number(iopOS) : null,
        iopInstrument,
        refractionOD,
        refractionOS,
        diagnosis,
        treatmentPlan,
        status,
      });

      if (!response.success) {
        setError(response.message);
        return;
      }

      setSavedStatus(status);
      setMessage(response.message);
    });
  };

  const requestLab = (test: LabRequest) => {
    if (!patient) return;
    setRequesting(test.code);
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await createLabOrder({
        patientCode,
        testCode: test.code,
        testName: test.name,
        specimenType: test.specimenType,
        price: 0,
        priority: "NORMAL",
        clinicalNotes: diagnosis || presentingComplaint || undefined,
      });

      if (!response.success) {
        setError(response.message);
      } else {
        setMessage(response.message);
        await refreshPatient();
      }
      setRequesting("");
    });
  };

  const requestInvestigation = (test: DiagnosticRequest) => {
    setRequesting(test.name);
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await createDiagnosticOrder({
        patientCode,
        name: test.name,
        price: test.price,
      });

      if (!response.success) {
        setError(response.message);
      } else {
        setMessage(response.message);
        await refreshPatient();
      }
      setRequesting("");
    });
  };

  const refreshPatient = async () => {
    const response = await fetch(`/api/patients/${encodeURIComponent(patientCode)}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (response.ok) setPatient(data.patient);
  };

  const referOptometry = () => {
    setRequesting("optometry");
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await referPatientToOptometry(patientCode);
      if (!response.success) setError(response.message);
      else setMessage(response.message);
      setRequesting("");
    });
  };

  const referOptician = () => {
    setRequesting("optician");
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await createOpticalOrder(patientCode);
      if (!response.success) {
        setError(response.message);
      } else {
        setMessage(response.message);
        await refreshPatient();
      }
      setRequesting("");
    });
  };

  const prescribe = () => {
    setMessage("");
    setError("");

    if (!medication.trim() || !dosage.trim()) {
      setError("Medication and dosage are required.");
      return;
    }

    startTransition(async () => {
      const response = await createPrescription({
        patientCode,
        drugName: medication,
        dosage,
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit),
      });

      if (!response.success) {
        setError(response.message);
        return;
      }

      setMessage(response.message);
      setMedication("");
      setDosage("");
      setQuantity("1");
      setPricePerUnit("0");
      await refreshPatient();
    });
  };

  const refractionComplete = useMemo(
    () =>
      Boolean(
        refractionOD.sphere ||
          refractionOD.cylinder ||
          refractionOD.axis ||
          refractionOS.sphere ||
          refractionOS.cylinder ||
          refractionOS.axis
      ),
    [refractionOD, refractionOS]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading patient record...
        </div>
      </main>
    );
  }

  if (!patient) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Patient not found</h1>
          <p className="mt-2 text-sm text-gray-500">{error || "Unable to load this patient record."}</p>
          <button onClick={() => router.back()} className="mt-6 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="sticky top-0 z-30 border-b bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-xl border p-2 text-gray-600 hover:bg-gray-50"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{patient.fullName}</p>
              <p className="truncate text-xs text-gray-500">{patient.patientId} • Doctor Consultation</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => save("draft")}
              disabled={isPending}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => save("completed")}
              disabled={isPending}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Complete Consultation"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-1 rounded-2xl border bg-white p-3 shadow-sm">
            {[
              ["nurse", "Nurse documentation"],
              ["history", "History"],
              ["exam", "Ocular examination"],
              ["gonioscopy", "Gonioscopy"],
              ["slit-lamp", "Slit lamp"],
              ["iop", "IOP"],
              ["diagnosis", "Diagnosis"],
              ["investigation", "Investigation"],
              ["treatment", "Treatment / plan"],
              ["requests", "Clinical requests"],
              ["results", "Results / feedback"],
              ["appointment", "Appointment"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {(message || error) && (
            <div className={`rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
              {error || message}
            </div>
          )}

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <UserRound className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{patient.fullName}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {patient.patientId} • {patient.age ?? "—"} years • {patient.gender || "—"} • {patient.coveragePlan || "Self-Pay"}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-right text-sm">
                <p className="text-gray-500">Encounter status</p>
                <p className="font-semibold capitalize">{savedStatus}</p>
              </div>
            </div>
            {patient.allergies && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <strong>Allergies:</strong> {patient.allergies}
              </div>
            )}
          </section>

          <Section id="nurse" title="Nurse documentation" icon={<HeartPulse className="h-5 w-5" />}>
            {patient.vitals ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Presenting complaint from triage</p>
                  <p className="mt-1 text-sm text-blue-950">{patient.vitals.primaryComplaint || "Not recorded"}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["VA OD", patient.vitals.visualAcuityOD],
                    ["VA OD (PH)", patient.vitals.visualAcuityODPinhole],
                    ["VA OS", patient.vitals.visualAcuityOS],
                    ["VA OS (PH)", patient.vitals.visualAcuityOSPinhole],
                    ["VA OU", patient.vitals.visualAcuityOU],
                    ["IOP OD", patient.vitals.iopOD !== undefined ? `${patient.vitals.iopOD} mmHg` : undefined],
                    ["IOP OS", patient.vitals.iopOS !== undefined ? `${patient.vitals.iopOS} mmHg` : undefined],
                    ["IOP instrument", patient.vitals.iopInstrument],
                    ["BP", patient.vitals.bpSystolic !== undefined ? `${patient.vitals.bpSystolic}/${patient.vitals.bpDiastolic ?? "—"} mmHg` : undefined],
                    ["Pulse", patient.vitals.pulse !== undefined ? `${patient.vitals.pulse} bpm` : undefined],
                    ["Temperature", patient.vitals.temperature !== undefined ? `${patient.vitals.temperature} °C` : undefined],
                    ["SpO₂", patient.vitals.spo2 !== undefined ? `${patient.vitals.spo2}%` : undefined],
                    ["Correction", patient.vitals.withCorrection ? "With correction" : "Without correction"],
                    ["Severity", patient.vitals.severity],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-semibold text-gray-500">Symptoms</p>
                    <p className="mt-1 text-sm">{patient.vitals.symptoms?.join(", ") || "—"}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-semibold text-gray-500">Duration</p>
                    <p className="mt-1 text-sm">{patient.vitals.durationText || "—"}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Recorded {formatDate(patient.vitals.recordedAt)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No nurse documentation is available yet.</p>
            )}
          </Section>

          <Section id="history" title="History" icon={<ClipboardList className="h-5 w-5" />}>
            <div className="grid gap-4">
              <Field label="Presenting complaint" value={presentingComplaint} onChange={setPresentingComplaint} />
              <Field label="History of presenting complaint" value={hpi} onChange={setHpi} rows={5} />
              <Field label="Past medical history" value={pastMedicalHistory} onChange={setPastMedicalHistory} />
              <Field label="Past ocular history" value={pastOcularHistory} onChange={setPastOcularHistory} />
              <Field label="Family ocular history" value={familyOcularHistory} onChange={setFamilyOcularHistory} />
            </div>
          </Section>

          <Section id="exam" title="Ocular examination" icon={<Stethoscope className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Right eye (OD)" value={ocularExamOD} onChange={setOcularExamOD} rows={5} placeholder="Document ocular examination findings..." />
              <Field label="Left eye (OS)" value={ocularExamOS} onChange={setOcularExamOS} rows={5} placeholder="Document ocular examination findings..." />
            </div>
          </Section>

          <Section id="gonioscopy" title="Gonioscopy" icon={<Activity className="h-5 w-5" />}>
            <p className="mb-4 text-sm text-gray-500">
              Record the gonioscopy findings for each eye. These findings are saved to the patient's clinical record.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="OD — Right eye"
                value={gonioscopyOD}
                onChange={setGonioscopyOD}
                rows={4}
                placeholder="Enter right-eye gonioscopy findings..."
              />
              <Field
                label="OS — Left eye"
                value={gonioscopyOS}
                onChange={setGonioscopyOS}
                rows={4}
                placeholder="Enter left-eye gonioscopy findings..."
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={savingGonioscopy || loading || !patient?.vitals}
                onClick={async () => {
                  setSavingGonioscopy(true);
                  setMessage("");
                  setError("");
                  try {
                    const response = await fetch(
                      `/api/patients/${encodeURIComponent(patientCode)}/gonioscopy`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          gonioscopyOD: gonioscopyOD.trim() || null,
                          gonioscopyOS: gonioscopyOS.trim() || null,
                        }),
                      }
                    );
                    const result = await response.json();
                    if (!response.ok) {
                      throw new Error(result?.error || "Unable to save gonioscopy findings.");
                    }
                    setPatient((current) =>
                      current
                        ? {
                            ...current,
                            vitals: current.vitals
                              ? {
                                  ...current.vitals,
                                  gonioscopyOD: gonioscopyOD.trim(),
                                  gonioscopyOS: gonioscopyOS.trim(),
                                }
                              : current.vitals,
                          }
                        : current
                    );
                    setMessage("Gonioscopy findings saved successfully.");
                  } catch (saveError) {
                    setError(saveError instanceof Error ? saveError.message : "Unable to save gonioscopy findings.");
                  } finally {
                    setSavingGonioscopy(false);
                  }
                }}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingGonioscopy ? "Saving findings..." : "Save Gonioscopy Findings"}
              </button>
            </div>
            {!patient?.vitals && (
              <p className="mt-3 text-xs text-amber-700">
                Nurse triage measurements must be recorded before gonioscopy findings can be saved.
              </p>
            )}
          </Section>

          <Section id="slit-lamp" title="Slit-lamp examination" icon={<Activity className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="OD — slit lamp" value={slitLampOD} onChange={setSlitLampOD} rows={6} />
              <Field label="OS — slit lamp" value={slitLampOS} onChange={setSlitLampOS} rows={6} />
            </div>
            <div className="mt-4">
              <Field label="Other examination findings" value={otherFindings} onChange={setOtherFindings} rows={4} />
            </div>
          </Section>

          <Section id="iop" title="Intraocular pressure" icon={<Activity className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">IOP OD (mmHg)</span>
                <input type="number" min="0" step="0.1" value={iopOD} onChange={(e) => setIopOD(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">IOP OS (mmHg)</span>
                <input type="number" min="0" step="0.1" value={iopOS} onChange={(e) => setIopOS(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Instrument</span>
                <input value={iopInstrument} onChange={(e) => setIopInstrument(e.target.value)} className={inputClass} />
              </label>
            </div>
          </Section>

          <Section id="diagnosis" title="Diagnosis" icon={<Hospital className="h-5 w-5" />}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Diagnosis / clinical impression</span>
              <textarea id="diagnosis" rows={5} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className={inputClass} placeholder="Enter the working or confirmed diagnosis..." />
            </label>
          </Section>

          <Section id="investigation" title="Investigation" icon={<TestTube2 className="h-5 w-5" />}>
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Refraction → Optometrist</h3>
                    <p className="text-xs text-gray-500">Send the patient to Optometry for formal refraction.</p>
                  </div>
                  {refractionComplete && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[["OD", refractionOD, setRefractionOD], ["OS", refractionOS, setRefractionOS]].map(([eye, value, setter]) => {
                    const v = value as Refraction;
                    const setV = setter as React.Dispatch<React.SetStateAction<Refraction>>;
                    return (
                      <div key={eye as string} className="rounded-xl border p-4">
                        <p className="mb-3 text-sm font-semibold">{eye as string}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <input placeholder="Sphere" value={v.sphere} onChange={(e) => setV((x) => ({ ...x, sphere: e.target.value }))} className={inputClass} />
                          <input placeholder="Cylinder" value={v.cylinder} onChange={(e) => setV((x) => ({ ...x, cylinder: e.target.value }))} className={inputClass} />
                          <input placeholder="Axis" value={v.axis} onChange={(e) => setV((x) => ({ ...x, axis: e.target.value }))} className={inputClass} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={referOptometry} disabled={isPending || requesting === "optometry"} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                  {requesting === "optometry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Refraction Request to Optometrist
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">Laboratory</h3>
                  </div>
                  <div className="space-y-2">
                    {LAB_REQUESTS.map((test) => (
                      <div key={test.code} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
                        <div>
                          <p className="text-sm font-medium">{test.name}</p>
                          <p className="text-xs text-gray-500">{test.specimenType}</p>
                        </div>
                        <button onClick={() => requestLab(test)} disabled={isPending || requesting === test.code} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
                          {requesting === test.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TestTube2 className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">Investigation Room</h3>
                  </div>
                  <div className="space-y-2">
                    {INVESTIGATION_REQUESTS.map((test) => (
                      <div key={test.name} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
                        <div>
                          <p className="text-sm font-medium">{test.name}</p>
                          <p className="text-xs text-gray-500">{test.price ? `₦${test.price.toLocaleString()}` : "Price to be configured"}</p>
                        </div>
                        <button onClick={() => requestInvestigation(test)} disabled={isPending || requesting === test.name} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
                          {requesting === test.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section id="treatment" title="Treatment / plan" icon={<Pill className="h-5 w-5" />}>
            <div className="space-y-4">
              <Field label="Treatment and follow-up plan" value={treatmentPlan} onChange={setTreatmentPlan} rows={5} />
              <div className="rounded-2xl border p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Pharmacy request</h3>
                    <p className="text-xs text-gray-500">Create the prescription and automatically add it to billing.</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <input placeholder="Medication" value={medication} onChange={(e) => setMedication(e.target.value)} className={inputClass} />
                  <input placeholder="Dosage / instructions" value={dosage} onChange={(e) => setDosage(e.target.value)} className={inputClass} />
                  <input type="number" min="1" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
                  <input type="number" min="0" placeholder="Price/unit" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} className={inputClass} />
                </div>
                <button onClick={prescribe} disabled={isPending} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                  <Send className="h-4 w-4" /> Send to Pharmacy
                </button>
              </div>
            </div>
          </Section>

          <Section id="requests" title="Clinical requests" icon={<Send className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <FlaskConical className="h-5 w-5 text-blue-600" />
                <h3 className="mt-2 font-semibold">Laboratory</h3>
                <p className="mt-1 text-xs text-gray-500">Orders are sent directly into the Laboratory queue.</p>
              </div>
              <button onClick={() => router.push(`/cashier?patientCode=${encodeURIComponent(patientCode)}`)} className="rounded-2xl border p-4 text-left hover:border-blue-300 hover:bg-blue-50">
                <Wallet className="h-5 w-5 text-blue-600" />
                <h3 className="mt-2 font-semibold">Cashier</h3>
                <p className="mt-1 text-xs text-gray-500">Open the patient's billing/payment workflow.</p>
              </button>
              <div className="rounded-2xl border p-4">
                <Pill className="h-5 w-5 text-blue-600" />
                <h3 className="mt-2 font-semibold">Pharmacy</h3>
                <p className="mt-1 text-xs text-gray-500">Prescriptions created above enter the Pharmacy workflow.</p>
              </div>
              <button onClick={referOptometry} disabled={isPending} className="rounded-2xl border p-4 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                <h3 className="mt-2 font-semibold">Optometrist</h3>
                <p className="mt-1 text-xs text-gray-500">Send the patient to the Optometry queue.</p>
              </button>
              <div className="rounded-2xl border p-4">
                <TestTube2 className="h-5 w-5 text-blue-600" />
                <h3 className="mt-2 font-semibold">Investigation Room</h3>
                <p className="mt-1 text-xs text-gray-500">Use the Investigation section above to send a named test.</p>
              </div>
              <button onClick={referOptician} disabled={isPending || requesting === "optician"} className="rounded-2xl border p-4 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50">
                {requesting === "optician" ? <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> : <Hospital className="h-5 w-5 text-blue-600" />}
                <h3 className="mt-2 font-semibold">Optician</h3>
                <p className="mt-1 text-xs text-gray-500">Send the patient to the Optician queue after a completed Optometry assessment.</p>
              </button>
            </div>
          </Section>

          <Section id="results" title="Results / feedback" icon={<CheckCircle2 className="h-5 w-5" />}>
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 font-semibold">Investigation results</h3>
                {patient.diagnostics?.length ? (
                  <div className="space-y-2">
                    {patient.diagnostics.map((item) => (
                      <div key={item.id} className="rounded-xl border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">Status: {item.status}</p>
                          </div>
                          {item.completedAt && <span className="text-xs text-gray-500">{formatDate(item.completedAt)}</span>}
                        </div>
                        {(item.findings || item.interpretation) && (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg bg-gray-50 p-3 text-sm"><strong>Findings:</strong> {item.findings || "—"}</div>
                            <div className="rounded-lg bg-gray-50 p-3 text-sm"><strong>Interpretation:</strong> {item.interpretation || "—"}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-gray-500">No investigation results yet.</p>
                )}
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Laboratory results</h3>
                {patient.laboratoryResults?.length ? (
                  <div className="space-y-2">
                    {patient.laboratoryResults.map((item) => (
                      <div key={item.id} className="rounded-xl border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-medium">{item.testName}</p>
                          <span className="text-xs text-green-700">Verified {formatDate(item.verifiedAt)}</span>
                        </div>
                        <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs">{resultText(item.resultData)}</pre>
                        {item.laboratoryComments && <p className="mt-2 text-sm text-gray-600">Lab comment: {item.laboratoryComments}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-gray-500">No verified laboratory results yet.</p>
                )}
              </div>

              {optometryResult?.previousOptometryEncounter && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Optometry result / feedback</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div><p className="text-xs text-violet-600">Visual acuity</p><p className="text-sm font-medium">{optometryResult.previousOptometryEncounter.visualAcuityOD || "—"} OD · {optometryResult.previousOptometryEncounter.visualAcuityOS || "—"} OS · {optometryResult.previousOptometryEncounter.visualAcuityOU || "—"} OU</p></div>
                    <div><p className="text-xs text-violet-600">Clinical impression</p><p className="text-sm font-medium">{optometryResult.previousOptometryEncounter.diagnosis || "—"}</p></div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-white/70 p-3 text-sm"><strong>Refraction OD:</strong> {resultText(optometryResult.previousOptometryEncounter.refractionOD)}</div>
                    <div className="rounded-lg bg-white/70 p-3 text-sm"><strong>Refraction OS:</strong> {resultText(optometryResult.previousOptometryEncounter.refractionOS)}</div>
                  </div>
                </div>
              )}

              {latestEncounter && (
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Previous consultation</p>
                  <p className="mt-1 text-sm">Last recorded: {formatDate(latestEncounter.createdAt)} • {latestEncounter.diagnosis || "No diagnosis recorded"}</p>
                </div>
              )}
            </div>
          </Section>

          <Section id="appointment" title="Appointment" icon={<Calendar className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Preferred date</span>
                <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Preferred time</span>
                <input type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className={inputClass} />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => router.push(`/appointments?patientCode=${encodeURIComponent(patientCode)}&date=${encodeURIComponent(appointmentDate)}&time=${encodeURIComponent(appointmentTime)}`)}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Open Appointment Booking
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">The appointment module remains the source of truth for booking and scheduling.</p>
          </Section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold">Consultation {savedStatus === "completed" ? "completed" : "in progress"}</p>
              <p className="text-xs text-gray-500">Save your documentation before leaving this page.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push("/doctor")} className="rounded-xl border px-4 py-2.5 text-sm font-medium">
                Back to Doctor Dashboard
              </button>
              <button onClick={() => save("completed")} disabled={isPending} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {isPending ? "Saving..." : "Complete Consultation"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
