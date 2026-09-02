"use client";

import React, { useState } from "react";
import { AlertTriangle, ChevronLeft, Clock, Save } from "lucide-react";

export default function AnatomicEyeExamination() {
  const [activeTab, setActiveTab] = useState("Eye Examination");
  const [selectedVisit, setSelectedVisit] = useState("24 Aug 2026");

  // State management for Anatomic Examination segments
  const [anatomicData, setAnatomicData] = useState({
    eyelids: {
      od: ["Normal"],
      os: ["Normal"],
      odNotes: "",
      osNotes: "",
    },
    conjunctiva: {
      od: ["Injection"],
      os: ["Normal"],
      odNotes: "Mild conjunctival injection",
      osNotes: "",
    },
    cornea: {
      od: ["Clear"],
      os: ["Clear", "Arcus Senilis"],
      odNotes: "",
      osNotes: "",
    },
    anteriorChamber: {
      od: ["Deep & Quiet"],
      os: ["Deep & Quiet"],
      odNotes: "",
      osNotes: "",
    },
    irisPupil: {
      od: ["Normal"],
      os: ["Normal"],
      odNotes: "Reactive pupil reaction",
      osNotes: "Reactive pupil reaction",
    },
    lens: {
      od: ["Nuclear Sclerosis"],
      os: ["Pseudophakia"],
      odNotes: "Grade II nuclear sclerosis",
      osNotes: "Post cataract surgery 2024, IOL in situ",
    },
    retinaFundus: {
      od: ["Cup:Disc Ratio"],
      os: ["Normal", "Cup:Disc Ratio"],
      odNotes: "Suspicious C:D ratio (0.7), recommend OCT",
      osNotes: "C:D ratio 0.4",
    },
  });

  // Toggle selection for tags
  const toggleTag = (
    segment: keyof typeof anatomicData,
    eye: "od" | "os",
    tag: string
  ) => {
    setAnatomicData((prev) => {
      const currentTags = prev[segment][eye] as string[];
      let updatedTags: string[];

      if (tag === "Normal" || tag === "Clear" || tag === "Deep & Quiet") {
        // If selecting a default clear state, reset to just that state
        updatedTags = [tag];
      } else {
        // Remove default clear state if present when selecting an abnormality
        const filtered = currentTags.filter(
          (t) => t !== "Normal" && t !== "Clear" && t !== "Deep & Quiet"
        );
        if (filtered.includes(tag)) {
          updatedTags = filtered.filter((t) => t !== tag);
          if (updatedTags.length === 0) {
            updatedTags = [
              segment === "cornea"
                ? "Clear"
                : segment === "anteriorChamber"
                ? "Deep & Quiet"
                : "Normal",
            ];
          }
        } else {
          updatedTags = [...filtered, tag];
        }
      }

      return {
        ...prev,
        [segment]: {
          ...prev[segment],
          [eye]: updatedTags,
        },
      };
    });
  };

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

  const anatomySegments = [
    {
      id: "eyelids" as const,
      num: "1.",
      title: "Eyelids",
      options: ["Normal", "Ptosis", "Swelling", "Chalazion", "Entropion"],
    },
    {
      id: "conjunctiva" as const,
      num: "2.",
      title: "Conjunctiva",
      options: ["Normal", "Injection", "Discharge", "Pterygium", "Follicles"],
    },
    {
      id: "cornea" as const,
      num: "3.",
      title: "Cornea",
      options: ["Clear", "Opacity", "Ulcer", "Edema", "Arcus Senilis", "Foreign Body"],
    },
    {
      id: "anteriorChamber" as const,
      num: "4.",
      title: "Anterior Chamber",
      options: ["Deep & Quiet", "Shallow", "Cells", "Flare", "Hyphema"],
    },
    {
      id: "irisPupil" as const,
      num: "5.",
      title: "Iris & Pupil",
      options: ["Normal", "RAPD", "Synechiae", "Irregular"],
    },
    {
      id: "lens" as const,
      num: "6.",
      title: "Lens",
      options: [
        "Clear",
        "Nuclear Sclerosis",
        "Cortical Opacity",
        "PSC",
        "Pseudophakia",
        "Aphakia",
      ],
    },
    {
      id: "retinaFundus" as const,
      num: "7.",
      title: "Retina / Fundus",
      options: ["Normal", "Cup:Disc Ratio", "Hemorrhages", "Exudates", "Macular Changes"],
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F3F5F8] font-sans antialiased text-slate-800">
      {/* 1. TOP PATIENT HEADER BANNER */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-sm px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Patient Info */}
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

          {/* Vitals */}
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

          {/* Alerts */}
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

        {/* Tab Navigation */}
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

      {/* MAIN CONTENT CANVAS */}
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

        {/* MAIN ANATOMIC EXAMINATION TABLE */}
        <main className="flex-1 p-6 space-y-6 max-w-7xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Anatomic Eye Examination
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200/80 px-6 py-3 text-xs font-bold text-slate-700">
              <div className="col-span-3">Anatomy segment</div>
              <div className="col-span-4 pl-2">OD (Right Eye)</div>
              <div className="col-span-5 pl-2">OS (Left Eye)</div>
            </div>

            {/* Segment Rows */}
            <div className="divide-y divide-slate-200/80">
              {anatomySegments.map((segment) => {
                const segData = anatomicData[segment.id];

                return (
                  <div
                    key={segment.id}
                    className="grid grid-cols-12 px-6 py-4 items-start gap-4 text-xs hover:bg-slate-50/30 transition"
                  >
                    {/* Segment Label */}
                    <div className="col-span-3 font-bold text-slate-900 pt-1.5 flex items-center gap-1">
                      <span className="text-slate-400 font-semibold">{segment.num}</span>
                      <span>{segment.title}</span>
                    </div>

                    {/* OD (Right Eye) Options & Notes */}
                    <div className="col-span-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {segment.options.map((option) => {
                          const isSelected = segData.od.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleTag(segment.id, "od", option)}
                              className={`px-3 py-1 rounded-lg border text-xs font-medium transition ${
                                isSelected
                                  ? "bg-purple-50 border-[#6D4AFF] text-[#6D4AFF] font-bold shadow-xs"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>

                      {/* Notes Field for OD (shows when abnormal or if notes exist) */}
                      {(!segData.od.includes("Normal") &&
                        !segData.od.includes("Clear") &&
                        !segData.od.includes("Deep & Quiet")) ||
                      segData.odNotes !== "" ? (
                        <input
                          type="text"
                          placeholder="Add OD findings notes..."
                          value={segData.odNotes}
                          onChange={(e) =>
                            setAnatomicData({
                              ...anatomicData,
                              [segment.id]: {
                                ...segData,
                                odNotes: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] text-slate-800"
                        />
                      ) : null}
                    </div>

                    {/* OS (Left Eye) Options & Notes */}
                    <div className="col-span-5 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {segment.options.map((option) => {
                          const isSelected = segData.os.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleTag(segment.id, "os", option)}
                              className={`px-3 py-1 rounded-lg border text-xs font-medium transition ${
                                isSelected
                                  ? "bg-purple-50 border-[#6D4AFF] text-[#6D4AFF] font-bold shadow-xs"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>

                      {/* Notes Field for OS (shows when abnormal or if notes exist) */}
                      {(!segData.os.includes("Normal") &&
                        !segData.os.includes("Clear") &&
                        !segData.os.includes("Deep & Quiet")) ||
                      segData.osNotes !== "" ? (
                        <input
                          type="text"
                          placeholder="Add OS findings notes..."
                          value={segData.osNotes}
                          onChange={(e) =>
                            setAnatomicData({
                              ...anatomicData,
                              [segment.id]: {
                                ...segData,
                                osNotes: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] text-slate-800"
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              Save as Draft
            </button>
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl bg-[#6D4AFF] text-white text-xs font-bold hover:bg-[#5b3ce1] transition shadow-md shadow-purple-200 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Examination</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}