"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
  ShieldAlert,
  Users,
  Bell,
} from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  staffMember: string;
  role: string;
  actionCategory: string;
  actionType: "standard" | "discount" | "override";
  details: string;
  ipAddress: string;
}

export default function AuditTrailDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("Aug 25 – Aug 27, 2026");
  const [staffFilter, setStaffFilter] = useState("All Staff");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [roleFilter, setRoleFilter] = useState("All Roles");

  // Static Audit Logs Data using explicit string IDs
  const auditLogs: AuditLog[] = [
    {
      id: "log-1",
      timestamp: "Aug 27, 10:42 AM",
      staffMember: "Dr. Ananya Mehta",
      role: "Ophthalmologist",
      actionCategory: "Patient Record View",
      actionType: "standard",
      details: "Accessed record SPK-30892",
      ipAddress: "192.168.1.45",
    },
    {
      id: "log-2",
      timestamp: "Aug 27, 10:38 AM",
      staffMember: "Folake Adeyemi",
      role: "Cashier",
      actionCategory: "Invoice Created",
      actionType: "standard",
      details: "Generated INV-2026-4851 for ₦69,700",
      ipAddress: "192.168.1.22",
    },
    {
      id: "log-3",
      timestamp: "Aug 27, 10:35 AM",
      staffMember: "Folake Adeyemi",
      role: "Cashier",
      actionCategory: "Discount Applied",
      actionType: "discount",
      details: "₦5,000 discount on INV-2026-4851 — Approved by Admin PIN",
      ipAddress: "192.168.1.22",
    },
    {
      id: "log-4",
      timestamp: "Aug 27, 10:30 AM",
      staffMember: "Nurse Amaka Eze",
      role: "Nurse",
      actionCategory: "Prescription Sent",
      actionType: "standard",
      details: "Routed Rx #7831 to pharmacy queue",
      ipAddress: "192.168.1.33",
    },
    {
      id: "log-5",
      timestamp: "Aug 27, 10:22 AM",
      staffMember: "Sys. Admin Chidi",
      role: "IT Admin",
      actionCategory: "System Override",
      actionType: "override",
      details: "Manual price correction on Tonometry — ₦8,000 → ₦7,500",
      ipAddress: "192.168.1.10",
    },
    {
      id: "log-6",
      timestamp: "Aug 27, 10:15 AM",
      staffMember: "Dr. Ananya Mehta",
      role: "Ophthalmologist",
      actionCategory: "Diagnosis Entry",
      actionType: "standard",
      details: "Added Diabetic Retinopathy to SPK-30892",
      ipAddress: "192.168.1.45",
    },
    {
      id: "log-7",
      timestamp: "Aug 27, 09:58 AM",
      staffMember: "Folake Adeyemi",
      role: "Cashier",
      actionCategory: "Price Adjustment",
      actionType: "discount",
      details: "Unit price edit: Eye Shield ₦3,000 → ₦2,500 — Manager approved",
      ipAddress: "192.168.1.22",
    },
    {
      id: "log-8",
      timestamp: "Aug 27, 09:45 AM",
      staffMember: "Reception Yemi",
      role: "Receptionist",
      actionCategory: "Patient Check-In",
      actionType: "standard",
      details: "Checked in Mrs. Chidinma Okafor SPK-30892",
      ipAddress: "192.168.1.18",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F3F5F8] text-slate-800 font-sans antialiased flex flex-col justify-between">
      <div>
        {/* HEADER */}
        <header className="sticky top-0 z-30 w-full bg-[#0F3A48] text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00A3BF] flex items-center justify-center font-bold text-white shadow-xs">
              ✦
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">
                SPARKLE EYE HOSPITAL
              </h1>
              <p className="text-[11px] text-teal-200/90 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                Admin: Security & Audit Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-right">
              <div className="w-8 h-8 rounded-full bg-[#174C5E] border border-teal-400/30 flex items-center justify-center font-bold text-xs text-teal-100">
                BO
              </div>
              <div>
                <span className="text-xs font-bold block text-white">
                  Adm. Bola Ogundimu
                </span>
                <span className="text-[10px] text-teal-200/80">
                  Chief Security Officer
                </span>
              </div>
            </div>

            <button className="relative p-2 text-teal-100 hover:text-white bg-[#174C5E] rounded-lg transition">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            <button className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Workstation</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="max-w-7xl mx-auto p-6 space-y-6">
          {/* TAMPER-PROOF LEDGER BANNER */}
          <div className="bg-[#E6F4F1] border border-teal-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs font-medium text-[#0F3A48]">
            <ShieldCheck className="w-5 h-5 text-[#0B7285] shrink-0" />
            <span>
              <strong className="font-bold uppercase tracking-wider">
                Tamper-Proof Ledger:
              </strong>{" "}
              Records are cryptographically sealed, monitored in real-time, and
              cannot be modified or deleted.
            </span>
          </div>

          {/* FILTERS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Date Range Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Date Range
              </label>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 pr-8 rounded-xl focus:outline-none focus:border-[#0B7285]"
                >
                  <option>Aug 25 – Aug 27, 2026</option>
                  <option>Today (Aug 27, 2026)</option>
                  <option>Past 7 Days</option>
                  <option>Past 30 Days</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Staff Member Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Staff Member
              </label>
              <div className="relative">
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 pr-8 rounded-xl focus:outline-none focus:border-[#0B7285]"
                >
                  <option>All Staff</option>
                  <option>Dr. Ananya Mehta</option>
                  <option>Folake Adeyemi</option>
                  <option>Nurse Amaka Eze</option>
                  <option>Sys. Admin Chidi</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Action Category Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Action Category
              </label>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 pr-8 rounded-xl focus:outline-none focus:border-[#0B7285]"
                >
                  <option>All Categories</option>
                  <option>Patient Record View</option>
                  <option>Invoice Created</option>
                  <option>Discount Applied</option>
                  <option>System Override</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Role Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Role Filter
              </label>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 pr-8 rounded-xl focus:outline-none focus:border-[#0B7285]"
                >
                  <option>All Roles</option>
                  <option>Ophthalmologist</option>
                  <option>Cashier</option>
                  <option>Nurse</option>
                  <option>IT Admin</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Keyword Search */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Keyword Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by keyword or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium py-2.5 pl-9 pr-3 rounded-xl focus:outline-none focus:border-[#0B7285] placeholder:text-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Actions */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Actions Today
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    284
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    ↗ +14%
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B7285]">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            {/* Price Adjustments */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Price Adjustments
                </span>
                <span className="text-2xl font-extrabold text-slate-900">
                  12
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            {/* System Overrides */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  System Overrides
                </span>
                <span className="text-2xl font-extrabold text-slate-900">
                  3
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Active Sessions
                </span>
                <span className="text-2xl font-extrabold text-slate-900">
                  8
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052CC]">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* AUDIT TRAIL TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-4 w-3"></th>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Action Category</th>
                    <th className="py-3.5 px-4">Details</th>
                    <th className="py-3.5 px-4 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      {/* Action Category Status Indicator Line */}
                      <td className="py-3 px-1">
                        <div
                          className={`w-1.5 h-6 rounded-r-full ${
                            log.actionType === "standard"
                              ? "bg-emerald-500"
                              : log.actionType === "discount"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        ></div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 font-semibold text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>

                      {/* Staff Member */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {log.staffMember}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200/60 text-slate-600 font-bold rounded-lg text-[10px]">
                          {log.role}
                        </span>
                      </td>

                      {/* Action Category */}
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <span
                          className={
                            log.actionType === "standard"
                              ? "text-[#0B7285]"
                              : log.actionType === "discount"
                              ? "text-amber-700"
                              : "text-rose-600"
                          }
                        >
                          {log.actionCategory}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {log.details}
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER / PAGINATION */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-800">1–8</strong> of{" "}
                <strong className="text-slate-800">284</strong> entries
              </span>

              <div className="flex items-center gap-1.5">
                <button className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-3 py-1.5 bg-[#0B7285] text-white font-bold rounded-lg text-xs shadow-xs">
                  1
                </button>
                <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-lg text-xs transition">
                  2
                </button>
                <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-lg text-xs transition">
                  3
                </button>
                <button className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-800 hover:text-white rounded-lg transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* LEGEND BAR */}
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-600 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Standard Action</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Discount / Price Change</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>System Override</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}