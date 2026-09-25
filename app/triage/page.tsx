"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  Bell,
  MessageSquare,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  User,
  AlertTriangle,
  Info,
  Loader2,
  CheckCircle2,
} from "lucide-react";

type Severity = "Mild" | "Moderate" | "Severe";

function TriageVitalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = searchParams.get("patientId")?.trim() || "";

  // Eye vitals
  const [odVisual, setOdVisual] = useState("20/40");
  const [osVisual, setOsVisual] = useState("20/20");
  const [ouVisual, setOuVisual] = useState("20/30");
  const [withCorrection, setWithCorrection] = useState(false);

  const [odIop, setOdIop] = useState("16");
  const [osIop, setOsIop] = useState("24");
  const [instrument, setInstrument] = useState("Goldmann Applanation");

  // General vitals
  const [bpSystolic, setBpSystolic] = useState("128");
  const [bpDiastolic, setBpDiastolic] = useState("82");
  const [pulse, setPulse] = useState("76");
  const [temp, setTemp] = useState("36.8");
  const [spo2, setSpo2] = useState("98");

  // Chief complaint
  const [complaintText, setComplaintText] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>("Moderate");
  const [duration, setDuration] = useState("2 weeks");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const symptomsList = [
    "Blurry Vision",
    "Eye Pain",
    "Redness",
    "Floaters",
    "Light Sensitivity",
    "Discharge",
  ];

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  };

  const numOdIop = Number.parseFloat(odIop) || 0;
  const numOsIop = Number.parseFloat(osIop) || 0;

  const isOdHigh = numOdIop > 21;
  const isOsHigh = numOsIop > 21;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSaveMessage("");
    setSaveError("");

    if (!patientId) {
      setSaveError(
        "No patient was selected. Please return to the nurse queue and select a patient."
      );
      return;
    }

    if (!odVisual || !osVisual) {
      setSaveError("Visual acuity for both eyes is required.");
      return;
    }

    if (!complaintText.trim()) {
      setSaveError("Please enter the patient's chief complaint.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/patients/${encodeURIComponent(patientId)}/vitals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            visualAcuityOD: odVisual,
            visualAcuityOS: osVisual,
            visualAcuityOU: ouVisual,
            withCorrection,

            iopOD: odIop ? Number(odIop) : null,
            iopOS: osIop ? Number(osIop) : null,
            iopInstrument: instrument,

            bpSystolic: bpSystolic ? Number(bpSystolic) : null,
            bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
            pulse: pulse ? Number(pulse) : null,
            temperature: temp ? Number(temp) : null,
            spo2: spo2 ? Number(spo2) : null,

            primaryComplaint: complaintText.trim(),
            symptoms: selectedSymptoms,
            severity,
            durationText: duration,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to save patient vitals.");
      }

      setSaveMessage("Vitals saved successfully. Patient sent to the doctor queue.");

      setTimeout(() => {
        router.push("/nurse");
      }, 700);
    } catch (error) {
      console.error("Save vitals error:", error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save patient vitals."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800 font-sans antialiased">
      {/* NAVBAR */}
      <header className="bg-white border-b border-slate-200/80 px-6 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
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

          <div className="hidden lg:block h-5 w-px bg-slate-200" />

          <Link
            href="/nurse"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#6B21A8] bg-slate-100 hover:bg-purple-50 px-3.5 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Nurse Queue</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-purple-100 text-[#6B21A8] flex items-center justify-center font-bold text-xs border border-purple-200">
              NE
            </div>

            <div className="text-left leading-tight hidden sm:block">
              <span className="block font-bold text-xs text-slate-900">
                Nurse On-Duty
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Triage Nurse
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* PATIENT IDENTIFIER */}
      <div className="bg-white border-b border-slate-200/80 px-6 md:px-8 py-3">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-[#6B21A8] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Patient
              </span>

              <span className="text-sm font-extrabold text-slate-900">
                {patientId || "No patient selected"}
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 font-bold rounded-full border border-amber-200/80 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Triage In Progress
          </span>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto p-6 md:p-8">
        {!patientId && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-semibold">
            No patient was selected. Please return to the nurse queue and
            select a patient before recording vitals.
          </div>
        )}

        {saveError && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {saveError}
          </div>
        )}

        {saveMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {saveMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-8 space-y-8">
            {/* EYE VITALS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-[#6B21A8]">
                  <Eye className="w-5 h-5" />

                  <h2 className="font-bold text-base text-slate-900">
                    Eye Vitals Entry
                  </h2>
                </div>

                <span className="px-2.5 py-1 bg-purple-50 text-[#6B21A8] font-bold text-[10px] rounded-md uppercase">
                  Required
                </span>
              </div>

              {/* VISUAL ACUITY */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Visual Acuity
                  </label>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 block">
                      OD — Right Eye
                    </span>

                    <select
                      value={odVisual}
                      onChange={(e) => setOdVisual(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                    >
                      <option value="20/20">20/20</option>
                      <option value="20/25">20/25</option>
                      <option value="20/30">20/30</option>
                      <option value="20/40">20/40</option>
                      <option value="20/50">20/50</option>
                      <option value="20/100">20/100</option>
                      <option value="20/200">20/200</option>
                    </select>

                    <span className="text-[10px] text-slate-400">
                      Right eye
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 block">
                      OS — Left Eye
                    </span>

                    <select
                      value={osVisual}
                      onChange={(e) => setOsVisual(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                    >
                      <option value="20/20">20/20</option>
                      <option value="20/25">20/25</option>
                      <option value="20/30">20/30</option>
                      <option value="20/40">20/40</option>
                      <option value="20/50">20/50</option>
                      <option value="20/100">20/100</option>
                      <option value="20/200">20/200</option>
                    </select>

                    <span className="text-[10px] text-slate-400">
                      Left eye
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 block">
                      OU — Both Eyes
                    </span>

                    <select
                      value={ouVisual}
                      onChange={(e) => setOuVisual(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                    >
                      <option value="20/20">20/20</option>
                      <option value="20/25">20/25</option>
                      <option value="20/30">20/30</option>
                      <option value="20/40">20/40</option>
                      <option value="20/50">20/50</option>
                    </select>

                    <span className="text-[10px] text-slate-400">
                      Both eyes
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      With Correction
                    </span>

                    <span className="text-[10px] text-slate-400">
                      Glasses or contact lenses
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWithCorrection((value) => !value)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      withCorrection ? "bg-[#6B21A8]" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        withCorrection
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* IOP */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Intraocular Pressure
                  </label>

                  <span className="text-[10px] text-slate-400">
                    Tonometry reading in mmHg
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      label: "OD — Right Eye",
                      value: odIop,
                      setValue: setOdIop,
                      high: isOdHigh,
                    },
                    {
                      label: "OS — Left Eye",
                      value: osIop,
                      setValue: setOsIop,
                      high: isOsHigh,
                    },
                  ].map((eye) => (
                    <div key={eye.label} className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-600 block">
                        {eye.label}
                      </span>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={eye.value}
                          onChange={(e) => eye.setValue(e.target.value)}
                          className={`w-full border rounded-xl py-2.5 pl-3 pr-14 text-xs font-bold focus:outline-none ${
                            eye.high
                              ? "bg-rose-50 border-rose-400 text-rose-700"
                              : "bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-600"
                          }`}
                        />

                        <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                          mmHg
                        </span>
                      </div>

                      {eye.high ? (
                        <span className="text-[10px] font-bold text-rose-600 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          High reading
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600">
                          Within reference range
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
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
                      <option value="Icare Tonometer">
                        Icare Tonometer
                      </option>
                    </select>

                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* GENERAL VITALS */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  General Vitals
                </label>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Blood Pressure
                    </span>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={bpSystolic}
                        onChange={(e) => setBpSystolic(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center text-xs font-bold focus:outline-none"
                      />

                      <span className="text-slate-300 font-bold">/</span>

                      <input
                        type="number"
                        min="0"
                        value={bpDiastolic}
                        onChange={(e) => setBpDiastolic(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center text-xs font-bold focus:outline-none"
                      />
                    </div>

                    <span className="text-[9px] text-slate-400">
                      mmHg
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Pulse Rate
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold focus:outline-none"
                    />

                    <span className="text-[9px] text-slate-400">
                      bpm
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Temperature
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold focus:outline-none"
                    />

                    <span className="text-[9px] text-slate-400">
                      °C
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      SpO2
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold focus:outline-none"
                    />

                    <span className="text-[9px] text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving || !patientId}
                  className="w-full sm:flex-1 bg-[#6B21A8] hover:bg-[#581c87] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Vitals...
                    </>
                  ) : (
                    <>
                      <span>Save Vitals & Send to Doctor</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => router.push("/nurse")}
                  className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold py-3.5 px-6 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 space-y-6">
            {/* CHIEF COMPLAINT */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
              <div className="flex items-center gap-2 text-[#6B21A8]">
                <MessageSquare className="w-5 h-5" />

                <h3 className="font-bold text-sm text-slate-900">
                  Chief Complaint
                </h3>
              </div>

              <textarea
                rows={5}
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Describe the patient's main complaint..."
                className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-700 leading-relaxed focus:outline-none focus:border-purple-600 resize-none"
              />

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Quick-Add Symptoms
                </label>

                <div className="flex flex-wrap gap-2">
                  {symptomsList.map((symptom) => {
                    const selected = selectedSymptoms.includes(symptom);

                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          selected
                            ? "bg-[#6B21A8] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {symptom}
                        {selected && " ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Severity
                  </label>

                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    {(["Mild", "Moderate", "Severe"] as Severity[]).map(
                      (item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSeverity(item)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${
                            severity === item
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-500"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
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
                      <option value="Today">Today</option>
                      <option value="3 days">3 days</option>
                      <option value="1 week">1 week</option>
                      <option value="2 weeks">2 weeks</option>
                      <option value="1 month">1 month</option>
                      <option value="More than 1 month">
                        More than 1 month
                      </option>
                    </select>

                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* CLINICAL FLAGS */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />

                <h3 className="font-bold text-sm text-slate-900">
                  Clinical Flags
                </h3>
              </div>

              {isOdHigh || isOsHigh ? (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-rose-700">
                    Elevated IOP detected.
                  </p>

                  <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">
                    The elevated reading will be included in the patient's
                    clinical record for the doctor to review.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-emerald-700">
                    No elevated IOP flag detected.
                  </p>
                </div>
              )}
            </div>

            {/* PATIENT FLOW */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center gap-2 text-[#6B21A8] mb-4">
                <Clock className="w-5 h-5" />

                <h3 className="font-bold text-sm text-slate-900">
                  Patient Flow
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Patient Registration
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Patient record created
                    </p>
                  </div>
                </div>

                <div className="h-4 border-l border-dashed border-slate-300 ml-3.5" />

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-[#6B21A8] flex items-center justify-center text-xs font-bold">
                    2
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Triage & Vitals
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Current stage
                    </p>
                  </div>
                </div>

                <div className="h-4 border-l border-dashed border-slate-300 ml-3.5" />

                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                    3
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Doctor Consultation
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Next stage
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function TriageVitalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-[#6B21A8]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-semibold">Loading triage dashboard...</p>
          </div>
        </div>
      }
    >
      <TriageVitalsContent />
    </Suspense>
  );
}