"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Download,
  FileSpreadsheet,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  ShieldAlert,
  Activity,
  Shield,
  Eye,
  AlertTriangle,
  FileText,
} from "lucide-react";

// --- Types ---
type TabType = "OPERATIONS" | "SECURITY";

interface OperationalLog {
  id: string;
  timestamp: string;
  user: string;
  staffId: string;
  role: string;
  roleColor: string;
  category: "CLINICAL" | "BILLING" | "ADMIN";
  action: string;
  details: string;
  financialAmount?: string;
  metadata: Record<string, string | number>;
}

interface SecurityLog {
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

interface AuthenticatedUser {
  id?: string;
  staffId?: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  title?: string;
  department?: string;
}

export default function UnifiedAuditDashboard() {
  // Shared Workspace State
  const [activeTab, setActiveTab] = useState<TabType>("OPERATIONS");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [selectedOperationalLog, setSelectedOperationalLog] =
    useState<OperationalLog | null>(null);

  const [operationalLogs, setOperationalLogs] = useState<OperationalLog[]>(
    []
  );
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);

  const [currentUser, setCurrentUser] =
    useState<AuthenticatedUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAuditData() {
      try {
        const [meRes, opRes, secRes] = await Promise.all([
          fetch("/api/auth/me", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/activity-logs", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/security-logs", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();

          if (!cancelled) {
            setCurrentUser(meData?.user ?? null);
          }
        }

        if (opRes.ok) {
          const { logs } = await opRes.json();

          if (!cancelled) {
            setOperationalLogs(Array.isArray(logs) ? logs : []);
          }
        }

        if (secRes.ok) {
          const { logs, alerts } = await secRes.json();

          if (!cancelled) {
            setSecurityLogs(Array.isArray(logs) ? logs : []);
            setSecurityAlerts(Array.isArray(alerts) ? alerts : []);
          }
        }
      } catch (err) {
        console.error("Failed to load audit data:", err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAuditData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Current authenticated user's display information
  const currentUserName =
    currentUser?.name ||
    currentUser?.username ||
    "Authenticated Administrator";

  const currentUserRole =
    currentUser?.title ||
    currentUser?.role ||
    "Administrator";

  const currentUserInitials = useMemo(() => {
    const name = currentUserName.trim();

    if (!name) {
      return "AD";
    }

    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [currentUserName]);

  // Filter Logic
  const filteredOperationalLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return operationalLogs.filter((log) => {
      const matchesSearch =
        !query ||
        log.user.toLowerCase().includes(query) ||
        log.staffId.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "ALL" || log.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [operationalLogs, searchQuery, categoryFilter]);

  const filteredSecurityLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return securityLogs.filter((log) => {
      const matchesSearch =
        !query ||
        log.user.toLowerCase().includes(query) ||
        log.staffId.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.ipAddress.toLowerCase().includes(query) ||
        log.device.toLowerCase().includes(query);

      const matchesSeverity =
        severityFilter === "ALL" || log.riskLevel === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [securityLogs, searchQuery, severityFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            Loading audit data…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Workspace Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        {/* Left: Page Context & Live Status */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            Audit & Compliance Logs
          </h1>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>

        {/* Right: Active User & Security Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
              {currentUserInitials}
            </div>

            <div className="hidden sm:block">
              <span className="text-slate-900 font-semibold block leading-tight">
                {currentUserName}
              </span>

              <span className="text-[10px] text-slate-500 block leading-tight">
                {currentUserRole}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled
            title="Emergency lockdown is not connected to a live system-wide control."
            className="bg-slate-100 text-slate-400 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-200 cursor-not-allowed"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              Emergency Lockdown
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("OPERATIONS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "OPERATIONS"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="h-4 w-4" />

              Clinical & Operational Logs

              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700">
                {operationalLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SECURITY")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "SECURITY"
                  ? "bg-white text-rose-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Shield className="h-4 w-4" />

              Security Threats & Auth Logs

              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700">
                {securityLogs.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Audit export is not connected on this page yet."
              className="bg-slate-100 text-slate-400 font-semibold text-xs px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>

            <button
              type="button"
              disabled
              title="Audit reporting is not connected on this page yet."
              className="bg-slate-100 text-slate-400 font-semibold text-xs px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-not-allowed"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Report
            </button>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />

              <span>
                Current audit records
              </span>
            </div>

            {/* Contextual Filter Switches */}
            {activeTab === "OPERATIONS" ? (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">
                  Category: All Types
                </option>

                <option value="CLINICAL">
                  Clinical Only
                </option>

                <option value="BILLING">
                  Billing Only
                </option>

                <option value="ADMIN">
                  Admin Only
                </option>
              </select>
            ) : (
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">
                  Severity: All Levels
                </option>

                <option value="CRITICAL">
                  Critical Only
                </option>

                <option value="MEDIUM">
                  Medium Only
                </option>

                <option value="LOW">
                  Low Only
                </option>
              </select>
            )}

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />

              <input
                type="text"
                placeholder="Search staff, action, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {(searchQuery ||
            categoryFilter !== "ALL" ||
            severityFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("ALL");
                setSeverityFilter("ALL");
              }}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3 w-3" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Tab-Specific Metrics Summary */}
        {activeTab === "SECURITY" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 shadow-xs flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-rose-700 uppercase">
                  CRITICAL THREATS
                </div>

                <div className="text-2xl font-black text-rose-600 mt-1">
                  {
                    securityAlerts.filter(
                      (a) => a.type === "critical"
                    ).length
                  }{" "}
                  Active
                </div>
              </div>

              <AlertTriangle className="h-8 w-8 text-rose-400" />
            </div>

            <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase">
                ACTIVE THREAT FEED
              </div>

              {securityAlerts.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">
                  No active alerts in the last 24 hours.
                </p>
              ) : (
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-800">
                    {securityAlerts[0].title}
                  </span>

                  <button
                    type="button"
                    disabled
                    title="Threat response workflow is not connected."
                    className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-400 cursor-not-allowed"
                  >
                    {securityAlerts[0].actionText}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tables Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {activeTab === "OPERATIONS" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    <th className="py-3 px-4">
                      TIMESTAMP
                    </th>

                    <th className="py-3 px-4">
                      USER / STAFF ID
                    </th>

                    <th className="py-3 px-4">
                      CATEGORY
                    </th>

                    <th className="py-3 px-6">
                      ACTION & DETAILS
                    </th>

                    <th className="py-3 px-4 text-right">
                      INSPECT
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs font-sans">
                  {filteredOperationalLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        No operational audit records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOperationalLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div>{log.user}</div>

                          <div className="text-[10px] text-slate-400 font-mono">
                            ({log.staffId})
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-6 text-slate-800">
                          <div className="font-semibold">
                            {log.action}
                          </div>

                          <div className="text-[11px] text-slate-500">
                            {log.details}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOperationalLog(log)
                            }
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Inspect audit record"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    <th className="py-3 px-4">
                      TIMESTAMP
                    </th>

                    <th className="py-3 px-4">
                      USER / STAFF ID
                    </th>

                    <th className="py-3 px-6">
                      SECURITY EVENT
                    </th>

                    <th className="py-3 px-4">
                      ORIGIN (IP / DEVICE)
                    </th>

                    <th className="py-3 px-4 text-right">
                      RISK LEVEL
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs font-mono">
                  {filteredSecurityLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        No security audit records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSecurityLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        <td className="py-3.5 px-4 font-sans font-semibold text-slate-900 whitespace-nowrap">
                          <div>{log.user}</div>

                          <div className="text-[10px] text-slate-400 font-mono">
                            ({log.staffId})
                          </div>
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
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {log.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
            <span>
              {activeTab === "OPERATIONS"
                ? `Showing ${filteredOperationalLogs.length} operational records`
                : `Showing ${filteredSecurityLogs.length} security records`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="p-1 rounded bg-white border border-slate-200 text-slate-300 cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold"
              >
                1
              </button>

              <button
                type="button"
                disabled
                className="p-1 rounded bg-white border border-slate-200 text-slate-300 cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Compliance Information */}
        <div className="text-center text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5 pt-2">
          <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />

          <span>
            Audit records displayed here are sourced from the hospital
            audit and security log systems. Retention and tamper-evidence
            depend on the configured backend infrastructure.
          </span>
        </div>
      </main>

      {/* Shared Log Inspection Modal */}
      {selectedOperationalLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                Audit Log Deep Inspection
              </h3>

              <button
                type="button"
                onClick={() => setSelectedOperationalLog(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                  Action
                </span>

                <p className="text-slate-800 font-bold text-sm mt-0.5">
                  {selectedOperationalLog.action}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                    User
                  </span>

                  <p className="text-slate-700 font-medium">
                    {selectedOperationalLog.user}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                    Staff ID
                  </span>

                  <p className="text-slate-700 font-mono">
                    {selectedOperationalLog.staffId}
                  </p>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                  Metadata payload
                </span>

                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg mt-1 font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(
                    selectedOperationalLog.metadata,
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}