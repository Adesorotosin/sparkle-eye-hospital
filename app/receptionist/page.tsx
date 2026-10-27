"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getProcedurePriceCatalog, getRecentProcedures, registerProcedure } from "@/app/actions/procedures";
import { createExternalDiagnosticOrder } from "@/app/actions/clinical-orders";
import { createLabOrder } from "@/app/actions/lab-orders";
import { registerVisitingOptometryPatient } from "@/app/actions/optometry";
import ClinicalHandoffInbox from "@/components/ClinicalHandoffInbox";
import { createPatientVisitRoute, type VisitDestination } from "@/app/actions/patient-visit-routing";

type Patient = {
  id: string;
  patientId: string;
  registrationNumber?: string | null;
  fullName: string;
  coveragePlan?: string | null;
  age?: number | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  nextOfKin?: string | null;
  nextOfKinPhone?: string | null;
  status?: string | null;
  isWalkIn?: boolean;
};

type Appointment = {
  id: string;
  patientName: string;
  physician: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string | null;
};

type DoctorOption = {
  id: string;
  staffId: string;
  name: string;
  role: string;
  title?: string | null;
};

type ProcedureRegistration = {
  id: string;
  procedureName: string;
  referralType: string;
  orderReference: string;
  scheduledDate?: string | null;
  price: number;
  status: string;
  patientCode: string;
  registrationNumber?: string | null;
  patientName: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return "";

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  if (age < 0) return "";

  return String(age);
}

