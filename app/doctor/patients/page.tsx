"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Bell,
  Stethoscope,
  FileText,
  Edit,
  UserCheck,
  Printer,
  Sparkles,
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  isWalkIn?: boolean;
  ageSex: string;
  phone: string;
  lastVisit: string;
  status: "Waiting for Triage" | "In Consultation" | "Completed Today";
}

export default function PatientDirectoryPage() {
  const [globalSearch, setGlobalSearch] = useState("Sarah");
  const [tableSearch, setTableSearch] = useState("");

  const patients: Patient[] = [
    {
      id: "SESH-2026-089",
      name: "Sarah Adams",
      ageSex: "34 Y / F",
      phone: "+234 803 123 4567",
      lastVisit: "May 14, 2026",
      status: "Waiting for Triage",
    },
    {
      id: "SESH-2026-074",
      name: "Tunde Ayodele",
      isWalkIn: true,
      ageSex: "42 Y / M",
      phone: "+234 815 333 4444",
      lastVisit: "June 12, 2026",
      status: "In Consultation",
    },
    {
      id: "SESH-2026-045",
      name: "Chinedu Okafor",
      ageSex: "61 Y / M",
      phone: "+234 902 444 5555",
      lastVisit: "June 10, 2026",
      status: "Completed Today",
    },
    {
      id: "SESH-2026-023",
      name: "Fatima Yusuf",
      ageSex: "19 Y / F",
      phone: "+234 809 555 7777",
      lastVisit: "May 01, 2026",
      status: "Waiting for Triage",
    },
    {
      id: "SESH-2025-998",
      name: "Chioma Nze",
      ageSex: "55 Y / F",
      phone: "+234 803 999 1111",
      lastVisit: "Dec 18, 2025",
      status: "Completed Today",
    },
    {
      id: "SESH-2026-004",
      name: "Abubakar Garba",
      ageSex: "67 Y / M",
      phone: "+234 806 888 2222",
      lastVisit: "April 15, 2026",
      status: "In Consultation",
    },
  ];

  const activityLogs = [
    {
      text: "Dr. James Okoro started consultation with Patient SESH-2026-089",
      time: "3 min ago",
    },
    {
      text: "SESH-2026-045 (Sarah Adams) triage vitals uploaded",
      time: "12 min ago",
    },
    {
      text: "Walk-in check-in completed for Patient SESH-2026-112",
      time: "25 min ago",
    },
    {
      text: "Dr. Adams completed consultation for SESH-2026-012",
      time: "45 min ago",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800 font-sans antialiased">
      {/* GLOBAL NAVBAR */}
      <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <div className="flex items-center gap-2 text-[#0B7285] font-extrabold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-xl bg-[#0B7285] text-white flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <span>
              Sparkle{" "}
              <span className="font-normal text-slate-600 text-sm">
                Eye Specialist
              </span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600">
            <a href="#" className="px-4 py-2 rounded-lg hover:bg-slate-100 transition">
              Dashboard
            </a>
            <a href="#" className="px-4 py-2 bg-purple-100 text-[#6B21A8] rounded-lg transition">
              Patients
            </a>
            <a href="#" className="px-4 py-2 rounded-lg hover:bg-slate-100 transition">
              Visits
            </a>
            <a href="#" className="px-4 py-2 rounded-lg hover:bg-slate-100 transition">
              Reports
            </a>
          </nav>
        </div>

        {/* User Info & Notification */}
        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>

          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
              <div className="w-full h-full bg-[#0B7285] flex items-center justify-center text-white font-bold text-xs">
                AN
              </div>
            </div>
            <div className="text-left leading-tight">
              <span className="block font-bold text-xs text-slate-900">
                Adaora Nwachukwu
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Lead Triage Desk
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
        {/* HEADER TITLE & ACTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Patient Directory & Intake
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Quick search existing patient records or register new arrivals for triage queue.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 px-5 py-3 bg-[#0B7285] hover:bg-[#085a69] text-white font-bold text-xs rounded-xl shadow-xs transition">
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Register New Patient</span>
          </button>
        </div>

        {/* TOP GLOBAL SEARCH INPUT */}
        <div className="relative w-full">
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search patient name, ID, or phone number..."
            className="w-full bg-white border-2 border-indigo-500/80 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <Search className="w-5 h-5 text-indigo-500 absolute left-4 top-4" />
        </div>

        {/* QUICK SEARCH SELECTION BAR */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-amber-100 border border-amber-300 overflow-hidden flex items-center justify-center font-bold text-amber-800 text-sm">
              SA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Sarah Adams</h3>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  SESH-2026-089
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                34 Yrs • Female • +234 803 123 4567
              </p>
            </div>
          </div>

          <Link
            href="/doctor/patients/SESH-2026-089/encounter"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#6B21A8] hover:bg-[#581c87] text-white text-center font-bold text-xs rounded-xl shadow-xs transition"
          >
            Start New Visit
          </Link>
        </div>

        {/* TWO-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT 3-COLUMNS: PATIENTS TABLE */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            {/* Table Header & Local Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <h2 className="font-bold text-sm text-slate-900">
                Active Patient Records
              </h2>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filter directory..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Patients Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3 px-4">Patient ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Age/Sex</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Last Visit</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {patients.map((patient) => {
                    const isHighlighted = patient.id === "SESH-2026-074";
                    return (
                      <tr
                        key={patient.id}
                        className={`transition ${
                          isHighlighted
                            ? "bg-indigo-50/50 hover:bg-indigo-50 border-l-4 border-l-indigo-600"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-indigo-600 whitespace-nowrap">
                          {patient.id}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{patient.name}</span>
                            {patient.isWalkIn && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded-md uppercase">
                                Walk-in
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-semibold">
                          {patient.ageSex}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-semibold">
                          {patient.phone}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                          {patient.lastVisit}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              patient.status === "Waiting for Triage"
                                ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                                : patient.status === "In Consultation"
                                ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                patient.status === "Waiting for Triage"
                                  ? "bg-amber-500"
                                  : patient.status === "In Consultation"
                                  ? "bg-blue-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                            {patient.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            {/* Start Clinical Exam Link */}
                            <Link
                              href={`/doctor/patients/${patient.id}/encounter`}
                              title="Start Exam / Encounter"
                              className="p-1 hover:text-[#0B7285] hover:bg-slate-100 rounded transition"
                            >
                              <Stethoscope className="w-4 h-4" />
                            </Link>

                            {/* View EMR Record Link */}
                            <Link
                              href={`/doctor/patients/${patient.id}`}
                              title="Review Patient EMR"
                              className="p-1 hover:text-[#0B7285] hover:bg-slate-100 rounded transition"
                            >
                              <FileText className="w-4 h-4" />
                            </Link>

                            {/* Edit Info */}
                            <button
                              title="Edit Patient Info"
                              className="p-1 hover:text-[#0B7285] hover:bg-slate-100 rounded transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-medium">
                Showing 6 of 124 patients
              </span>

              <div className="flex items-center gap-1.5">
                <button className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-semibold transition">
                  Previous
                </button>
                <button className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg">
                  1
                </button>
                <button className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold transition">
                  2
                </button>
                <button className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold transition">
                  3
                </button>
                <button className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-semibold transition">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 1-COLUMN: SIDEBAR WIDGETS */}
          <div className="space-y-6">
            {/* TODAY'S TRIAGE SUMMARY */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="font-bold text-xs text-slate-900 tracking-tight">
                Today's Triage Summary
              </h3>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl font-black text-slate-900 block">
                    24
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Visits
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl font-black text-amber-600 block">
                    6
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Waiting
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl font-black text-blue-600 block">
                    8
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    In Progress
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl font-black text-emerald-600 block">
                    10
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Completed
                  </span>
                </div>
              </div>
            </div>

            {/* LIVE ACTIVITY FEED */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="font-bold text-xs text-slate-900 tracking-tight">
                Live Activity Feed
              </h3>

              <div className="space-y-3.5 relative pl-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {activityLogs.map((log, idx) => (
                  <div key={idx} className="relative pl-3 space-y-0.5">
                    <span className="absolute -left-[11px] top-1.5 w-2 h-2 rounded-full bg-indigo-600 border-2 border-white" />
                    <p className="text-xs font-semibold text-slate-700 leading-snug">
                      {log.text}
                    </p>
                    <span className="text-[10px] font-medium text-slate-400 block">
                      {log.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* OPERATIONAL ACTIONS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <h3 className="font-bold text-xs text-slate-900 tracking-tight mb-2">
                Operational Actions
              </h3>

              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-xl text-xs font-bold transition">
                <Plus className="w-4 h-4" />
                <span>Register New Patient</span>
              </button>

              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                <UserCheck className="w-4 h-4 text-slate-500" />
                <span>Walk-in Check-in</span>
              </button>

              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Queue List</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}