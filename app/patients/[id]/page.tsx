"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckSquare,
  Search,
  Eye,
} from "lucide-react";

export default function PatientEHRPage() {
  const [activeTab, setActiveTab] = useState("Eye Examination");
  const [selectedVisit, setSelectedVisit] = useState("24 Aug 2026");

  // Eye Exam Form State
  const [affectedEye, setAffectedEye] = useState("OU");
  const [chiefComplaint, setChiefComplaint] = useState(
    "Gradual blurring of vision, both eyes, worse in the right"
  );
  const [duration, setDuration] = useState("3 months");
  const [currentDrops, setCurrentDrops] = useState("Timolol 0.5% BD");
  const [pastSurgeries, setPastSurgeries] = useState("Cataract surgery OS — 2024");

  // Systemic Conditions State
  const [systemic, setSystemic] = useState({
    diabetes: true,
    hypertension: true,
    asthma: false,
    sickleCell: false,
  });

  // Anatomic Segment Findings State
  const [anatomicFindings, setAnatomicFindings] = useState({
    odLids: "Normal",
    osLids: "Normal",
    odConjunctiva: "Clear",
    osConjunctiva: "Clear",
    odCornea: "Clear",
    osCornea: "Clear",
    odAC: "Quiet, Deep",
    osAC: "Quiet, Deep",
    odIris: "Normal",
    osIris: "Normal",
    odLens: "Nuclear Sclerosis 2+",
    osLens: "PCIOL in situ (Clear)",
    odOpticDisc: "C/D 0.6, Rim thin temporally",
    osOpticDisc: "C/D 0.4, Healthy rim",
    odMacula: "Normal reflex",
    osMacula: "Normal reflex",
  });

  const tabs = [
    "Patient Info",
    "History",
    "Eye Examination",
    "Diagnosis",
    "Treatment",
    "Investigations",
    "Surgery",
    "Pharmacy",
    "Payments",
    "Reports",
  ];

  const visitHistory = [
    { date: "24 Aug 2026", type: "Follow-up Review", isToday: true },
    { date: "10 Jul 2026", type: "Glaucoma Check", isToday: false },
    { date: "15 May 2026", type: "Initial Examination", isToday: false },
    { date: "02 Mar 2026", type: "Refraction Test", isToday: false },
    { date: "18 Jan 2026", type: "Emergency Consult", isToday: false },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F3F5F8] font-sans antialiased text-slate-800">
      {/* 1. TOP PATIENT HEADER BANNER */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-sm px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Patient Avatar & Key Info */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#EFEBFF] text-[#6D4AFF] font-bold text-sm flex items-center justify-center shrink-0 border border-purple-100">
              AO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-none">
                  Mrs. Adaeze Okonkwo
                </h1>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  SESH-2026-089
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                54 / Female
              </p>
            </div>
          </div>

          {/* Center: Vitals Badge */}
          <div className="flex items-center gap-6 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                BLOOD PRESSURE
              </span>
              <span className="text-slate-900 font-bold">130/85 mmHg</span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                PULSE RATE
              </span>
              <span className="text-slate-900 font-bold">78 bpm</span>
            </div>
          </div>

          {/* Right: Clinical Alert Badges */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Drug Allergy: Sulfonamides</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Diabetic</span>
            </div>
          </div>
        </div>

        {/* 2. EHR MODULE TAB NAVIGATION */}
        <div className="mt-4 border-t border-slate-100 pt-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
                activeTab === tab
                  ? "bg-[#6D4AFF] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex min-h-[calc(100vh-120px)]">
        
        {/* LEFT PANEL: VISIT HISTORY */}
        <aside className="w-64 border-r border-slate-200/80 bg-white p-4 shrink-0 hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              VISIT HISTORY
            </h2>
            <ChevronLeft className="w-4 h-4 text-slate-400 cursor-pointer" />
          </div>

          <div className="space-y-2">
            {visitHistory.map((visit) => (
              <button
                key={visit.date}
                onClick={() => setSelectedVisit(visit.date)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                  selectedVisit === visit.date
                    ? "bg-purple-50/80 border-[#6D4AFF] ring-1 ring-[#6D4AFF]/20"
                    : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>
                    {visit.date} {visit.isToday && "(Today)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {visit.type}
                </p>
              </button>
            ))}
          </div>
        </aside>

        {/* RIGHT CANVAS: ACTIVE TAB CONTENT */}
        <main className="flex-1 p-6 space-y-6 max-w-6xl">
          {activeTab === "Eye Examination" && (
            <>
              {/* SECTION HEADER */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Eye Examination Overview
                </h2>
              </div>

              {/* CARD 1: CHIEF COMPLAINT & MEDICAL HISTORY */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Chief Complaint & Medical History
                </h3>

                {/* Complaint & Duration */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Chief Complaint
                    </label>
                    <input
                      type="text"
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF]"
                    />
                  </div>
                </div>

                {/* Affected Eye, Eye Drops, Past Surgeries */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Affected Eye
                    </label>
                    <div className="flex items-center gap-2 pt-0.5">
                      {["OD", "OS", "OU"].map((eye) => (
                        <button
                          key={eye}
                          type="button"
                          onClick={() => setAffectedEye(eye)}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition ${
                            affectedEye === eye
                              ? "bg-purple-50 border-[#6D4AFF] text-[#6D4AFF]"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {eye}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current Eye Drops
                    </label>
                    <input
                      type="text"
                      value={currentDrops}
                      onChange={(e) => setCurrentDrops(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Past Ocular Surgeries
                    </label>
                    <input
                      type="text"
                      value={pastSurgeries}
                      onChange={(e) => setPastSurgeries(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF]"
                    />
                  </div>
                </div>

                {/* Systemic Conditions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Systemic Conditions
                  </label>
                  <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemic.diabetes}
                        onChange={(e) =>
                          setSystemic({ ...systemic, diabetes: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-[#6D4AFF] accent-[#6D4AFF]"
                      />
                      Diabetes
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemic.hypertension}
                        onChange={(e) =>
                          setSystemic({ ...systemic, hypertension: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-[#6D4AFF] accent-[#6D4AFF]"
                      />
                      Hypertension
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemic.asthma}
                        onChange={(e) =>
                          setSystemic({ ...systemic, asthma: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-[#6D4AFF] accent-[#6D4AFF]"
                      />
                      Asthma
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemic.sickleCell}
                        onChange={(e) =>
                          setSystemic({ ...systemic, sickleCell: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-[#6D4AFF] accent-[#6D4AFF]"
                      />
                      Sickle Cell
                    </label>
                  </div>
                </div>
              </div>

              {/* CARD 2: VISUAL ACUITY & INTRAOCULAR PRESSURE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Acuity Table (2 Cols Wide) */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Visual Acuity (VA) Split
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                          <th className="pb-3">Parameter</th>
                          <th className="pb-3">OD (Right Eye)</th>
                          <th className="pb-3">OS (Left Eye)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        <tr>
                          <td className="py-3 font-semibold text-slate-900">Unaided Vision</td>
                          <td className="py-2 pr-3">
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]">
                              <option>6/36</option>
                              <option>6/60</option>
                              <option>6/18</option>
                            </select>
                          </td>
                          <td className="py-2">
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]">
                              <option>6/18</option>
                              <option>6/12</option>
                              <option>6/9</option>
                            </select>
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3 font-semibold text-slate-900">Current Glasses</td>
                          <td className="py-2 pr-3">
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]">
                              <option>6/24</option>
                              <option>6/18</option>
                            </select>
                          </td>
                          <td className="py-2">
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]">
                              <option>6/12</option>
                              <option>6/9</option>
                            </select>
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3 font-semibold text-slate-900">Best Corrected</td>
                          <td className="py-2 pr-3">
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]">
                              <option>6/12</option>
                              <option>6/9</option>
                            </select>
                          </td>
                          <td className="py-2">
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]">
                              <option>6/9</option>
                              <option>6/6</option>
                            </select>
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3 font-semibold text-slate-900">Pinhole</td>
                          <td className="py-2 pr-3">
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]">
                              <option>6/12</option>
                              <option>6/9</option>
                            </select>
                          </td>
                          <td className="py-2">
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]">
                              <option>6/9</option>
                              <option>6/6</option>
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Intraocular Pressure Box (1 Col Wide) */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">
                      Intraocular Pressure (IOP)
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          OD (Right Eye)
                        </label>
                        <div className="p-2.5 rounded-xl border-2 border-amber-400 bg-amber-50/50 text-amber-900 font-bold text-center text-sm">
                          22 mmHg
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          OS (Left Eye)
                        </label>
                        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold text-center text-sm">
                          16 mmHg
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Measurement Method
                      </label>
                      <select className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-[#6D4AFF]">
                        <option>NCT (Non-Contact Tonometry)</option>
                        <option>Goldmann Applanation Tonometry</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Measured on 24 Aug 2026, 10:32 AM</span>
                  </div>
                </div>
              </div>

              {/* CARD 3: ANATOMIC EYE EXAMINATION (ANTERIOR & POSTERIOR SEGMENTS) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#6D4AFF]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Anatomic Segment Examination
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    Slit Lamp & Ophthalmoscopy
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                        <th className="pb-3 w-1/4">Anatomic Structure</th>
                        <th className="pb-3 w-3/8">OD (Right Eye)</th>
                        <th className="pb-3 w-3/8">OS (Left Eye)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {/* Anterior Segment Header */}
                      <tr className="bg-slate-50/70">
                        <td colSpan={3} className="py-2 px-1 font-bold text-slate-500 text-[11px] tracking-wider uppercase">
                          Anterior Segment
                        </td>
                      </tr>

                      {/* Lids & Adnexa */}
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-900">Lids & Adnexa</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={anatomicFindings.odLids}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, odLids: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={anatomicFindings.osLids}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, osLids: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                      </tr>

                      {/* Conjunctiva / Sclera */}
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-900">Conjunctiva / Sclera</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={anatomicFindings.odConjunctiva}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, odConjunctiva: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={anatomicFindings.osConjunctiva}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, osConjunctiva: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                      </tr>

                      {/* Cornea */}
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-900">Cornea</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={anatomicFindings.odCornea}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, odCornea: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={anatomicFindings.osCornea}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, osCornea: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                      </tr>

                      {/* Anterior Chamber */}
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-900">Anterior Chamber</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={anatomicFindings.odAC}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, odAC: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={anatomicFindings.osAC}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, osAC: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                      </tr>

                      {/* Iris / Pupil */}
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-900">Iris & Pupil</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={anatomicFindings.odIris}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, odIris: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={anatomicFindings.osIris}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, osIris: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                      </tr>

                      {/* Crystalline Lens */}
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-900">Crystalline Lens</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={anatomicFindings.odLens}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, odLens: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={anatomicFindings.osLens}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, osLens: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                      </tr>

                      {/* Posterior Segment Header */}
                      <tr className="bg-slate-50/70">
                        <td colSpan={3} className="py-2 px-1 font-bold text-slate-500 text-[11px] tracking-wider uppercase">
                          Posterior Segment (Fundus)
                        </td>
                      </tr>

                      {/* Optic Disc */}
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-900">Optic Disc / Cup-to-Disc</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={anatomicFindings.odOpticDisc}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, odOpticDisc: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={anatomicFindings.osOpticDisc}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, osOpticDisc: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                      </tr>

                      {/* Macula */}
                      <tr>
                        <td className="py-2.5 font-semibold text-slate-900">Macula & Retina</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={anatomicFindings.odMacula}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, odMacula: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={anatomicFindings.osMacula}
                            onChange={(e) => setAnatomicFindings({ ...anatomicFindings, osMacula: e.target.value })}
                            className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] focus:bg-white"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* PLACEHOLDER STATES FOR OTHER TABS */}
          {activeTab !== "Eye Examination" && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-[#6D4AFF] flex items-center justify-center mx-auto">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {activeTab} Module
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Viewing {activeTab} history for Mrs. Adaeze Okonkwo. Active encounter records update automatically.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}