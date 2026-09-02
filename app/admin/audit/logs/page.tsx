"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Search,
  Download,
  FileSpreadsheet,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  ShieldAlert,
} from "lucide-react";

// --- Types ---
interface AuditLogEvent {
  id: string;
  timestamp: string;
  user: string;
  staffId: string;
  role: string;
  roleColor: string;
  action: string;
  ipAddress: string;
  device: string;
  riskLevel: "CRITICAL" | "MEDIUM" | "LOW";
}

interface SecurityAlert {
  id: string;
  title: string;
  timestamp: string;
  actionText: string;
  type: "critical" | "warning";
}

// --- Mock Data ---
const INITIAL_LOGS: AuditLogEvent[] = [
  {
    id: "1",
    timestamp: "2026-08-30 10:42:33",
    user: "unknown",
    staffId: "—",
    role: "—",
    roleColor: "bg-slate-100 text-slate-600 border-slate-200",
    action: "Failed Password Attempt (12th try)",
    ipAddress: "192.168.1.45",
    device: "Chrome Win11",
    riskLevel: "CRITICAL",
  },
  {
    id: "2",
    timestamp: "2026-08-30 10:41:15",
    user: "Dr. Ananya Mehta",
    staffId: "DOC-2201",
    role: "Ophthalmologist",
    roleColor: "bg-purple-100 text-purple-700 border-purple-200",
    action: "Viewed Medical Record #SPK-30892",
    ipAddress: "192.168.1.50",
    device: "Workstation-A3",
    riskLevel: "LOW",
  },
  {
    id: "3",
    timestamp: "2026-08-30 10:38:44",
    user: "Folake Adeyemi",
    staffId: "NRS-0445",
    role: "Cashier",
    roleColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    action: "Attempted Billing Override — INV-2026-4920",
    ipAddress: "192.168.1.22",
    device: "POS Terminal 2",
    riskLevel: "MEDIUM",
  },
  {
    id: "4",
    timestamp: "2026-08-30 10:35:20",
    user: "Nurse Amaka Eze",
    staffId: "NRS-0312",
    role: "Nurse",
    roleColor: "bg-blue-100 text-blue-700 border-blue-200",
    action: "Dispensed Medication Rx #7845",
    ipAddress: "192.168.1.33",
    device: "Pharmacy Station",
    riskLevel: "LOW",
  },
  {
    id: "5",
    timestamp: "2026-08-30 10:33:08",
    user: "Sys. Admin Chidi",
    staffId: "ADM-0100",
    role: "IT Admin",
    roleColor: "bg-rose-100 text-rose-700 border-rose-200",
    action: "System Override: Modified Drug Price Table",
    ipAddress: "192.168.1.10",
    device: "Admin Console",
    riskLevel: "CRITICAL",
  },
  {
    id: "6",
    timestamp: "2026-08-30 10:30:55",
    user: "Dr. Fatima Hassan",
    staffId: "DOC-2215",
    role: "Ophthalmologist",
    roleColor: "bg-purple-100 text-purple-700 border-purple-200",
    action: "Signed Prescription Rx #7842",
    ipAddress: "192.168.1.48",
    device: "Workstation-B1",
    riskLevel: "LOW",
  },
  {
    id: "7",
    timestamp: "2026-08-30 10:28:17",
    user: "Reception Yemi",
    staffId: "REC-0089",
    role: "Receptionist",
    roleColor: "bg-amber-100 text-amber-700 border-amber-200",
    action: "Exported Patient List (42 records)",
    ipAddress: "192.168.1.18",
    device: "Front Desk",
    riskLevel: "MEDIUM",
  },
  {
    id: "8",
    timestamp: "2026-08-30 10:25:40",
    user: "Tech. Blessing Ade",
    staffId: "TEC-0156",
    role: "Technician",
    roleColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    action: "Uploaded OCT Scan Result — SPK-30801",
    ipAddress: "192.168.1.40",
    device: "OCT Room",
    riskLevel: "LOW",
  },
  {
    id: "9",
    timestamp: "2026-08-30 02:15:03",
    user: "Dr. Emeka Obi",
    staffId: "DOC-2208",
    role: "Ophthalmologist",
    roleColor: "bg-purple-100 text-purple-700 border-purple-200",
    action: "After-Hours Record Access — SPK-29444",
    ipAddress: "41.58.120.77",
    device: "Unknown Mobile",
    riskLevel: "CRITICAL",
  },
  {
    id: "10",
    timestamp: "2026-08-29 17:45:22",
    user: "Folake Adeyemi",
    staffId: "NRS-0445",
    role: "Cashier",
    roleColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    action: "Processed Payment INV-2026-4851 — ₦64,700",
    ipAddress: "192.168.1.22",
    device: "POS Terminal 2",
    riskLevel: "LOW",
  },
  {
    id: "11",
    timestamp: "2026-08-29 16:30:11",
    user: "Sys. Admin Chidi",
    staffId: "ADM-0100",
    role: "IT Admin",
    roleColor: "bg-rose-100 text-rose-700 border-rose-200",
    action: "Changed User Permissions — NRS-0445 elevated",
    ipAddress: "192.168.1.10",
    device: "Admin Console",
    riskLevel: "MEDIUM",
  },
  {
    id: "12",
    timestamp: "2026-08-29 15:12:05",
    user: "Dr. Ananya Mehta",
    staffId: "DOC-2201",
    role: "Ophthalmologist",
    roleColor: "bg-purple-100 text-purple-700 border-purple-200",
    action: "Created Referral — SPK-30892 to Retina Specialist",
    ipAddress: "192.168.1.50",
    device: "Workstation-A3",
    riskLevel: "LOW",
  },
];

