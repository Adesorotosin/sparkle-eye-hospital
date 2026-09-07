"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Calendar,
  Stethoscope,
  FileText,
  Activity,
  Filter,
} from "lucide-react";

export default function DoctorDashboard() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "in-consultation" | "completed">("all");

  const doctorQueue = [
    {
      id: "PAT-2026-089",
      fullName: "Amina Bello",
      age: 34,
      gender: "Female",
      triageNote: "Complains of blurred vision and eye strain for 2 weeks.",
      priority: "Normal",
      status: "waiting",
      timeInQueue: "10:45 AM",
    },
    {
      id: "PAT-2026-090",
      fullName: "Chukwudi Okeke",
      age: 45,
      gender: "Male",
      triageNote: "Post-op cataract follow-up check. Mild itching reported.",
      priority: "Priority",
      status: "waiting",
      timeInQueue: "11:00 AM",
    },
    {
      id: "PAT-2026-092",
      fullName: "Zainab Ahmed",
      age: 28,
      gender: "Female",
      triageNote: "Routine comprehensive eye exam. Requesting anti-glare lenses.",
      priority: "Normal",
      status: "completed",
      timeInQueue: "09:15 AM",
    },
  ];

  const filteredQueue = doctorQueue.filter((item) => {
    const matchesSearch =
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStartConsultation = (patientId: string) => {
  router.push(`/doctor/patients/${patientId}/encounter`);
};

  return (
    <div className="min-h-screen w-full bg-[#F3F0F7] text-slate-800 font-sans antialiased">
      {/* TOP HEADER */}
      <header className="w-full bg-[#3F1D85] text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7E57C2] flex items-center justify-center font-bold text-white shadow-xs">
            ✦
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">Sparkle Eye Specialist Hospital</h1>
            <p className="text-[11px] text-purple-200/80 font-medium">Physician Consultation & Patient Queue</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-purple-100 font-medium">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-300" />
            <span>Doctor: <strong className="text-white">Dr. Adebayo Oladipo</strong></span>
          </div>
          <div className="flex items-center gap-2 border-l border-purple-800 pl-6">
            <Calendar className="w-4 h-4 text-purple-300" />
            <span>Sep 4, 2026</span>
          </div>
        </div>
      </header>

      {/* SUB-NAV / METRICS BAR */}
      <div className="bg-[#5E35B1] text-white px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">Waiting for Exam</p>
            <p className="text-xl font-extrabold text-white">2 Patients</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">Consultations Done</p>
            <p className="text-xl font-extrabold text-white">8 Patients</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">Clinic Room</p>
            <p className="text-xl font-extrabold text-white">Optometry Room 03</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-400/20 text-purple-200 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-sm space-y-5">
          
          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#5E35B1]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === "all" ? "bg-[#5E35B1] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("waiting")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === "waiting" ? "bg-[#5E35B1] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Waiting
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === "completed" ? "bg-[#5E35B1] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>

          {/* PATIENT QUEUE TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Triage Notes / Chief Complaint</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Arrival Time</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.fullName}</div>
                      <div className="text-[11px] text-slate-400">{item.id} • {item.age} yrs, {item.gender}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {item.triageNote}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.priority === "Priority" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{item.timeInQueue}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                          item.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleStartConsultation(item.id)}
                        className="px-3.5 py-2 bg-[#5E35B1] hover:bg-[#4527A0] text-white rounded-xl font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5 group cursor-pointer"
                      >
                        <span>{item.status === "completed" ? "Review EMR" : "Start Exam"}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}