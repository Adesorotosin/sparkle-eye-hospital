'use client';

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  User,
  ShieldAlert,
  FileText,
  CircleDot,
  AlertOctagon,
} from "lucide-react";

export default function SurgicalSuiteManagement() {
  const [currentStep, setCurrentStep] = useState(1);

  // Pre-Op Checklist items state
  const [checklist, setChecklist] = useState([
    {
      id: 1,
      title: "Patient Identity & Surgical Site Verified (OD)",
      badge: "VERIFIED",
      badgeType: "success",
      description: "Verified by Dr. Patel at 07:15 AM",
      status: "verified",
      checked: true,
    },
    {
      id: 2,
      title: "Informed Consent Signed",
      badge: "VERIFIED",
      badgeType: "success",
      description: "Signed 08/28/2026 — witnessed by RN Lopez",
      status: "verified",
      checked: true,
    },
    {
      id: 3,
      title: "Anesthesia Clearance",
      badge: "VERIFIED",
      badgeType: "success",
      description: "Topical + IV sedation approved — Dr. Huang",
      status: "verified",
      checked: true,
    },
    {
      id: 4,
      title: "IOL Power Verified (+21.5 D)",
      badge: "VERIFIED",
      badgeType: "success",
      description: "AcrySof IQ — SN60WF, confirmed by biometry",
      status: "verified",
      checked: true,
    },
    {
      id: 5,
      title: "Antibiotic Prophylaxis Administered",
      badge: "VERIFIED",
      badgeType: "success",
      description: "Moxifloxacin 0.5% instilled x3",
      status: "verified",
      checked: true,
    },
    {
      id: 6,
      title: "Pupil Dilation Confirmed",
      badge: "ATTENTION",
      badgeType: "warning",
      description: "Measured 6.5mm — borderline, monitor during procedure",
      status: "attention",
      checked: true,
    },
    {
      id: 7,
      title: "Equipment & Microscope Calibrated",
      badge: "PENDING",
      badgeType: "pending",
      description: "Pending — awaiting tech confirmation",
      status: "pending",
      checked: false,
    },
  ]);

  const toggleCheck = (id: number) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col text-slate-800 font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
      {/* TOP HEADER / OR BAR */}
      <header className="bg-[#0B132B] text-white px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-800 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs font-bold px-2.5 py-1 rounded-md">
            OR-2
          </span>
          <h1 className="font-extrabold text-base text-white tracking-tight">
            Cataract Extraction + IOL Insertion
          </h1>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <strong className="font-bold text-white">Margaret Chen, 68F</strong>
            <span className="text-slate-400 font-mono text-[11px]">
              — MRN #20458712
            </span>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-white">
              <Clock className="w-4 h-4 text-slate-400" />
              00:42:18
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              In Progress
            </span>

            <button className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm">
              <AlertOctagon className="w-3.5 h-3.5" />
              Emergency Stop
            </button>
          </div>
        </div>
      </header>

      {/* STEP PROGRESS BAR */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 text-xs font-bold">
          {/* Step 1 */}
          <div className="flex items-center gap-2 text-[#6B21A8]">
            <span className="w-6 h-6 rounded-full bg-[#6B21A8] text-white flex items-center justify-center text-xs">
              1
            </span>
            <span>Pre-Op Checklist</span>
          </div>

          <div className="w-16 h-0.5 bg-[#6B21A8]"></div>

          {/* Step 2 */}
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-500 flex items-center justify-center text-xs">
              2
            </span>
            <span>Intra-Operative Log</span>
          </div>

          <div className="w-16 h-0.5 bg-slate-200"></div>

          {/* Step 3 */}
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-500 flex items-center justify-center text-xs">
              3
            </span>
            <span>Post-Op Recovery</span>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto">
        {/* LEFT COLUMN: PRE-OP SAFETY CHECKLIST */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6B21A8]" />
                <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                  Pre-Op Surgical Safety Checklist
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Step 1 of 3
              </span>
            </div>

            {/* CHECKLIST LIST */}
            <div className="divide-y divide-slate-100">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`py-3.5 px-2 flex items-center justify-between gap-4 transition rounded-xl ${
                    item.status === "attention"
                      ? "bg-amber-50/40"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.checked ? "bg-[#6B21A8]" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          item.checked ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">
                          {item.title}
                        </strong>

                        {/* Status Badge */}
                        {item.badgeType === "success" && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/60">
                            ✓ {item.badge}
                          </span>
                        )}
                        {item.badgeType === "warning" && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300/80 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {item.badge}
                          </span>
                        )}
                        {item.badgeType === "pending" && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator Icon */}
                  <div>
                    {item.status === "verified" && (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    {item.status === "attention" && (
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                        <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                    {item.status === "pending" && (
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                        <CircleDot className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3 pt-2">
            <button className="bg-[#6B21A8] hover:bg-[#581c87] text-white font-extrabold px-6 py-3 rounded-xl text-xs transition shadow-xs flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              Confirm All & Proceed to Surgery
            </button>

            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-xl text-xs transition flex items-center gap-2 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Flag Issue
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: TEAM, NOTES & ALERTS */}
        <div className="lg:col-span-4 space-y-6">
          {/* Surgical Team Roster Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-700" />
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Surgical Team Roster
              </h2>
            </div>

            <div className="space-y-3 divide-y divide-slate-100">
              {/* Member 1 */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      SP
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">
                      Dr. Sarah Patel
                    </strong>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Lead Surgeon ·{" "}
                      <span className="text-emerald-600 font-semibold">
                        Available
                      </span>
                    </span>
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 transition">
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Member 2 */}
              <div className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      KH
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">
                      Dr. Kevin Huang
                    </strong>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Anesthetist ·{" "}
                      <span className="text-emerald-600 font-semibold">
                        Available
                      </span>
                    </span>
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 transition">
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Member 3 */}
              <div className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      ML
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">
                      Maria Lopez, RN
                    </strong>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Scrub Nurse ·{" "}
                      <span className="text-emerald-600 font-semibold">
                        Available
                      </span>
                    </span>
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 transition">
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Member 4 */}
              <div className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      JC
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white absolute bottom-0 right-0"></span>
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">
                      James Carter, CST
                    </strong>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Surgical Tech ·{" "}
                      <span className="text-amber-600 font-semibold">
                        On Call
                      </span>
                    </span>
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 transition">
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Procedure Notes Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-700" />
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Procedure Notes
              </h2>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5 text-xs text-slate-600 font-normal leading-relaxed">
              Standard phacoemulsification approach planned. Discuss with
              patient re: posterior capsule status. Backup IOL on standby (+22.0
              D).
            </div>
          </div>

          {/* Critical Alerts Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="font-extrabold text-sm text-slate-900 tracking-tight mb-3">
              Critical Alerts
            </h2>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-extrabold text-amber-900 block">
                  Sulfa Allergy
                </strong>
                <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                  Avoid sulfonamide-based agents
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}