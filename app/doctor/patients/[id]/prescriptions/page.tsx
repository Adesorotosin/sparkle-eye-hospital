"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
} from "lucide-react";

interface Diagnosis {
  id: string;
  name: string;
  code: string;
}

interface Prescription {
  id: string;
  drugName: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  eyeRoute: "OD" | "OS" | "OU" | "N/A";
  instructions: string;
}

export default function ClinicalPrescriptionPortal() {
  const router = useRouter();

  // Selected Diagnoses State
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([
    { id: "1", name: "Cataract (Senile nuclear)", code: "H25.1" },
    { id: "2", name: "Diabetic Retinopathy", code: "E11.3" },
  ]);

  const [customInput, setCustomInput] = useState("");

  // Quick Add Presets
  const quickConditions = [
    { name: "Glaucoma", code: "H40.9" },
    { name: "Refractive Error", code: "H52.9" },
    { name: "Pterygium", code: "H11.0" },
    { name: "Conjunctivitis", code: "H10.9" },
    { name: "Corneal Ulcer", code: "H16.0" },
  ];

  // Prescriptions List State
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([
    {
      id: "1",
      drugName: "Timolol Maleate",
      strength: "0.5%",
      dose: "1 drop",
      frequency: "Twice daily",
      duration: "30 days",
      eyeRoute: "OS",
      instructions: "Instill before bedtime",
    },
    {
      id: "2",
      drugName: "Prednisolone Acetate",
      strength: "1%",
      dose: "1 drop",
      frequency: "4x daily",
      duration: "14 days",
      eyeRoute: "OU",
      instructions: "Taper as directed",
    },
    {
      id: "3",
      drugName: "Metformin",
      strength: "500mg",
      dose: "1 tablet",
      frequency: "Twice daily",
      duration: "90 days",
      eyeRoute: "N/A",
      instructions: "Take with meals",
    },
  ]);

  // Handlers for Diagnoses
  const addDiagnosis = (name: string, code: string) => {
    if (diagnoses.some((d) => d.code === code)) return;
    setDiagnoses([...diagnoses, { id: Date.now().toString(), name, code }]);
  };

  const removeDiagnosis = (id: string) => {
    setDiagnoses(diagnoses.filter((d) => d.id !== id));
  };

  // Handlers for Prescriptions
  const updateRoute = (id: string, route: "OD" | "OS" | "OU" | "N/A") => {
    setPrescriptions(
      prescriptions.map((p) => (p.id === id ? { ...p, eyeRoute: route } : p))
    );
  };

  const deletePrescription = (id: string) => {
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  const addEmptyMedication = () => {
    setPrescriptions([
      ...prescriptions,
      {
        id: Date.now().toString(),
        drugName: "",
        strength: "",
        dose: "1 drop",
        frequency: "Once daily",
        duration: "7 days",
        eyeRoute: "OU",
        instructions: "",
      },
    ]);
  };

  return (
    <div className="min-h-screen w-full bg-[#F3F5F8] font-sans antialiased text-slate-800 flex flex-col justify-between">
      <div>
        {/* TOP PATIENT HEADER BANNER */}
        <header className="sticky top-0 z-30 w-full bg-[#091E42] text-white px-6 py-3 border-b border-slate-800 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* App Brand & Doctor Info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00A3BF] flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">
                  VisionCare EHR
                </h1>
                <p className="text-[10px] text-teal-300 font-semibold uppercase tracking-wider">
                  OPHTHALMOLOGY SUITE
                </p>
              </div>
            </div>

            {/* Patient Context Details */}
            <div className="flex items-center gap-4 bg-[#172B4D] px-4 py-2 rounded-xl text-xs font-medium">
              <div className="w-8 h-8 rounded-full bg-[#0052CC] text-white font-bold flex items-center justify-center text-xs">
                RK
              </div>
              <div>
                <span className="font-bold text-white block">Rajesh Kumar</span>
                <span className="text-[11px] text-slate-300">58 Yrs / Male</span>
              </div>
              <div className="h-6 w-px bg-slate-700 mx-1"></div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  MRN
                </span>
                <span className="font-semibold text-teal-300">#MRN-20458</span>
              </div>
              <div className="h-6 w-px bg-slate-700 mx-1"></div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  VISIT DATE
                </span>
                <span className="font-semibold text-white">Aug 27, 2026</span>
              </div>
              <div className="h-6 w-px bg-slate-700 mx-1"></div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  IOP (TONOMETER)
                </span>
                <span className="font-semibold text-emerald-400">
                  OD: 16 mmHg | OS: 21 mmHg
                </span>
              </div>
            </div>

            {/* Patient Alerts & Doctor Location */}
            <div className="flex items-center gap-3">
              <div className="hidden xl:flex items-center gap-2 text-xs font-semibold">
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg">
                  ALLERGY: Sulfa Drugs
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
                  Diabetic (Type II)
                </span>
              </div>

              <div className="text-right pl-3 border-l border-slate-700">
                <span className="text-xs font-bold block text-white">
                  Dr. Ananya Mehta, MD
                </span>
                <span className="text-[10px] text-slate-400">
                  Cornea & Refractive Specialist
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Page Heading & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-900">
                Clinical Output & Prescription Portal
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>Session status: ACTIVE EXAM</span>
            </div>
          </div>

          {/* CARD 1: DIAGNOSES SECTION */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0052CC]" />
                <h3 className="text-sm font-bold text-slate-900">Diagnoses</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                ICD-10 Ophthalmology Codes Linked Automatically
              </span>
            </div>

            {/* Input Tag Field */}
            <div className="min-h-[48px] p-2 bg-slate-50/50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-[#0052CC]/20 focus-within:border-[#0052CC]">
              {diagnoses.map((diag) => (
                <span
                  key={diag.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EAE6FF] text-[#403294] text-xs font-semibold border border-purple-200"
                >
                  <span>
                    {diag.name} [{diag.code}]
                  </span>
                  <button
                    onClick={() => removeDiagnosis(diag.id)}
                    className="hover:text-rose-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder={
                  diagnoses.length === 0
                    ? "Type code or custom condition..."
                    : "Type code or custom condition..."
                }
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customInput.trim()) {
                    addDiagnosis(customInput.trim(), "Custom");
                    setCustomInput("");
                  }
                }}
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none px-2 min-w-[200px]"
              />
            </div>

            {/* Quick Add Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                Quick Add Common Conditions
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {quickConditions.map((cond) => (
                  <button
                    key={cond.code}
                    onClick={() => addDiagnosis(cond.name, cond.code)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {cond.name} [{cond.code}]
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    const custom = prompt("Enter Custom Diagnosis Name:");
                    if (custom) addDiagnosis(custom, "Custom");
                  }}
                  className="text-xs font-bold text-[#0052CC] hover:underline px-2"
                >
                  + Add Custom Diagnosis
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: PRESCRIPTIONS (ACTIVE BUILDER) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-rose-500 rotate-45" />
                <h3 className="text-sm font-bold text-slate-900">
                  Prescriptions (Active Builder)
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>FDA Drug-Interaction Checks Active</span>
              </div>
            </div>

            {/* Prescriptions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="pb-3 min-w-[160px]">Drug Name</th>
                    <th className="pb-3">Strength</th>
                    <th className="pb-3">Dose</th>
                    <th className="pb-3">Frequency</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3 min-w-[180px]">Eye / Route</th>
                    <th className="pb-3 min-w-[200px]">Special Instructions</th>
                    <th className="pb-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {prescriptions.map((p) => (
                    <tr key={p.id}>
                      {/* Drug Name */}
                      <td className="py-3 pr-2 font-bold text-slate-900">
                        <input
                          type="text"
                          value={p.drugName}
                          onChange={(e) =>
                            setPrescriptions(
                              prescriptions.map((item) =>
                                item.id === p.id
                                  ? { ...item, drugName: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="e.g. Timolol"
                          className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0052CC] font-semibold"
                        />
                      </td>

                      {/* Strength */}
                      <td className="py-3 pr-2">
                        <input
                          type="text"
                          value={p.strength}
                          onChange={(e) =>
                            setPrescriptions(
                              prescriptions.map((item) =>
                                item.id === p.id
                                  ? { ...item, strength: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="0.5%"
                          className="w-20 p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0052CC]"
                        />
                      </td>

                      {/* Dose */}
                      <td className="py-3 pr-2">
                        <input
                          type="text"
                          value={p.dose}
                          onChange={(e) =>
                            setPrescriptions(
                              prescriptions.map((item) =>
                                item.id === p.id
                                  ? { ...item, dose: e.target.value }
                                  : item
                              )
                            )
                          }
                          className="w-20 p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0052CC]"
                        />
                      </td>

                      {/* Frequency */}
                      <td className="py-3 pr-2">
                        <select
                          value={p.frequency}
                          onChange={(e) =>
                            setPrescriptions(
                              prescriptions.map((item) =>
                                item.id === p.id
                                  ? { ...item, frequency: e.target.value }
                                  : item
                              )
                            )
                          }
                          className="p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0052CC]"
                        >
                          <option>Twice daily</option>
                          <option>4x daily</option>
                          <option>Once daily</option>
                          <option>Every 2 hours</option>
                        </select>
                      </td>

                      {/* Duration */}
                      <td className="py-3 pr-2">
                        <input
                          type="text"
                          value={p.duration}
                          onChange={(e) =>
                            setPrescriptions(
                              prescriptions.map((item) =>
                                item.id === p.id
                                  ? { ...item, duration: e.target.value }
                                  : item
                              )
                            )
                          }
                          className="w-24 p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0052CC]"
                        />
                      </td>

                      {/* Eye / Route Segmented Controls */}
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                          {(["OD", "OS", "OU", "N/A"] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => updateRoute(p.id, r)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded transition ${
                                p.eyeRoute === r
                                  ? "bg-[#0052CC] text-white shadow-sm"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Instructions */}
                      <td className="py-3 pr-2">
                        <input
                          type="text"
                          value={p.instructions}
                          onChange={(e) =>
                            setPrescriptions(
                              prescriptions.map((item) =>
                                item.id === p.id
                                  ? { ...item, instructions: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="Special instructions..."
                          className="w-full p-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0052CC]"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="py-3 text-center">
                        <button
                          onClick={() => deletePrescription(p.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Prescriptions Action Bar */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={addEmptyMedication}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EAE6FF] text-[#0052CC] text-xs font-bold rounded-xl hover:bg-purple-100 transition border border-purple-200"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </button>

              <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition border border-slate-200">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Load Prescription Template</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER ACTION BANNER */}
      <footer className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              All medications verified against <strong>#MRN-20458</strong>{" "}
              records.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
              Save as Draft
            </button>

            {/* CONNECTED PROCEED TO BILLING BUTTON */}
            <button
              onClick={() => router.push("/billing")}
              className="px-5 py-2.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition"
            >
              Proceed to Billing &rarr;
            </button>

            <button className="px-5 py-2.5 text-xs font-bold text-white bg-[#0052CC] hover:bg-blue-700 rounded-xl transition shadow-sm">
              Save Notes & Send to Pharmacy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}