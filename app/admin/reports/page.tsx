"use client";

import { useState } from "react";
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
  AlertCircle,
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

interface RevenuePreviewRow {
  invoice_no?: string;
  patient_name?: string;
  item_name?: string;
  payment_method?: string;
  grand_total?: number | string;
}

interface RevenuePreview {
  title: string;
  dateRange: string;
  department: string;
  recordCount: number;
  lineCount: number;
  totalRevenue: number;
  paymentMethodTotals: Record<string, number>;
  rows: RevenuePreviewRow[];
}

const LIVE_REPORT_IDS = new Set<string>(["fin-1"]);

const financialReports: ReportItem[] = [
  {
    id: "fin-1",
    title: "Daily Revenue & POS Cash Register Ledger",
    category: "financial",
  },
  {
    id: "fin-2",
    title: "Outstanding Patient Invoices & Debtors List",
    category: "financial",
  },
  {
    id: "fin-3",
    title: "HMO & Insurance Claims Status Breakdown",
    category: "financial",
  },
  {
    id: "fin-4",
    title: "Pharmacy Inventory & Frame Sales Margin Report",
    category: "financial",
  },
];

const clinicalReports: ReportItem[] = [
  {
    id: "clin-1",
    title: "Patient Attendance & Consultation Volume Summary",
    category: "clinical",
  },
  {
    id: "clin-2",
    title: "Doctor Workload & Optometry Appointment Logs",
    category: "clinical",
  },
  {
    id: "clin-3",
    title: "OCT & Diagnostic Procedure Completion Metrics",
    category: "clinical",
  },
];

const complianceReports: ReportItem[] = [
  {
    id: "comp-1",
    title: "HIPAA & Patient Data Privacy Audit Log",
    category: "compliance",
  },
  {
    id: "comp-2",
    title: "Staff System Access & Permission Summary",
    category: "compliance",
  },
  {
    id: "comp-3",
    title: "Controlled Substance Pharmacy Logs",
    category: "compliance",
  },
];

const allReports: ReportItem[] = [
  ...financialReports,
  ...clinicalReports,
  ...complianceReports,
];