const SECURITY_ALERTS: SecurityAlert[] = [
  {
    id: "a1",
    title: "Multiple Failed Logins from IP 192.168.1.45 — 12 attempts in 5 min",
    timestamp: "10:42 AM",
    actionText: "Revoke User Session",
    type: "critical",
  },
  {
    id: "a2",
    title: "Unusual Billing Override Pattern — Staff ID NRS-0445",
    timestamp: "10:38 AM",
    actionText: "Investigate",
    type: "warning",
  },
  {
    id: "a3",
    title: "After-Hours Record Access — Dr. account from unknown device",
    timestamp: "02:15 AM",
    actionText: "Review Access",
    type: "critical",
  },
];

export default function AuditLogViewerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [activeFilters, setActiveFilters] = useState([
    { id: "severity", label: "All Severity Levels" },
    { id: "source", label: "All Systems" },
    { id: "timeframe", label: "Past 5 Days" },
  ]);

  const removeFilter = (id: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const filteredLogs = INITIAL_LOGS.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      severityFilter === "ALL" || log.riskLevel === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Security & System Audit Logs
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Log Stream: Active
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              HOSPITAL SYSTEM COMPLIANCE PORTAL — Last synced: 2 seconds ago
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              AN
            </div>
            <div>
              <div className="text-slate-900 font-semibold leading-tight">
                Adaeze Nnaji
              </div>
              <div className="text-[10px] text-slate-500">Compliance Officer</div>
            </div>
          </div>

          <button
            type="button"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            Emergency Lockdown
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Filter Toolbar & Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Aug 25, 2026 — Aug 30, 2026</span>
              </div>

              {/* Severity Dropdown */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Severity: All Levels</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="MEDIUM">Medium Only</option>
                <option value="LOW">Low Only</option>
              </select>

              {/* Source Dropdown */}
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500">
                <option value="ALL">Source: All Systems</option>
                <option value="EHR">EHR Module</option>
                <option value="BILLING">Billing & POS</option>
                <option value="ADMIN">Admin Console</option>
              </select>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by staff name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                Export Logs
              </button>
              <button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Generate Compliance Report
              </button>
            </div>
          </div>

          {/* Active Filter Badges */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ACTIVE FILTERS:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((filter) => (
                <span
                  key={filter.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {filter.label}
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="hover:text-indigo-900 p-0.5 rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              TOTAL EVENTS (24H)
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-900">1,847</span>
              <span className="text-xs text-emerald-600 font-bold">
                +12% vs. yesterday
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              SECURITY WARNINGS
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-600">23</span>
              <span className="text-xs text-amber-700 font-semibold">
                3 unresolved
              </span>
            </div>
          </div>

          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              CRITICAL ALERTS
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-rose-600">4</span>
              <span className="text-xs text-rose-700 font-bold">
                2 require action
              </span>
            </div>
          </div>

          {/* Active Security Threat Banner */}
          <div className="md:col-span-3 lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-rose-600 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                ACTIVE SECURITY ALERTS
              </span>
              <span className="text-slate-400 font-normal">
                3 THREATENING
              </span>
            </div>

            <div className="mt-2 space-y-2">
              {SECURITY_ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="truncate pr-2">
                    <p className="text-slate-800 font-semibold truncate">
                      {alert.title}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {alert.timestamp}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-[11px] font-bold px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200 transition-colors cursor-pointer"
                  >
                    {alert.actionText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="py-3 px-4">TIMESTAMP</th>
                  <th className="py-3 px-4">USER / STAFF ID</th>
                  <th className="py-3 px-4">ROLE</th>
                  <th className="py-3 px-6">ACTION PERFORMED</th>
                  <th className="py-3 px-4">IP ADDRESS / DEVICE</th>
                  <th className="py-3 px-4 text-right">RISK LEVEL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-900 whitespace-nowrap">
                      <div>{log.user}</div>
                      {log.staffId !== "—" && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          ({log.staffId})
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-sans">
                      {log.role !== "—" ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${log.roleColor}`}
                        >
                          {log.role}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-sans text-slate-800 font-medium">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">
                        {log.ipAddress}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        / {log.device}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          log.riskLevel === "CRITICAL"
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : log.riskLevel === "MEDIUM"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {log.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
            <span>Showing 1–12 of 1,847 events</span>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-hidden">
                  <option value="12">12</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled
                  className="p-1 rounded bg-white border border-slate-200 text-slate-300 cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="px-2 py-1 rounded bg-indigo-600 text-white font-bold">
                  1
                </button>
                <button className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700">
                  2
                </button>
                <button className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700">
                  3
                </button>
                <span className="px-1 text-slate-400">...</span>
                <button className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700">
                  154
                </button>
                <button className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legal / Compliance Footer */}
        <div className="text-center text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5 pt-2">
          <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
          <span>
            All audit logs are cryptographically signed, tamper-evident, and
            retained for 7 years per healthcare compliance regulations
            (HIPAA/NDPR).
          </span>
        </div>
      </main>
    </div>
  );
}