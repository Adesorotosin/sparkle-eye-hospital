import React, { useState } from "react";
import {
  Calendar,
  CreditCard,
  User,
  ShieldAlert,
  FileText,
  Clock,
  Eye,
  Plus,
  Check,
  ChevronRight,
  ClipboardList,
  Stethoscope,
  Pill,
  Scissors,
} from "lucide-react";

export default function OphthalmologyConsultation() {
  const [activeTab, setActiveTab] = useState("slit-lamp");

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col text-slate-800 font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
      {/* TOP HEADER / PATIENT BAR */}
      <header className="bg-[#0B132B] text-white px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-800 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-700/60 border border-slate-600 flex items-center justify-center font-bold text-slate-200 text-sm">
            MC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-white tracking-tight">
                Margaret Chen
              </h1>
              <span className="text-xs text-slate-400 font-medium">
                68F · DOB: 03/14/1958
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-wide mt-0.5">
              MRN: #MRN-20458712
            </p>
          </div>
        </div>

        {/* Status Badge & Patient Info Metadata */}
        <div className="flex items-center gap-6 text-xs text-slate-300">
          <div className="hidden md:flex items-center gap-2 border-r border-slate-700/80 pr-6">
            <span className="text-slate-400 font-medium">ALLERGIES:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Penicillin Allergy
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Sulfa Allergy
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-5 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Insurance:</span>
              <strong className="font-semibold text-white">Aetna PPO</strong>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Provider:</span>
              <strong className="font-semibold text-white">
                Dr. Sarah Patel, MD — Ophthalmology
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Encounter In Progress
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto">
        {/* LEFT COLUMN: PATIENT HISTORY & IMAGING */}
        <div className="lg:col-span-4 space-y-6">
          {/* Patient History Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="mb-4">
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Patient History
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Chronological ophthalmic visit logs
              </p>
            </div>

            <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
              {/* Timeline Entry 1 */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-purple-50 border-2 border-[#6B21A8] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6B21A8]"></div>
                </div>
                <div className="text-[11px]">
                  <span className="font-bold text-[#6B21A8] block">
                    08/15/2026
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs mt-0.5">
                    Annual Eye Exam
                  </h3>
                  <p className="text-slate-600 leading-relaxed mt-1">
                    VA 20/25 OD, 20/30 OS. Stable visual fields. Refraction
                    checked.
                  </p>
                </div>
              </div>

              {/* Timeline Entry 2 */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-purple-50 border-2 border-[#6B21A8] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6B21A8]"></div>
                </div>
                <div className="text-[11px]">
                  <span className="font-bold text-[#6B21A8] block">
                    03/02/2026
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs mt-0.5">
                    Follow-up: Glaucoma Suspect
                  </h3>
                  <p className="text-slate-600 leading-relaxed mt-1">
                    IOP 18 mmHg OD, 19 mmHg OS. C/D ratio stable at 0.55 OU.
                    Repeat OCT requested.
                  </p>
                </div>
              </div>

              {/* Timeline Entry 3 */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-purple-50 border-2 border-[#6B21A8] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6B21A8]"></div>
                </div>
                <div className="text-[11px]">
                  <span className="font-bold text-[#6B21A8] block">
                    11/10/2025
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs mt-0.5">
                    Diabetic Retinopathy Screening
                  </h3>
                  <p className="text-slate-600 leading-relaxed mt-1">
                    No DR detected. Macula clear. Recommends routine return in 1
                    year.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Imaging Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="mb-4">
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Recent Imaging
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                OCT Scans & Diagnostic Imaging
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Scan Card 1 */}
              <div className="border border-slate-200/80 rounded-xl p-2.5 bg-slate-50/50 hover:border-slate-300 transition cursor-pointer group">
                <div className="aspect-video bg-[#0A0E1A] rounded-lg overflow-hidden relative border border-slate-800 flex items-center justify-center">
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-slate-300 bg-slate-900/80 px-1.5 py-0.5 rounded">
                    OCT SCAN
                  </span>
                  <svg
                    className="w-full h-full p-2 text-rose-500 opacity-80"
                    viewBox="0 0 100 50"
                  >
                    <path
                      d="M0,45 Q25,10 50,25 T100,5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,35 Q25,20 50,40 T100,25"
                      fill="none"
                      stroke="#0EA5E9"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <div className="mt-2 text-left">
                  <strong className="text-xs font-bold text-slate-900 block group-hover:text-[#6B21A8]">
                    OCT Macula OD
                  </strong>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    08/15/2026
                  </span>
                </div>
              </div>

              {/* Scan Card 2 */}
              <div className="border border-slate-200/80 rounded-xl p-2.5 bg-slate-50/50 hover:border-slate-300 transition cursor-pointer group">
                <div className="aspect-video bg-[#0A0E1A] rounded-lg overflow-hidden relative border border-slate-800 flex items-center justify-center">
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-slate-300 bg-slate-900/80 px-1.5 py-0.5 rounded">
                    OCT SCAN
                  </span>
                  <svg
                    className="w-full h-full p-2 text-emerald-400 opacity-80"
                    viewBox="0 0 100 50"
                  >
                    <path
                      d="M0,10 Q35,40 60,15 T100,30"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,25 Q40,5 70,35 T100,45"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <div className="mt-2 text-left">
                  <strong className="text-xs font-bold text-slate-900 block group-hover:text-[#6B21A8]">
                    OCT RNFL OS
                  </strong>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    08/15/2026
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Previous Rx Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Previous Rx
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">
                Last Issued: 08/15/2026
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 space-y-1.5 font-mono text-xs text-slate-700">
              <div>
                <strong className="font-bold text-slate-900">OD:</strong> -2.25
                -0.75 x 180
              </div>
              <div>
                <strong className="font-bold text-slate-900">OS:</strong> -1.75
                -0.50 x 005
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: EXAMINATION TABS & OBSERVATIONS */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Tab Navigation */}
            <div className="flex items-center gap-8 border-b border-slate-200 pb-3 mb-6">
              <button
                onClick={() => setActiveTab("slit-lamp")}
                className={`font-bold text-sm transition relative pb-2 -mb-3.5 ${
                  activeTab === "slit-lamp"
                    ? "text-[#6B21A8] border-b-2 border-[#6B21A8]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Slit Lamp Exam
              </button>
              <button
                onClick={() => setActiveTab("refraction")}
                className={`font-bold text-sm transition relative pb-2 -mb-3.5 ${
                  activeTab === "refraction"
                    ? "text-[#6B21A8] border-b-2 border-[#6B21A8]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Refraction & Prescription
              </button>
              <button
                onClick={() => setActiveTab("diagnosis")}
                className={`font-bold text-sm transition relative pb-2 -mb-3.5 ${
                  activeTab === "diagnosis"
                    ? "text-[#6B21A8] border-b-2 border-[#6B21A8]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Diagnosis & Assessment
              </button>
            </div>

            {/* TAB CONTENT: SLIT LAMP EXAM */}
            {activeTab === "slit-lamp" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* OD (Right Eye) Panel */}
                <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-purple-700"></span>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      OD (Right Eye)
                    </h3>
                  </div>

                  {/* Cornea */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Cornea
                    </label>
                    <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-700 font-medium">
                      Clear, no staining
                    </div>
                  </div>

                  {/* Anterior Chamber */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Anterior Chamber
                    </label>
                    <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-700 font-medium">
                      Deep and quiet, no cells/flare
                    </div>
                  </div>

                  {/* Lens */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Lens
                    </label>
                    <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-700 font-medium">
                      Trace nuclear sclerosis 1+
                    </div>
                  </div>

                  {/* Additional Notes Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Additional Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Type eye-specific slit lamp observations here..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8] transition resize-none"
                    ></textarea>
                  </div>
                </div>

                {/* OS (Left Eye) Panel */}
                <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-purple-700"></span>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      OS (Left Eye)
                    </h3>
                  </div>

                  {/* Cornea */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Cornea
                    </label>
                    <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-700 font-medium">
                      Clear, no staining
                    </div>
                  </div>

                  {/* Anterior Chamber */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Anterior Chamber
                    </label>
                    <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-700 font-medium">
                      Deep and quiet, no cells/flare
                    </div>
                  </div>

                  {/* Lens */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Lens
                    </label>
                    <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-700 font-medium">
                      Trace nuclear sclerosis 1+
                    </div>
                  </div>

                  {/* Additional Notes Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Additional Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Type eye-specific slit lamp observations here..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8] transition resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* PLACEHOLDER FOR OTHER TABS */}
            {activeTab !== "slit-lamp" && (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <p className="text-sm font-semibold">
                  Section view configured for {activeTab}.
                </p>
                <p className="text-xs">
                  Select "Slit Lamp Exam" to return to active view.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM FIXED ENCOUNTER BAR */}
      <footer className="bg-[#0B132B] text-white px-6 py-3 flex items-center justify-between border-t border-slate-800 sticky bottom-0 z-20">
        <button className="px-4 py-2 border border-slate-700 text-slate-200 hover:bg-slate-800 rounded-xl text-xs font-bold transition">
          Save Draft
        </button>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700">
            <ClipboardList className="w-3.5 h-3.5 text-slate-300" />
            Order Diagnostics
          </button>

          <button className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-300" />
            Schedule Surgery
          </button>

          <button className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700">
            <Pill className="w-3.5 h-3.5 text-slate-300" />
            Issue Prescription
          </button>

          <button className="px-5 py-2.5 bg-[#6B21A8] hover:bg-[#581c87] text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2">
            <Check className="w-4 h-4" />
            Complete Encounter
          </button>
        </div>
      </footer>
    </div>
  );
}