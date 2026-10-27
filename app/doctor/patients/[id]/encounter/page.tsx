"use client";

import React, { useEffect, useState, useTransition } from "react";
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
import { createClinicalHandoff } from "@/app/actions/clinical-handoffs";

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
  historyProforma?: Record<string, { selected: string[]; notes: string }>;
  refractionNotes?: string;
  lensType?: string;
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
  { code: "HBA1C", name: "Glycated Haemoglobin (HbA1c)", specimenType: "Blood" },
];

const INVESTIGATION_REQUESTS: DiagnosticRequest[] = [
  { name: "Perimetry", price: 12000 },
  { name: "OCT Macula", price: 18000 },
  { name: "OCT RNFL / ONH", price: 18000 },
  { name: "Pachymetry", price: 0 },
  { name: "Keratometry K1/K2", price: 0 },
  { name: "B-scan", price: 0 },
  { name: "A-scan", price: 0 },
  { name: "Fundus Photograph", price: 9000 },
  { name: "Autorefraction", price: 0 },
];

const HISTORY_SECTIONS = [
  { key: "presentingComplaints", title: "Presenting complaints and duration", options: ["Poor vision", "Pain", "Redness", "Itching", "Discharge", "Tearing", "Photophobia", "Flashes / floaters", "Diplopia", "Trauma", "Right eye", "Left eye", "Both eyes", "<1 day", "1–7 days", "1–4 weeks", "1–6 months", ">6 months"] },
  { key: "historyOfPresentingComplaints", title: "History of presenting complaints", options: ["Onset: Sudden", "Onset: Gradual", "Course: Improving", "Course: Stable", "Course: Worsening", "Course: Recurrent", "Vision affected: Distance", "Vision affected: Near", "Vision affected: Both", "Vision affected: Not affected", "Treatment tried: None", "Treatment tried: Eye drops", "Treatment tried: Glasses", "Treatment tried: Traditional remedy", "Treatment tried: Other"] },
  { key: "pastMedicalHistory", title: "Past medical history", options: ["Condition: None known", "Condition: Hypertension", "Condition: Diabetes", "Condition: Asthma", "Condition: Other", "Medicine: None", "Medicine: Antihypertensives", "Medicine: Diabetes medicines", "Medicine: Steroids", "Medicine: Other", "Drug allergy: None known", "Drug allergy: Yes", "Drug allergy: Unknown"] },
  { key: "pastOcularHistory", title: "Past ocular history", options: ["History: None known", "History: Glasses", "History: Eye injury", "History: Glaucoma", "History: Other", "Procedure: None", "Procedure: Surgery", "Procedure: Laser", "Procedure: Injection", "Eye drops: None", "Eye drops: Glaucoma drops", "Eye drops: Steroid drops", "Eye drops: Other"] },
  { key: "familySocialHistory", title: "Family and social history", options: ["Family illness: None known", "Family illness: Hypertension", "Family illness: Diabetes", "Family illness: Other", "Family illness: Unknown", "Smoking: Never", "Smoking: Past", "Smoking: Current", "Alcohol: None", "Alcohol: Past", "Alcohol: Current"] },
  { key: "familyOcularHistory", title: "Family ocular history", options: ["Eye conditions: None known", "Eye conditions: Glaucoma", "Eye conditions: Blindness", "Eye conditions: Cataract", "Eye conditions: Other", "Relative: Parent", "Relative: Sibling", "Relative: Child", "Relative: Other", "Relative: Not applicable"] },
] as const;

const OCULAR_PARTS = [
  "Lid", "Globe", "Extraocular muscle movement", "Conjunctiva", "Cornea",
  "Anterior chamber", "Pupil", "Lens", "Vitreous", "Fundus",
] as const;

type EyeExamRows = Record<string, { penlight: string; slitLamp: string }>;
const emptyEyeExam = (): EyeExamRows => Object.fromEntries(
  OCULAR_PARTS.map((part) => [part, { penlight: "", slitLamp: "" }])
);
function parseEyeExam(value?: string, legacySlitLamp?: string): EyeExamRows {
  const rows = emptyEyeExam();
  if (value) {
    try {
      const parsed = JSON.parse(value) as Record<string, { penlight?: string; slitLamp?: string }>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const part of OCULAR_PARTS) {
          if (parsed[part]) rows[part] = { penlight: parsed[part].penlight ?? "", slitLamp: parsed[part].slitLamp ?? "" };
        }
      } else {
        rows.Lid.penlight = value;
      }
    } catch {
      rows.Lid.penlight = value;
    }
  }
  if (legacySlitLamp) {
    try {
      const parsed = JSON.parse(legacySlitLamp) as Record<string, { penlight?: string; slitLamp?: string }>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const part of OCULAR_PARTS) if (parsed[part]) rows[part].slitLamp = parsed[part].slitLamp ?? rows[part].slitLamp;
      } else rows.Lid.slitLamp = legacySlitLamp;
    } catch { rows.Lid.slitLamp = legacySlitLamp; }
  }
  return rows;
}

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

