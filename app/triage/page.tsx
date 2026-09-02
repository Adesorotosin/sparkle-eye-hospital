"use client";

import React, { useState } from "react";
import {
  Eye,
  Bell,
  Sparkles,
  Info,
  MessageSquare,
  Clock,
  ArrowRight,
  Plus,
  ChevronDown,
  User,
} from "lucide-react";

export default function TriageVitalsPage() {
  // Form State
  const [odVisual, setOdVisual] = useState("20/40");
  const [osVisual, setOsVisual] = useState("20/20");
  const [ouVisual, setOuVisual] = useState("20/30");
  const [withCorrection, setWithCorrection] = useState(false);

  const [odIop, setOdIop] = useState("16");
  const [osIop, setOsIop] = useState("24"); // High reading triggers red flag
  const [instrument, setInstrument] = useState("Goldmann Applanation");

  const [bpSystolic, setBpSystolic] = useState("128");
  const [bpDiastolic, setBpDiastolic] = useState("82");
  const [pulse, setPulse] = useState("76");
  const [temp, setTemp] = useState("36.8");
  const [spo2, setSpo2] = useState("98");

  // Chief Complaint & Symptoms
  const [complaintText, setComplaintText] = useState(
    "Patient reports blurry vision in right eye for the past 2 weeks. Occasional headaches and sensitivity to bright light. No history of trauma."
  );
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    "Blurry Vision",
    "Light Sensitivity",
  ]);
  const [severity, setSeverity] = useState<"Mild" | "Moderate" | "Severe">(
    "Moderate"
  );
  const [duration, setDuration] = useState("2 weeks");

  const symptomsList = [
    "Blurry Vision",
    "Eye Pain",
    "Redness",
    "Floaters",
    "Light Sensitivity",
    "Discharge",
  ];

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800 font-sans antialiased">
      {/* GLOBAL NAVBAR */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6B21A8] text-white flex items-center justify-center font-bold shadow-xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 leading-tight">
                Sparkle Eye Specialist Hospital
              </h1>
              <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase block">
                Triage & Clinical Care
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-600">
            <a href="#" className="px-4 py-2 rounded-lg hover:bg-slate-100 transition">
              Dashboard
            </a>
            <a href="#" className="px-4 py-2 rounded-lg hover:bg-slate-100 transition">
              Patients
            </a>
            <a href="#" className="px-4 py-2 bg-purple-50 text-[#6B21A8] rounded-lg transition">
              Triage
            </a>
            <a href="#" className="px-4 py-2 rounded-lg hover:bg-slate-100 transition">
              Appointments
            </a>
            <a href="#" className="px-4 py-2 rounded-lg hover:bg-slate-100 transition">
              Billing
            </a>
          </nav>
        </div>

        {/* User Info & Notification */}
        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>

          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-purple-100 text-[#6B21A8] flex items-center justify-center font-bold text-xs border border-purple-200">
              EO
            </div>
            <div className="text-left leading-tight">
              <span className="block font-bold text-xs text-slate-900">
                Dr. Emeka Obi
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Ophthalmologist
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* PATIENT SUB-HEADER BAR */}
      <div className="bg-white border-b border-slate-200/80 px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-purple-50 text-[#6B21A8] flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-extrabold text-slate-900 text-sm">Sarah Adams</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-semibold">
              ID: <strong className="text-slate-800">SESH-2026-089</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-semibold">
              Age: <strong className="text-slate-800">34 yrs</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-semibold">
              Sex: <strong className="text-slate-800">Female</strong>
            </span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md text-[10px] uppercase">
              Walk-in
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 font-bold rounded-full border border-amber-200/80 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Triage Status: In Progress
          </span>
          <span className="text-slate-400">Aug 28, 2026 • 9:15 AM</span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTENT */}
      <main className="max-w-[1400px] mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: EYE & GENERAL VITALS FORM (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-8 space-y-8">
          
          {/* Eye Vitals Section Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-[#6B21A8]">
              <Eye className="w-5 h-5 stroke-[2.5]" />
              <h2 className="font-bold text-base text-slate-900 tracking-tight">
                Eye Vitals Entry
              </h2>
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-[#6B21A8] font-bold text-[10px] rounded-md tracking-wider uppercase">
              Required
            </span>
          </div>

          {/* VISUAL ACUITY (SNELLEN CHART) */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Visual Acuity (Snellen Chart)
              </label>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* OD - Right Eye */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 block">
                  OD — Right Eye
                </span>
                <div className="relative">
                  <select
                    value={odVisual}
                    onChange={(e) => setOdVisual(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:border-purple-600"
                  >
                    <option value="20/40">20/40</option>
                    <option value="20/20">20/20</option>
                    <option value="20/50">20/50</option>
                  </select>
                  <span className="absolute right-2.5 top-2.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[9px] rounded">
                    Mild Reduction
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Without correction
                </span>
              </div>

              {/* OS - Left Eye */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 block">
                  OS — Left Eye
                </span>
                <div className="relative">
                  <select
                    value={osVisual}
                    onChange={(e) => setOsVisual(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:border-purple-600"
                  >
                    <option value="20/20">20/20</option>
                    <option value="20/30">20/30</option>
                  </select>
                  <span className="absolute right-2.5 top-2.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded">
                    Normal
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Without correction
                </span>
              </div>

              {/* OU - Both Eyes */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 block">
                  OU — Both Eyes
                </span>
                <div className="relative">
                  <select
                    value={ouVisual}
                    onChange={(e) => setOuVisual(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:border-purple-600"
                  >
                    <option value="20/30">20/30</option>
                    <option value="20/20">20/20</option>
                  </select>
                  <span className="absolute right-2.5 top-2.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[9px] rounded">
                    Slight Reduction
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Without correction
                </span>
              </div>
            </div>

            {/* Correction Toggle */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-xs font-bold text-slate-700 block">
                  With Correction (Glasses/Contacts)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Input refraction status under correction
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWithCorrection(!withCorrection)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  withCorrection ? "bg-[#6B21A8]" : "bg-slate-200"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    withCorrection ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* INTRAOCULAR PRESSURE (IOP) */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Intraocular Pressure (IOP)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Tonometry Reading
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OD IOP */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 block">
                  OD (Right Eye)
                </span>
                <div className="relative">
                  <input
                    type="number"
                    value={odIop}
                    onChange={(e) => setOdIop(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-12 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                    mmHg
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Normal (10–21 mmHg)
                </span>
              </div>

              {/* OS IOP - HIGH FLAGGED STATE */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 block">
                  OS (Left Eye)
                </span>
                <div className="relative">
                  <input
                    type="number"
                    value={osIop}
                    onChange={(e) => setOsIop(e.target.value)}
                    className="w-full bg-rose-50/40 border-2 border-rose-500 rounded-xl py-2.5 pl-3 pr-12 text-xs font-bold text-rose-600 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-rose-400">
                    mmHg
                  </span>
                </div>
                <span className="text-[10px] font-bold text-rose-600 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  High — Flagged
                </span>
              </div>
            </div>

            {/* Instrument Used Dropdown */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-600 block">
                Instrument Used
              </label>
              <div className="relative">
                <select
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-purple-600"
                >
                  <option value="Goldmann Applanation">
                    Goldmann Applanation
                  </option>
                  <option value="Non-Contact Tonometer">
                    Non-Contact Tonometer
                  </option>
                  <option value="Icare Tonometer">Icare Tonometer</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                Default gold standard method
              </span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* GENERAL VITALS */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              General Vitals
            </label>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* BP */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Blood Pressure
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center text-xs font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-slate-300 font-bold">/</span>
                  <input
                    type="text"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <span className="text-[9px] font-bold text-amber-600 block">
                  ● Elevated (mmHg)
                </span>
              </div>

              {/* Pulse Rate */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Pulse Rate
                </span>
                <div className="relative">
                  <input
                    type="text"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-2 pr-8 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="absolute right-2 top-2 text-[10px] font-semibold text-slate-400">
                    bpm
                  </span>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 block">
                  ● Normal (10–21 mmHg)
                </span>
              </div>

              {/* Temperature */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Temperature
                </span>
                <div className="relative">
                  <input
                    type="text"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-2 pr-6 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="absolute right-2 top-2 text-[10px] font-semibold text-slate-400">
                    °C
                  </span>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 block">
                  ● Normal (10–21 mmHg)
                </span>
              </div>

              {/* SpO2 */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  SpO2
                </span>
                <div className="relative">
                  <input
                    type="text"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-2 pr-6 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="absolute right-2 top-2 text-[10px] font-semibold text-slate-400">
                    %
                  </span>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 block">
                  ● Normal (10–21 mmHg)
                </span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
            <button
              type="button"
              className="w-full sm:w-auto flex-1 bg-[#6B21A8] hover:bg-[#581c87] text-white font-bold py-3.5 px-6 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              <span>Save Vitals & Proceed to Exam</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-6 rounded-xl text-xs transition"
            >
              Save as Draft
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: CHIEF COMPLAINT & HISTORICAL VITALS (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CHIEF COMPLAINT CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-2 text-[#6B21A8]">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                Chief Complaint
              </h3>
            </div>

            <textarea
              rows={4}
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-700 leading-relaxed focus:outline-none focus:border-purple-600 resize-none"
            />

            {/* QUICK-ADD SYMPTOMS */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Quick-Add Symptoms
              </label>
              <div className="flex flex-wrap gap-2">
                {symptomsList.map((sym) => {
                  const isSelected = selectedSymptoms.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        isSelected
                          ? "bg-[#6B21A8] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{sym}</span>
                      {isSelected && <span>✓</span>}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>More</span>
                </button>
              </div>
            </div>

            {/* SEVERITY & DURATION */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Severity
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  {(["Mild", "Moderate", "Severe"] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                        severity === sev
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Duration
                </label>
                <div className="relative">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs font-bold text-slate-800 appearance-none focus:outline-none"
                  >
                    <option value="2 weeks">2 weeks</option>
                    <option value="1 week">1 week</option>
                    <option value="1 month">1 month</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* RECENT VITALS HISTORY CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#6B21A8]">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                  Recent Vitals History
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[9px] font-bold rounded-full border border-amber-200/80">
                IOP OD ↑ Trending Up
              </span>
            </div>

            {/* Historical Entries */}
            <div className="space-y-3">
              {/* Entry 1 */}
              <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Aug 10, 2026</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Follow-up Visit
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-medium pt-1">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      Visual Acuity
                    </span>
                    <strong className="text-slate-800 font-bold">
                      OD 20/30 • OS 20/20
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      IOP
                    </span>
                    <strong className="text-slate-800 font-bold">
                      OD 15 • OS 18 mmHg
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      Blood Pressure
                    </span>
                    <strong className="text-slate-800 font-bold">
                      122/80 mmHg
                    </strong>
                  </div>
                </div>
              </div>

              {/* Entry 2 */}
              <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Jun 15, 2026</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Routine Exam
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-medium pt-1">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      Visual Acuity
                    </span>
                    <strong className="text-slate-800 font-bold">
                      OD 20/25 • OS 20/20
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      IOP
                    </span>
                    <strong className="text-slate-800 font-bold">
                      OD 14 • OS 16 mmHg
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      Blood Pressure
                    </span>
                    <strong className="text-slate-800 font-bold">
                      118/76 mmHg
                    </strong>
                  </div>
                </div>
              </div>

              {/* Entry 3 */}
              <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Mar 02, 2026</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    First Consultation
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-medium pt-1">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      Visual Acuity
                    </span>
                    <strong className="text-slate-800 font-bold">
                      OD 20/25 • OS 20/20
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      IOP
                    </span>
                    <strong className="text-slate-800 font-bold">
                      OD 13 • OS 15 mmHg
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">
                      Blood Pressure
                    </span>
                    <strong className="text-slate-800 font-bold">
                      120/78 mmHg
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* History Footer Link */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                className="text-[#6B21A8] font-bold hover:underline"
              >
                View Full History →
              </button>
              <span className="text-slate-400 text-[10px] font-medium">
                Showing 3 historical records
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}