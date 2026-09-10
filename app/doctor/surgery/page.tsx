'use client';

import React, { useState, useEffect } from "react";
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  User,
  FileText,
  CircleDot,
  AlertOctagon,
  ArrowRight,
  ArrowLeft,
  Pause,
  Play,
  Activity,
  Award,
  Bed,
  CheckSquare
} from "lucide-react";

export default function SurgicalSuiteManagement() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [secondsElapsed, setSecondsElapsed] = useState(2538); // Starts at 00:42:18

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Format Timer
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Step 1: Pre-Op Checklist state
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

  // Step 2: Intra-Operative Log state
  const [intraOpLogs, setIntraOpLogs] = useState([
    { id: 1, time: "08:00 AM", note: "Patient entered OR-2. Monitoring vital signs.", author: "RN Lopez" },
    { id: 2, time: "08:05 AM", note: "Topical anesthesia applied. Eye draped.", author: "Dr. Huang" },
    { id: 3, time: "08:12 AM", note: "Corneal incision & Capsulorhexis initiated.", author: "Dr. Patel" },
    { id: 4, time: "08:25 AM", note: "Phacoemulsification completed cleanly. Capsule intact.", author: "Dr. Patel" },
  ]);
  const [newLogNote, setNewLogNote] = useState("");

  // Step 3: Post-Op Recovery state
  const [postOpVitals, setPostOpVitals] = useState({
    bp: "124/82",
    hr: "72 bpm",
    iop: "15 mmHg",
    eyeStatus: "Clear shield applied (OD)",
    dischargeReady: false,
  });

  const toggleCheck = (id: number) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNote.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setIntraOpLogs((prev) => [
      ...prev,
      { id: Date.now(), time: timeStr, note: newLogNote, author: "Dr. Adams" },
    ]);
    setNewLogNote("");
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
            <div className="flex items-center gap-2 font-mono text-sm font-bold text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
              <Clock className="w-4 h-4 text-purple-400" />
              {formatTime(secondsElapsed)}
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="ml-1 text-slate-400 hover:text-white transition"
                title={isTimerRunning ? "Pause Timer" : "Start Timer"}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              In Progress
            </span>

            <button 
              onClick={() => setIsTimerRunning(false)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Emergency Stop
            </button>
          </div>
        </div>
      </header>

      {/* STEP PROGRESS BAR */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 text-xs font-bold">
          
          {/* Step 1 Switcher */}
          <button
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 transition cursor-pointer ${
              currentStep === 1 ? "text-[#6B21A8]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${
                currentStep === 1
                  ? "bg-[#6B21A8] text-white"
                  : "bg-slate-100 border border-slate-300 text-slate-500"
              }`}
            >
              1
            </span>
            <span>Pre-Op Checklist</span>
          </button>

          <div className={`w-16 h-0.5 transition ${currentStep > 1 ? "bg-[#6B21A8]" : "bg-slate-200"}`}></div>

          {/* Step 2 Switcher */}
          <button
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 transition cursor-pointer ${
              currentStep === 2 ? "text-[#6B21A8]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${
                currentStep === 2
                  ? "bg-[#6B21A8] text-white"
                  : "bg-slate-100 border border-slate-300 text-slate-500"
              }`}
            >
              2
            </span>
            <span>Intra-Operative Log</span>
          </button>

          <div className={`w-16 h-0.5 transition ${currentStep > 2 ? "bg-[#6B21A8]" : "bg-slate-200"}`}></div>

          {/* Step 3 Switcher */}
          <button
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-2 transition cursor-pointer ${
              currentStep === 3 ? "text-[#6B21A8]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${
                currentStep === 3
                  ? "bg-[#6B21A8] text-white"
                  : "bg-slate-100 border border-slate-300 text-slate-500"
              }`}
            >
              3
            </span>
            <span>Post-Op Recovery</span>
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto">
        
        {/* LEFT COLUMN: ACTIVE STEP PANEL */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* STEP 1: PRE-OP SAFETY CHECKLIST */}
          {currentStep === 1 && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#6B21A8]" />
                    <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                      Pre-Op Surgical Safety Checklist
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Step 1 of 3</span>
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
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-[#6B21A8] hover:bg-[#581c87] text-white font-extrabold px-6 py-3 rounded-xl text-xs transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Confirm All &amp; Proceed to Surgery
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-xl text-xs transition flex items-center gap-2 shadow-2xs cursor-pointer">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Flag Issue
                </button>
              </div>
            </>
          )}

          {/* STEP 2: INTRA-OPERATIVE LOG */}
          {currentStep === 2 && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#6B21A8]" />
                    <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                      Intra-Operative Surgical Event Log
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Step 2 of 3</span>
                </div>

                {/* Log Stream */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {intraOpLogs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-3">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                        {log.time}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs text-slate-800 font-medium">{log.note}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">Recorded by: {log.author}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Event Form */}
                <form onSubmit={handleAddLog} className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={newLogNote}
                    onChange={(e) => setNewLogNote(e.target.value)}
                    placeholder="Enter surgical event observation (e.g., Lens inserted successfully)..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    className="bg-[#6B21A8] hover:bg-[#581c87] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shrink-0"
                  >
                    Add Log Entry
                  </button>
                </form>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Checklist
                </button>

                <button
                  onClick={() => setCurrentStep(3)}
                  className="bg-[#6B21A8] hover:bg-[#581c87] text-white font-extrabold px-6 py-3 rounded-xl text-xs transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  Complete Surgery &amp; Post-Op Recovery
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* STEP 3: POST-OP RECOVERY */}
          {currentStep === 3 && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-[#6B21A8]" />
                    <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                      Post-Operative Recovery &amp; Vitals
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Step 3 of 3</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                    <span className="text-[10px] font-bold text-purple-700 uppercase block">Blood Pressure</span>
                    <strong className="text-base font-extrabold text-slate-900 mt-1 block">{postOpVitals.bp}</strong>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Heart Rate</span>
                    <strong className="text-base font-extrabold text-slate-900 mt-1 block">{postOpVitals.hr}</strong>
                  </div>

                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">Intraocular Pressure (IOP)</span>
                    <strong className="text-base font-extrabold text-slate-900 mt-1 block">{postOpVitals.iop}</strong>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Surgical Eye Status &amp; Dressing</span>
                  <p className="text-xs text-slate-600">{postOpVitals.eyeStatus}</p>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-amber-600" />
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Ready for PACU / Discharge Clearance</strong>
                      <span className="text-[11px] text-slate-500">Patient vital signs stabilized following surgery.</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={postOpVitals.dischargeReady}
                    onChange={(e) => setPostOpVitals({ ...postOpVitals, dischargeReady: e.target.checked })}
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Intra-Op Log
                </button>

                <button
                  disabled={!postOpVitals.dischargeReady}
                  className={`font-extrabold px-6 py-3 rounded-xl text-xs transition shadow-xs flex items-center gap-2 ${
                    postOpVitals.dischargeReady
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Sign Off Surgical Case
                </button>
              </div>
            </>
          )}

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
                <button className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 transition cursor-pointer">
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
                <button className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 transition cursor-pointer">
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
                <button className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 transition cursor-pointer">
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
                <button className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 transition cursor-pointer">
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