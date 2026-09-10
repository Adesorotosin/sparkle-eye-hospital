"use client";

import React, { useState, useMemo } from "react";
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
  X,
  ChevronRight,
  LogOut,
  User,
  CheckCheck,
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
  // --- STATES ---
  const [globalSearch, setGlobalSearch] = useState("Sarah");
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Drawers State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Sample Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New Walk-in Patient Arrived",
      desc: "Tunde Ayodele registered at reception desk.",
      time: "2 mins ago",
      unread: true,
    },
    {
      id: 2,
      title: "Vitals Updated",
      desc: "Sarah Adams triage vitals uploaded by Nurse Grace.",
      time: "10 mins ago",
      unread: true,
    },
    {
      id: 3,
      title: "Lab Results Ready",
      desc: "Optical coherence tomography report for SESH-2026-045 is ready.",
      time: "25 mins ago",
      unread: false,
    },
  ]);

  // Active Selected Patient for Modals
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Initial Patient Data State
  const [patients, setPatients] = useState<Patient[]>([
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
  ]);

  // Form State for Adding / Editing Patient
  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    gender: "F",
    phone: "",
    isWalkIn: false,
    status: "Waiting for Triage" as Patient["status"],
  });

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

  // --- FILTERED DATA COMPUTATION ---
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesGlobal =
        !globalSearch ||
        patient.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
        patient.id.toLowerCase().includes(globalSearch.toLowerCase()) ||
        patient.phone.includes(globalSearch);

      const matchesTable =
        !tableSearch ||
        patient.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
        patient.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        patient.phone.includes(tableSearch);

      return matchesGlobal && matchesTable;
    });
  }, [patients, globalSearch, tableSearch]);

  const quickPatient = useMemo(() => {
    return (
      filteredPatients.find((p) =>
        p.name.toLowerCase().includes(globalSearch.toLowerCase())
      ) ||
      filteredPatients[0] ||
      patients[0]
    );
  }, [filteredPatients, globalSearch, patients]);

  const summaryMetrics = useMemo(() => {
    return {
      total: patients.length,
      waiting: patients.filter((p) => p.status === "Waiting for Triage").length,
      inProgress: patients.filter((p) => p.status === "In Consultation").length,
      completed: patients.filter((p) => p.status === "Completed Today").length,
    };
  }, [patients]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // --- HANDLERS ---
  const handleOpenRegisterModal = (isWalkIn = false) => {
    setPatientForm({
      name: "",
      age: "",
      gender: "F",
      phone: "+234 ",
      isWalkIn: isWalkIn,
      status: "Waiting for Triage",
    });
    setIsRegisterOpen(true);
  };

  const handleSaveNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.name || !patientForm.phone) return;

    const newId = `SESH-2026-${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    const newPatient: Patient = {
      id: newId,
      name: patientForm.name,
      ageSex: `${patientForm.age || "30"} Y / ${patientForm.gender}`,
      phone: patientForm.phone,
      lastVisit: today,
      isWalkIn: patientForm.isWalkIn,
      status: patientForm.status,
    };

    setPatients([newPatient, ...patients]);
    setIsRegisterOpen(false);
  };

  const handleOpenEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    const [agePart, genderPart] = patient.ageSex.split(" / ");
    setPatientForm({
      name: patient.name,
      age: agePart.replace(" Y", ""),
      gender: genderPart || "F",
      phone: patient.phone,
      isWalkIn: !!patient.isWalkIn,
      status: patient.status,
    });
    setIsEditOpen(true);
  };

  const handleSaveEditPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    setPatients((prev) =>
      prev.map((p) =>
        p.id === editingPatient.id
          ? {
              ...p,
              name: patientForm.name,
              ageSex: `${patientForm.age} Y / ${patientForm.gender}`,
              phone: patientForm.phone,
              isWalkIn: patientForm.isWalkIn,
              status: patientForm.status,
            }
          : p
      )
    );
    setIsEditOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800 font-sans antialiased">
      {/* TOP NAVBAR (CLEANED - NO LOGO, NO LINKS) */}
      <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-4 relative">
          {/* CLICKABLE BELL ICON BUTTON */}
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition focus:outline-none"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* NOTIFICATIONS DROPDOWN PANEL */}
          {isNotificationsOpen && (
            <div className="absolute right-12 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-slate-900">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border text-xs transition ${
                      item.unread
                        ? "bg-indigo-50/40 border-indigo-100"
                        : "bg-slate-50/60 border-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-900 leading-snug">
                        {item.title}
                      </p>
                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap ml-2">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-1 leading-normal">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USER PROFILE INFO */}
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-3 pl-3 border-l border-slate-200 text-left focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-full bg-[#0B7285] text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:ring-2 ring-indigo-500 transition">
              AN
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="block font-bold text-xs text-slate-900">
                Adaora Nwachukwu
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Lead Triage Desk
              </span>
            </div>
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs space-y-1">
              <Link
                href="/doctor/profile"
                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition"
              >
                <User className="w-4 h-4" /> Profile Settings
              </Link>
              <button
                onClick={() => alert("Logged out successfully")}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
        {/* BREADCRUMB ROUTING NAVIGATION */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link
            href="/doctor/dashboard"
            className="hover:text-slate-700 transition"
          >
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-bold">Patients</span>
        </nav>

        {/* HEADER TITLE & ACTION BUTTON */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Patient Directory & Intake
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Quick search existing patient records or register new arrivals
              for triage queue.
            </p>
          </div>

          <button
            onClick={() => handleOpenRegisterModal(false)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-[#0B7285] hover:bg-[#085a69] text-white font-bold text-xs rounded-2xl shadow-xs transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Register New Patient</span>
          </button>
        </div>

        {/* GLOBAL SEARCH */}
        <div className="relative w-full">
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search patient name, ID, or phone number..."
            className="w-full bg-white border-2 border-indigo-500/80 rounded-2xl py-3.5 pl-11 pr-10 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <Search className="w-5 h-5 text-indigo-500 absolute left-4 top-4" />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch("")}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* QUICK SEARCH SELECTION BAR */}
        {quickPatient && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-800 text-sm">
                {quickPatient.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    {quickPatient.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {quickPatient.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {quickPatient.ageSex} • {quickPatient.phone}
                </p>
              </div>
            </div>

            <Link
              href={`/doctor/patients/${quickPatient.id}/encounter`}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#6B21A8] hover:bg-[#581c87] text-white text-center font-bold text-xs rounded-xl shadow-xs transition"
            >
              Start New Visit
            </Link>
          </div>
        )}

        {/* MAIN DATA GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <h2 className="font-bold text-sm text-slate-900">
                Active Patient Records ({filteredPatients.length})
              </h2>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filter directory..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                {tableSearch && (
                  <button
                    onClick={() => setTableSearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

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
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-slate-400 font-semibold"
                      >
                        No matching patient records found.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => {
                      const isHighlighted = patient.id === quickPatient?.id;
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
                              <Link
                                href={`/doctor/patients/${patient.id}/encounter`}
                                title="Start Exam / Encounter"
                                className="p-1.5 hover:text-[#0B7285] hover:bg-slate-100 rounded transition"
                              >
                                <Stethoscope className="w-4 h-4" />
                              </Link>
                              <Link
                                href={`/doctor/patients/${patient.id}`}
                                title="Review Patient EMR"
                                className="p-1.5 hover:text-[#0B7285] hover:bg-slate-100 rounded transition"
                              >
                                <FileText className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleOpenEditModal(patient)}
                                title="Edit Patient Info"
                                className="p-1.5 hover:text-[#0B7285] hover:bg-slate-100 rounded transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-medium">
                Showing {filteredPatients.length} of {patients.length} patients
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-semibold transition disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`px-3 py-1.5 font-bold rounded-lg ${
                    currentPage === 1
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  1
                </button>
                <button
                  onClick={() => setCurrentPage(2)}
                  className={`px-3 py-1.5 font-bold rounded-lg ${
                    currentPage === 2
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  2
                </button>
                <button
                  disabled={currentPage === 2}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-semibold transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* SIDEBAR WIDGETS */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="font-bold text-xs text-slate-900 tracking-tight">
                Today's Triage Summary
              </h3>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl font-black text-slate-900 block">
                    {summaryMetrics.total}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Visits
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl font-black text-amber-600 block">
                    {summaryMetrics.waiting}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Waiting
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl font-black text-blue-600 block">
                    {summaryMetrics.inProgress}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    In Progress
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-2xl font-black text-emerald-600 block">
                    {summaryMetrics.completed}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Completed
                  </span>
                </div>
              </div>
            </div>

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

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <h3 className="font-bold text-xs text-slate-900 tracking-tight mb-2">
                Operational Actions
              </h3>

              <button
                onClick={() => handleOpenRegisterModal(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-xl text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Patient</span>
              </button>

              <button
                onClick={() => handleOpenRegisterModal(true)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <UserCheck className="w-4 h-4 text-slate-500" />
                <span>Walk-in Check-in</span>
              </button>

              <button
                onClick={() => window.print()}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Queue List</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* REGISTER PATIENT MODAL */}
      {isRegisterOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {patientForm.isWalkIn
                  ? "Walk-in Patient Check-in"
                  : "Register New Patient"}
              </h3>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPatient} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Samuel Okon"
                  value={patientForm.name}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, name: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Age
                  </label>
                  <input
                    required
                    type="number"
                    placeholder="35"
                    value={patientForm.age}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, age: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        gender: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  required
                  type="text"
                  value={patientForm.phone}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, phone: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={patientForm.status}
                  onChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      status: e.target.value as Patient["status"],
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="Waiting for Triage">Waiting for Triage</option>
                  <option value="In Consultation">In Consultation</option>
                  <option value="Completed Today">Completed Today</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B7285] hover:bg-[#085a69] text-white rounded-xl font-bold"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PATIENT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Edit Patient Record ({editingPatient?.id})
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveEditPatient}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={patientForm.name}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, name: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Age
                  </label>
                  <input
                    required
                    type="number"
                    value={patientForm.age}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, age: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        gender: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  required
                  type="text"
                  value={patientForm.phone}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, phone: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={patientForm.status}
                  onChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      status: e.target.value as Patient["status"],
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="Waiting for Triage">Waiting for Triage</option>
                  <option value="In Consultation">In Consultation</option>
                  <option value="Completed Today">Completed Today</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}