function formatOptometryRefraction(
  value: unknown,
  method: "objective" | "subjective",
): string {
  if (!value || typeof value !== "object") return "—";

  const record = value as Record<string, unknown>;
  const selected = record[method];

  // Older records stored a single refraction set; display it as subjective.
  const values =
    selected && typeof selected === "object"
      ? (selected as Record<string, unknown>)
      : method === "subjective" && "sphere" in record
        ? record
        : null;

  if (!values) return "—";

  const fields = [
    ["Sphere", values.sphere],
    ["Cylinder", values.cylinder],
    ["Axis", values.axis],
    ["Add", values.add],
  ] as const;

  const summary = fields
    .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== "")
    .map(([label, fieldValue]) => `${label}: ${String(fieldValue)}`);

  return summary.length ? summary.join(" · ") : "—";
}

export default function DoctorEncounterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientCode = params?.id ?? "";
  const [isPending, startTransition] = useTransition();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loadedPatientCode, setLoadedPatientCode] = useState<string | null>(null);
  const loading = Boolean(patientCode) && loadedPatientCode !== patientCode;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedStatus, setSavedStatus] = useState<"draft" | "completed">("draft");
  const [encounterId, setEncounterId] = useState<string | undefined>(undefined);

  const [presentingComplaint, setPresentingComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [pastOcularHistory, setPastOcularHistory] = useState("");
  const [familyOcularHistory, setFamilyOcularHistory] = useState("");
  const [historyProforma, setHistoryProforma] = useState<Record<string, { selected: string[]; notes: string }>>({});
  const [ocularExamODRows, setOcularExamODRows] = useState<EyeExamRows>(() => emptyEyeExam());
  const [ocularExamOSRows, setOcularExamOSRows] = useState<EyeExamRows>(() => emptyEyeExam());
  const [refractionNotes, setRefractionNotes] = useState("");
  const [lensType, setLensType] = useState("");
  const [supplierWhatsApp, setSupplierWhatsApp] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierContacts, setSupplierContacts] = useState<Array<{ name: string; phone: string }>>([]);
  const [followUpInterval, setFollowUpInterval] = useState("7");
  const [followUpUnit, setFollowUpUnit] = useState<"days" | "months">("days");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [procedureDetails, setProcedureDetails] = useState("");
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

  const [prescriptionText, setPrescriptionText] = useState("");

  const [requesting, setRequesting] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [optometryResult, setOptometryResult] = useState<{
    previousOptometryEncounter?: {
      status?: string | null;
      visualAcuityOD?: string | null;
      visualAcuityOS?: string | null;
      visualAcuityOU?: string | null;
      diagnosis?: string | null;
      refractionOD?: unknown;
      refractionOS?: unknown;
    } | null;
  } | null>(null);

  const latestEncounter = patient?.encounters?.[0];
  const optometryAssessmentCompleted =
    optometryResult?.previousOptometryEncounter?.status === "completed";

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sparkle-eye-supplier-contacts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate optional browser-only shortcuts from localStorage.
          setSupplierContacts(parsed.filter((item) => item && typeof item.name === "string" && typeof item.phone === "string"));
        }
      }
    } catch {
      // Supplier shortcuts are optional; manual entry remains available.
    }
  }, []);

  useEffect(() => {
    if (!patientCode) return;

    let cancelled = false;
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
          // Continue editing a draft in place. A completed encounter is
          // historical, so the next save starts a new encounter.
          setEncounterId(
            encounter.status === "draft" ? encounter.id : undefined
          );
          setPresentingComplaint(encounter.presentingComplaint ?? "");
          setHpi(encounter.historyOfPresentingComplaint ?? "");
          setPastMedicalHistory(encounter.pastMedicalHistory ?? "");
          setPastOcularHistory(encounter.pastOcularHistory ?? "");
          setFamilyOcularHistory(encounter.familyOcularHistory ?? "");
          const savedProforma = encounter.historyProforma ?? {};
          setHistoryProforma(Object.keys(savedProforma).length > 0 ? savedProforma : {
            presentingComplaints: { selected: [], notes: encounter.presentingComplaint ?? "" },
            historyOfPresentingComplaints: { selected: [], notes: encounter.historyOfPresentingComplaint ?? "" },
            pastMedicalHistory: { selected: [], notes: encounter.pastMedicalHistory ?? "" },
            pastOcularHistory: { selected: [], notes: encounter.pastOcularHistory ?? "" },
            familyOcularHistory: { selected: [], notes: encounter.familyOcularHistory ?? "" },
          });
          setRefractionNotes(encounter.refractionNotes ?? "");
          setLensType(encounter.lensType ?? "");
          setOcularExamODRows(parseEyeExam(encounter.ocularExamOD, encounter.slitLampOD));
          setOcularExamOSRows(parseEyeExam(encounter.ocularExamOS, encounter.slitLampOS));
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
          setHistoryProforma({
            presentingComplaints: { selected: [], notes: data.vitals.primaryComplaint },
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load patient.");
      })
      .finally(() => {
        if (!cancelled) setLoadedPatientCode(patientCode);
      });

    return () => {
      cancelled = true;
    };
  }, [patientCode]);

  const save = (status: "draft" | "completed") => {
    setMessage("");
    setError("");

    if (
      savedStatus === "completed" &&
      status === "completed" &&
      !encounterId
    ) {
      setError(
        "This encounter is already completed. Save as draft to begin a new consultation, or refresh to review the latest record."
      );
      return;
    }

    if (status === "completed" && !diagnosis.trim()) {
      setError("Enter a diagnosis before completing the consultation.");
      document.getElementById("diagnosis")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    startTransition(async () => {
      const response = await saveConsultationEncounter({
        patientId: patientCode,
        encounterId,
        presentingComplaint: historyText("presentingComplaints"),
        historyOfPresentingComplaint: historyText("historyOfPresentingComplaints"),
        pastMedicalHistory: historyText("pastMedicalHistory"),
        pastOcularHistory: historyText("pastOcularHistory"),
        familyOcularHistory: historyText("familyOcularHistory"),
        historyProforma,
        refractionNotes,
        lensType,
        ocularExamOD: JSON.stringify(ocularExamODRows),
        ocularExamOS: JSON.stringify(ocularExamOSRows),
        slitLampOD: "",
        slitLampOS: "",
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
      setEncounterId(status === "draft" ? response.encounterId : undefined);
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
        // Some failures happen after the order row is already created.
        // Refresh when an ID is returned so the doctor can see that order
        // and avoid retrying blindly.
        if (response.id) await refreshPatient();
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
        if (response.id) await refreshPatient();
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
      if (!response.success) {
        setError(response.message);
      } else {
        setMessage(response.message);
        await refreshPatient();
        try {
          const optometry = await getOptometryPatient(patientCode);
          if (optometry.success) {
            setOptometryResult(optometry.patient ?? null);
          }
        } catch {
          setOptometryResult(null);
        }
      }
      setRequesting("");
    });
  };

  const referOptician = () => {
    setRequesting("optician");
    setMessage("");
    setError("");

    startTransition(async () => {
      // Persist the current clinical notes before handing the optical
      // order to Optician, so lens type and refraction notes survive a
      // refresh even when the doctor has not clicked Save separately.
      const saved = await saveConsultationEncounter({
        patientId: patientCode,
        encounterId,
        presentingComplaint: historyText("presentingComplaints"),
        historyOfPresentingComplaint: historyText("historyOfPresentingComplaints"),
        pastMedicalHistory: historyText("pastMedicalHistory"),
        pastOcularHistory: historyText("pastOcularHistory"),
        familyOcularHistory: historyText("familyOcularHistory"),
        historyProforma,
        refractionNotes,
        lensType,
        ocularExamOD: JSON.stringify(ocularExamODRows),
        ocularExamOS: JSON.stringify(ocularExamOSRows),
        slitLampOD: "",
        slitLampOS: "",
        otherExaminationFindings: otherFindings,
        iopOD: iopOD.trim() ? Number(iopOD) : null,
        iopOS: iopOS.trim() ? Number(iopOS) : null,
        iopInstrument,
        refractionOD,
        refractionOS,
        diagnosis,
        treatmentPlan,
        status: "draft",
      });

      if (!saved.success || !saved.encounterId) {
        setError(saved.message || "Save the consultation notes before sending the optical order.");
        setRequesting("");
        return;
      }

      setEncounterId(saved.encounterId);
      const response = await createOpticalOrder(patientCode, { lensType, refractionNotes });
      if (!response.success) {
        setError(response.message);
        if (response.orderId) await refreshPatient();
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

    if (!prescriptionText.trim()) {
      setError("Enter the prescription instructions before sending to Pharmacy.");
      return;
    }

    if (prescriptionText.trim().length > 5000) {
      setError("The prescription must be 5,000 characters or fewer.");
      return;
    }

    startTransition(async () => {
      const response = await createPrescription({
        patientCode,
        prescriptionText: prescriptionText.trim(),
      });

      if (!response.success) {
        setError(response.message);
        if (response.id) await refreshPatient();
        return;
      }

      setMessage(response.message);
      setPrescriptionText("");
      await refreshPatient();
    });
  };

  const historyText = (key: string) => {
    const section = historyProforma[key];
    return [...(section?.selected ?? []), section?.notes?.trim() ?? ""].filter(Boolean).join("; ");
  };

  const updateHistorySection = (key: string, update: Partial<{ selected: string[]; notes: string }>) => {
    setHistoryProforma((current) => ({
      ...current,
      [key]: { selected: current[key]?.selected ?? [], notes: current[key]?.notes ?? "", ...update },
    }));
  };

  const saveSupplierContact = () => {
    const name = supplierName.trim();
    const phone = supplierWhatsApp.replace(/\D/g, "");
    if (!name) { setError("Enter a supplier name before saving this contact."); return; }
    if (!phone) { setError("Enter the supplier WhatsApp number, including country code."); return; }
    const updated = [...supplierContacts.filter((contact) => contact.phone !== phone), { name, phone }];
    setSupplierContacts(updated);
    try {
      window.localStorage.setItem("sparkle-eye-supplier-contacts", JSON.stringify(updated));
    } catch {
      setError("Supplier contact could not be saved in this browser. You can still use the number for this message.");
      return;
    }
    setMessage(`Supplier contact saved: ${name}.`);
    setError("");
  };

  const sendSupplierWhatsApp = () => {
    const phone = supplierWhatsApp.replace(/\D/g, "");
    if (!phone) { setError("Enter the supplier's WhatsApp number, including country code."); return; }
    const messageText = [
      "Sparkle Eye Hospital — Lens Order",
      `Patient reference: ${patient?.patientId ?? patientCode}`,
      `Lens type: ${lensType || "To be confirmed"}`,
      `OD objective: ${completedOptometryEncounter ? formatOptometryRefraction(completedOptometryEncounter.refractionOD, "objective") : "Not recorded"}`,
      `OD subjective: ${completedOptometryEncounter ? formatOptometryRefraction(completedOptometryEncounter.refractionOD, "subjective") : "Not recorded"}`,
      `OS objective: ${completedOptometryEncounter ? formatOptometryRefraction(completedOptometryEncounter.refractionOS, "objective") : "Not recorded"}`,
      `OS subjective: ${completedOptometryEncounter ? formatOptometryRefraction(completedOptometryEncounter.refractionOS, "subjective") : "Not recorded"}`,
      `Notes: ${refractionNotes || "None"}`,
      "Please confirm availability and quotation before processing.",
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`, "_blank", "noopener,noreferrer");
  };

  const sendHandoff = (input: Parameters<typeof createClinicalHandoff>[0]) => {
    setMessage("");
    setError("");
    setRequesting("handoff-" + input.handoffType);
    startTransition(async () => {
      const response = await createClinicalHandoff(input);
      if (!response.success) setError(response.message);
      else setMessage(response.message);
      setRequesting("");
    });
  };

  const completedOptometryEncounter = optometryAssessmentCompleted
    ? optometryResult?.previousOptometryEncounter ?? null
    : null;

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
              ["iop", "IOP"],
              ["diagnosis", "Diagnosis"],
              ["treatment", "Treatment / plan"],
              ["refraction-notes", "Refraction result and lens instructions"],
              ["investigation", "Investigation"],
              ["procedure-request", "Procedure request"],
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
                {patient.vitals.primaryComplaint?.trim() &&
                  patient.vitals.primaryComplaint.trim().toLowerCase() !== "not recorded" && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Presenting complaint from triage</p>
                      <p className="mt-1 text-sm text-blue-950">{patient.vitals.primaryComplaint}</p>
                    </div>
                  )}
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
                  ]
                    .filter(([, value]) => {
                      const displayValue = value == null ? "" : String(value).trim();
                      return displayValue !== "" && displayValue !== "—" && displayValue !== "-";
                    })
                    .map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="mt-1 text-sm font-medium">{value}</p>
                      </div>
                    ))}
                </div>
                {(patient.vitals.symptoms?.length || patient.vitals.durationText?.trim()) && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {patient.vitals.symptoms && patient.vitals.symptoms.length > 0 && (
                      <div className="rounded-xl border p-4">
                        <p className="text-xs font-semibold text-gray-500">Symptoms</p>
                        <p className="mt-1 text-sm">{patient.vitals.symptoms.join(", ")}</p>
                      </div>
                    )}
                    {patient.vitals.durationText?.trim() && (
                      <div className="rounded-xl border p-4">
                        <p className="text-xs font-semibold text-gray-500">Duration</p>
                        <p className="mt-1 text-sm">{patient.vitals.durationText}</p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500">Recorded {formatDate(patient.vitals.recordedAt)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No nurse documentation is available yet.</p>
            )}
          </Section>

          <Section id="history" title="Ophthalmology history proforma" icon={<ClipboardList className="h-5 w-5" />}>
            <p className="mb-4 text-sm text-gray-500">Select every applicable option in each section. Add details in the notes field; multiple options may be selected.</p>
            <div className="space-y-5">
              {HISTORY_SECTIONS.map((section) => {
                const value = historyProforma[section.key] ?? { selected: [], notes: "" };
                return (
                  <div key={section.key} className="rounded-xl border p-4">
                    <h3 className="mb-3 font-semibold">{section.title}</h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {section.options.map((option) => (
                        <label key={option} className="flex cursor-pointer items-start gap-2 rounded-lg bg-gray-50 p-2.5 text-sm">
                          <input type="checkbox" checked={value.selected.includes(option)} onChange={(event) => updateHistorySection(section.key, { selected: event.target.checked ? [...value.selected, option] : value.selected.filter((item) => item !== option) })} className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Field label="Additional notes / duration / treatment tried" value={value.notes} onChange={(notes) => updateHistorySection(section.key, { notes })} rows={2} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section id="exam" title="Combined ocular examination — penlight and slit lamp" icon={<Stethoscope className="h-5 w-5" />}>
            <p className="mb-4 text-sm text-gray-500">Record findings for each ocular part. Penlight and slit-lamp findings are grouped in one examination table.</p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="bg-gray-50"><tr><th className="border-b p-3 text-left">Right eye (OD)</th><th className="border-b p-3 text-left">Ocular parts</th><th className="border-b p-3 text-left">Left eye (OS)</th></tr></thead>
                <tbody>
                  {OCULAR_PARTS.map((part) => (
                    <tr key={part} className="align-top">
                      <td className="w-[40%] border-b p-3"><div className="space-y-2"><label className="block text-xs font-medium text-gray-500">Penlight</label><textarea rows={2} value={ocularExamODRows[part]?.penlight ?? ""} onChange={(e) => setOcularExamODRows((current) => ({ ...current, [part]: { ...current[part], penlight: e.target.value } }))} className={inputClass} aria-label={`OD ${part} penlight findings`} /><label className="block text-xs font-medium text-gray-500">Slit lamp</label><textarea rows={2} value={ocularExamODRows[part]?.slitLamp ?? ""} onChange={(e) => setOcularExamODRows((current) => ({ ...current, [part]: { ...current[part], slitLamp: e.target.value } }))} className={inputClass} aria-label={`OD ${part} slit lamp findings`} /></div></td>
                      <th scope="row" className="border-b bg-gray-50/70 p-3 text-left font-semibold">{part}</th>
                      <td className="w-[40%] border-b p-3"><div className="space-y-2"><label className="block text-xs font-medium text-gray-500">Penlight</label><textarea rows={2} value={ocularExamOSRows[part]?.penlight ?? ""} onChange={(e) => setOcularExamOSRows((current) => ({ ...current, [part]: { ...current[part], penlight: e.target.value } }))} className={inputClass} aria-label={`OS ${part} penlight findings`} /><label className="block text-xs font-medium text-gray-500">Slit lamp</label><textarea rows={2} value={ocularExamOSRows[part]?.slitLamp ?? ""} onChange={(e) => setOcularExamOSRows((current) => ({ ...current, [part]: { ...current[part], slitLamp: e.target.value } }))} className={inputClass} aria-label={`OS ${part} slit lamp findings`} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4"><Field label="Other examination notes" value={otherFindings} onChange={setOtherFindings} rows={3} /></div>
          </Section>

          <Section id="gonioscopy" title="Gonioscopy" icon={<Activity className="h-5 w-5" />}>
            <p className="mb-4 text-sm text-gray-500">
              Record the gonioscopy findings for each eye. These findings are saved to the patient&apos;s clinical record.
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

          <Section id="treatment" title="Treatment / plan" icon={<Pill className="h-5 w-5" />}>
            <div className="space-y-4">
              <Field label="Treatment and follow-up plan" value={treatmentPlan} onChange={setTreatmentPlan} rows={5} />
              <div className="rounded-2xl border p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Prescription</h3>
                    <p className="text-xs text-gray-500">Write the prescription in plain language. Pharmacy will review the request, select the medication, and confirm quantity and price before billing.</p>
                  </div>
                </div>
                <label htmlFor="prescription-text" className="mb-1.5 block text-sm font-medium text-gray-700">Prescription instructions</label>
                <textarea id="prescription-text" value={prescriptionText} onChange={(e) => setPrescriptionText(e.target.value)} maxLength={5000} rows={5} placeholder="Enter medication name(s), strength, dose, route, frequency, duration, and any special instructions..." className={`${inputClass} min-h-32 w-full resize-y`} />
                <p className="mt-1 text-xs text-gray-500">Do not enter prices here. The pharmacist will confirm the dispensed medication and approved price.</p>
                <button onClick={prescribe} disabled={isPending || !prescriptionText.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                  <Send className="h-4 w-4" /> Send Prescription to Pharmacy
                </button>
              </div>
            </div>
          </Section>

          

<Section id="refraction-notes" title="Refraction result and lens instructions" icon={<ClipboardList className="h-5 w-5" />}>
            <p className="mb-4 text-sm text-gray-500">Review the optometry result above where available, record the lens type and instructions, then send the order to the Optician. Supplier messages open in WhatsApp for staff review and manual sending.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Lens type" value={lensType} onChange={setLensType} rows={2} placeholder="e.g. single vision, bifocal or progressive, according to the prescription" />
              <Field label="Refraction / lens notes" value={refractionNotes} onChange={setRefractionNotes} rows={2} placeholder="Document prescribed lens material, coatings or dispensing instructions." />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={referOptician} disabled={isPending || requesting === "optician" || !optometryAssessmentCompleted} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-4 w-4" />{requesting === "optician" ? "Sending..." : "Send prescription to Optician"}</button>
              {!optometryAssessmentCompleted && <p className="self-center text-xs text-amber-700">The Optometrist must complete the refraction assessment before an optical order can be created.</p>}
            </div>
            <div className="mt-5 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <label htmlFor="saved-supplier" className="mb-2 block text-sm font-medium text-gray-700">Choose a saved supplier</label>
                <select id="saved-supplier" value={supplierContacts.some((contact) => contact.phone === supplierWhatsApp) ? supplierWhatsApp : ""} onChange={(event) => { const contact = supplierContacts.find((item) => item.phone === event.target.value); setSupplierWhatsApp(contact?.phone ?? ""); setSupplierName(contact?.name ?? ""); }} className={inputClass + " min-h-11"}>
                  <option value="">Enter a new supplier below</option>
                  {supplierContacts.map((contact) => <option key={contact.phone} value={contact.phone}>{contact.name} (+{contact.phone})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="supplier-name" className="mb-2 block text-sm font-medium text-gray-700">Supplier name</label>
                  <input id="supplier-name" type="text" autoComplete="organization" value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="e.g. Preferred lens supplier" className={inputClass + " h-11"} />
                </div>
                <div>
                  <label htmlFor="supplier-whatsapp" className="mb-2 block text-sm font-medium text-gray-700">Supplier WhatsApp number (include country code)</label>
                  <input id="supplier-whatsapp" type="tel" inputMode="tel" autoComplete="tel" value={supplierWhatsApp} onChange={(event) => setSupplierWhatsApp(event.target.value)} placeholder="e.g. 2348012345678" className={inputClass + " h-11"} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={saveSupplierContact} className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Save supplier</button>
                <button type="button" onClick={sendSupplierWhatsApp} className="min-h-11 rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-50">Prepare supplier WhatsApp</button>
              </div>
              <p className="text-xs text-gray-600">Saved supplier shortcuts stay in this browser only. WhatsApp opens with a prepared message; staff must review it and press Send.</p>
            </div>
          </Section>

          

<Section id="investigation" title="Investigation" icon={<TestTube2 className="h-5 w-5" />}>
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Refraction → Optometrist</h3>
                    <p className="text-xs text-gray-500">Completed refraction results return here automatically from the Optometry assessment.</p>
                  </div>
                  {optometryAssessmentCompleted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                </div>
                {optometryAssessmentCompleted && completedOptometryEncounter ? (
                  <div className="space-y-3">
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        { eye: "OD", result: completedOptometryEncounter.refractionOD },
                        { eye: "OS", result: completedOptometryEncounter.refractionOS },
                      ].map(({ eye, result }) => (
                        <div key={eye} className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                          <p className="mb-3 text-sm font-semibold">{eye} — {eye === "OD" ? "Right eye" : "Left eye"}</p>
                          <p className="text-sm"><strong>Objective:</strong> {formatOptometryRefraction(result, "objective")}</p>
                          <p className="mt-2 text-sm"><strong>Subjective:</strong> {formatOptometryRefraction(result, "subjective")}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-col items-start">
                      <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Optometry assessment completed</span>
                      </span>
                      <button type="button" onClick={async () => {
                        setRequesting("refresh-optometry");
                        setError("");
                        try {
                          const result = await getOptometryPatient(patientCode);
                          if (!result.success) throw new Error(result.message || "Unable to refresh Optometry results.");
                          setOptometryResult(result.patient ?? null);
                          setMessage("Optometry results refreshed.");
                        } catch (refreshError) {
                          setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh Optometry results.");
                        } finally {
                          setRequesting("");
                        }
                      }} disabled={requesting === "refresh-optometry"} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                        {requesting === "refresh-optometry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                        Refresh Optometry results
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4">
                    <p className="text-sm text-gray-600">No completed Optometry refraction result is available yet. OD and OS will populate automatically when the Optometrist saves and completes the assessment.</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button onClick={referOptometry} disabled={isPending || requesting === "optometry"} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                        {requesting === "optometry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send Refraction Request to Optometrist
                      </button>
                      <button type="button" onClick={async () => {
                        setRequesting("refresh-optometry");
                        setError("");
                        try {
                          const result = await getOptometryPatient(patientCode);
                          if (!result.success) throw new Error(result.message || "Unable to refresh Optometry results.");
                          setOptometryResult(result.patient ?? null);
                          setMessage(result.patient?.previousOptometryEncounter?.status === "completed" ? "Completed Optometry results loaded." : "No completed Optometry result is available yet.");
                        } catch (refreshError) {
                          setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh Optometry results.");
                        } finally {
                          setRequesting("");
                        }
                      }} disabled={requesting === "refresh-optometry"} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                        {requesting === "refresh-optometry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                        Refresh Optometry results
                      </button>
                    </div>
                  </div>
                )}
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

          <Section id="procedure-request" title="Procedure request" icon={<Calendar className="h-5 w-5" />}>
            <p className="mb-4 text-sm text-gray-500">Send a procedure request to Reception for registration, pricing confirmation and scheduling. Do not enter an unapproved price here.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Procedure requested" value={procedureName} onChange={setProcedureName} rows={2} placeholder="Enter the procedure name" />
              <Field label="Clinical instructions / indication" value={procedureDetails} onChange={setProcedureDetails} rows={2} placeholder="Document the clinical indication and relevant instructions." />
            </div>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => sendHandoff({ patientCode, encounterId, destination: "RECEPTIONIST", handoffType: "PROCEDURE", title: procedureName.trim(), details: procedureDetails.trim() || "Please review and arrange this procedure request." })} disabled={isPending || !procedureName.trim() || requesting === "handoff-PROCEDURE"} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-4 w-4" />{requesting === "handoff-PROCEDURE" ? "Sending..." : "Send procedure to Reception"}</button></div>
          </Section>

          <Section id="requests" title="Clinical requests" icon={<Send className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <FlaskConical className="h-5 w-5 text-blue-600" />
                <h3 className="mt-2 font-semibold">Laboratory</h3>
                <p className="mt-1 text-xs text-gray-500">Orders are sent directly into the Laboratory queue.</p>
              </div>
              <div
                aria-disabled="true"
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left"
              >
                <Wallet className="h-5 w-5 text-gray-400" />
                <h3 className="mt-2 font-semibold text-gray-700">Cashier</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Billing and payments are handled by the Cashier. Doctors cannot open the cashier workflow.
                </p>
              </div>
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
              <button onClick={referOptician} disabled={isPending || requesting === "optician" || !optometryAssessmentCompleted} className="rounded-2xl border p-4 text-left hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
                {requesting === "optician" ? <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> : <Hospital className="h-5 w-5 text-blue-600" />}
                <h3 className="mt-2 font-semibold">Optician</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {optometryAssessmentCompleted
                    ? "Review the optometry results above, then forward the patient to the Optician queue."
                    : "Available after the Optometrist completes and sends the assessment to the doctor."}
                </p>
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

              {optometryAssessmentCompleted && optometryResult?.previousOptometryEncounter && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Optometry result / feedback</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div><p className="text-xs text-violet-600">Visual acuity</p><p className="text-sm font-medium">{optometryResult.previousOptometryEncounter.visualAcuityOD || "—"} OD · {optometryResult.previousOptometryEncounter.visualAcuityOS || "—"} OS · {optometryResult.previousOptometryEncounter.visualAcuityOU || "—"} OU</p></div>
                    <div><p className="text-xs text-violet-600">Clinical impression</p><p className="text-sm font-medium">{optometryResult.previousOptometryEncounter.diagnosis || "—"}</p></div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-white/70 p-3 text-sm">
                      <p className="font-semibold">Right eye (OD)</p>
                      <p className="mt-1"><strong>Objective:</strong> {formatOptometryRefraction(optometryResult.previousOptometryEncounter.refractionOD, "objective")}</p>
                      <p className="mt-1"><strong>Subjective:</strong> {formatOptometryRefraction(optometryResult.previousOptometryEncounter.refractionOD, "subjective")}</p>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3 text-sm">
                      <p className="font-semibold">Left eye (OS)</p>
                      <p className="mt-1"><strong>Objective:</strong> {formatOptometryRefraction(optometryResult.previousOptometryEncounter.refractionOS, "objective")}</p>
                      <p className="mt-1"><strong>Subjective:</strong> {formatOptometryRefraction(optometryResult.previousOptometryEncounter.refractionOS, "subjective")}</p>
                    </div>
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
                      <div className="mt-6 border-t pt-5">
              <h3 className="font-semibold text-gray-900">Request follow-up appointment</h3>
              <p className="mt-1 text-sm text-gray-500">This sends the requested interval to Reception. Reception confirms the actual booking with the patient.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700">Follow up in</span><input type="number" min="1" max="120" step="1" value={followUpInterval} onChange={(e) => setFollowUpInterval(e.target.value)} className={inputClass} /></label>
                <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700">Interval unit</span><select value={followUpUnit} onChange={(e) => setFollowUpUnit(e.target.value as "days" | "months")} className={inputClass}><option value="days">Days</option><option value="months">Months</option></select></label>
                <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700">Preferred time (optional)</span><input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} className={inputClass} /></label>
              </div>
              <div className="mt-3"><Field label="Follow-up instructions / reason" value={followUpNotes} onChange={setFollowUpNotes} rows={2} placeholder="e.g. review response to treatment, repeat IOP..." /></div>
              <div className="mt-3 flex justify-end"><button type="button" onClick={() => sendHandoff({ patientCode, encounterId, destination: "RECEPTIONIST", handoffType: "FOLLOW_UP", title: "Follow-up appointment request", details: followUpNotes.trim() || "Please arrange the doctor's requested follow-up appointment.", intervalValue: Number(followUpInterval), intervalUnit: followUpUnit, preferredTime: followUpTime })} disabled={isPending || !Number.isInteger(Number(followUpInterval)) || Number(followUpInterval) < 1 || Number(followUpInterval) > 120 || requesting === "handoff-FOLLOW_UP"} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Calendar className="h-4 w-4" />{requesting === "handoff-FOLLOW_UP" ? "Sending..." : "Send follow-up to Reception"}</button></div>
            </div>
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
