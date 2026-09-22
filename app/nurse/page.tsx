"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Plus,
  Search,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  User,
  ArrowRight,
  X,
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface ApiPatient {
  patientId: string;
  fullName: string;
  coveragePlan?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  allergies?: string | null;
  status?: string | null;
  isWalkIn?: boolean | null;
  lastVisitAt?: string | null;
  primaryComplaint?: string | null;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  arrivalTime: string;
  visitType: string;
  clinicalAlert: string;
  alertType: "urgent" | "normal";
  status: "WAITING" | "IN PROGRESS" | "COMPLETED";
  vitalsData?: {
    primaryComplaint?: string;
  };
}

type Filter = "All" | "Waiting" | "In Progress" | "Completed";

function normalizeStatus(status?: string | null): Patient["status"] {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    normalized === "completed" ||
    normalized === "completed_today" ||
    normalized === "complete"
  ) {
    return "COMPLETED";
  }

  if (
    normalized === "in_consultation" ||
    normalized === "in_progress" ||
    normalized === "consultation" ||
    normalized === "with_doctor"
  ) {
    return "IN PROGRESS";
  }

  return "WAITING";
}

function formatArrivalTime(lastVisitAt?: string | null) {
  if (!lastVisitAt) {
    return "Today";
  }

  const date = new Date(lastVisitAt);

  if (Number.isNaN(date.getTime())) {
    return "Today";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVisitType(isWalkIn?: boolean | null) {
  return isWalkIn === false ? "APPOINTMENT" : "WALK-IN";
}

function getClinicalAlert(
  patient: ApiPatient
): {
  message: string;
  type: "urgent" | "normal";
} {
  const complaint = patient.primaryComplaint?.trim();

  if (!complaint) {
    return {
      message: "No active flags",
      type: "normal",
    };
  }

  const urgentKeywords = [
    "chemical",
    "trauma",
    "injury",
    "sudden vision loss",
    "vision loss",
    "severe pain",
    "acute pain",
    "chemical splash",
    "red eye",
    "bleeding",
    "foreign body",
    "flashes",
    "floaters",
  ];

  const complaintLower = complaint.toLowerCase();

  const isUrgent = urgentKeywords.some((keyword) =>
    complaintLower.includes(keyword)
  );

  return {
    message: complaint,
    type: isUrgent ? "urgent" : "normal",
  };
}

function mapApiPatient(patient: ApiPatient): Patient {
  const alert = getClinicalAlert(patient);

  return {
    id: patient.patientId,
    name: patient.fullName,
    age: Number(patient.age ?? 0),
    gender: patient.gender || "Unspecified",
    arrivalTime: formatArrivalTime(patient.lastVisitAt),
    visitType: formatVisitType(patient.isWalkIn),
    clinicalAlert: alert.message,
    alertType: alert.type,
    status: normalizeStatus(patient.status),
    vitalsData: {
      primaryComplaint: patient.primaryComplaint || undefined,
    },
  };
}

export default function NurseDashboard() {
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPatients = useCallback(async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/patients", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load the patient queue."
        );
      }

      const apiPatients: ApiPatient[] = Array.isArray(data?.patients)
        ? data.patients
        : [];

      setPatients(apiPatients.map(mapApiPatient));
    } catch (err) {
      console.error("Failed to load nurse queue:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load the patient queue."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("sparkle_staff_token");
      window.location.href = "/";
    }
  };

  const handlePatientAction = (patient: Patient) => {
    if (!patient.id) {
      setError("This patient does not have a valid patient code.");
      return;
    }

    if (patient.status === "COMPLETED") {
      setSelectedPatient(patient);
      return;
    }

    router.push(`/triage?patientId=${encodeURIComponent(patient.id)}`);
  };

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesFilter =
        filter === "All"
          ? true
          : filter === "Waiting"
          ? patient.status === "WAITING"
          : filter === "In Progress"
          ? patient.status === "IN PROGRESS"
          : patient.status === "COMPLETED";

      const matchesSearch =
        !query ||
        patient.name.toLowerCase().includes(query) ||
        patient.id.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [patients, filter, searchQuery]);

  const waitingCount = patients.filter(
    (patient) => patient.status === "WAITING"
  ).length;

  const inProgressCount = patients.filter(
    (patient) => patient.status === "IN PROGRESS"
  ).length;

  const completedCount = patients.filter(
    (patient) => patient.status === "COMPLETED"
  ).length;

  const urgentCount = patients.filter(
    (patient) => patient.alertType === "urgent"
  ).length;

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800 font-sans antialiased">
      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-200/80 px-6 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-[#6B21A8]/5 border border-[#6B21A8]/10 shadow-xs">
            <Image
              src="/logo.png"
              alt="Sparkle Eye Specialist Hospital Logo"
              width={36}
              height={36}
              className="object-contain p-1"
              priority
            />
          </div>

          <div>
            <h1 className="font-extrabold text-sm text-slate-900 leading-tight">
              Nurse Triage &amp; Vitals Dashboard
            </h1>

            <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase block">
              Sparkle Eye Portal • Live Patient Queue
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-purple-50 border border-purple-200/80 px-3.5 py-1.5 rounded-xl">
            <User className="w-4 h-4 text-[#6B21A8]" />

            <span className="text-xs font-bold text-[#6B21A8]">
              Nurse Amaka Eze (NRS-0312)
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          <Link
            href="/triage"
            className="bg-[#6B21A8] hover:bg-[#581c87] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New Vitals Intake</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Waiting for Triage
              </span>

              <span className="text-2xl font-black text-slate-900">
                {waitingCount}
              </span>
            </div>

            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                In Assessment
              </span>

              <span className="text-2xl font-black text-purple-700">
                {inProgressCount}
              </span>
            </div>

            <div className="w-10 h-10 rounded-full bg-purple-50 text-[#6B21A8] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Completed Today
              </span>

              <span className="text-2xl font-black text-emerald-600">
                {completedCount}
              </span>
            </div>

            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
                Clinical Alerts
              </span>

              <span className="text-2xl font-black text-rose-600">
                {urgentCount} Urgent
              </span>
            </div>

            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {(["All", "Waiting", "In Progress", "Completed"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    filter === tab
                      ? "bg-[#6B21A8] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab === "All" ? "All Patients" : tab}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

              <input
                type="text"
                placeholder="Search patient name or ID..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadPatients(true)}
              disabled={loading || refreshing}
              title="Refresh patient queue"
              className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />

              <div>
                <p className="text-xs font-extrabold">
                  Unable to load the patient queue
                </p>

                <p className="text-xs font-medium mt-0.5">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadPatients()}
              className="text-xs font-bold underline whitespace-nowrap"
            >
              Try Again
            </button>
          </div>
        )}

        {/* CLINICAL QUEUE TABLE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Active Clinical Queue ({filteredPatients.length})
              </h3>

              <p className="text-[11px] font-medium text-slate-400 mt-1">
                Patient records are loaded from the hospital database.
              </p>
            </div>

            <span className="text-[11px] font-semibold text-slate-400">
              {refreshing ? "Refreshing..." : "Live"}
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-[#6B21A8] mb-3" />

              <p className="text-sm font-bold text-slate-600">
                Loading patient queue...
              </p>

              <p className="text-xs mt-1">
                Fetching registered patients.
              </p>
            </div>
          ) : filteredPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-6">Patient Info</th>
                    <th className="py-3.5 px-4">Arrival</th>
                    <th className="py-3.5 px-4">Visit Type</th>
                    <th className="py-3.5 px-4">Clinical Alerts</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      {/* PATIENT INFO */}
                      <td className="py-4 px-6">
                        <span className="block font-extrabold text-slate-900 text-sm">
                          {patient.name}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-400">
                          {patient.id} • {patient.age || "—"} yrs •{" "}
                          {patient.gender}
                        </span>
                      </td>

                      {/* ARRIVAL */}
                      <td className="py-4 px-4 font-bold text-slate-700">
                        {patient.arrivalTime}
                      </td>

                      {/* VISIT TYPE */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] uppercase">
                          {patient.visitType}
                        </span>
                      </td>

                      {/* CLINICAL ALERT */}
                      <td className="py-4 px-4">
                        {patient.alertType === "urgent" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 font-bold rounded-full border border-rose-200/80 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />

                            <span>{patient.clinicalAlert}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">
                            {patient.clinicalAlert}
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-4">
                        {patient.status === "IN PROGRESS" && (
                          <span className="px-3 py-1 bg-purple-50 text-purple-700 font-extrabold rounded-full text-[10px] uppercase">
                            In Progress
                          </span>
                        )}

                        {patient.status === "WAITING" && (
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 font-extrabold rounded-full text-[10px] uppercase">
                            Waiting
                          </span>
                        )}

                        {patient.status === "COMPLETED" && (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold rounded-full text-[10px] uppercase">
                            Completed
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handlePatientAction(patient)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            patient.status === "IN PROGRESS"
                              ? "bg-purple-100 hover:bg-purple-200 text-[#6B21A8]"
                              : patient.status === "COMPLETED"
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-[#6B21A8] hover:bg-[#581c87] text-white shadow-xs"
                          }`}
                        >
                          <span>
                            {patient.status === "IN PROGRESS"
                              ? "Continue Form"
                              : patient.status === "COMPLETED"
                              ? "View Patient"
                              : "Start Vitals"}
                          </span>

                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <User className="w-5 h-5 text-slate-400" />
              </div>

              <p className="text-sm font-bold text-slate-600">
                {patients.length === 0
                  ? "No registered patients found."
                  : "No patients match your search or filter."}
              </p>

              <p className="text-xs text-slate-400 mt-1">
                {patients.length === 0
                  ? "Register a patient to add them to the clinical queue."
                  : "Try changing the filter or search term."}
              </p>

              {patients.length === 0 && (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#6B21A8] text-white rounded-xl text-xs font-bold hover:bg-[#581c87] transition"
                >
                  Go to Registration
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      {/* COMPLETED PATIENT MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6B21A8] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    {selectedPatient.name}
                  </h3>

                  <span className="text-xs text-slate-400 font-medium">
                    ID: {selectedPatient.id} • {selectedPatient.age || "—"} yrs
                    • {selectedPatient.gender}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PATIENT SUMMARY */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">
                  Current Status
                </span>

                <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold rounded-full text-[10px] uppercase">
                  Completed
                </span>
              </div>

              <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100">
                <span className="text-purple-700 block font-bold text-[10px] uppercase tracking-wider mb-1">
                  Primary Complaint
                </span>

                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  {selectedPatient.vitalsData?.primaryComplaint ||
                    "No primary complaint recorded."}
                </p>
              </div>

              <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100">
                <span className="text-amber-700 block font-bold text-[10px] uppercase tracking-wider mb-1">
                  Clinical Alert
                </span>

                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  {selectedPatient.clinicalAlert}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">
                  Note
                </span>

                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Detailed historical vitals will be loaded from the clinical
                  record as the nurse/clinical-history integration is completed.
                </p>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const id = selectedPatient.id;

                  setSelectedPatient(null);

                  router.push(
                    `/triage?patientId=${encodeURIComponent(id)}`
                  );
                }}
                className="text-xs font-bold text-[#6B21A8] hover:underline"
              >
                Open Vitals
              </button>

              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
