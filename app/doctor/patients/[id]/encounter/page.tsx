"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import { getPatientById, PatientRecord } from "@/lib/patients";
// Using absolute alias path (@) instead of deep relative paths (../../..)
import { saveConsultationEncounter } from "@/app/actions/consultation";
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
  History,
} from "lucide-react";

export default function OphthalmologyConsultation() {
  const params = useParams();
  // Safe extraction for Next.js client component params (can be string or string[])
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("refraction");

  // Form states for live data entry
  const [slitLampOD, setSlitLampOD] = useState("");
  const [slitLampOS, setSlitLampOS] = useState("");
  const [refractionOD, setRefractionOD] = useState({ sphere: "", cylinder: "", axis: "" });
  const [refractionOS, setRefractionOS] = useState({ sphere: "", cylinder: "", axis: "" });
  const [diagnosis, setDiagnosis] = useState("");

  // STEP 3 STATE: Historical comparison toggle
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);

  // Modal states for footer actions
  const [activeModal, setActiveModal] = useState<"diagnostics" | "surgery" | "prescription" | null>(null);
  const [selectedDiagnostics, setSelectedDiagnostics] = useState<string[]>([]);
  const [surgeryDetails, setSurgeryDetails] = useState({ procedure: "Cataract (Phaco + IOL)", date: "", notes: "" });
  const [prescriptionDetails, setPrescriptionDetails] = useState({ medication: "", dosage: "", frequency: "", duration: "" });

  // Transition and feedback states
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

