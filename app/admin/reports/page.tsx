"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Activity,
  Shield,
  Search,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  FileText,
  Plus,
  ArrowRight,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface ReportItem {
  id: string;
  title: string;
  category: "financial" | "clinical" | "compliance";
}

interface ScheduledJob {
  id: string;
  name: string;
  active: boolean;
  nextRun: string;
  frequency: string;
}

export default function ReportsPage() {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [previewReportTitle, setPreviewReportTitle] = useState<string | null>(null);
  const [generatingReportTitle, setGeneratingReportTitle] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCustomReportModalOpen, setIsCustomReportModalOpen] = useState(false);
  
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [department, setDepartment] = useState("All Departments");
  const [exportFormat, setExportFormat] = useState("PDF");

  // Category 1: Financial & Revenue
  const financialReports: ReportItem[] = [
    { id: "fin-1", title: "Daily Revenue & POS Cash Register Ledger", category: "financial" },
    { id: "fin-2", title: "Outstanding Patient Invoices & Debtors List", category: "financial" },
    { id: "fin-3", title: "HMO & Insurance Claims Status Breakdown", category: "financial" },
    { id: "fin-4", title: "Pharmacy Inventory & Frame Sales Margin Report", category: "financial" },
  ];

  // Category 2: Operational & Clinical
  const clinicalReports: ReportItem[] = [
    { id: "clin-1", title: "Patient Attendance & Consultation Volume Summary", category: "clinical" },
    { id: "clin-2", title: "Doctor Workload & Optometry Appointment Logs", category: "clinical" },
    { id: "clin-3", title: "OCT & Diagnostic Procedure Completion Metrics", category: "clinical" },
  ];

  // Category 3: Compliance & Audit
  const complianceReports: ReportItem[] = [
    { id: "comp-1", title: "HIPAA & Patient Data Privacy Audit Log", category: "compliance" },
    { id: "comp-2", title: "Staff System Access & Permission Summary", category: "compliance" },
    { id: "comp-3", title: "Controlled Substance Pharmacy Logs", category: "compliance" },
  ];

  const filterList = (reports: ReportItem[]) =>
    reports.filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredFinancial = filterList(financialReports);
  const filteredClinical = filterList(clinicalReports);
  const filteredCompliance = filterList(complianceReports);

  const totalVisibleCount =
    filteredFinancial.length + filteredClinical.length + filteredCompliance.length;

  const scheduledJobs: ScheduledJob[] = [
    {
      id: "job-1",
      name: "Weekly Financial Summary",
      active: true,
      nextRun: "Sep 8, 2026",
      frequency: "Weekly",
    },
    {
      id: "job-2",
      name: "Monthly Patient Volume Analysis",
      active: false,
      nextRun: "Paused",
      frequency: "Monthly",
    },
  ];

  const toggleReportSelect = (id: string) => {
    setSelectedReports((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCategory = (reports: ReportItem[]) => {
    const ids = reports.map((r) => r.id);
    const allSelected = ids.every((id) => selectedReports.includes(id));
    if (allSelected) {
      setSelectedReports((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedReports((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const startGenerateProcess = (title: string) => {
    setGeneratingReportTitle(title);
    setIsGenerating(false);
    setGenerateSuccess(false);
  };

  const handleRunGeneration = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerateSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans p-6">
      <main className="max-w-7xl mx-auto space-y-6">
        {/* TOP HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Reports & Analytics
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Generate, schedule, and export hospital clinical, financial, and compliance records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => startGenerateProcess(`${selectedReports.length} Selected Reports Batch`)}
              disabled={selectedReports.length === 0}
              className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Selected ({selectedReports.length})
            </button>
            <button
              onClick={() => alert("Report indices refreshed.")}
              className="p-2 border border-[#E2E8F0] bg-white rounded-lg text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FILTER BAR SECTION */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search reports by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent outline-none font-semibold text-[#0F172A] cursor-pointer"
              >
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>This Quarter</option>
                <option>Year to Date</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-[#64748B]" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-transparent outline-none font-semibold text-[#0F172A] cursor-pointer"
              >
                <option>All Departments</option>
                <option>Optometry & Diagnostics</option>
                <option>Pharmacy & Optical</option>
                <option>Billing & Reception</option>
              </select>
            </div>
          </div>
        </div>

        {/* MAIN 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: REPORT CATEGORIES (2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category 1: Financial & Revenue */}
            {filteredFinancial.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#4F46E5]" />
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Financial & Revenue Reports
                    </h4>
                  </div>
                  <button
                    onClick={() => handleSelectAllCategory(financialReports)}
                    className="text-[11px] font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {filteredFinancial.map((item) => (
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
                        <button
                          onClick={() => setPreviewReportTitle(item.title)}
                          className="text-[#4F46E5] hover:underline cursor-pointer"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => startGenerateProcess(item.title)}
                          className="text-[#4F46E5] hover:underline cursor-pointer"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category 2: Operational & Clinical */}
            {filteredClinical.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#4F46E5]" />
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Operational & Clinical Reports
                    </h4>
                  </div>
                  <button
                    onClick={() => handleSelectAllCategory(clinicalReports)}
                    className="text-[11px] font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {filteredClinical.map((item) => (
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
                        <button
                          onClick={() => setPreviewReportTitle(item.title)}
                          className="text-[#4F46E5] hover:underline cursor-pointer"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => startGenerateProcess(item.title)}
                          className="text-[#4F46E5] hover:underline cursor-pointer"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category 3: Compliance & Audit */}
            {filteredCompliance.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#4F46E5]" />
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Compliance & Audit Reports
                    </h4>
                  </div>
                  <button
                    onClick={() => handleSelectAllCategory(complianceReports)}
                    className="text-[11px] font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {filteredCompliance.map((item) => (
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
                        <button
                          onClick={() => setPreviewReportTitle(item.title)}
                          className="text-[#4F46E5] hover:underline cursor-pointer"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => startGenerateProcess(item.title)}
                          className="text-[#4F46E5] hover:underline cursor-pointer"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalVisibleCount === 0 && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-[#64748B]">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No report templates match your search query.</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-xs text-[#4F46E5] font-semibold hover:underline cursor-pointer"
                >
                  Clear Search Filter
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: SIDEBAR (1/3 Width) */}
          <div className="space-y-6">
            {/* Scheduled Reports Card */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Scheduled Reports
                </h3>
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="p-1 hover:bg-[#F1F5F9] rounded text-[#4F46E5] cursor-pointer"
                  title="Add Schedule"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {scheduledJobs.map((job) => (
                  <div key={job.id} className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-[#0F172A]">
                        {job.name}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                          job.active ? "text-[#10B981]" : "text-[#D97706]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            job.active ? "bg-[#10B981]" : "bg-[#D97706]"
                          }`}
                        />{" "}
                        {job.active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Next Run: <span className="font-semibold text-[#0F172A]">{job.nextRun}</span> • Frequency: {job.frequency}
                    </p>
                  </div>
                ))}
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
                    <button
                      onClick={() => startGenerateProcess(file.name)}
                      className="text-[#4F46E5] hover:text-[#4338CA] p-1 rounded hover:bg-[#EEF2FF] cursor-pointer"
                    >
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
                <button
                  onClick={() => setIsCustomReportModalOpen(true)}
                  className="w-full flex items-center justify-between py-1.5 hover:underline text-left cursor-pointer"
                >
                  <span>Create Custom Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alert("Template manager opened.")}
                  className="w-full flex items-center justify-between py-1.5 hover:underline text-left cursor-pointer"
                >
                  <span>Manage Report Templates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => startGenerateProcess("Full System Data Dump (ZIP)")}
                  className="w-full flex items-center justify-between py-1.5 hover:underline text-left cursor-pointer"
                >
                  <span>Export All Data (Full Dump)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* PREVIEW REPORT MODAL */}
      {previewReportTitle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setPreviewReportTitle(null)}
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-[#4F46E5] mb-2">
              <FileText className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Report Live Sample Preview</span>
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{previewReportTitle}</h3>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 font-mono text-xs text-slate-700 space-y-2 mb-6">
              <div className="border-b border-slate-200 pb-2 font-bold flex justify-between text-slate-900">
                <span>METRIC / PARAMETER</span>
                <span>SYSTEM VALUE</span>
              </div>
              <div className="flex justify-between">
                <span>Hospital Branch:</span>
                <span className="font-semibold text-slate-900">Sparkle Eye Specialist HQ</span>
              </div>
              <div className="flex justify-between">
                <span>Selected Window:</span>
                <span className="font-semibold text-slate-900">{dateRange}</span>
              </div>
              <div className="flex justify-between">
                <span>Filter Department:</span>
                <span className="font-semibold text-slate-900">{department}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Sample Records Found:</span>
                <span className="font-semibold text-slate-900">1,248 Records</span>
              </div>
              <div className="flex justify-between">
                <span>Compliance Audit Status:</span>
                <span className="text-[#10B981] font-bold">Verified & Active Log</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPreviewReportTitle(null)}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  const title = previewReportTitle;
                  setPreviewReportTitle(null);
                  startGenerateProcess(title);
                }}
                className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-medium hover:bg-[#4338CA] flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Generate & Export Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE / EXPORT MODAL */}
      {generatingReportTitle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setGeneratingReportTitle(null)}
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-bold text-[#0F172A] mb-1">Generate Report Export</h3>
            <p className="text-xs text-[#64748B] mb-4 truncate">{generatingReportTitle}</p>

            {!isGenerating && !generateSuccess && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Export Format</label>
                  <select 
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs focus:ring-2 focus:ring-[#4F46E5] outline-none"
                  >
                    <option value="PDF">PDF Document (.pdf)</option>
                    <option value="Excel">Excel Spreadsheet (.xlsx)</option>
                    <option value="CSV">Comma Separated (.csv)</option>
                  </select>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] text-[#64748B] space-y-1">
                  <p>• Date Scope: <strong>{dateRange}</strong></p>
                  <p>• Department: <strong>{department}</strong></p>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setGeneratingReportTitle(null)}
                    className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRunGeneration}
                    className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-medium hover:bg-[#4338CA] flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Start Generation
                  </button>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#0F172A]">Compiling live database records...</p>
                <p className="text-[11px] text-[#64748B]">Formatting file as {exportFormat}</p>
              </div>
            )}

            {generateSuccess && (
              <div className="py-6 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-[#10B981] mx-auto" />
                <h4 className="text-sm font-bold text-[#0F172A]">Report Export Ready!</h4>
                <p className="text-xs text-[#64748B]">Your file has been generated and queued for download.</p>

                <button
                  onClick={() => setGeneratingReportTitle(null)}
                  className="mt-4 px-6 py-2 bg-[#10B981] text-white rounded-lg text-xs font-semibold hover:bg-[#059669] cursor-pointer"
                >
                  Download File ({exportFormat})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHEDULE AUTOMATED REPORT MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-[#0F172A] mb-1">Schedule Automated Report</h3>
            <p className="text-xs text-[#64748B] mb-4">Set up recurring report delivery to email recipients.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Report Name</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Financial Summary"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs focus:ring-2 focus:ring-[#4F46E5] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Frequency</label>
                <select className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs focus:ring-2 focus:ring-[#4F46E5] outline-none">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsScheduleModalOpen(false);
                  alert("Automated report schedule created successfully!");
                }}
                className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-medium hover:bg-[#4338CA] cursor-pointer"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM REPORT MODAL */}
      {isCustomReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCustomReportModalOpen(false)}
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-[#0F172A] mb-1">Create Custom Report</h3>
            <p className="text-xs text-[#64748B] mb-4">Combine parameters across revenue, visits, and clinical outcomes.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Report Title</label>
                <input
                  type="text"
                  placeholder="e.g. Custom OCT & Patient Billing Breakdown"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs focus:ring-2 focus:ring-[#4F46E5] outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsCustomReportModalOpen(false)}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsCustomReportModalOpen(false);
                  startGenerateProcess("Custom Created Report");
                }}
                className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-medium hover:bg-[#4338CA] cursor-pointer"
              >
                Generate Custom Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}