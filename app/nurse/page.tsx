"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
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
  Eye,
  FileText,
} from "lucide-react";

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
    visualAcuityOD?: string;
    visualAcuityOS?: string;
    iopOD?: string;
    iopOS?: string;
    bp?: string;
    pulse?: string;
    notes?: string;
  };
}

export default function NurseDashboard() {
  const router = useRouter();
  const [filter, setFilter] = useState<"All" | "Waiting" | "In Progress" | "Completed">("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for View Vitals Modal (Completed Patients)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Logout Handler
  const handleLogout = () => {
    document.cookie = "is_logged_in=; path=/; max-age=0;";
    document.cookie = "user_role=; path=/; max-age=0;";
    document.cookie = "staff_id=; path=/; max-age=0;";
    localStorage.removeItem("sparkle_staff_token");
    window.location.href = "/";
  };

  // Mock Patient Queue Data
  const [patients] = useState<Patient[]>([
    {
      id: "SESH-2026-089",
      name: "Sarah Adams",
      age: 34,
      gender: "Female",
      arrivalTime: "09:15 AM",
      visitType: "WALK-IN",
      clinicalAlert: "IOP Elevation (24 mmHg)",
      alertType: "urgent",
      status: "IN PROGRESS",
    },
    {
      id: "SESH-2026-092",
      name: "Babatunde Adebayo",
      age: 58,
      gender: "Male",
      arrivalTime: "09:30 AM",
      visitType: "APPOINTMENT",
      clinicalAlert: "No active flags",
      alertType: "normal",
      status: "WAITING",
    },
    {
      id: "SESH-2026-095",
      name: "Grace Chukwu",
      age: 42,
      gender: "Female",
      arrivalTime: "09:45 AM",
      visitType: "EMERGENCY",
      clinicalAlert: "Acute Eye Pain & Chemical Splash",
      alertType: "urgent",
      status: "WAITING",
    },
    {
      id: "SESH-2026-078",
      name: "Michael Okon",
      age: 61,
      gender: "Male",
      arrivalTime: "08:40 AM",
      visitType: "APPOINTMENT",
      clinicalAlert: "No active flags",
      alertType: "normal",
      status: "COMPLETED",
      vitalsData: {
        visualAcuityOD: "20/30",
        visualAcuityOS: "20/20",
        iopOD: "15 mmHg",
        iopOS: "16 mmHg",
        bp: "120/80 mmHg",
        pulse: "72 bpm",
        notes: "Routine checkup. No acute eye distress reported.",
      },
    },
  ]);

  // Action Button Router Handler
  const handlePatientAction = (patient: Patient) => {
    if (patient.status === "COMPLETED") {
      // Open modal view for completed vitals
      setSelectedPatient(patient);
    } else {
      // Direct to triage form for WAITING or IN PROGRESS
      router.push(`/triage?patientId=${patient.id}`);
    }
  };

  // Filter & Search Logic
  const filteredPatients = patients.filter((p) => {
    const matchesFilter =
      filter === "All"
        ? true
        : filter === "Waiting"
        ? p.status === "WAITING"
        : filter === "In Progress"
        ? p.status === "IN PROGRESS"
        : p.status === "COMPLETED";

    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800 font-sans antialiased">
      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-200/80 px-6 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6B21A8] text-white flex items-center justify-center font-bold shadow-xs">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 leading-tight">
              Nurse Triage & Vitals Dashboard
            </h1>
            <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase block">
              Sparkle Eye Portal • Live Patient Queue
            </span>
          </div>
        </div>

        {/* LOGOUT & USER PROFILE */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-200/80 px-3.5 py-1.5 rounded-xl">
            <User className="w-4 h-4 text-[#6B21A8]" />
            <span className="text-xs font-bold text-[#6B21A8]">
              Nurse Amaka Eze (NRS-0312)
            </span>
          </div>

          {/* LOGOUT BUTTON */}
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

      {/* STATS OVERVIEW CARDS */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Waiting for Triage
              </span>
              <span className="text-2xl font-black text-slate-900">2</span>
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
              <span className="text-2xl font-black text-purple-700">1</span>
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
              <span className="text-2xl font-black text-emerald-600">1</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
                Critical Eye Flags
              </span>
              <span className="text-2xl font-black text-rose-600">2 Urgent</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* CONTROLS: FILTERS & SEARCH */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {(["All", "Waiting", "In Progress", "Completed"] as const).map((tab) => (
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
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search patient name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        {/* CLINICAL QUEUE TABLE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">
              Active Clinical Queue ({filteredPatients.length})
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Updated Live</span>
          </div>

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
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-purple-50/30 transition-colors">
                      {/* Patient Info */}
                      <td className="py-4 px-6">
                        <span className="block font-extrabold text-slate-900 text-sm">
                          {patient.name}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {patient.id} • {patient.age} yrs • {patient.gender}
                        </span>
                      </td>

                      {/* Arrival */}
                      <td className="py-4 px-4 font-bold text-slate-700">
                        {patient.arrivalTime}
                      </td>

                      {/* Visit Type */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] uppercase">
                          {patient.visitType}
                        </span>
                      </td>

                      {/* Clinical Alert */}
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

                      {/* Status */}
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

                      {/* Action Button */}
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
                              ? "View Vitals"
                              : "Start Vitals"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-medium">
                      No patients found matching your search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* VIEW VITALS SUMMARY MODAL (For COMPLETED status) */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
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
                    ID: {selectedPatient.id} • {selectedPatient.age} yrs • {selectedPatient.gender}
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

            {/* Vitals Clinical Summary Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">
                    Visual Acuity (OD / OS)
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    OD: {selectedPatient.vitalsData?.visualAcuityOD || "20/20"} | OS: {selectedPatient.vitalsData?.visualAcuityOS || "20/20"}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">
                    IOP / Tonometry
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    OD: {selectedPatient.vitalsData?.iopOD || "14 mmHg"} | OS: {selectedPatient.vitalsData?.iopOS || "15 mmHg"}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">
                    Blood Pressure
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {selectedPatient.vitalsData?.bp || "120/80 mmHg"}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-1">
                    Pulse Rate
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {selectedPatient.vitalsData?.pulse || "74 bpm"}
                  </span>
                </div>
              </div>

              {/* Triage Nurse Notes */}
              <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100">
                <span className="text-purple-700 block font-bold text-[10px] uppercase tracking-wider mb-1">
                  Nurse Clinical Assessment Notes
                </span>
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  {selectedPatient.vitalsData?.notes || "No additional preliminary triage warnings recorded."}
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const id = selectedPatient.id;
                  setSelectedPatient(null);
                  router.push(`/triage?patientId=${id}`);
                }}
                className="text-xs font-bold text-[#6B21A8] hover:underline"
              >
                Edit Vitals Record
              </button>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl text-xs transition cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}