useEffect(() => {
  async function loadPatientData() {
    if (!id) return;
    try {
      const data = await getPatientById(id); // <--- HERE: Checks lib/patients.ts
      if (data) {
        setPatient(data);
        // ...
      }
    } catch (err) {
      console.error("Failed to load patient record:", err);
    } finally {
      setLoading(false);
    }
  }
  loadPatientData();
}, [id]);

  // --- STEP 2: OPTOMETRIC FORMATTING UTILITIES ---
  const snapToQuarter = (value: string): string => {
    const cleaned = value.trim();
    if (!cleaned || isNaN(Number(cleaned))) return cleaned;
    
    const num = parseFloat(cleaned);
    const snapped = Math.round(num * 4) / 4;
    return (snapped > 0 ? "+" : "") + snapped.toFixed(2);
  };

  const validateAndFormatAxis = (value: string): string => {
    const cleaned = value.trim();
    if (!cleaned || isNaN(Number(cleaned))) return cleaned;
    
    let num = parseInt(cleaned, 10);
    if (num < 0) num = 0;
    if (num > 180) num = 180;
    return num.toString();
  };

  const handleRefractionBlur = (eye: "od" | "os", field: "sphere" | "cylinder" | "axis") => {
    if (eye === "od") {
      setRefractionOD((prev) => {
        const updatedVal = field === "axis" 
          ? validateAndFormatAxis(prev[field]) 
          : snapToQuarter(prev[field]);
        return { ...prev, [field]: updatedVal };
      });
    } else {
      setRefractionOS((prev) => {
        const updatedVal = field === "axis" 
          ? validateAndFormatAxis(prev[field]) 
          : snapToQuarter(prev[field]);
        return { ...prev, [field]: updatedVal };
      });
    }
  };
  // ----------------------------------------------

  const handleSave = (status: "draft" | "completed") => {
    if (!id) return;
    startTransition(async () => {
      const result = await saveConsultationEncounter({
        patientId: id,
        slitLampOD,
        slitLampOS,
        refractionOD,
        refractionOS,
        diagnosis,
        status,
      });

      setFeedbackMessage(result.message);
      setTimeout(() => setFeedbackMessage(null), 4000);
    });
  };

  if (loading) {
    return <div className="p-8 text-xs text-slate-500 bg-[#F4F6FB] min-h-screen">Loading patient record...</div>;
  }

 if (!patient) {
  return <div className="p-8 text-xs text-rose-500 font-bold bg-[#F4F6FB] min-h-screen">Patient record not found for ID: {id}</div>;
}

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F4F6FB] selection:bg-purple-100 selection:text-purple-900 relative">
      
      {/* WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px] w-full mx-auto">
          
          {/* LEFT COLUMN: PATIENT HISTORY & IMAGING */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="mb-4">
                <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                  Patient History
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {patient.name} — MRN: {patient.mrn}
                </p>
              </div>

              <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                {patient.history.map((hist, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-purple-50 border-2 border-[#6B21A8] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6B21A8]"></div>
                    </div>
                    <div className="text-[11px]">
                      <span className="font-bold text-[#6B21A8] block">{hist.date}</span>
                      <h3 className="font-bold text-slate-900 text-xs mt-0.5">
                        {hist.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed mt-1">
                        {hist.details}
                      </p>
                    </div>
                  </div>
                ))}
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
                {patient.imaging.map((img) => (
                  <div key={img.id} className="border border-slate-200/80 rounded-xl p-2.5 bg-slate-50/50 hover:border-slate-300 transition cursor-pointer group">
                    <div className="aspect-video bg-[#0A0E1A] rounded-lg overflow-hidden relative border border-slate-800 flex items-center justify-center">
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-slate-300 bg-slate-900/80 px-1.5 py-0.5 rounded">
                        OCT SCAN
                      </span>
                      <svg className={`w-full h-full p-2 ${img.color} opacity-80`} viewBox="0 0 100 50">
                        <path d={img.path} fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="mt-2 text-left">
                      <strong className="text-xs font-bold text-slate-900 block group-hover:text-[#6B21A8]">
                        {img.type}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-medium block">{img.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: EXAMINATION TABS & OBSERVATIONS */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              {/* Tab Navigation */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
                <div className="flex items-center gap-8">
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

                {/* Step 3 Control: Historical Overlay Toggle */}
                {activeTab === "refraction" && (
                  <button
                    onClick={() => setShowHistoryOverlay(!showHistoryOverlay)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                      showHistoryOverlay 
                        ? "bg-purple-100 border-purple-300 text-purple-900" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-[#6B21A8]" />
                    {showHistoryOverlay ? "Hide Previous Exam" : "Compare Previous Exam"}
                  </button>
                )}
              </div>

              {/* TAB 1: SLIT LAMP EXAM */}
              {activeTab === "slit-lamp" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <span className="w-2 h-2 rounded-full bg-purple-700"></span>
                      <h3 className="font-extrabold text-sm text-slate-900">OD (Right Eye)</h3>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 block">Cornea & Lens Observations</label>
                      <textarea
                        rows={4}
                        value={slitLampOD}
                        onChange={(e) => setSlitLampOD(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <span className="w-2 h-2 rounded-full bg-purple-700"></span>
                      <h3 className="font-extrabold text-sm text-slate-900">OS (Left Eye)</h3>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 block">Cornea & Lens Observations</label>
                      <textarea
                        rows={4}
                        value={slitLampOS}
                        onChange={(e) => setSlitLampOS(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REFRACTION & PRESCRIPTION WITH STEP 3 HISTORY COMPARISON */}
              {activeTab === "refraction" && (
                <div className="space-y-6">
                  {/* Step 3 Historical Context Banner / Card */}
                  {showHistoryOverlay && patient.previousRefraction && (
                    <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 border border-slate-800 space-y-3 animate-in fade-in duration-200 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-purple-400" />
                          <h4 className="font-bold text-xs tracking-wide">Previous Record ({patient.previousRefraction.date})</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">Verified Baseline</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-sans font-bold text-purple-300 block mb-1">OD (Right Eye)</span>
                          Sphere: {patient.previousRefraction.od.sphere} | Cyl: {patient.previousRefraction.od.cylinder} | Axis: {patient.previousRefraction.od.axis}°
                        </div>
                        <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-sans font-bold text-purple-300 block mb-1">OS (Left Eye)</span>
                          Sphere: {patient.previousRefraction.os.sphere} | Cyl: {patient.previousRefraction.os.cylinder} | Axis: {patient.previousRefraction.os.axis}°
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* OD Refraction */}
                    <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4">
                      <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">OD Refraction (Right Eye)</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">SPHERE (0.25)</label>
                          <input
                            type="text"
                            placeholder="-2.00"
                            value={refractionOD.sphere}
                            onChange={(e) => setRefractionOD({ ...refractionOD, sphere: e.target.value })}
                            onBlur={() => handleRefractionBlur("od", "sphere")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">CYLINDER</label>
                          <input
                            type="text"
                            placeholder="-0.50"
                            value={refractionOD.cylinder}
                            onChange={(e) => setRefractionOD({ ...refractionOD, cylinder: e.target.value })}
                            onBlur={() => handleRefractionBlur("od", "cylinder")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">AXIS (0-180°)</label>
                          <input
                            type="text"
                            placeholder="90"
                            value={refractionOD.axis}
                            onChange={(e) => setRefractionOD({ ...refractionOD, axis: e.target.value })}
                            onBlur={() => handleRefractionBlur("od", "axis")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* OS Refraction */}
                    <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4">
                      <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">OS Refraction (Left Eye)</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">SPHERE (0.25)</label>
                          <input
                            type="text"
                            placeholder="-1.75"
                            value={refractionOS.sphere}
                            onChange={(e) => setRefractionOS({ ...refractionOS, sphere: e.target.value })}
                            onBlur={() => handleRefractionBlur("os", "sphere")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">CYLINDER</label>
                          <input
                            type="text"
                            placeholder="-0.25"
                            value={refractionOS.cylinder}
                            onChange={(e) => setRefractionOS({ ...refractionOS, cylinder: e.target.value })}
                            onBlur={() => handleRefractionBlur("os", "cylinder")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">AXIS (0-180°)</label>
                          <input
                            type="text"
                            placeholder="180"
                            value={refractionOS.axis}
                            onChange={(e) => setRefractionOS({ ...refractionOS, axis: e.target.value })}
                            onBlur={() => handleRefractionBlur("os", "axis")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-center font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DIAGNOSIS & ASSESSMENT */}
              {activeTab === "diagnosis" && (
                <div className="border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">Clinical Assessment & ICD-10 Coding</h3>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">Primary Impression</label>
                    <textarea
                      rows={4}
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6B21A8]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM FIXED ENCOUNTER BAR */}
        <footer className="bg-[#0B132B] text-white px-6 py-3 flex flex-wrap items-center justify-between border-t border-slate-800 sticky bottom-0 z-20 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave("draft")}
              disabled={isPending}
              className="px-4 py-2 border border-slate-700 text-slate-200 hover:bg-slate-800 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Saving..." : "Save Draft"}
            </button>

            {feedbackMessage && (
              <span className="text-[11px] text-emerald-400 font-semibold animate-pulse">
                {feedbackMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setActiveModal("diagnostics")}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-300" />
              Order Diagnostics
            </button>

            <button
              onClick={() => setActiveModal("surgery")}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              Schedule Surgery
            </button>

            <button
              onClick={() => setActiveModal("prescription")}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <Pill className="w-3.5 h-3.5 text-slate-300" />
              Issue Prescription
            </button>

            <button
              onClick={() => handleSave("completed")}
              disabled={isPending}
              className="px-5 py-2.5 bg-[#6B21A8] hover:bg-[#581c87] text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isPending ? "Processing..." : "Complete Encounter"}
            </button>
          </div>
        </footer>
      </div>

      {/* INTERACTIVE MODALS OVERLAY */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            {/* 1. ORDER DIAGNOSTICS MODAL */}
            {activeModal === "diagnostics" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900">Order Diagnostic Scans & Tests</h3>
                  <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">✕</button>
                </div>
                <div className="space-y-2.5">
                  {["Visual Field Test (Humphrey)", "Optical Coherence Tomography (OCT)", "Pachymetry (Corneal Thickness)", "Gonioscopy", "Fundus Photography"].map((test) => (
                    <label key={test} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700">
                      <input 
                        type="checkbox" 
                        checked={selectedDiagnostics.includes(test)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDiagnostics([...selectedDiagnostics, test]);
                          else setSelectedDiagnostics(selectedDiagnostics.filter(t => t !== test));
                        }}
                        className="rounded border-slate-300 text-[#6B21A8] focus:ring-purple-500"
                      />
                      {test}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button onClick={() => { alert("Diagnostics submitted to lab!"); setActiveModal(null); }} className="px-4 py-2 bg-[#6B21A8] text-white rounded-xl text-xs font-bold hover:bg-[#581c87] cursor-pointer">Submit Order</button>
                </div>
              </>
            )}

            {/* 2. SCHEDULE SURGERY MODAL */}
            {activeModal === "surgery" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900">Schedule Surgical Procedure</h3>
                  <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">✕</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Procedure Type</label>
                    <select 
                      value={surgeryDetails.procedure}
                      onChange={(e) => setSurgeryDetails({ ...surgeryDetails, procedure: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    >
                      <option>Cataract (Phacoemulsification + IOL)</option>
                      <option>Glaucoma Trabeculectomy</option>
                      <option>Pterygium Excision with Graft</option>
                      <option>Intravitreal Injection</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Preferred Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={surgeryDetails.date}
                      onChange={(e) => setSurgeryDetails({ ...surgeryDetails, date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button onClick={() => { alert("Surgery scheduled successfully!"); setActiveModal(null); }} className="px-4 py-2 bg-[#6B21A8] text-white rounded-xl text-xs font-bold hover:bg-[#581c87] cursor-pointer">Confirm Schedule</button>
                </div>
              </>
            )}

            {/* 3. ISSUE PRESCRIPTION MODAL */}
            {activeModal === "prescription" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900">Issue Medication Prescription</h3>
                  <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">✕</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Eye Drop / Medication Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Latanoprost 0.005% Ophthalmic Solution"
                      value={prescriptionDetails.medication}
                      onChange={(e) => setPrescriptionDetails({ ...prescriptionDetails, medication: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Dosage / Instructions</label>
                      <input 
                        type="text" 
                        placeholder="e.g., 1 drop"
                        value={prescriptionDetails.dosage}
                        onChange={(e) => setPrescriptionDetails({ ...prescriptionDetails, dosage: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Frequency</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Once daily at night (OD)"
                        value={prescriptionDetails.frequency}
                        onChange={(e) => setPrescriptionDetails({ ...prescriptionDetails, frequency: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button onClick={() => { alert("Prescription added to chart!"); setActiveModal(null); }} className="px-4 py-2 bg-[#6B21A8] text-white rounded-xl text-xs font-bold hover:bg-[#581c87] cursor-pointer">Save Prescription</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}