const scheduledJobs: ScheduledJob[] = [
  {
    id: "job-1",
    name: "Weekly Financial Summary",
    active: true,
    nextRun: "Not connected",
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

export default function ReportsPage() {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [previewReportTitle, setPreviewReportTitle] = useState<string | null>(
    null
  );
  const [previewData, setPreviewData] = useState<RevenuePreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [generatingReportTitle, setGeneratingReportTitle] = useState<
    string | null
  >(null);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCustomReportModalOpen, setIsCustomReportModalOpen] = useState(false);

  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [department, setDepartment] = useState("All Departments");
  const [exportFormat, setExportFormat] = useState("CSV");

  const filterReports = (reports: ReportItem[]) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return reports;
    }

    return reports.filter((report) =>
      report.title.toLowerCase().includes(query)
    );
  };

  const filteredFinancial = filterReports(financialReports);
  const filteredClinical = filterReports(clinicalReports);
  const filteredCompliance = filterReports(complianceReports);

  const totalVisibleCount =
    filteredFinancial.length +
    filteredClinical.length +
    filteredCompliance.length;

  const getReportById = (id: string) => {
    return allReports.find((report) => report.id === id);
  };

  const getReportByTitle = (title: string) => {
    return allReports.find((report) => report.title === title);
  };

  const isLiveReport = (id: string | null | undefined) => {
    if (!id) {
      return false;
    }

    return LIVE_REPORT_IDS.has(id);
  };

  const toggleReportSelect = (id: string) => {
    setSelectedReports((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  };

  const handleSelectAllCategory = (reports: ReportItem[]) => {
    const ids = reports.map((report) => report.id);

    const allSelected =
      ids.length > 0 &&
      ids.every((id) => selectedReports.includes(id));

    if (allSelected) {
      setSelectedReports((current) =>
        current.filter((id) => !ids.includes(id))
      );
      return;
    }

    setSelectedReports((current) =>
      Array.from(new Set([...current, ...ids]))
    );
  };

  const startGenerateProcess = (
    title: string,
    reportId?: string
  ) => {
    const report = reportId
      ? getReportById(reportId)
      : getReportByTitle(title);

    setGeneratingReportTitle(title);
    setGeneratingReportId(report?.id ?? reportId ?? null);
    setIsGenerating(false);
    setGenerateSuccess(false);
    setGenerateError(null);
  };

  const closePreview = () => {
    if (isPreviewLoading) {
      return;
    }

    setPreviewReportTitle(null);
    setPreviewData(null);
    setPreviewError(null);
  };

  const closeGenerateModal = () => {
    if (isGenerating) {
      return;
    }

    setGeneratingReportTitle(null);
    setGeneratingReportId(null);
    setGenerateError(null);
    setGenerateSuccess(false);
  };

  const handlePreview = async (report: ReportItem) => {
    setPreviewReportTitle(report.title);
    setPreviewData(null);
    setPreviewError(null);

    if (!isLiveReport(report.id)) {
      return;
    }

    setIsPreviewLoading(true);

    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId: report.id,
          reportTitle: report.title,
          dateRange,
          department,
          format: "CSV",
          preview: true,
        }),
      });

      const contentType =
        response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const result = await response.json();

          throw new Error(
            result?.error || "Failed to load report preview."
          );
        }

        throw new Error("Failed to load report preview.");
      }

      if (!contentType.includes("application/json")) {
        throw new Error(
          "The report preview endpoint returned an unexpected response."
        );
      }

      const result = await response.json();

      if (!result?.report) {
        throw new Error(
          "The report preview response did not contain report data."
        );
      }

      setPreviewData(result.report as RevenuePreview);
    } catch (error) {
      console.error("Report preview failed:", error);

      setPreviewError(
        error instanceof Error
          ? error.message
          : "Unable to load report preview."
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleRunGeneration = async () => {
    if (!generatingReportTitle) {
      return;
    }

    if (!generatingReportId || !isLiveReport(generatingReportId)) {
      setGenerateError(
        "This report has not been connected to the live reporting engine yet."
      );
      return;
    }

    if (exportFormat !== "CSV") {
      setGenerateError(
        "CSV is currently the only available live export format."
      );
      return;
    }

    setIsGenerating(true);
    setGenerateSuccess(false);
    setGenerateError(null);

    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId: generatingReportId,
          reportTitle: generatingReportTitle,
          dateRange,
          department,
          format: exportFormat,
          preview: false,
        }),
      });

      const contentType =
        response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const result = await response.json();

          throw new Error(
            result?.error || "Failed to generate report."
          );
        }

        throw new Error("Failed to generate report.");
      }

      if (contentType.includes("application/json")) {
        const result = await response.json();

        throw new Error(
          result?.error ||
            "The report endpoint returned JSON instead of a CSV file."
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("The generated report file is empty.");
      }

      const disposition =
        response.headers.get("content-disposition") || "";

      const filenameMatch = disposition.match(
        /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i
      );

      const filename = filenameMatch?.[1]
        ? decodeURIComponent(filenameMatch[1])
        : `Sparkle_Eye_Report_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

      const downloadUrl =
        window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setGenerateSuccess(true);
    } catch (error) {
      console.error("Report generation failed:", error);

      setGenerateError(
        error instanceof Error
          ? error.message
          : "Unable to generate report."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  };

  const handleExportSelected = () => {
    if (selectedReports.length === 0) {
      return;
    }

    const liveSelectedReports = selectedReports
      .map((id) => getReportById(id))
      .filter(
        (report): report is ReportItem =>
          Boolean(report) && isLiveReport(report?.id)
      );

    if (liveSelectedReports.length === 0) {
      window.alert(
        "None of the selected reports are connected to the live reporting engine yet."
      );
      return;
    }

    if (selectedReports.length > 1) {
      window.alert(
        "Batch export is not active yet. Please select one live report at a time."
      );
      return;
    }

    const report = liveSelectedReports[0];

    startGenerateProcess(report.title, report.id);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans p-6">
      <main className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Reports & Analytics
            </h1>

            <p className="text-xs text-[#64748B] mt-1">
              Generate and export hospital clinical, financial,
              and compliance records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportSelected}
              disabled={selectedReports.length === 0}
              className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Selected ({selectedReports.length})
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="p-2 border border-[#E2E8F0] bg-white rounded-lg text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />

            <input
              type="text"
              placeholder="Search reports by keyword..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />

              <select
                value={dateRange}
                onChange={(event) =>
                  setDateRange(event.target.value)
                }
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
                onChange={(event) =>
                  setDepartment(event.target.value)
                }
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

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* FINANCIAL */}
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
                    type="button"
                    onClick={() =>
                      handleSelectAllCategory(financialReports)
                    }
                    className="text-[11px] font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {filteredFinancial.map((item) => {
                    const isLive = isLiveReport(item.id);

                    return (
                      <div
                        key={item.id}
                        className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer select-none min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedReports.includes(
                              item.id
                            )}
                            onChange={() =>
                              toggleReportSelect(item.id)
                            }
                            className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5]"
                          />

                          <span className="text-xs font-semibold text-[#0F172A]">
                            {item.title}
                          </span>
                        </label>

                        <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
                          {isLive ? (
                            <span className="text-[10px] text-[#10B981] font-bold uppercase">
                              Live
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#94A3B8] font-bold uppercase">
                              Coming soon
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePreview(item)}
                            className={
                              isLive
                                ? "text-[#4F46E5] hover:underline cursor-pointer"
                                : "text-[#64748B] hover:underline cursor-pointer"
                            }
                          >
                            Preview
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              startGenerateProcess(
                                item.title,
                                item.id
                              )
                            }
                            className={
                              isLive
                                ? "text-[#4F46E5] hover:underline cursor-pointer"
                                : "text-[#64748B] hover:underline cursor-pointer"
                            }
                          >
                            Generate
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CLINICAL */}
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
                    type="button"
                    onClick={() =>
                      handleSelectAllCategory(clinicalReports)
                    }
                    className="text-[11px] font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {filteredClinical.map((item) => (
                    <div
                      key={item.id}
                      className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <label className="flex items-center gap-3 cursor-pointer select-none min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(
                            item.id
                          )}
                          onChange={() =>
                            toggleReportSelect(item.id)
                          }
                          className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5]"
                        />

                        <span className="text-xs font-semibold text-[#0F172A]">
                          {item.title}
                        </span>
                      </label>

                      <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
                        <span className="text-[10px] text-[#94A3B8] font-bold uppercase">
                          Coming soon
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePreview(item)}
                          className="text-[#64748B] hover:underline cursor-pointer"
                        >
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            startGenerateProcess(
                              item.title,
                              item.id
                            )
                          }
                          className="text-[#64748B] hover:underline cursor-pointer"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMPLIANCE */}
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
                    type="button"
                    onClick={() =>
                      handleSelectAllCategory(complianceReports)
                    }
                    className="text-[11px] font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {filteredCompliance.map((item) => (
                    <div
                      key={item.id}
                      className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <label className="flex items-center gap-3 cursor-pointer select-none min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(
                            item.id
                          )}
                          onChange={() =>
                            toggleReportSelect(item.id)
                          }
                          className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5]"
                        />

                        <span className="text-xs font-semibold text-[#0F172A]">
                          {item.title}
                        </span>
                      </label>

                      <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
                        <span className="text-[10px] text-[#94A3B8] font-bold uppercase">
                          Coming soon
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePreview(item)}
                          className="text-[#64748B] hover:underline cursor-pointer"
                        >
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            startGenerateProcess(
                              item.title,
                              item.id
                            )
                          }
                          className="text-[#64748B] hover:underline cursor-pointer"
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

                <p className="text-sm font-semibold">
                  No report templates match your search query.
                </p>

                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-xs text-[#4F46E5] font-semibold hover:underline cursor-pointer"
                >
                  Clear Search Filter
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* SCHEDULED REPORTS */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-base text-[#0F172A]">
                    Scheduled Reports
                  </h3>

                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    Scheduling backend is not connected yet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="p-1 hover:bg-[#F1F5F9] rounded text-[#4F46E5] cursor-pointer"
                  title="Add Schedule"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {scheduledJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-[#0F172A]">
                        {job.name}
                      </p>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                          job.active
                            ? "text-[#10B981]"
                            : "text-[#D97706]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            job.active
                              ? "bg-[#10B981]"
                              : "bg-[#D97706]"
                          }`}
                        />

                        {job.active ? "Configured" : "Paused"}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#64748B]">
                      Next Run:{" "}
                      <span className="font-semibold text-[#0F172A]">
                        {job.nextRun}
                      </span>{" "}
                      • Frequency: {job.frequency}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT EXPORTS */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <h3 className="font-semibold text-base text-[#0F172A] mb-4">
                Recent Exports
              </h3>

              <div className="p-4 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC]">
                <FileText className="w-5 h-5 text-[#94A3B8] mb-2" />

                <p className="text-xs font-semibold text-[#475569]">
                  Live export history will appear here.
                </p>

                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Export history will be connected after the
                  reporting audit workflow is implemented.
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <h3 className="font-semibold text-base text-[#0F172A] mb-4">
                Quick Actions
              </h3>

              <div className="space-y-3 text-xs font-semibold text-[#4F46E5]">
                <button
                  type="button"
                  onClick={() =>
                    setIsCustomReportModalOpen(true)
                  }
                  className="w-full flex items-center justify-between py-1.5 hover:underline text-left cursor-pointer"
                >
                  <span>Create Custom Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.alert(
                      "Report template management will be connected after the live report engine is complete."
                    )
                  }
                  className="w-full flex items-center justify-between py-1.5 hover:underline text-left cursor-pointer"
                >
                  <span>Manage Report Templates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.alert(
                      "Full system data export is intentionally disabled until a dedicated secure export workflow is implemented."
                    )
                  }
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

      {/* PREVIEW MODAL */}
      {previewReportTitle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={closePreview}
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              disabled={isPreviewLoading}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[#4F46E5] mb-2">
              <FileText className="w-5 h-5" />

              <span className="text-xs font-bold uppercase tracking-wider">
                Report Preview
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#0F172A] mb-4 pr-8">
              {previewReportTitle}
            </h3>

            {!isLiveReport(
              getReportByTitle(previewReportTitle)?.id
            ) ? (
              <div className="p-5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                <AlertCircle className="w-5 h-5 text-[#64748B] mb-2" />

                <p className="text-sm font-semibold text-[#0F172A]">
                  This report is not connected to live data yet.
                </p>

                <p className="text-xs text-[#64748B] mt-1">
                  The reports are being implemented one by one so
                  the system does not display fabricated hospital
                  data.
                </p>
              </div>
            ) : isPreviewLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin mx-auto mb-3" />

                <p className="text-xs font-semibold text-[#0F172A]">
                  Loading live database records...
                </p>
              </div>
            ) : previewError ? (
              <div className="p-5 rounded-lg border border-red-200 bg-red-50">
                <AlertCircle className="w-5 h-5 text-red-600 mb-2" />

                <p className="text-sm font-semibold text-red-800">
                  Preview failed
                </p>

                <p className="text-xs text-red-700 mt-1">
                  {previewError}
                </p>
              </div>
            ) : previewData ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-[10px] uppercase font-bold text-[#64748B]">
                      Paid Invoices
                    </p>

                    <p className="text-xl font-bold text-[#0F172A] mt-1">
                      {previewData.recordCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-[10px] uppercase font-bold text-[#64748B]">
                      Report Lines
                    </p>

                    <p className="text-xl font-bold text-[#0F172A] mt-1">
                      {previewData.lineCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-[10px] uppercase font-bold text-[#64748B]">
                      Total Revenue
                    </p>

                    <p className="text-xl font-bold text-[#0F172A] mt-1">
                      {formatCurrency(
                        previewData.totalRevenue
                      )}
                    </p>
                  </div>
                </div>

                <div className="mb-5 rounded-lg border border-[#E2E8F0] bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Payment Method Breakdown
                    </p>
                  </div>

                  <div className="divide-y divide-[#F1F5F9]">
                    {Object.entries(
                      previewData.paymentMethodTotals || {}
                    ).map(([method, amount]) => (
                      <div
                        key={method}
                        className="px-4 py-3 flex items-center justify-between"
                      >
                        <span className="text-xs font-semibold text-[#475569] capitalize">
                          {method}
                        </span>

                        <span className="text-xs font-bold text-[#0F172A]">
                          {formatCurrency(Number(amount))}
                        </span>
                      </div>
                    ))}

                    {Object.keys(
                      previewData.paymentMethodTotals || {}
                    ).length === 0 && (
                      <div className="px-4 py-5 text-xs text-[#64748B]">
                        No paid invoices were found for the
                        selected period.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Report Records
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#64748B]">
                            Invoice
                          </th>

                          <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#64748B]">
                            Patient
                          </th>

                          <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#64748B]">
                            Item
                          </th>

                          <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#64748B]">
                            Payment
                          </th>

                          <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#64748B]">
                            Total
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#F1F5F9]">
                        {(previewData.rows || [])
                          .slice(0, 20)
                          .map((row, index) => (
                            <tr
                              key={`${row.invoice_no || "row"}-${index}`}
                            >
                              <td className="px-4 py-3 text-xs font-semibold text-[#0F172A]">
                                {row.invoice_no || "—"}
                              </td>

                              <td className="px-4 py-3 text-xs text-[#475569]">
                                {row.patient_name || "—"}
                              </td>

                              <td className="px-4 py-3 text-xs text-[#475569]">
                                {row.item_name || "—"}
                              </td>

                              <td className="px-4 py-3 text-xs text-[#475569] capitalize">
                                {row.payment_method || "—"}
                              </td>

                              <td className="px-4 py-3 text-xs font-bold text-[#0F172A]">
                                {formatCurrency(
                                  Number(
                                    row.grand_total || 0
                                  )
                                )}
                              </td>
                            </tr>
                          ))}

                        {previewData.rows.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-xs text-[#64748B]"
                            >
                              No paid invoices were found for
                              this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closePreview}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
              >
                Close Preview
              </button>

              {isLiveReport(
                getReportByTitle(previewReportTitle)?.id
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    const report =
                      getReportByTitle(previewReportTitle);

                    if (!report) {
                      return;
                    }

                    closePreview();

                    startGenerateProcess(
                      report.title,
                      report.id
                    );
                  }}
                  className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-medium hover:bg-[#4338CA] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Generate & Export CSV
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GENERATE MODAL */}
      {generatingReportTitle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={closeGenerateModal}
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              disabled={isGenerating}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#0F172A] mb-1">
              Generate Report Export
            </h3>

            <p className="text-xs text-[#64748B] mb-4 truncate pr-8">
              {generatingReportTitle}
            </p>

            {!isGenerating && !generateSuccess && (
              <div className="space-y-4">
                {!isLiveReport(generatingReportId) ? (
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                    <AlertCircle className="w-5 h-5 text-amber-600 mb-2" />

                    <p className="text-xs font-semibold text-amber-900">
                      This report is not live yet.
                    </p>

                    <p className="text-[11px] text-amber-800 mt-1">
                      The live reporting engine is being
                      implemented report-by-report.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                        Export Format
                      </label>

                      <select
                        value={exportFormat}
                        onChange={(event) =>
                          setExportFormat(event.target.value)
                        }
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs focus:ring-2 focus:ring-[#4F46E5] outline-none"
                      >
                        <option value="CSV">
                          CSV Spreadsheet (.csv)
                        </option>

                        <option value="PDF" disabled>
                          PDF Document (.pdf) — Coming next
                        </option>

                        <option value="Excel" disabled>
                          Excel Spreadsheet (.xlsx) — Coming next
                        </option>
                      </select>
                    </div>

                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] text-[#64748B] space-y-1">
                      <p>
                        • Date Scope:{" "}
                        <strong>{dateRange}</strong>
                      </p>

                      <p>
                        • Department:{" "}
                        <strong>{department}</strong>
                      </p>

                      <p>
                        • Format: <strong>CSV</strong>
                      </p>
                    </div>
                  </>
                )}

                {generateError && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <p className="text-xs font-semibold text-red-800">
                      {generateError}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeGenerateModal}
                    className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>

                  {isLiveReport(generatingReportId) && (
                    <button
                      type="button"
                      onClick={handleRunGeneration}
                      className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-medium hover:bg-[#4338CA] flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Start Generation
                    </button>
                  )}
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin mx-auto" />

                <p className="text-xs font-semibold text-[#0F172A]">
                  Compiling live database records...
                </p>

                <p className="text-[11px] text-[#64748B]">
                  Generating CSV from paid invoice records.
                </p>
              </div>
            )}

            {generateSuccess && (
              <div className="py-6 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-[#10B981] mx-auto" />

                <h4 className="text-sm font-bold text-[#0F172A]">
                  Report Downloaded
                </h4>

                <p className="text-xs text-[#64748B]">
                  The live report was generated successfully
                  and downloaded as a CSV file.
                </p>

                <button
                  type="button"
                  onClick={closeGenerateModal}
                  className="mt-4 px-6 py-2 bg-[#10B981] text-white rounded-lg text-xs font-semibold hover:bg-[#059669] cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#0F172A] mb-1">
              Schedule Automated Report
            </h3>

            <p className="text-xs text-[#64748B] mb-4">
              Scheduling will be connected after the live report
              generation engine is complete.
            </p>

            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-xs font-semibold text-amber-900">
                Scheduling is not active yet.
              </p>

              <p className="text-[11px] text-amber-800 mt-1">
                We are intentionally not saving schedules until
                the database-backed scheduling workflow is
                implemented.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM REPORT MODAL */}
      {isCustomReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() =>
                setIsCustomReportModalOpen(false)
              }
              className="absolute right-4 top-4 text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#0F172A] mb-1">
              Create Custom Report
            </h3>

            <p className="text-xs text-[#64748B] mb-4">
              Custom report generation will be connected after
              the core live report templates are implemented.
            </p>

            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-xs font-semibold text-amber-900">
                Custom reports are not active yet.
              </p>

              <p className="text-[11px] text-amber-800 mt-1">
                This prevents the system from generating reports
                that look real but are not backed by actual
                database queries.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setIsCustomReportModalOpen(false)
                }
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}