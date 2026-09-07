"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  Plus,
  Clock,
  X,
  Activity,
} from "lucide-react";

interface ReportDetail {
  id: string;
  patientName: string;
  patientId: string;
  testName: string;
  technician: string;
  completedTime: string;
  scanQuality: string;
  findings: string[];
  interpretation: string;
  statusBadge: string;
}

const REPORT_DETAILS: Record<string, ReportDetail> = {
  "SPK-30801": {
    id: "SPK-30801",
    patientName: "Grace Okonkwo",
    patientId: "SPK-30801",
    testName: "Macular OCT - Right Eye (OD)",
    technician: "Tech. Blessing Ade",
    completedTime: "Aug 28, 2026, 8:30 AM",
    scanQuality: "Good",
    findings: ["Macular Edema", "Subretinal Fluid"],
    interpretation:
      "OCT reveals mild macular edema with central retinal thickness of 310µm (normal <300µm). Subretinal fluid noted in the foveal region. Recommend anti-VEGF injection consultation and follow-up OCT in 4 weeks.",
    statusBadge: "Abnormality Detected",
  },
  "SPK-30856": {
    id: "SPK-30856",
    patientName: "Ibrahim Suleiman",
    patientId: "SPK-30856",
    testName: "Visual Field - Both Eyes (OU)",
    technician: "Tech. Yusuf Musa",
    completedTime: "Aug 27, 2026, 4:15 PM",
    scanQuality: "Excellent",
    findings: ["Normal Sensitivity", "No Defect"],
    interpretation:
      "Visual field testing shows full perifoveal and peripheral field without scotoma or neurological field defects.",
    statusBadge: "Within Normal Limits",
  },
  "SPK-30899": {
    id: "SPK-30899",
    patientName: "Ngozi Eze",
    patientId: "SPK-30899",
    testName: "Fundus Photo - Right Eye (OD)",
    technician: "Tech. Blessing Ade",
    completedTime: "Aug 27, 2026, 3:00 PM",
    scanQuality: "Fair",
    findings: ["Microaneurysms", "Cotton Wool Spots"],
    interpretation:
      "Color fundus photography shows early diabetic retinopathy signs with localized microaneurysms.",
    statusBadge: "Review Required",
  },
  "SPK-30910": {
    id: "SPK-30910",
    patientName: "Tunde Bakare",
    patientId: "SPK-30910",
    testName: "Tonometry - Both Eyes (OU)",
    technician: "Tech. Yusuf Musa",
    completedTime: "Aug 27, 2026, 1:45 PM",
    scanQuality: "Good",
    findings: ["IOP OD: 15 mmHg", "IOP OS: 16 mmHg"],
    interpretation:
      "Intraocular pressure is well within normal physiological limits for both eyes.",
    statusBadge: "Normal Range",
  },
};

