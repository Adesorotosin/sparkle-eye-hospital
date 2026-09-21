"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  Activity,
  Eye,
  Pill,
  Receipt,
  FlaskConical,
  Stethoscope,
  User,
} from "lucide-react";
import { PatientRecord } from "@/types/hospital";

const tabs = [
  "Patient Info",
  "History",
  "Diagnosis",
  "Investigations",
  "Pharmacy",
  "Payments",
  "Treatment",
  "Surgery",
  "Reports",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PatientEHRPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [activeTab, setActiveTab] = useState("Patient Info");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadPatient() {
      try {
        const res = await fetch(`/api/patients/${id}`);
        if (!res.ok) throw new Error("Failed to load patient");
        const { patient: fetched } = await res.json();
        if (cancelled) return;
        setPatient(fetched);
        if (fetched.encounters && fetched.encounters.length > 0) {
          setSelectedEncounterId(fetched.encounters[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPatient();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F5F8]">
        <p className="text-sm text-slate-500">Loading patient chart…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F5F8]">
        <p className="text-sm text-red-600">Patient not found.</p>
      </div>
    );
  }

  const selectedEncounter =
    patient.encounters?.find((e) => e.id === selectedEncounterId) || patient.encounters?.[0];

  const allergyList = patient.allergies
    ? patient.allergies.split(",").map((a) => a.trim()).filter((a) => a && a.toLowerCase() !== "none")
    : [];

  return (
    <div className="min-h-screen w-full bg-[#F3F5F8] font-sans antialiased text-slate-800">
      {/* TOP PATIENT HEADER BANNER */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-sm px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#EFEBFF] text-[#6D4AFF] font-bold text-sm flex items-center justify-center shrink-0 border border-purple-100">
              {initials(patient.fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-none">
                  {patient.fullName}
                </h1>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {patient.patientId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {patient.age ? `${patient.age} / ` : ""}
                {patient.gender || "—"} · {patient.coveragePlan}
              </p>
            </div>
          </div>

          {/* Center: Real Vitals (from Triage), when available */}
          <div className="flex items-center gap-6 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                VISUAL ACUITY (OD / OS)
              </span>
              <span className="text-slate-900 font-bold">
                {patient.vitals ? `${patient.vitals.visualAcuityOD} / ${patient.vitals.visualAcuityOS}` : "Not recorded"}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                IOP
              </span>
              <span className="text-slate-900 font-bold">
                {patient.vitals ? `${patient.vitals.iop} mmHg` : "Not recorded"}
              </span>
            </div>
          </div>

          {/* Right: Real allergy badges */}
          <div className="flex items-center gap-2">
            {allergyList.length > 0 ? (
              allergyList.map((a) => (
                <div
                  key={a}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Allergy: {a}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 font-medium">No known allergies on file</span>
            )}
          </div>
        </div>

        {/* EHR MODULE TAB NAVIGATION */}
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
        {/* LEFT PANEL: VISIT HISTORY — real encounters */}
        <aside className="w-64 border-r border-slate-200/80 bg-white p-4 shrink-0 hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              VISIT HISTORY
            </h2>
            <ChevronLeft className="w-4 h-4 text-slate-400 cursor-pointer" />
          </div>

          {!patient.encounters || patient.encounters.length === 0 ? (
            <p className="text-xs text-slate-400">No consultations recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {patient.encounters.map((visit, idx) => (
                <button
                  key={visit.id}
                  onClick={() => setSelectedEncounterId(visit.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                    selectedEncounterId === visit.id
                      ? "bg-purple-50/80 border-[#6D4AFF] ring-1 ring-[#6D4AFF]/20"
                      : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>
                      {new Date(visit.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                      {idx === 0 && " (Latest)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {visit.diagnosis || (visit.status === "draft" ? "Draft consultation" : "Consultation")}
                  </p>
                </button>
              ))}
            </div>
          )}

          <Link
            href={`/doctor/patients/${patient.patientId}/encounter`}
            className="mt-4 block text-center px-3 py-2 bg-[#6D4AFF] hover:bg-[#5B3CE1] text-white rounded-xl font-bold text-xs transition"
          >
            + Start New Consultation
          </Link>
        </aside>

        {/* RIGHT CANVAS: ACTIVE TAB CONTENT */}
        <main className="flex-1 p-6 space-y-6 max-w-6xl">
          {activeTab === "Patient Info" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-[#6D4AFF]" /> Patient Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <Field label="Full Name" value={patient.fullName} />
                <Field label="Patient ID" value={patient.patientId} />
                <Field label="Age" value={patient.age ? `${patient.age} years` : "Not recorded"} />
                <Field label="Gender" value={patient.gender || "Not recorded"} />
                <Field label="Phone" value={patient.phone || "Not recorded"} />
                <Field label="Coverage Plan" value={patient.coveragePlan} />
                <Field label="Known Allergies" value={patient.allergies || "None recorded"} />
              </div>
            </div>
          )}

          {activeTab === "History" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#6D4AFF]" /> Consultation History
              </h2>
              {selectedEncounter ? (
                <div className="space-y-4 text-sm">
                  <p className="text-xs text-slate-400 font-semibold">
                    {new Date(selectedEncounter.createdAt).toLocaleString()}
                  </p>
                  <Field label="Slit Lamp — OD" value={selectedEncounter.slitLampOD || "Not recorded"} />
                  <Field label="Slit Lamp — OS" value={selectedEncounter.slitLampOS || "Not recorded"} />
                  <Field
                    label="Refraction — OD"
                    value={
                      selectedEncounter.refractionOD
                        ? `${selectedEncounter.refractionOD.sphere} / ${selectedEncounter.refractionOD.cylinder} x ${selectedEncounter.refractionOD.axis}`
                        : "Not recorded"
                    }
                  />
                  <Field
                    label="Refraction — OS"
                    value={
                      selectedEncounter.refractionOS
                        ? `${selectedEncounter.refractionOS.sphere} / ${selectedEncounter.refractionOS.cylinder} x ${selectedEncounter.refractionOS.axis}`
                        : "Not recorded"
                    }
                  />
                  <Field label="Diagnosis" value={selectedEncounter.diagnosis || "Not recorded"} />
                  <Field label="Status" value={selectedEncounter.status === "completed" ? "Completed" : "Draft"} />
                </div>
              ) : (
                <p className="text-sm text-slate-400">No consultations recorded yet for this patient.</p>
              )}
            </div>
          )}

          {activeTab === "Diagnosis" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#6D4AFF]" /> Diagnosis
              </h2>
              {selectedEncounter?.diagnosis ? (
                <p className="text-sm text-slate-700 leading-relaxed">{selectedEncounter.diagnosis}</p>
              ) : (
                <p className="text-sm text-slate-400">No diagnosis recorded yet. Start a consultation to add one.</p>
              )}
            </div>
          )}

          {activeTab === "Investigations" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#6D4AFF]" /> Investigations / Diagnostic Orders
              </h2>
              {patient.diagnostics.length === 0 ? (
                <p className="text-sm text-slate-400">No diagnostic tests ordered yet.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold">
                      <th className="py-2">Test</th>
                      <th className="py-2">Price</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patient.diagnostics.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2.5">{d.name}</td>
                        <td className="py-2.5">₦{d.price.toLocaleString()}</td>
                        <td className="py-2.5 capitalize">{d.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "Pharmacy" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#6D4AFF]" /> Prescriptions
              </h2>
              {patient.prescriptions.length === 0 ? (
                <p className="text-sm text-slate-400">No prescriptions on file yet.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold">
                      <th className="py-2">Drug</th>
                      <th className="py-2">Dosage</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patient.prescriptions.map((rx) => (
                      <tr key={rx.id}>
                        <td className="py-2.5">{rx.drugName}</td>
                        <td className="py-2.5">{rx.dosage}</td>
                        <td className="py-2.5">{rx.quantity}</td>
                        <td className="py-2.5 capitalize">{rx.status.replace(/_/g, " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "Payments" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#6D4AFF]" /> Billing & Payments
              </h2>
              {patient.invoice.items.length === 0 ? (
                <p className="text-sm text-slate-400">No invoice items yet.</p>
              ) : (
                <>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold">
                        <th className="py-2">Item</th>
                        <th className="py-2">Category</th>
                        <th className="py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {patient.invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5">{item.name}</td>
                          <td className="py-2.5 capitalize">{item.category}</td>
                          <td className="py-2.5">₦{item.totalPrice.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="pt-3 border-t border-slate-100 space-y-1 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>₦{patient.invoice.subtotal.toLocaleString()}</span>
                    </div>
                    {patient.invoice.discountAmount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Discount</span>
                        <span>-₦{patient.invoice.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Grand Total</span>
                      <span>₦{patient.invoice.grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Status</span>
                      <span className="capitalize">{patient.invoice.status}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {["Treatment", "Surgery", "Reports"].includes(activeTab) && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{activeTab} — Demo data</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There's no {activeTab.toLowerCase()} data model in the system yet, so this tab isn't
                connected to real records. Let your developer know if this is a module worth building out.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-slate-500 mb-1">{label}</span>
      <span className="block text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
