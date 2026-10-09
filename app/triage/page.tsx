"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  Loader2,
  User,
} from "lucide-react";
import { VISUAL_ACUITY_OPTIONS } from "@/lib/visual-acuity";

function TriageVitalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = searchParams.get("patientId")?.trim() || "";

  // ------------------------------------------------------------
  // VISUAL ACUITY
  // ------------------------------------------------------------

  const [odVisual, setOdVisual] = useState("6/6");
  const [osVisual, setOsVisual] = useState("6/6");
  const [ouVisual, setOuVisual] = useState("6/6");

  // Pinhole visual acuity is recorded separately for each eye.
  const [odPinhole, setOdPinhole] = useState("");
  const [osPinhole, setOsPinhole] = useState("");

  const [odVisualNote, setOdVisualNote] = useState("");
  const [osVisualNote, setOsVisualNote] = useState("");
  const [ouVisualNote, setOuVisualNote] = useState("");

  const [withCorrection, setWithCorrection] = useState(false);

  // ------------------------------------------------------------
  // GENERAL VITALS
  // ------------------------------------------------------------

  const [bpSystolic, setBpSystolic] = useState("128");
  const [bpDiastolic, setBpDiastolic] = useState("82");
  const [pulse, setPulse] = useState("76");
  const [temp, setTemp] = useState("36.8");
  const [spo2, setSpo2] = useState("98");
  const [rbs, setRbs] = useState("");

  // ------------------------------------------------------------
  // SAVE STATE
  // ------------------------------------------------------------

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  // ------------------------------------------------------------
  // SUBMIT
  // ------------------------------------------------------------

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaveMessage("");
    setSaveError("");

    if (!patientId) {
      setSaveError(
        "No patient was selected. Please return to the nurse queue and select a patient."
      );
      return;
    }

    if (!odVisual || !osVisual || !ouVisual) {
      setSaveError(
        "Visual acuity for all required measurements is required."
      );
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
            visualAcuityODPinhole: odPinhole || null,
            visualAcuityOSPinhole: osPinhole || null,
            withCorrection,

            visualAcuityODNote: odVisualNote.trim() || null,
            visualAcuityOSNote: osVisualNote.trim() || null,
            visualAcuityOUNote: ouVisualNote.trim() || null,

            // Gonioscopy is recorded by the doctor, not during nurse triage.
            gonioscopyOD: null,
            gonioscopyOS: null,

            bpSystolic: bpSystolic ? Number(bpSystolic) : null,
            bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
            pulse: pulse ? Number(pulse) : null,
            temperature: temp ? Number(temp) : null,
            spo2: spo2 ? Number(spo2) : null,
            rbs: rbs ? Number(rbs) : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Failed to save patient vitals."
        );
      }

      setSaveMessage(
        "Vitals saved successfully. Patient sent to the doctor queue."
      );

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
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-purple-100 flex items-center justify-center shadow-xs shrink-0">
              <Image
                src="/Logo.png"
                alt="Sparkle Eye Specialist Hospital Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain p-1"
                priority
              />
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
        <div className="max-w-350 mx-auto flex flex-wrap items-center justify-between gap-3">
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

      <main className="max-w-350 mx-auto p-6 md:p-8">
        {/* NO PATIENT */}
        {!patientId && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-semibold">
            No patient was selected. Please return to the nurse queue and
            select a patient before recording vitals.
          </div>
        )}

        {/* SAVE ERROR */}
        {saveError && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {saveError}
          </div>
        )}

        {/* SAVE SUCCESS */}
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
          {/* =====================================================
              LEFT COLUMN
              ===================================================== */}
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
                  {/* OD */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 block">
                      OD — Right Eye
                    </span>

                    <div className="flex gap-2">
                      <select
                        value={odVisual}
                        onChange={(event) =>
                          setOdVisual(event.target.value)
                        }
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                      >
                        {VISUAL_ACUITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={odVisualNote}
                        onChange={(event) =>
                          setOdVisualNote(event.target.value)
                        }
                        placeholder="Additional"
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <span className="text-[10px] text-slate-400">
                      Right eye
                    </span>
                  </div>

                  {/* OS */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 block">
                      OS — Left Eye
                    </span>

                    <div className="flex gap-2">
                      <select
                        value={osVisual}
                        onChange={(event) =>
                          setOsVisual(event.target.value)
                        }
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                      >
                        {VISUAL_ACUITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={osVisualNote}
                        onChange={(event) =>
                          setOsVisualNote(event.target.value)
                        }
                        placeholder="Additional"
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <span className="text-[10px] text-slate-400">
                      Left eye
                    </span>
                  </div>

                  {/* OU */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 block">
                      OU — Both Eyes
                    </span>

                    <div className="flex gap-2">
                      <select
                        value={ouVisual}
                        onChange={(event) =>
                          setOuVisual(event.target.value)
                        }
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                      >
                        {VISUAL_ACUITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={ouVisualNote}
                        onChange={(event) =>
                          setOuVisualNote(event.target.value)
                        }
                        placeholder="Additional"
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <span className="text-[10px] text-slate-400">
                      Both eyes
                    </span>
                  </div>
                </div>

                {/* VISUAL ACUITY WITH PINHOLE */}
                <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Visual Acuity with Pinhole (PH)
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Record the measured result for each eye when pinhole testing is performed.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-600 block">OD — Right Eye (PH)</span>
                      <select value={odPinhole} onChange={(event) => setOdPinhole(event.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600">
                        <option value="">Not tested / Not recorded</option>
                        {VISUAL_ACUITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-600 block">OS — Left Eye (PH)</span>
                      <select value={osPinhole} onChange={(event) => setOsPinhole(event.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600">
                        <option value="">Not tested / Not recorded</option>
                        {VISUAL_ACUITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  </div>
                </div>

                {/* CORRECTION */}
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
                    onClick={() =>
                      setWithCorrection((current) => !current)
                    }
                    aria-pressed={withCorrection}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      withCorrection
                        ? "bg-[#6B21A8]"
                        : "bg-slate-200"
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
                        type="number"
                        min="0"
                        value={bpSystolic}
                        onChange={(event) =>
                          setBpSystolic(event.target.value)
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center text-xs font-bold focus:outline-none focus:border-purple-600"
                      />

                      <span className="text-slate-300 font-bold">
                        /
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={bpDiastolic}
                        onChange={(event) =>
                          setBpDiastolic(event.target.value)
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center text-xs font-bold focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    <span className="text-[9px] text-slate-400">
                      mmHg
                    </span>
                  </div>

                  {/* PULSE */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Pulse Rate
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={pulse}
                      onChange={(event) =>
                        setPulse(event.target.value)
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold focus:outline-none focus:border-purple-600"
                    />

                    <span className="text-[9px] text-slate-400">
                      bpm
                    </span>
                  </div>

                  {/* TEMPERATURE */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Temperature
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={temp}
                      onChange={(event) =>
                        setTemp(event.target.value)
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold focus:outline-none focus:border-purple-600"
                    />

                    <span className="text-[9px] text-slate-400">
                      °C
                    </span>
                  </div>

                  {/* SPO2 */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      SpO2
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={spo2}
                      onChange={(event) =>
                        setSpo2(event.target.value)
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold focus:outline-none focus:border-purple-600"
                    />

                    <span className="text-[9px] text-slate-400">
                      %
                    </span>
                  </div>
                </div>

                {/* RBS */}
                <div className="max-w-xs space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    RBS
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={rbs}
                    onChange={(event) =>
                      setRbs(event.target.value)
                    }
                    placeholder="Enter RBS"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none focus:border-purple-600"
                  />

                  <span className="text-[9px] text-slate-400">
                    Random Blood Sugar
                  </span>
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

          {/* =====================================================
              RIGHT COLUMN
              ===================================================== */}
          <div className="lg:col-span-5 space-y-6">
            {/* CLINICAL FLAGS */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />

                <h3 className="font-bold text-sm text-slate-900">
                  Clinical Flags
                </h3>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-700">
                  No automatic clinical flags.
                </p>

                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  The recorded measurements will be available to the
                  doctor for clinical review.
                </p>
              </div>
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
                {/* STEP 1 */}
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

                {/* STEP 2 */}
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

                {/* STEP 3 */}
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

            <p className="text-sm font-semibold">
              Loading triage dashboard...
            </p>
          </div>
        </div>
      }
    >
      <TriageVitalsContent />
    </Suspense>
  );
}