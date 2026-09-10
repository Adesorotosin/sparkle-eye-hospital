"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Clock,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  Filter,
  Bell,
  Check,
  AlertCircle,
  X,
} from "lucide-react";

export default function DoctorDashboard() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "in-consultation" | "completed">("all");

  // Notification State
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Urgent Triage Alert",
      message: "Chukwudi Okeke added to high-priority cataract queue.",
      time: "10 mins ago",
      read: false,
      type: "urgent",
    },
    {
      id: 2,
      title: "Lab Results Ready",
      message: "Margaret Chen's OCT Optical Scan reports uploaded.",
      time: "25 mins ago",
      read: false,
      type: "info",
    },
    {
      id: 3,
      title: "Appointment Rescheduled",
      message: "Zainab Ahmed updated appointment time to 2:00 PM.",
      time: "1 hour ago",
      read: true,
      type: "info",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

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
      {/* SINGLE TOP HEADER WITH WORKING BELL ICON */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 w-96">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search patient records, charts, or orders... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5E35B1] transition"
            />
            <span className="absolute right-2.5 top-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
              ⌘K
            </span>
          </div>
        </div>

        {/* NOTIFICATION BELL & POPUP */}
        <div className="flex items-center gap-4 relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-purple-50 hover:text-[#5E35B1] transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#5E35B1] font-bold text-[10px]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-[#5E35B1] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark read
                    </button>
                  )}
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 transition flex gap-3 ${
                      item.read ? "bg-white" : "bg-purple-50/40"
                    }`}
                  >
                    <div className="pt-0.5">
                      {item.type === "urgent" ? (
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#5E35B1] shrink-0" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <p
                          className={`font-bold text-xs ${
                            item.read ? "text-slate-700" : "text-slate-900"
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* METRICS & QUICK SUMMARY BAR */}
      <div className="bg-[#5E35B1] text-white px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Waiting for Exam
            </p>
            <p className="text-2xl font-extrabold text-white">2 Patients</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Consultations Done
            </p>
            <p className="text-2xl font-extrabold text-white">8 Patients</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Clinic Room
            </p>
            <p className="text-2xl font-extrabold text-white">Optometry Room 03</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-400/20 text-purple-200 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-sm space-y-5">
          {/* FILTER CONTROLS */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-[#5E35B1] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("waiting")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === "waiting"
                      ? "bg-[#5E35B1] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Waiting
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === "completed"
                      ? "bg-[#5E35B1] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
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
                      <div className="text-[11px] text-slate-400">
                        {item.id} • {item.age} yrs, {item.gender}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {item.triageNote}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.priority === "Priority"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
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
                        <span>
                          {item.status === "completed" ? "Review EMR" : "Start Exam"}
                        </span>
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