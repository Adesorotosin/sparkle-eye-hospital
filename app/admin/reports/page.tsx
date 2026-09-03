"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ChevronDown,
  Download,
  Clock,
  Wallet,
  Users,
  ShieldCheck,
  Search,
  FileText,
  HeartPulse,
  Shield,
  ArrowRight,
  Bell,
  CheckCircle2,
} from "lucide-react";

export default function AnalyticsExportCenterPage() {
  // Selected Report Checkboxes State
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const toggleReportSelect = (reportId: string) => {
    setSelectedReports((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
      {/* 1. TOP GLOBAL NAVIGATION */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#4F46E5] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-[#0F172A]">
                Sparkle Eye
              </h1>
              <p className="text-[10px] tracking-wider text-[#64748B] uppercase font-medium">
                Specialist Hospital
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-8 text-sm font-medium">
            <Link
              href="/admin"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/access-control"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              Staff & Access Control
            </Link>
            <Link
              href="/admin/audit"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              Audit Logs
            </Link>
            <Link
              href="/admin/reports"
              className="text-[#4F46E5] font-semibold border-b-2 border-[#4F46E5] py-5"
            >
              Reports & Analytics
            </Link>
            <Link
              href="/admin/settings"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              System Settings
            </Link>
          </nav>

          {/* User & Notifications */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-full transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#4F46E5] rounded-full"></span>
            </button>
            <div className="h-8 w-[1px] bg-[#E2E8F0]" />
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&auto=format&fit=crop&q=80"
                alt="Dr. Adeyemi"
                className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0]"
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold leading-tight text-[#0F172A]">
                  Dr. Adeyemi
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Chief Medical Officer
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* PAGE HEADER & ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Analytics & Export Center
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Generate, schedule, and export hospital financial, clinical, and
              compliance reports.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#0F172A] bg-white hover:bg-[#F8FAFC] transition-all shadow-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#64748B]" /> Schedule Automated
              Report
            </button>
            <button className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium transition-all shadow-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Selected (PDF/Excel)
            </button>
          </div>
        </div>

        {/* FILTER TOOLBAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Date Range Picker */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-[#64748B] mb-1.5">
              Date Range
            </label>
            <div className="relative">
              <input
                type="text"
                defaultValue="Aug 1, 2026 — Aug 30, 2026"
                className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
              <Calendar className="w-4 h-4 text-[#64748B] absolute left-3 top-3 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-[#64748B] mb-1.5">
              Department
            </label>
            <div className="relative">
              <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                <option>All Departments</option>
                <option>Ophthalmology</option>
                <option>Pharmacy</option>
                <option>Diagnostics & OCT</option>
                <option>Billing & POS</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Export Format Selector */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-[#64748B] mb-1.5">
              Export Format
            </label>
            <div className="relative">
              <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                <option>PDF Document</option>
                <option>Excel Spreadsheet (.xlsx)</option>
                <option>CSV Raw Data</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* METRICS ROW (3 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1: Revenue */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">
                Total Monthly Revenue
              </p>
              <p className="text-2xl font-bold text-[#0F172A] mt-2">
                ₦48,250,000
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-bold text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-md">
                  +14% vs last month
                </span>
                <span className="text-[11px] text-[#64748B]">
                  from POS, Pharmacy & Claims
                </span>
              </div>
            </div>
            <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#4F46E5]">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Patients */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">
                Total Patient Visits
              </p>
              <p className="text-2xl font-bold text-[#0F172A] mt-2">
                3,420 Patients
              </p>
              <p className="text-xs text-[#64748B] mt-3">
                Avg. wait time:{" "}
                <span className="font-semibold text-[#0F172A]">18 mins</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#4F46E5]">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Compliance */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">
                Compliance & Audit Score
              </p>
              <p className="text-2xl font-bold text-[#0F172A] mt-2">99.4%</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-bold text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-md">
                  HIPAA/NDPR Compliant
                </span>
                <span className="text-[11px] text-[#64748B]">
                  Last audited: 3 days ago
                </span>
              </div>
            </div>
            <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-[#4F46E5]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN (2/3 Width): REPORT TEMPLATES */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#0F172A]">
                Available Report Templates
              </h3>
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search templates..."
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Category 1: Financial & Billing */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#4F46E5]" />
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Financial & Billing Reports
                </h4>
              </div>

              <div className="divide-y divide-[#F1F5F9]">
                {[
                  {
                    id: "fin-1",
                    title: "Daily POS & Cashier Reconciliation Report",
                  },
                  {
                    id: "fin-2",
                    title: "Pharmacy Drug Sales & Revenue Breakdown",
                  },
                  {
                    id: "fin-3",
                    title: "Outstanding Invoices & Insurance Claims Summary",
                  },
                  { id: "fin-4", title: "Monthly Revenue by Department" },
                  { id: "fin-5", title: "Tax & VAT Compliance Report" },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
                  >
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(item.id)}
                        onChange={() => toggleReportSelect(item.id)}
                        className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5]"
                      />
                      <span className="text-xs font-semibold text-[#0F172A]">
                        {item.title}
                      </span>
                    </label>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <button className="text-[#4F46E5] hover:underline">
                        Preview
                      </button>
                      <button className="text-[#4F46E5] hover:underline">
                        Generate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category 2: Clinical & Patient */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#4F46E5]" />
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Clinical & Patient Reports
                </h4>
              </div>

              <div className="divide-y divide-[#F1F5F9]">
                {[
                  {
                    id: "clin-1",
                    title: "Patient Visit Summary (Daily/Weekly/Monthly)",
                  },
                  {
                    id: "clin-2",
                    title: "Diagnosis & Procedure Frequency Report",
                  },
                  { id: "clin-3", title: "Referral & Follow-up Tracking Report" },
                  {
                    id: "clin-4",
                    title: "Clinical Outcomes & Complication Rates",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
                  >
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(item.id)}
                        onChange={() => toggleReportSelect(item.id)}
                        className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5]"
                      />
                      <span className="text-xs font-semibold text-[#0F172A]">
                        {item.title}
                      </span>
                    </label>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <button className="text-[#4F46E5] hover:underline">
                        Preview
                      </button>
                      <button className="text-[#4F46E5] hover:underline">
                        Generate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category 3: Compliance & Audit */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#4F46E5]" />
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Compliance & Audit Reports
                </h4>
              </div>

              <div className="divide-y divide-[#F1F5F9]">
                {[
                  { id: "comp-1", title: "HIPAA/NDPR Compliance Audit Trail" },
                  { id: "comp-2", title: "Staff Access & Permission Audit Log" },
                  { id: "comp-3", title: "Data Breach Incident Report" },
                  { id: "comp-4", title: "System Uptime & Security Report" },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
                  >
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(item.id)}
                        onChange={() => toggleReportSelect(item.id)}
                        className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5]"
                      />
                      <span className="text-xs font-semibold text-[#0F172A]">
                        {item.title}
                      </span>
                    </label>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <button className="text-[#4F46E5] hover:underline">
                        Preview
                      </button>
                      <button className="text-[#4F46E5] hover:underline">
                        Generate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (1/3 Width) */}
          <div className="space-y-6">
            {/* Scheduled Reports Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <h3 className="font-semibold text-base text-[#0F172A] mb-4">
                Scheduled Reports
              </h3>

              <div className="space-y-3">
                {/* Job 1 */}
                <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Monthly Revenue Report
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10B981]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />{" "}
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Next Run: <span className="font-semibold text-[#0F172A]">Sep 1, 2026</span> • Frequency: Monthly
                  </p>
                </div>

                {/* Job 2 */}
                <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Weekly Patient Summary
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10B981]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />{" "}
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Next Run: <span className="font-semibold text-[#0F172A]">Sep 7, 2026</span> • Frequency: Weekly
                  </p>
                </div>

                {/* Job 3 */}
                <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Quarterly Compliance Audit
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#D97706]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />{" "}
                      Paused
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Next Run: <span className="font-semibold text-[#0F172A]">Oct 1, 2026</span> • Frequency: Quarterly
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Exports Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <h3 className="font-semibold text-base text-[#0F172A] mb-4">
                Recent Exports
              </h3>

              <div className="space-y-3">
                {[
                  {
                    name: "Revenue_Aug2026.xlsx",
                    info: "Downloaded Aug 28, 2026 • by Dr. Adeyemi • 2.4 MB",
                  },
                  {
                    name: "PatientVisits_W34.pdf",
                    info: "Downloaded Aug 25, 2026 • by Admin • 1.1 MB",
                  },
                  {
                    name: "Compliance_Q2.pdf",
                    info: "Downloaded Aug 20, 2026 • by Compliance Officer • 3.8 MB",
                  },
                ].map((file, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between"
                  >
                    <div className="flex items-start gap-2.5">
                      <FileText className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#0F172A]">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          {file.info}
                        </p>
                      </div>
                    </div>
                    <button className="text-[#4F46E5] hover:text-[#4338CA] p-1">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <h3 className="font-semibold text-base text-[#0F172A] mb-4">
                Quick Actions
              </h3>

              <div className="space-y-3 text-xs font-semibold text-[#4F46E5]">
                <button className="w-full flex items-center justify-between py-1.5 hover:underline text-left">
                  <span>Create Custom Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button className="w-full flex items-center justify-between py-1.5 hover:underline text-left">
                  <span>Manage Report Templates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button className="w-full flex items-center justify-between py-1.5 hover:underline text-left">
                  <span>Export All Data (Full Dump)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button className="w-full flex items-center justify-between py-1.5 hover:underline text-left">
                  <span>View Report Archive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}