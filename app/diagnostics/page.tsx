"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  User,
  Activity,
} from "lucide-react";

export default function DiagnosticsPage() {
  const [selectedFilter, setSelectedFilter] = useState("All Tests");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    "SPK-30801"
  );

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
              placeholder="Search patient or test..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition">
            <Filter className="w-3.5 h-3.5" />
            <span>Test Type</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition">
            <Calendar className="w-3.5 h-3.5" />
            <span>Aug 28, 2026</span>
          </button>

          <button className="flex items-center gap-1.5 px-4 py-2 bg-[#6B21A8] hover:bg-[#581c87] text-white rounded-xl text-xs font-bold shadow-xs transition">
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
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
        {/* KANBAN BOARD (3 COLUMNS) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 min-w-[850px]">
          
          {/* COLUMN 1: PENDING REQUESTS (3) */}
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

            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Chidinma Okafor</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-30692</span>
                </div>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  URGENT
                </span>
              </div>

              <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg inline-block">
                Macular OCT - Both Eyes
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Ananya Mehta</strong></p>
                <p>Requested: <span className="text-slate-600 font-medium">28 Aug, 9:30 AM</span></p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition">
                  Assign Technician
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> 45m ago
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Emeka Nwosu</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-31004</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  NORMAL
                </span>
              </div>

              <div className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg inline-block">
                Visual Field Test - OD
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Fatima Hassan</strong></p>
                <p>Requested: <span className="text-slate-600 font-medium">28 Aug, 8:15 AM</span></p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition">
                  Assign Technician
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> 2 hrs ago
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Aisha Bello</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-31012</span>
                </div>
                <span className="px-2 py-0.5 bg-rose-600 text-white font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  ● EMERGENCY
                </span>
              </div>

              <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                Fundus Photography - OU
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Emeka Obi</strong></p>
                <p>Requested: <span className="text-slate-600 font-medium">28 Aug, 10:05 AM</span></p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition">
                  Assign Technician
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> 12m ago
              </p>
            </div>
          </div>

          {/* COLUMN 2: IN PROGRESS (2) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className="font-bold text-sm text-slate-900">In Progress</h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                2
              </span>
            </div>

            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Rajesh Kumar</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-30845</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  NORMAL
                </span>
              </div>

              <div className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg inline-block">
                Tonometry - Both Eyes
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Ananya Mehta</strong></p>
                <p>Technician: <strong className="text-slate-700">Tech. Blessing Ade</strong></p>
              </div>

              {/* Progress Bar */}
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
                <button className="w-full bg-purple-50 hover:bg-purple-100 text-[#6B21A8] border border-purple-200 rounded-xl py-2 text-xs font-bold transition">
                  Upload Result
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Folashade Ige</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-30978</span>
                </div>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  URGENT
                </span>
              </div>

              <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg inline-block">
                Macular OCT - OS
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Fatima Hassan</strong></p>
                <p>Technician: <strong className="text-slate-700">Tech. Yusuf Musa</strong></p>
              </div>

              {/* Progress Bar */}
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
                <button className="w-full bg-purple-50 hover:bg-purple-100 text-[#6B21A8] border border-purple-200 rounded-xl py-2 text-xs font-bold transition">
                  Upload Result
                </button>
              </div>
            </div>
          </div>

          {/* COLUMN 3: RESULTS READY (4) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="font-bold text-sm text-slate-900">Results Ready</h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                4
              </span>
            </div>

            {/* Selected Active Card - Grace Okonkwo */}
            <div
              onClick={() => setSelectedReportId("SPK-30801")}
              className={`bg-white rounded-2xl border-2 p-4 space-y-3 shadow-md cursor-pointer transition ${
                selectedReportId === "SPK-30801"
                  ? "border-[#6B21A8] ring-2 ring-purple-100"
                  : "border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Grace Okonkwo</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-30801</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  NORMAL
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">
                  Macular OCT - OD
                </span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  Abnormality Detected
                </span>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Emeka Obi</strong></p>
                <p>Completed: <span className="text-slate-600 font-medium">28 Aug, 8:30 AM</span></p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-[#6B21A8] hover:bg-[#581c87] text-white rounded-xl py-2 text-xs font-bold shadow-xs transition">
                  View Report Preview
                </button>
              </div>
            </div>

            {/* Card 2 - Ibrahim Suleiman */}
            <div
              onClick={() => setSelectedReportId("SPK-30856")}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md cursor-pointer transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Ibrahim Suleiman</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-30856</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  NORMAL
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg">
                  Visual Field - OU
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Within Normal Limits
                </span>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Ananya Mehta</strong></p>
                <p>Completed: <span className="text-slate-600 font-medium">27 Aug, 4:15 PM</span></p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition">
                  View Report
                </button>
              </div>
            </div>

            {/* Card 3 - Ngozi Eze */}
            <div
              onClick={() => setSelectedReportId("SPK-30899")}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md cursor-pointer transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Ngozi Eze</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-30899</span>
                </div>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  URGENT
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                  Fundus Photo - OD
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  Review Required
                </span>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Fatima Hassan</strong></p>
                <p>Completed: <span className="text-slate-600 font-medium">27 Aug, 3:00 PM</span></p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition">
                  View Report
                </button>
              </div>
            </div>

            {/* Card 4 - Tunde Bakare */}
            <div
              onClick={() => setSelectedReportId("SPK-30910")}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs hover:shadow-md cursor-pointer transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Tunde Bakare</h3>
                  <span className="text-[10px] text-slate-400 font-medium">ID: SPK-30910</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[9px] rounded-md tracking-wider uppercase">
                  NORMAL
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">
                  Tonometry - OU
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Normal Range
                </span>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Ordered by: <strong className="text-slate-700">Dr. Emeka Obi</strong></p>
                <p>Completed: <span className="text-slate-600 font-medium">27 Aug, 1:45 PM</span></p>
              </div>

              <div className="pt-2">
                <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2 text-xs font-bold transition">
                  View Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT DRAWER: INVESTIGATION REPORT PREVIEW */}
{selectedReportId && (
  <div className="w-[320px] lg:w-[350px] shrink-0 space-y-6 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
  {/* Drawer Header & Close Button */}
  <div className="flex items-start justify-between">
    <div>
      <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
        Investigation Report
      </h3>
      <div className="mt-1">
        <span className="font-bold text-xs text-slate-900 block">
          Grace Okonkwo
        </span>
        <span className="text-[10px] text-slate-400 font-medium block">
          Patient ID: SPK-30801
        </span>
      </div>
    </div>
    <button
      onClick={() => setSelectedReportId(null)}
      className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition -mr-1"
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
        Macular OCT - Right Eye (OD)
      </strong>
    </div>
    <div className="text-right">
      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
        Performed By
      </span>
      <strong className="text-slate-900 font-bold block mt-0.5">
        Tech. Blessing Ade
      </strong>
    </div>
    <div>
      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
        Completed Time
      </span>
      <strong className="text-slate-900 font-bold block mt-0.5">
        Aug 28, 2026, 8:30 AM
      </strong>
    </div>
    <div className="text-right">
      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
        Ophthalmic OCT Scan
      </span>
      <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
        ● Scan Quality: Good
      </span>
    </div>
  </div>

  {/* Key Findings */}
  <div className="space-y-2 pt-2">
    <label className="text-[11px] font-bold text-slate-900 block">
      Key Findings
    </label>
    <div className="flex items-center gap-2">
      <span className="px-2.5 py-1 bg-rose-50 text-rose-600 font-bold text-[11px] rounded-md">
        Macular Edema
      </span>
      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-md">
        Subretinal Fluid
      </span>
    </div>
  </div>

  {/* Clinical Interpretation */}
  <div className="space-y-2 pt-1">
    <label className="text-[11px] font-bold text-slate-900 block">
      Clinical Interpretation
    </label>
    <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
      OCT reveals mild macular edema with central retinal thickness of 310µm
      (normal &lt;300µm). Subretinal fluid noted in the foveal region.
      Recommend anti-VEGF injection consultation and follow-up OCT in 4 weeks.
    </p>
  </div>

  {/* Report Actions */}
  <div className="space-y-2 pt-4">
    <button className="w-full bg-[#6B21A8] hover:bg-[#581c87] text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-xs">
      Approve & Send to Doctor
    </button>

    <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition">
      Request Re-scan
    </button>

    <button className="w-full text-rose-600 hover:underline font-bold text-xs py-1 transition text-center block">
      Flag for Review
    </button>
  </div>
</div>
)}
      </main>
    </div>
  );
}