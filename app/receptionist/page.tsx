'use client';

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
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Patient = {
  id: string;
  patientId: string;
  fullName: string;
  coveragePlan?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReceptionistPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPatient, setSavingPatient] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const [patientForm, setPatientForm] = useState({
    fullName: "",
    phone: "",
    age: "",
    gender: "",
    coveragePlan: "Self-Pay",
    allergies: "",
    isWalkIn: true,
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patientName: "",
    physician: "Dr. James Okoro",
    date: todayIso(),
    startTime: "09:00",
    endTime: "09:30",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [appointmentResponse, patientResponse] = await Promise.all([
        fetch(`/api/appointments?date=${encodeURIComponent(date)}`, {
          cache: "no-store",
        }),
        fetch(`/api/patients?search=${encodeURIComponent(search)}`, {
          cache: "no-store",
        }),
      ]);

      const appointmentData = await appointmentResponse.json();
      const patientData = await patientResponse.json();

      if (!appointmentResponse.ok) {
        throw new Error(appointmentData?.error || "Failed to load appointments.");
      }

      if (!patientResponse.ok) {
        throw new Error(patientData?.error || "Failed to load patients.");
      }

      setAppointments(appointmentData.appointments ?? []);
      setPatients(patientData.patients ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load receptionist data.");
    } finally {
      setLoading(false);
    }
  }, [date, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, search ? 300 : 0);

    return () => window.clearTimeout(timer);
  }, [loadData, search]);

  const stats = useMemo(() => {
    const checkedIn = appointments.filter((item) => item.status === "checked_in").length;
    const completed = appointments.filter((item) => item.status === "completed").length;
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
    window.setTimeout(() => setToast(""), 3000);
  };

  async function handleRegisterPatient(event: FormEvent) {
    event.preventDefault();
    setSavingPatient(true);
    setError("");

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: patientForm.fullName,
          phone: patientForm.phone,
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
        throw new Error(data?.error || "Failed to register patient.");
      }

      setShowPatientModal(false);
      setPatientForm({
        fullName: "",
        phone: "",
        age: "",
        gender: "",
        coveragePlan: "Self-Pay",
        allergies: "",
        isWalkIn: true,
      });
      notify(`Patient ${data.patient.patientId} registered successfully.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register patient.");
    } finally {
      setSavingPatient(false);
    }
  }

  async function handleBookAppointment(event: FormEvent) {
    event.preventDefault();
    setSavingAppointment(true);
    setError("");

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to book appointment.");
      }

      setShowAppointmentModal(false);
      setAppointmentForm({
        patientName: "",
        physician: "Dr. James Okoro",
        date,
        startTime: "09:00",
        endTime: "09:30",
        notes: "",
      });
      notify("Appointment booked successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment.");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update appointment.");
      }

      notify(`Appointment marked as ${statusLabel(status)}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment.");
    } finally {
      setActionId(null);
    }
  }

  function openAppointmentForPatient(patient: Patient) {
    setAppointmentForm((current) => ({
      ...current,
      patientName: `${patient.fullName} (${patient.patientId})`,
      date,
    }));
    setShowAppointmentModal(true);
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Users className="h-5 w-5" />
            </div>
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
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } finally {
                  localStorage.removeItem("sparkle_staff_token");
                  window.location.href = "/";
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
        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {toast && (
          <div className="fixed right-6 top-24 z-50 flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {toast}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Today's Appointments", stats.total, CalendarDays],
            ["Checked In", stats.checkedIn, CheckCircle2],
            ["Remaining", stats.remaining, Clock3],
            ["Completed", stats.completed, FilePlus2],
          ].map(([label, value, Icon]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <Icon className="h-5 w-5 text-purple-600" />
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h2 className="font-extrabold text-slate-950">Today&apos;s schedule</h2>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Manage arrivals and move patients into the clinical flow.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    setAppointmentForm((current) => ({ ...current, date }));
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
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading schedule...
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <CalendarDays className="h-9 w-9 text-slate-300" />
                  <p className="mt-3 font-bold text-slate-700">No appointments for this date</p>
                  <p className="mt-1 text-xs text-slate-400">Book an appointment or register a walk-in patient.</p>
                </div>
              ) : (
                appointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="rounded-xl bg-purple-50 px-3 py-2 text-center">
                        <p className="text-xs font-extrabold text-purple-700">{formatTime(appointment.startTime)}</p>
                        <p className="text-[10px] font-semibold text-purple-400">{formatTime(appointment.endTime)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-slate-900">{appointment.patientName}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{appointment.physician}</p>
                        {appointment.notes && (
                          <p className="mt-1 truncate text-[11px] text-slate-400">{appointment.notes}</p>
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
                          onClick={() => void updateAppointment(appointment.id, "checked_in")}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {actionId === appointment.id ? "Updating..." : "Check in"}
                        </button>
                      )}
                      {appointment.status === "checked_in" && (
                        <button
                          disabled={actionId === appointment.id}
                          onClick={() => void updateAppointment(appointment.id, "completed")}
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

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-extrabold text-slate-950">Patient search</h2>
                <p className="mt-1 text-xs font-medium text-slate-400">Find an existing patient by code, name or phone.</p>
              </div>
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <div className="p-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patient..."
                  className={`${inputClass} pl-9`}
                />
              </div>

              <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto">
                {patients.length === 0 ? (
                  <p className="py-8 text-center text-xs font-semibold text-slate-400">No patients found.</p>
                ) : (
                  patients.slice(0, 12).map((patient) => (
                    <div key={patient.id} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-900">{patient.fullName}</p>
                          <p className="mt-1 text-[11px] font-bold text-purple-600">{patient.patientId}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{patient.phone || "No phone"} · {patient.coveragePlan || "Self-Pay"}</p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1.5">
                          <button
                            onClick={() => openAppointmentForPatient(patient)}
                            className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-[10px] font-extrabold text-purple-700 hover:bg-purple-100"
                          >
                            Book
                          </button>
                          <button
                            onClick={() => router.push(`/triage?patientId=${encodeURIComponent(patient.patientId)}`)}
                            className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-extrabold text-white hover:bg-slate-800"
                          >
                            Triage
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

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-slate-950">Reception actions</h2>
              <p className="mt-1 text-xs font-medium text-slate-400">Start the patient journey from one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPatientModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-purple-700"
              >
                <UserPlus className="h-4 w-4" />
                Register patient
              </button>
              <button
                onClick={() => {
                  setAppointmentForm((current) => ({ ...current, date }));
                  setShowAppointmentModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                <CalendarDays className="h-4 w-4" />
                Book appointment
              </button>
              <button
                onClick={() => router.push("/triage")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                Open triage queue
              </button>
            </div>
          </div>
        </section>
      </main>

      {showPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleRegisterPatient} className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-extrabold text-slate-950">Register new patient</h2>
                <p className="mt-1 text-xs font-medium text-slate-400">A patient code will be generated automatically.</p>
              </div>
              <button type="button" onClick={() => setShowPatientModal(false)} className="rounded-xl p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Full name *</label>
                <input required value={patientForm.fullName} onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Phone</label>
                <input value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Age</label>
                <input type="number" min="0" max="150" value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Gender</label>
                <select value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })} className={inputClass}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Coverage</label>
                <select value={patientForm.coveragePlan} onChange={(e) => setPatientForm({ ...patientForm, coveragePlan: e.target.value })} className={inputClass}>
                  <option>Self-Pay</option><option>HMO</option><option>NHIA</option><option>Private Insurance</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Allergies / notes</label>
                <textarea rows={3} value={patientForm.allergies} onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 md:col-span-2">
                <input type="checkbox" checked={patientForm.isWalkIn} onChange={(e) => setPatientForm({ ...patientForm, isWalkIn: e.target.checked })} />
                Walk-in patient
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setShowPatientModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button>
              <button disabled={savingPatient} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                {savingPatient && <Loader2 className="h-4 w-4 animate-spin" />} Register patient
              </button>
            </div>
          </form>
        </div>
      )}

      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleBookAppointment} className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-extrabold text-slate-950">Book appointment</h2>
                <p className="mt-1 text-xs font-medium text-slate-400">Create a real appointment in the hospital schedule.</p>
              </div>
              <button type="button" onClick={() => setShowAppointmentModal(false)} className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Patient name / code *</label>
                <input required value={appointmentForm.patientName} onChange={(e) => setAppointmentForm({ ...appointmentForm, patientName: e.target.value })} className={inputClass} placeholder="e.g. Adebayo Funmi (SPK-12345)" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Physician *</label>
                  <select value={appointmentForm.physician} onChange={(e) => setAppointmentForm({ ...appointmentForm, physician: e.target.value })} className={inputClass}>
                    <option>Dr. James Okoro</option><option>Dr. Amina Bello</option><option>Dr. Sarah Patel</option><option>Dr. Fatima Hassan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Date *</label>
                  <input type="date" required value={appointmentForm.date} onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Start time *</label>
                  <input type="time" required value={appointmentForm.startTime} onChange={(e) => setAppointmentForm({ ...appointmentForm, startTime: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">End time *</label>
                  <input type="time" required value={appointmentForm.endTime} onChange={(e) => setAppointmentForm({ ...appointmentForm, endTime: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Notes</label>
                <textarea rows={3} value={appointmentForm.notes} onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setShowAppointmentModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button>
              <button disabled={savingAppointment} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                {savingAppointment && <Loader2 className="h-4 w-4 animate-spin" />} Book appointment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