export default function DiagnosticsPage() {
  const [selectedFilter, setSelectedFilter] = useState("All Tests");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    "SPK-30801"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const activeReport = useMemo(() => {
    return selectedReportId ? REPORT_DETAILS[selectedReportId] || null : null;
  }, [selectedReportId]);

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800 font-sans antialiased">
      {/* GLOBAL NAVBAR */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6B21A8] text-white flex items-center justify-center font-bold shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 leading-tight">
              Sparkle Eye Specialist Hospital
            </h1>
            <span className="text-[10px] font-bold text-[#6B21A8] tracking-wider uppercase block">
              Diagnostic Investigations
            </span>
          </div>
        </div>

        {/* SEARCH & CONTROLS HEADER */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient or test..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-purple-600 transition"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer">
            <Filter className="w-3.5 h-3.5" />
            <span>Test Type</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer">
            <Calendar className="w-3.5 h-3.5" />
            <span>Aug 28, 2026</span>
          </button>

          <button className="flex items-center gap-1.5 px-4 py-2 bg-[#6B21A8] hover:bg-[#581c87] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>
      </header>

      {/* FILTER TABS BAR */}
      <div className="bg-white border-b border-slate-200/80 px-8 py-3 flex items-center gap-2">
        {["All Tests", "OCT", "Visual Field", "Fundus Photo", "Tonometry"].map(
          (tab) => {
            const isSelected = selectedFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedFilter(tab)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? "bg-[#6B21A8] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab} {tab === "All Tests" && "9"}
              </button>
            );
          }
        )}
      </div>

      {/* MAIN CONTAINER */}
      <main className="p-6 md:p-8 flex gap-6 overflow-x-auto items-start">
        {/* KANBAN BOARD */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 min-w-[850px]">
          {/* COLUMN 1: PENDING REQUESTS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="font-bold text-sm text-slate-900">
                  Pending Requests
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                3
              </span>
            </div>

            {/* Pending Card 1 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    Chidinma Okafor
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ID: SPK-30692
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  URGENT
                </span>
              </div>

              <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg inline-block">
                Macular OCT - Both Eyes
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>
                  Ordered by:{" "}
                  <strong className="text-slate-700">Dr. Ananya Mehta</strong>
                </p>
                <p>
                  Requested:{" "}
                  <span className="text-slate-600 font-medium">
                    28 Aug, 9:30 AM
                  </span>
                </p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition cursor-pointer">
                  Assign Technician
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> 45m ago
              </p>
            </div>

            {/* Pending Card 2 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    Emeka Nwosu
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ID: SPK-31004
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  NORMAL
                </span>
              </div>

              <div className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg inline-block">
                Visual Field Test - OD
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>
                  Ordered by:{" "}
                  <strong className="text-slate-700">Dr. Fatima Hassan</strong>
                </p>
                <p>
                  Requested:{" "}
                  <span className="text-slate-600 font-medium">
                    28 Aug, 8:15 AM
                  </span>
                </p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition cursor-pointer">
                  Assign Technician
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> 2 hrs ago
              </p>
            </div>

            {/* Pending Card 3 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    Aisha Bello
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ID: SPK-31012
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-rose-600 text-white font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  ● EMERGENCY
                </span>
              </div>

              <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                Fundus Photography - OU
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>
                  Ordered by:{" "}
                  <strong className="text-slate-700">Dr. Emeka Obi</strong>
                </p>
                <p>
                  Requested:{" "}
                  <span className="text-slate-600 font-medium">
                    28 Aug, 10:05 AM
                  </span>
                </p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition cursor-pointer">
                  Assign Technician
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> 12m ago
              </p>
            </div>
          </div>

          {/* COLUMN 2: IN PROGRESS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className="font-bold text-sm text-slate-900">
                  In Progress
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                2
              </span>
            </div>

            {/* In Progress Card 1 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    Rajesh Kumar
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ID: SPK-30845
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  NORMAL
                </span>
              </div>

              <div className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg inline-block">
                Tonometry - Both Eyes
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>
                  Ordered by:{" "}
                  <strong className="text-slate-700">Dr. Ananya Mehta</strong>
                </p>
                <p>
                  Technician:{" "}
                  <strong className="text-slate-700">
                    Tech. Blessing Ade
                  </strong>
                </p>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Scanning Progress</span>
                  <span className="text-[#6B21A8]">60%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#6B21A8] rounded-full w-[60%]" />
                </div>
              </div>

              <div className="pt-2">
                <button className="w-full bg-purple-50 hover:bg-purple-100 text-[#6B21A8] border border-purple-200 rounded-xl py-2 text-xs font-bold transition cursor-pointer">
                  Upload Result
                </button>
              </div>
            </div>

            {/* In Progress Card 2 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    Folashade Ige
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ID: SPK-30978
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  URGENT
                </span>
              </div>

              <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg inline-block">
                Macular OCT - OS
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>
                  Ordered by:{" "}
                  <strong className="text-slate-700">Dr. Fatima Hassan</strong>
                </p>
                <p>
                  Technician:{" "}
                  <strong className="text-slate-700">Tech. Yusuf Musa</strong>
                </p>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Scanning Progress</span>
                  <span className="text-[#6B21A8]">85%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#6B21A8] rounded-full w-[85%]" />
                </div>
              </div>

              <div className="pt-2">
                <button className="w-full bg-purple-50 hover:bg-purple-100 text-[#6B21A8] border border-purple-200 rounded-xl py-2 text-xs font-bold transition cursor-pointer">
                  Upload Result
                </button>
              </div>
            </div>
          </div>

          {/* COLUMN 3: RESULTS READY */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="font-bold text-sm text-slate-900">
                  Results Ready
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                4
              </span>
            </div>

            {/* Results Ready Cards */}
            {Object.values(REPORT_DETAILS).map((item) => {
              const isSelected = selectedReportId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedReportId(item.id)}
                  className={`bg-white rounded-2xl border-2 p-4 space-y-3 shadow-xs cursor-pointer transition ${
                    isSelected
                      ? "border-[#6B21A8] ring-2 ring-purple-100 shadow-md"
                      : "border-slate-200/80 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">
                        {item.patientName}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ID: {item.patientId}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                      NORMAL
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">
                      {item.testName}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      {item.statusBadge}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p>
                      Ordered by:{" "}
                      <strong className="text-slate-700">Dr. Emeka Obi</strong>
                    </p>
                    <p>
                      Completed:{" "}
                      <span className="text-slate-600 font-medium">
                        {item.completedTime}
                      </span>
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      className={`w-full rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? "bg-[#6B21A8] hover:bg-[#581c87] text-white shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {isSelected ? "View Report Preview" : "View Report"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT DRAWER: INVESTIGATION REPORT PREVIEW */}
        {activeReport && (
          <div className="w-[320px] lg:w-[350px] shrink-0 space-y-6 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs sticky top-24">
            {/* Drawer Header & Close Button */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                  Investigation Report
                </h3>
                <div className="mt-1">
                  <span className="font-bold text-xs text-slate-900 block">
                    {activeReport.patientName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Patient ID: {activeReport.patientId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReportId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition -mr-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[11px] pt-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                  Test Performed
                </span>
                <strong className="text-slate-900 font-bold block mt-0.5 leading-snug">
                  {activeReport.testName}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                  Performed By
                </span>
                <strong className="text-slate-900 font-bold block mt-0.5">
                  {activeReport.technician}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                  Completed Time
                </span>
                <strong className="text-slate-900 font-bold block mt-0.5">
                  {activeReport.completedTime}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                  Scan Quality
                </span>
                <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                  ● Quality: {activeReport.scanQuality}
                </span>
              </div>
            </div>

            {/* Key Findings */}
            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-slate-900 block">
                Key Findings
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {activeReport.findings.map((finding) => (
                  <span
                    key={finding}
                    className="px-2.5 py-1 bg-rose-50 text-rose-600 font-bold text-[11px] rounded-md"
                  >
                    {finding}
                  </span>
                ))}
              </div>
            </div>

            {/* Clinical Interpretation */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-slate-900 block">
                Clinical Interpretation
              </label>
              <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                {activeReport.interpretation}
              </p>
            </div>

            {/* Report Actions */}
            <div className="space-y-2 pt-4">
              <button className="w-full bg-[#6B21A8] hover:bg-[#581c87] text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-xs cursor-pointer">
                Approve & Send to Doctor
              </button>

              <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer">
                Request Re-scan
              </button>

              <button className="w-full text-rose-600 hover:underline font-bold text-xs py-1 transition text-center block cursor-pointer">
                Flag for Review
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}