export default function ReceptionistPage() {
  const router = useRouter();

  const [date, setDate] = useState(todayIso());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorLoadError, setDoctorLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingPatient, setSavingPatient] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [triageActionId, setTriageActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [registrationIntent, setRegistrationIntent] = useState<"general" | "medication" | "procedure">("general");
  const [visitDestination, setVisitDestination] = useState<VisitDestination>("TRIAGE");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [showVisitingInvestigationModal, setShowVisitingInvestigationModal] = useState(false);
  const [showVisitingRefractionModal, setShowVisitingRefractionModal] = useState(false);
  const [showVisitingLabModal, setShowVisitingLabModal] = useState(false);
  const [savingVisitingRequest, setSavingVisitingRequest] = useState(false);
  const [visitingInvestigationForm, setVisitingInvestigationForm] = useState({ fullName: "", age: "", gender: "", phone: "", referringCenter: "Self-presenting / walk-in", testName: "", price: "0" });
  const [visitingRefractionForm, setVisitingRefractionForm] = useState({ fullName: "", age: "", dateOfBirth: "", gender: "", phone: "", address: "", visitType: "self_presenting" as "self_presenting" | "external_referral" });
  const [visitingLabForm, setVisitingLabForm] = useState({ patientCode: "", fullName: "", age: "", sourceCenter: "Self-presenting / walk-in", contactPhone: "", sex: "", dateOfBirth: "", testCode: "", testName: "", specimenType: "Blood", price: "0", priority: "NORMAL" as "NORMAL" | "URGENT" | "STAT", clinicalNotes: "" });
  const [savingProcedure, setSavingProcedure] = useState(false);
  const [procedures, setProcedures] = useState<ProcedureRegistration[]>([]);
  const [procedurePrices, setProcedurePrices] = useState<Array<{ id: string; code: string; name: string; category: string; price: number; active: boolean }>>([]);
  const [procedureForm, setProcedureForm] = useState({
    patientCode: "",
    procedureCode: "refraction",
    scheduledDate: todayIso(),
    notes: "",
  });

  const [patientForm, setPatientForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    nextOfKin: "",
    nextOfKinPhone: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    coveragePlan: "Self-Pay",
    allergies: "",
    isWalkIn: true,
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patientName: "",
    patientId: "",
    doctorStaffId: "",
    date: todayIso(),
    startTime: "09:00",
    endTime: "09:30",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [appointmentResponse, patientResponse, doctorResponse] = await Promise.all([
        fetch(`/api/appointments?date=${encodeURIComponent(date)}`, {
          cache: "no-store",
        }),
        fetch(`/api/patients?search=${encodeURIComponent(search)}`, {
          cache: "no-store",
        }),
        fetch("/api/doctors", { cache: "no-store" }),
      ]);

      const [appointmentData, patientData, doctorData] = await Promise.all([
        appointmentResponse.json(),
        patientResponse.json(),
        doctorResponse.json(),
      ]);

      if (!doctorResponse.ok) {
        setDoctors([]);
        setDoctorLoadError(
          doctorData?.error || "Unable to load the doctor directory."
        );
      } else {
        const activeDoctors: DoctorOption[] = Array.isArray(doctorData?.doctors)
          ? doctorData.doctors
          : [];
        setDoctors(activeDoctors);
        setDoctorLoadError(
          activeDoctors.length === 0
            ? "No active doctors are available. Activate a doctor in staff management before booking."
            : ""
        );
      }

      if (!appointmentResponse.ok) {
        throw new Error(
          appointmentData?.error || "Failed to load appointments."
        );
      }

      if (!patientResponse.ok) {
        throw new Error(patientData?.error || "Failed to load patients.");
      }

      setAppointments(appointmentData.appointments ?? []);
      setPatients(patientData.patients ?? []);
      const [procedureData, priceCatalog] = await Promise.all([
        getRecentProcedures(),
        getProcedurePriceCatalog(),
      ]);
      setProcedures(procedureData.procedures ?? []);
      setProcedurePrices((priceCatalog.procedures ?? []).filter((item) => item.active));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load receptionist data."
      );
    } finally {
      setLoading(false);
    }
  }, [date, search]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadData();
      },
      search ? 300 : 0
    );

    return () => window.clearTimeout(timer);
  }, [loadData, search]);

  const stats = useMemo(() => {
    const checkedIn = appointments.filter(
      (item) => item.status === "checked_in"
    ).length;

    const completed = appointments.filter(
      (item) => item.status === "completed"
    ).length;

    const remaining = appointments.filter(
      (item) => !["completed", "cancelled"].includes(item.status)
    ).length;

    return {
      total: appointments.length,
      checkedIn,
      completed,
      remaining,
    };
  }, [appointments]);

  const notify = (message: string) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 3000);
  };

  async function handleRegisterPatient(event: FormEvent) {
    event.preventDefault();

    setSavingPatient(true);
    setError("");

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: patientForm.fullName,
          phone: patientForm.phone,
          address: patientForm.address,
          nextOfKin: patientForm.nextOfKin,
          nextOfKinPhone: patientForm.nextOfKinPhone,
          dateOfBirth: patientForm.dateOfBirth || undefined,
          age: patientForm.age,
          gender: patientForm.gender,
          coveragePlan: patientForm.coveragePlan,
          allergies: patientForm.allergies,
          isWalkIn: patientForm.isWalkIn,
          status: "waiting_triage",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to register patient."
        );
      }

      setShowPatientModal(false);

      setPatientForm({
        fullName: "",
        phone: "",
        address: "",
        nextOfKin: "",
        nextOfKinPhone: "",
        dateOfBirth: "",
        age: "",
        gender: "",
        coveragePlan: "Self-Pay",
        allergies: "",
        isWalkIn: true,
      });

      notify(
        `Patient registered successfully. Registration No.: ${data.patient.registrationNumber ?? 'assigned after database migration'} (Patient code: ${data.patient.patientId}).`
      );

      await loadData();

      // Routing is an arrival notification only. Reception never opens or
      // creates work inside another department's module.
      const routeResult = await createPatientVisitRoute({
        patientCode: data.patient.patientId,
        destination: visitDestination,
      });
      if (!routeResult.success) {
        setError(`Patient registered successfully (code: ${data.patient.patientId}), but routing failed: ${routeResult.message} Do not register the patient again.`);
      } else {
        notify(routeResult.message);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to register patient."
      );
    } finally {
      setSavingPatient(false);
    }
  }

  async function handleRegisterProcedure(event: FormEvent) {
    event.preventDefault();
    setSavingProcedure(true);
    setError("");

    try {
      const result = await registerProcedure({
        patientCode: procedureForm.patientCode,
        procedureCode: procedureForm.procedureCode,
        scheduledDate: procedureForm.scheduledDate || undefined,
        notes: procedureForm.notes,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      setShowProcedureModal(false);
      setProcedureForm({
        patientCode: "",
        procedureCode: "refraction",
        scheduledDate: date,
        notes: "",
      });
      notify(result.message);
      const refreshed = await getRecentProcedures();
      setProcedures(refreshed.procedures ?? []);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register procedure.");
    } finally {
      setSavingProcedure(false);
    }
  }

  async function handleRegisterVisitingInvestigation(event: FormEvent) {
    event.preventDefault();
    setSavingVisitingRequest(true);
    setError("");
    try {
      const result = await createExternalDiagnosticOrder({
        fullName: visitingInvestigationForm.fullName,
        age: visitingInvestigationForm.age ? Number(visitingInvestigationForm.age) : undefined,
        gender: visitingInvestigationForm.gender || undefined,
        phone: visitingInvestigationForm.phone || undefined,
        referringCenter: visitingInvestigationForm.referringCenter,
        testName: visitingInvestigationForm.testName,
        price: Number(visitingInvestigationForm.price),
      });
      if (!result.success) throw new Error(result.message);
      setShowVisitingInvestigationModal(false);
      setVisitingInvestigationForm({ fullName: "", age: "", gender: "", phone: "", referringCenter: "Self-presenting / walk-in", testName: "", price: "0" });
      notify(result.message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register the visiting investigation.");
    } finally {
      setSavingVisitingRequest(false);
    }
  }

  async function handleRegisterVisitingLab(event: FormEvent) {
    event.preventDefault();
    setSavingVisitingRequest(true);
    setError("");
    try {
      let patientCode = visitingLabForm.patientCode.trim();
      if (!patientCode) {
        const patientResponse = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: visitingLabForm.fullName,
            phone: visitingLabForm.contactPhone,
            dateOfBirth: visitingLabForm.dateOfBirth || undefined,
            age: visitingLabForm.age || undefined,
            gender: visitingLabForm.sex,
            coveragePlan: "Self-Pay",
            allergies: "",
            isWalkIn: true,
            status: "in_consultation",
          }),
        });
        const patientData = await patientResponse.json();
        if (!patientResponse.ok || !patientData?.patient?.patientId) {
          throw new Error(patientData?.error || "Unable to register the visiting laboratory patient.");
        }
        patientCode = String(patientData.patient.patientId);
      }
      const order = await createLabOrder({
        patientCode,
        testCode: visitingLabForm.testCode,
        testName: visitingLabForm.testName,
        specimenType: visitingLabForm.specimenType,
        price: Number(visitingLabForm.price),
        priority: visitingLabForm.priority,
        clinicalNotes: [`Visiting patient — source: ${visitingLabForm.sourceCenter}`, visitingLabForm.clinicalNotes].filter(Boolean).join("\n"),
      });
      if (!order.success) {
        if (order.id) {
          setError(`Patient ${patientCode} is registered and lab order ${order.id} was created, but a downstream step failed: ${order.message} Do not submit the order again; ask Cashier or the administrator to resolve the existing order.`);
          await loadData();
          return;
        }
        throw new Error(`Patient ${patientCode} was registered, but no lab order was created: ${order.message}. Do not register the patient again; use the existing patient code to retry.`);
      }
      setShowVisitingLabModal(false);
      setVisitingLabForm({ patientCode: "", fullName: "", age: "", sourceCenter: "Self-presenting / walk-in", contactPhone: "", sex: "", dateOfBirth: "", testCode: "", testName: "", specimenType: "Blood", price: "0", priority: "NORMAL", clinicalNotes: "" });
      notify(`Visiting laboratory patient registered (${patientCode}). ${order.message}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register the visiting laboratory request.");
    } finally {
      setSavingVisitingRequest(false);
    }
  }

  async function handleRegisterVisitingRefraction(event: FormEvent) {
    event.preventDefault();
    setSavingVisitingRequest(true);
    setError("");
    try {
      const result = await registerVisitingOptometryPatient({
        fullName: visitingRefractionForm.fullName,
        age: visitingRefractionForm.age ? Number(visitingRefractionForm.age) : undefined,
        dateOfBirth: visitingRefractionForm.dateOfBirth || undefined,
        gender: visitingRefractionForm.gender || undefined,
        phone: visitingRefractionForm.phone || undefined,
        address: visitingRefractionForm.address || undefined,
        visitType: visitingRefractionForm.visitType,
      });
      if (!result.success) throw new Error(result.message);
      setShowVisitingRefractionModal(false);
      setVisitingRefractionForm({ fullName: "", age: "", dateOfBirth: "", gender: "", phone: "", address: "", visitType: "self_presenting" });
      notify(result.patientCode ? `Visiting refraction registered. Patient code: ${result.patientCode}. The patient is now in the Optometry queue.` : result.message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register the visiting refraction.");
    } finally {
      setSavingVisitingRequest(false);
    }
  }

  async function handleBookAppointment(event: FormEvent) {
    event.preventDefault();

    setSavingAppointment(true);
    setError("");

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointmentForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to book appointment."
        );
      }

      setShowAppointmentModal(false);

      setAppointmentForm({
        patientName: "",
        patientId: "",
        doctorStaffId: doctors[0]?.id ?? "",
        date,
        startTime: "09:00",
        endTime: "09:30",
        notes: "",
      });

      notify("Appointment booked successfully.");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to book appointment."
      );
    } finally {
      setSavingAppointment(false);
    }
  }

  async function updateAppointment(id: string, status: string) {
    setActionId(id);
    setError("");

    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update appointment."
        );
      }

      notify(
        `Appointment marked as ${statusLabel(status)}.`
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update appointment."
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleSendToTriage(patient: Patient) {
    setTriageActionId(patient.patientId);
    setError("");

    try {
      const response = await fetch(
        `/api/patients/${encodeURIComponent(patient.patientId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "waiting_triage",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to send patient to triage."
        );
      }

      notify(`${patient.fullName} sent to triage.`);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send patient to triage."
      );
    } finally {
      setTriageActionId(null);
    }
  }

  function openAppointmentForPatient(patient: Patient) {
    setAppointmentForm((current) => ({
      ...current,
      patientName: `${patient.fullName} (${patient.patientId})`,
      patientId: patient.id,
      doctorStaffId: current.doctorStaffId || doctors[0]?.id || "",
      date,
    }));

    setShowAppointmentModal(true);
  }

  const statCards: Array<{ label: string; value: number; Icon: LucideIcon }> = [
    { label: "Today's Appointments", value: stats.total, Icon: CalendarDays },
    { label: "Checked In", value: stats.checkedIn, Icon: CheckCircle2 },
    { label: "Remaining", value: stats.remaining, Icon: Clock3 },
    { label: "Completed", value: stats.completed, Icon: FilePlus2 },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo.png"
              alt="Sparkle Eye Specialist Hospital"
              width={56}
              height={46}
              priority
              className="h-11 w-14 shrink-0 object-contain"
            />

            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950">
                Reception Desk
              </h1>

              <p className="text-xs font-medium text-slate-500">
                Patient registration, appointments & check-in
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", {
                    method: "POST",
                  });
                } finally {
                  localStorage.removeItem(
                    "sparkle_staff_token"
                  );

                  router.push("/");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 p-6 md:p-8">
        <ClinicalHandoffInbox destination="RECEPTIONIST" />
        {/* ERROR */}
        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div className="fixed right-6 top-24 z-50 flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {toast}
          </div>
        )}

        {/* RECEPTION ACTIONS */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="font-extrabold text-slate-950">Patient registration & routing</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Reception creates the patient record and sends an arrival notice to the selected queue. Clinical orders and care remain with the receiving department.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              { destination: "TRIAGE" as VisitDestination, title: "Register patient", detail: "General walk-in or first assessment.", color: "purple" },
              { destination: "DOCTOR" as VisitDestination, title: "Visiting procedure patient", detail: "Send for clinical review before any procedure is ordered.", color: "fuchsia" },
              { destination: "PHARMACY" as VisitDestination, title: "Visiting medication patient", detail: "Notify Pharmacy of arrival; no prescription is created here.", color: "emerald" },
              { destination: "DIAGNOSTICS" as VisitDestination, title: "Visiting investigation", detail: "Notify Diagnostics for review; no test order or bill is created here.", color: "amber" },
              { destination: "LABORATORY" as VisitDestination, title: "Visiting laboratory patient", detail: "Notify Laboratory of arrival; lab staff follow their approved order workflow.", color: "sky" },
              { destination: "OPTOMETRY" as VisitDestination, title: "Visiting glasses / refraction", detail: "Notify Optometry of arrival; the optometrist handles assessment.", color: "blue" },
            ]).map((item) => (
              <button
                key={item.destination}
                onClick={() => {
                  setVisitDestination(item.destination);
                  setRegistrationIntent("general");
                  setShowPatientModal(true);
                }}
                className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-purple-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <UserPlus className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">{item.detail}</span>
                </span>
              </button>
            ))}
            <button
              onClick={() => {
                setAppointmentForm((current) => ({
                  ...current,
                  date,
                  doctorStaffId: current.doctorStaffId || doctors[0]?.id || "",
                }));
                setShowAppointmentModal(true);
              }}
              className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-purple-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <CalendarDays className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-extrabold text-slate-900">Book appointment</span>
                <span className="mt-1 block text-xs font-medium text-slate-500">Schedule a patient visit without opening a clinical module.</span>
              </span>
            </button>
          </div>
        </section>

        {/* STATS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, Icon }) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </p>

                <Icon className="h-5 w-5 text-purple-600" />
              </div>

              <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
                {value}
              </p>
            </div>
          ))}
        </section>

        {/* MAIN CONTENT */}
        <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          {/* APPOINTMENTS */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h2 className="font-extrabold text-slate-950">
                  Today&apos;s schedule
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Manage arrivals and move patients into the clinical flow.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                />

                <button
                  onClick={() => {
                    setAppointmentForm((current) => ({
                      ...current,
                      date,
                      doctorStaffId: current.doctorStaffId || doctors[0]?.id || "",
                    }));

                    setShowAppointmentModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4" />
                  Appointment
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-semibold text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading schedule...
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <CalendarDays className="h-9 w-9 text-slate-300" />

                  <p className="mt-3 font-bold text-slate-700">
                    No appointments for this date
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Book an appointment or register a walk-in patient.
                  </p>
                </div>
              ) : (
                appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="rounded-xl bg-purple-50 px-3 py-2 text-center">
                        <p className="text-xs font-extrabold text-purple-700">
                          {formatTime(appointment.startTime)}
                        </p>

                        <p className="text-[10px] font-semibold text-purple-400">
                          {formatTime(appointment.endTime)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-slate-900">
                          {appointment.patientName}
                        </p>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {appointment.physician}
                        </p>

                        {appointment.notes && (
                          <p className="mt-1 truncate text-[11px] text-slate-400">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">
                        {statusLabel(appointment.status)}
                      </span>

                      {appointment.status === "scheduled" && (
                        <button
                          disabled={actionId === appointment.id}
                          onClick={() =>
                            void updateAppointment(
                              appointment.id,
                              "checked_in"
                            )
                          }
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {actionId === appointment.id
                            ? "Updating..."
                            : "Check in"}
                        </button>
                      )}

                      {appointment.status === "checked_in" && (
                        <button
                          disabled={actionId === appointment.id}
                          onClick={() =>
                            void updateAppointment(
                              appointment.id,
                              "completed"
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PATIENT SEARCH */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-extrabold text-slate-950">
                  Patient search
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Find an existing patient by registration number, code, name or phone.
                </p>
              </div>

              <Search className="h-5 w-5 text-slate-400" />
            </div>

            <div className="p-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search patient..."
                  className={`${inputClass} pl-9`}
                />
              </div>

              <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto">
                {patients.length === 0 ? (
                  <p className="py-8 text-center text-xs font-semibold text-slate-400">
                    No patients found.
                  </p>
                ) : (
                  patients.slice(0, 12).map((patient) => (
                    <div
                      key={patient.id}
                      className="rounded-xl border border-slate-100 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-900">
                            {patient.fullName}
                          </p>

                          <p className="mt-1 text-[11px] font-bold text-purple-600">
                            Reg. No.: {patient.registrationNumber || "Legacy record"}
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-slate-400">
                            Patient code: {patient.patientId}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {patient.phone || "No phone"} ·{" "}
                            {patient.coveragePlan || "Self-Pay"}
                          </p>

                          {patient.dateOfBirth && (
                            <p className="mt-1 text-[11px] font-medium text-slate-400">
                              DOB: {patient.dateOfBirth}
                              {patient.age !== null &&
                                patient.age !== undefined &&
                                ` · ${patient.age} years`}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-1.5">
                          <button
                            onClick={() =>
                              openAppointmentForPatient(patient)
                            }
                            className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-[10px] font-extrabold text-purple-700 hover:bg-purple-100"
                          >
                            Book
                          </button>

                          <button
                            disabled={
                              triageActionId === patient.patientId
                            }
                            onClick={() =>
                              void handleSendToTriage(patient)
                            }
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {triageActionId === patient.patientId
                              ? "Sending..."
                              : "Triage"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* RECENT PROCEDURES */}
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-extrabold text-slate-950">Recent procedure registrations</h2>
              <p className="mt-1 text-xs text-slate-500">Procedures registered by reception. The cashier handles payment; clinical staff confirm readiness and perform the procedure.</p>
            </div>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">{procedures.length} recent</span>
          </div>
          {procedures.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No procedures registered yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {procedures.map((procedure) => (
                <div key={procedure.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{procedure.procedureName}</p>
                    <p className="mt-1 text-xs text-slate-500">{procedure.patientName} · Reg. No. {procedure.registrationNumber || procedure.patientCode}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {procedure.referralType === "doctor_order" ? "Doctor's order" : "External referral"} · Ref: {procedure.orderReference}
                      {procedure.scheduledDate ? ` · Date: ${procedure.scheduledDate}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">₦{procedure.price.toLocaleString()}</p>
                    <span className="mt-1 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold capitalize text-amber-700">{procedure.status.replace(/_/g, " ")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* REGISTER PROCEDURE MODAL */}
      {showProcedureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-4">
          <form onSubmit={handleRegisterProcedure} className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-extrabold text-slate-950">Register a procedure</h2>
                <p className="mt-1 text-xs text-slate-500">Register an in-house procedure after the doctor has reviewed and approved it.</p>
              </div>
              <button type="button" onClick={() => setShowProcedureModal(false)} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Close procedure form"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                Register the procedure here only after the doctor has reviewed the patient and approved it. Reception selects the approved procedure, and the fixed catalogue price is added to the patient&apos;s bill.
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Patient *</span>
                <select required value={procedureForm.patientCode} onChange={(event) => setProcedureForm({ ...procedureForm, patientCode: event.target.value })} className={inputClass}>
                  <option value="">Select a patient</option>
                  {patients.map((patient) => (
                    <option key={patient.patientId} value={patient.patientId}>
                      {patient.fullName} · {patient.registrationNumber || patient.patientId}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-slate-400">Can’t find the patient? Search for them on the receptionist page first.</span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Procedure *</span>
                <select required value={procedureForm.procedureCode} onChange={(event) => setProcedureForm({ ...procedureForm, procedureCode: event.target.value })} className={inputClass}>
                  {procedurePrices.length === 0 && <option value="">No active procedures available</option>}
                  {procedurePrices.map((item) => (
                    <option key={item.code} value={item.code}>{item.name} — ₦{item.price.toLocaleString("en-NG")}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-slate-400">Prices are fixed by the administrator and cannot be changed at reception.</span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Procedure date</span>
                <input type="date" value={procedureForm.scheduledDate} onChange={(event) => setProcedureForm({ ...procedureForm, scheduledDate: event.target.value })} className={inputClass} />
              </label>

              <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                <p className="text-xs font-bold text-purple-700">Fixed procedure price</p>
                <p className="mt-1 text-2xl font-extrabold text-purple-950">₦{(procedurePrices.find((item) => item.code === procedureForm.procedureCode)?.price ?? 0).toLocaleString("en-NG")}</p>
                <p className="mt-1 text-[11px] text-purple-700">This amount is applied automatically to the patient&apos;s bill. Only an administrator can change the catalogue price.</p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Additional notes (optional)</span>
                <textarea rows={3} value={procedureForm.notes} onChange={(event) => setProcedureForm({ ...procedureForm, notes: event.target.value })} className={inputClass} placeholder="Optional scheduling details or notes from the doctor&apos;s review" />
              </label>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              <button type="button" onClick={() => setShowProcedureModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold hover:bg-slate-50">Cancel</button>
              <button disabled={savingProcedure} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-purple-700 disabled:opacity-50">
                {savingProcedure && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingProcedure ? "Registering..." : "Register and send bill to cashier"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showVisitingInvestigationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-4">
          <form onSubmit={handleRegisterVisitingInvestigation} className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold text-slate-950">Register visiting investigation</h2><p className="mt-1 text-sm text-slate-500">For patients who arrive for an investigation without going through the normal hospital registration route.</p></div><button type="button" onClick={() => setShowVisitingInvestigationModal(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Patient full name *<input required value={visitingInvestigationForm.fullName} onChange={(e) => setVisitingInvestigationForm({ ...visitingInvestigationForm, fullName: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Age<input type="number" min="0" max="150" value={visitingInvestigationForm.age} onChange={(e) => setVisitingInvestigationForm({ ...visitingInvestigationForm, age: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Sex<select value={visitingInvestigationForm.gender} onChange={(e) => setVisitingInvestigationForm({ ...visitingInvestigationForm, gender: e.target.value })} className={inputClass}><option value="">Not specified</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select></label>
              <label className="block text-xs font-bold text-slate-600">Phone<input value={visitingInvestigationForm.phone} onChange={(e) => setVisitingInvestigationForm({ ...visitingInvestigationForm, phone: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Referring centre / source *<input required value={visitingInvestigationForm.referringCenter} onChange={(e) => setVisitingInvestigationForm({ ...visitingInvestigationForm, referringCenter: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Investigation / test *<input required value={visitingInvestigationForm.testName} onChange={(e) => setVisitingInvestigationForm({ ...visitingInvestigationForm, testName: e.target.value })} placeholder="Enter the investigation requested" className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Approved price (₦) *<input required type="number" min="0" step="0.01" value={visitingInvestigationForm.price} onChange={(e) => setVisitingInvestigationForm({ ...visitingInvestigationForm, price: e.target.value })} className={inputClass} /><span className="mt-1 block font-normal text-slate-400">If price is not configured, Cashier will need to review it before payment.</span></label>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowVisitingInvestigationModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={savingVisitingRequest} className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{savingVisitingRequest ? "Registering…" : "Register and send request"}</button></div>
          </form>
        </div>
      )}

      {showVisitingLabModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={handleRegisterVisitingLab}
            className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">Register visiting laboratory request</h2>
                <p className="mt-1 text-sm text-slate-500">Registers a walk-in patient, sends the test to Laboratory, and creates billing handoffs for Cashier and Reception.</p>
              </div>
              <button type="button" onClick={() => setShowVisitingLabModal(false)} aria-label="Close" className="shrink-0 rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Existing patient code (optional)<input value={visitingLabForm.patientCode} onChange={e=>setVisitingLabForm({...visitingLabForm,patientCode:e.target.value})} className={inputClass} placeholder="Use this to retry an order after patient registration" /><span className="mt-1 block font-normal text-slate-400">Leave blank to register a new visiting patient.</span></label>
              {!visitingLabForm.patientCode && <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Patient full name *<input required value={visitingLabForm.fullName} onChange={e=>setVisitingLabForm({...visitingLabForm,fullName:e.target.value})} className={inputClass} /></label>}
              <label className="block text-xs font-bold text-slate-600">Referring centre / source *<input required value={visitingLabForm.sourceCenter} onChange={e=>setVisitingLabForm({...visitingLabForm,sourceCenter:e.target.value})} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Phone<input value={visitingLabForm.contactPhone} onChange={e=>setVisitingLabForm({...visitingLabForm,contactPhone:e.target.value})} className={inputClass} /></label>
              {!visitingLabForm.patientCode && <label className="block text-xs font-bold text-slate-600">Age<input type="number" min="0" max="150" value={visitingLabForm.age} onChange={e=>setVisitingLabForm({...visitingLabForm,age:e.target.value})} className={inputClass} /></label>}
              <label className="block text-xs font-bold text-slate-600">Sex<select value={visitingLabForm.sex} onChange={e=>setVisitingLabForm({...visitingLabForm,sex:e.target.value})} className={inputClass}><option value="">Not specified</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select></label>
              <label className="block text-xs font-bold text-slate-600">Date of birth<input type="date" value={visitingLabForm.dateOfBirth} onChange={e=>setVisitingLabForm({...visitingLabForm,dateOfBirth:e.target.value})} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Test code *<input required value={visitingLabForm.testCode} onChange={e=>setVisitingLabForm({...visitingLabForm,testCode:e.target.value})} className={inputClass} placeholder="e.g. FBS" /></label>
              <label className="block text-xs font-bold text-slate-600">Test name *<input required value={visitingLabForm.testName} onChange={e=>setVisitingLabForm({...visitingLabForm,testName:e.target.value})} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Specimen type *<input required value={visitingLabForm.specimenType} onChange={e=>setVisitingLabForm({...visitingLabForm,specimenType:e.target.value})} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Approved price (₦) *<input required type="number" min="0" step="0.01" value={visitingLabForm.price} onChange={e=>setVisitingLabForm({...visitingLabForm,price:e.target.value})} className={inputClass} /><span className="mt-1 block font-normal text-slate-400">If zero, the order is sent for Cashier pricing review; it is not treated as free.</span></label>
              <label className="block text-xs font-bold text-slate-600">Priority<select value={visitingLabForm.priority} onChange={e=>setVisitingLabForm({...visitingLabForm,priority:e.target.value as "NORMAL"|"URGENT"|"STAT"})} className={inputClass}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option><option value="STAT">STAT</option></select></label>
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Clinical notes<textarea rows={2} value={visitingLabForm.clinicalNotes} onChange={e=>setVisitingLabForm({...visitingLabForm,clinicalNotes:e.target.value})} className={inputClass} /></label>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
              <button type="button" onClick={() => setShowVisitingLabModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button>
              <button disabled={savingVisitingRequest} className="rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{savingVisitingRequest ? "Registering…" : "Register and send to Laboratory"}</button>
            </div>
          </form>
        </div>
      )}

      {showVisitingRefractionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-4">
          <form onSubmit={handleRegisterVisitingRefraction} className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold text-slate-950">Register visiting refraction</h2><p className="mt-1 text-sm text-slate-500">Register a patient who has arrived for glasses. The patient is sent directly to the Optometry queue for refraction.</p></div><button type="button" onClick={() => setShowVisitingRefractionModal(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Patient full name *<input required value={visitingRefractionForm.fullName} onChange={(e) => setVisitingRefractionForm({ ...visitingRefractionForm, fullName: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Date of birth<input type="date" value={visitingRefractionForm.dateOfBirth} onChange={(e) => setVisitingRefractionForm({ ...visitingRefractionForm, dateOfBirth: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Age<input type="number" min="0" max="150" value={visitingRefractionForm.age} onChange={(e) => setVisitingRefractionForm({ ...visitingRefractionForm, age: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600">Sex<select value={visitingRefractionForm.gender} onChange={(e) => setVisitingRefractionForm({ ...visitingRefractionForm, gender: e.target.value })} className={inputClass}><option value="">Not specified</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select></label>
              <label className="block text-xs font-bold text-slate-600">Phone<input value={visitingRefractionForm.phone} onChange={(e) => setVisitingRefractionForm({ ...visitingRefractionForm, phone: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Address<input value={visitingRefractionForm.address} onChange={(e) => setVisitingRefractionForm({ ...visitingRefractionForm, address: e.target.value })} className={inputClass} /></label>
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Visit type<select value={visitingRefractionForm.visitType} onChange={(e) => setVisitingRefractionForm({ ...visitingRefractionForm, visitType: e.target.value as "self_presenting" | "external_referral" })} className={inputClass}><option value="self_presenting">Self-presenting</option><option value="external_referral">External referral</option></select></label>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowVisitingRefractionModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={savingVisitingRequest} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{savingVisitingRequest ? "Registering…" : "Register and send to Optometry"}</button></div>
          </form>
        </div>
      )}

      {/* REGISTER PATIENT MODAL */}
      {showPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-4">
          <form
            onSubmit={handleRegisterPatient}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* MODAL HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <h2 className="font-extrabold text-slate-950">
                  Register new patient
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  A registration number and internal patient code will be generated automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPatientModal(false)}
                className="rounded-xl p-2 transition hover:bg-slate-100"
                aria-label="Close patient registration"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* SCROLLABLE FORM BODY */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
                {/* FULL NAME */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Full name *
                  </label>

                  <input
                    required
                    value={patientForm.fullName}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        fullName: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                {/* PHONE */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Phone
                  </label>

                  <input
                    value={patientForm.phone}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        phone: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                {/* ADDRESS */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Address
                  </label>

                  <input
                    value={patientForm.address}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        address: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                {/* NEXT OF KIN */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Next of kin
                  </label>

                  <input
                    value={patientForm.nextOfKin}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        nextOfKin: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                {/* NEXT OF KIN PHONE */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Next of kin phone
                  </label>

                  <input
                    value={patientForm.nextOfKinPhone}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        nextOfKinPhone: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                {/* DATE OF BIRTH */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Date of birth
                  </label>

                  <input
                    type="date"
                    max={todayIso()}
                    value={patientForm.dateOfBirth}
                    onChange={(event) => {
                      const dateOfBirth = event.target.value;

                      setPatientForm({
                        ...patientForm,
                        dateOfBirth,
                        age: calculateAge(dateOfBirth),
                      });
                    }}
                    className={inputClass}
                  />
                </div>

                {/* AGE */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Age
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={patientForm.age}
                    readOnly={Boolean(patientForm.dateOfBirth)}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        age: event.target.value,
                      })
                    }
                    className={`${inputClass} ${
                      patientForm.dateOfBirth
                        ? "cursor-not-allowed bg-slate-100 text-slate-500"
                        : ""
                    }`}
                  />

                  {patientForm.dateOfBirth && (
                    <p className="mt-1.5 text-[10px] font-semibold text-purple-600">
                      Age calculated automatically from date of birth.
                    </p>
                  )}
                </div>

                {/* GENDER */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Gender
                  </label>

                  <select
                    value={patientForm.gender}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        gender: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* COVERAGE */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Coverage
                  </label>

                  <select
                    value={patientForm.coveragePlan}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        coveragePlan: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option>Self-Pay</option>
                    <option>HMO</option>
                    <option>NHIA</option>
                    <option>Private Insurance</option>
                  </select>
                </div>

                {/* VISIT DESTINATION */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Visit destination *
                  </label>
                  <select
                    required
                    value={visitDestination}
                    onChange={(event) => setVisitDestination(event.target.value as VisitDestination)}
                    className={inputClass}
                  >
                    <option value="TRIAGE">Triage / first assessment</option>
                    <option value="DOCTOR">Doctor review</option>
                    <option value="PHARMACY">Pharmacy arrival queue</option>
                    <option value="LABORATORY">Laboratory arrival queue</option>
                    <option value="DIAGNOSTICS">Diagnostics / investigation review</option>
                    <option value="OPTOMETRY">Optometry / refraction queue</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">This only routes the arrival. It does not create a prescription, clinical order, procedure, or bill.</p>
                </div>

                {/* ALLERGIES */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Allergies / notes
                  </label>

                  <textarea
                    rows={3}
                    value={patientForm.allergies}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        allergies: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                {/* WALK-IN */}
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={patientForm.isWalkIn}
                    onChange={(event) =>
                      setPatientForm({
                        ...patientForm,
                        isWalkIn: event.target.checked,
                      })
                    }
                  />

                  Walk-in patient
                </label>
              </div>
            </div>

            {/* FIXED FOOTER */}
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setShowPatientModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                disabled={savingPatient}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {savingPatient && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Register patient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* APPOINTMENT MODAL */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleBookAppointment}
            className="w-full max-w-xl rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-extrabold text-slate-950">
                  Book appointment
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Create a real appointment in the hospital schedule.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAppointmentModal(false)}
                className="rounded-xl p-2 hover:bg-slate-100"
                aria-label="Close appointment modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* PATIENT */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  Patient name / code *
                </label>

                <input
                  required
                  value={appointmentForm.patientName}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      patientName: event.target.value,
                      patientId: "",
                    })
                  }
                  className={inputClass}
                  placeholder="e.g. Adebayo Funmi (SPK-12345)"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* PHYSICIAN */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Physician *
                  </label>

                  <select
                    required
                    value={appointmentForm.doctorStaffId}
                    onChange={(event) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        doctorStaffId: event.target.value,
                      })
                    }
                    className={inputClass}
                    disabled={doctors.length === 0}
                  >
                    <option value="">Select an active doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}{doctor.title ? ` — ${doctor.title}` : ""}
                      </option>
                    ))}
                  </select>
                  {doctorLoadError && (
                    <p className="mt-1.5 text-xs font-semibold text-rose-600">
                      {doctorLoadError}
                    </p>
                  )}
                </div>

                {/* DATE */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Date *
                  </label>

                  <input
                    type="date"
                    required
                    value={appointmentForm.date}
                    onChange={(event) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        date: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                {/* START */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Start time *
                  </label>

                  <input
                    type="time"
                    required
                    value={appointmentForm.startTime}
                    onChange={(event) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        startTime: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                {/* END */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    End time *
                  </label>

                  <input
                    type="time"
                    required
                    value={appointmentForm.endTime}
                    onChange={(event) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        endTime: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  Notes
                </label>

                <textarea
                  rows={3}
                  value={appointmentForm.notes}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      notes: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowAppointmentModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                disabled={savingAppointment}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {savingAppointment && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Book appointment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}