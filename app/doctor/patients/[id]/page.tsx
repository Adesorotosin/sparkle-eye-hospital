"use client";

import React, { useEffect, useState } from "react";
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
  const params = useParams<{ id: string }>();
const id = params.id;

  const [activeTab, setActiveTab] = useState("Patient Info");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!id) {
      setErrorMessage("Patient ID is missing.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPatient() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const res = await fetch(`/api/patients/${encodeURIComponent(id)}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Your session has expired. Please sign in again.");
          }

          if (res.status === 403) {
            throw new Error(
              "You are not authorized to view this patient record."
            );
          }

          if (res.status === 404) {
            throw new Error("Patient not found.");
          }

          throw new Error(
            data?.error || "Unable to load the patient record."
          );
        }

        const fetched = data?.patient as PatientRecord | undefined;

        if (!fetched) {
          throw new Error("The server returned an invalid patient record.");
        }

        if (cancelled) return;

        setPatient(fetched);

        if (fetched.encounters && fetched.encounters.length > 0) {
          setSelectedEncounterId(fetched.encounters[0].id);
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Patient EHR load error:", error);

        setPatient(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load the patient record."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
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
      <div className="min-h-screen flex items-center justify-center bg-[#F3F5F8] px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h1 className="text-lg font-bold text-slate-900">
            Unable to load patient
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {errorMessage || "The patient record could not be loaded."}
          </p>

          <Link
            href="/doctor"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#6D4AFF] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5B3CE1]"
          >
            Back to Doctor Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const selectedEncounter =
    patient.encounters?.find((e) => e.id === selectedEncounterId) ||
    patient.encounters?.[0];

  const allergyList = patient.allergies
    ? patient.allergies
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a && a.toLowerCase() !== "none")
    : [];

  return (
    <div className="min-h-screen w-full bg-[#F3F5F8] font-sans antialiased text-slate-800">
      {/* TOP PATIENT HEADER BANNER */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-100 bg-[#EFEBFF] text-sm font-bold text-[#6D4AFF]">
              {initials(patient.fullName)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold leading-none text-slate-900">
                  {patient.fullName}
                </h1>

                <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {patient.patientId}
                </span>
              </div>

              <p className="mt-1 text-xs font-medium text-slate-500">
                {patient.age ? `${patient.age} / ` : ""}
                {patient.gender || "—"} · {patient.coveragePlan}
              </p>
            </div>
          </div>

          {/* REAL VITALS */}
          <div className="flex items-center gap-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Visual Acuity (OD / OS)
              </span>

              <span className="font-bold text-slate-900">
                {patient.vitals
                  ? `${patient.vitals.visualAcuityOD} / ${patient.vitals.visualAcuityOS}`
                  : "Not recorded"}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                IOP
              </span>

              <span className="font-bold text-slate-900">
                {patient.vitals
                  ? `${patient.vitals.iop} mmHg`
                  : "Not recorded"}
              </span>
            </div>
          </div>

          {/* ALLERGIES */}
          <div className="flex items-center gap-2">
            {allergyList.length > 0 ? (
              allergyList.map((allergy) => (
                <div
                  key={allergy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Allergy: {allergy}</span>
                </div>
              ))
            ) : (
              <span className="text-xs font-medium text-slate-400">
                No known allergies on file
              </span>
            )}
          </div>
        </div>

        {/* EHR MODULE TAB NAVIGATION */}
        <div className="scrollbar-none mt-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === tab
                  ? "bg-[#6D4AFF] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex min-h-[calc(100vh-120px)]">
        {/* LEFT PANEL: VISIT HISTORY */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white p-4 md:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Visit History
            </h2>

            <ChevronLeft className="h-4 w-4 cursor-pointer text-slate-400" />
          </div>

          {!patient.encounters || patient.encounters.length === 0 ? (
            <p className="text-xs text-slate-400">
              No consultations recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {patient.encounters.map((visit, index) => (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => setSelectedEncounterId(visit.id)}
                  className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                    selectedEncounterId === visit.id
                      ? "border-[#6D4AFF] bg-purple-50/80 ring-1 ring-[#6D4AFF]/20"
                      : "border-slate-200/80 bg-slate-50/60 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>
                      {new Date(visit.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                      {index === 0 && " (Latest)"}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {visit.diagnosis ||
                      (visit.status === "draft"
                        ? "Draft consultation"
                        : "Consultation")}
                  </p>
                </button>
              ))}
            </div>
          )}

          <Link
            href={`/doctor/patients/${patient.patientId}/encounter`}
            className="mt-4 block rounded-xl bg-[#6D4AFF] px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-[#5B3CE1]"
          >
            + Start New Consultation
          </Link>
        </aside>

        {/* RIGHT CANVAS */}
        <main className="max-w-6xl flex-1 space-y-6 p-6">
          {/* PATIENT INFO */}
          {activeTab === "Patient Info" && (
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <User className="h-5 w-5 text-[#6D4AFF]" />
                Patient Information
              </h2>

              <div className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm md:grid-cols-2">
                <Field label="Full Name" value={patient.fullName} />
                <Field label="Patient ID" value={patient.patientId} />
                <Field
                  label="Age"
                  value={
                    patient.age !== undefined
                      ? `${patient.age} years`
                      : "Not recorded"
                  }
                />
                <Field
                  label="Gender"
                  value={patient.gender || "Not recorded"}
                />
                <Field
                  label="Phone"
                  value={patient.phone || "Not recorded"}
                />
                <Field
                  label="Coverage Plan"
                  value={patient.coveragePlan}
                />
                <Field
                  label="Known Allergies"
                  value={patient.allergies || "None recorded"}
                />
              </div>
            </div>
          )}

          {/* HISTORY */}
          {activeTab === "History" && (
            <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Activity className="h-5 w-5 text-[#6D4AFF]" />
                Consultation History
              </h2>

              {selectedEncounter ? (
                <div className="space-y-4 text-sm">
                  <p className="text-xs font-semibold text-slate-400">
                    {new Date(selectedEncounter.createdAt).toLocaleString()}
                  </p>

                  <Field
                    label="Slit Lamp — OD"
                    value={selectedEncounter.slitLampOD || "Not recorded"}
                  />

                  <Field
                    label="Slit Lamp — OS"
                    value={selectedEncounter.slitLampOS || "Not recorded"}
                  />

                  <Field
                    label="Refraction — OD"
                    value={
                      selectedEncounter.refractionOD
                        ? `${selectedEncounter.refractionOD.sphere} / ${selectedEncounter.refractionOD.cylinder} × ${selectedEncounter.refractionOD.axis}`
                        : "Not recorded"
                    }
                  />

                  <Field
                    label="Refraction — OS"
                    value={
                      selectedEncounter.refractionOS
                        ? `${selectedEncounter.refractionOS.sphere} / ${selectedEncounter.refractionOS.cylinder} × ${selectedEncounter.refractionOS.axis}`
                        : "Not recorded"
                    }
                  />

                  <Field
                    label="Diagnosis"
                    value={selectedEncounter.diagnosis || "Not recorded"}
                  />

                  <Field
                    label="Status"
                    value={
                      selectedEncounter.status === "completed"
                        ? "Completed"
                        : "Draft"
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No consultations recorded yet for this patient.
                </p>
              )}
            </div>
          )}

          {/* DIAGNOSIS */}
          {activeTab === "Diagnosis" && (
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Eye className="h-5 w-5 text-[#6D4AFF]" />
                Diagnosis
              </h2>

              {selectedEncounter?.diagnosis ? (
                <p className="text-sm leading-relaxed text-slate-700">
                  {selectedEncounter.diagnosis}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  No diagnosis recorded yet. Start a consultation to add one.
                </p>
              )}
            </div>
          )}

          {/* INVESTIGATIONS */}
          {activeTab === "Investigations" && (
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <FlaskConical className="h-5 w-5 text-[#6D4AFF]" />
                Investigations / Diagnostic Orders
              </h2>

              {patient.diagnostics.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No diagnostic tests ordered yet.
                </p>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2">Test</th>
                      <th className="py-2">Price</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patient.diagnostics.map((diagnostic) => (
                      <tr key={diagnostic.id}>
                        <td className="py-2.5">{diagnostic.name}</td>
                        <td className="py-2.5">
                          ₦{diagnostic.price.toLocaleString()}
                        </td>
                        <td className="py-2.5 capitalize">
                          {diagnostic.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* PHARMACY */}
          {activeTab === "Pharmacy" && (
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Pill className="h-5 w-5 text-[#6D4AFF]" />
                Prescriptions
              </h2>

              {patient.prescriptions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No prescriptions on file yet.
                </p>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2">Drug</th>
                      <th className="py-2">Dosage</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {patient.prescriptions.map((prescription) => (
                      <tr key={prescription.id}>
                        <td className="py-2.5">
                          {prescription.drugName}
                        </td>

                        <td className="py-2.5">
                          {prescription.dosage}
                        </td>

                        <td className="py-2.5">
                          {prescription.quantity}
                        </td>

                        <td className="py-2.5 capitalize">
                          {prescription.status.replace(/_/g, " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* PAYMENTS */}
          {activeTab === "Payments" && (
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Receipt className="h-5 w-5 text-[#6D4AFF]" />
                Billing & Payments
              </h2>

              {patient.invoice.items.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No invoice items yet.
                </p>
              ) : (
                <>
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2">Item</th>
                        <th className="py-2">Category</th>
                        <th className="py-2">Total</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {patient.invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5">{item.name}</td>

                          <td className="py-2.5 capitalize">
                            {item.category}
                          </td>

                          <td className="py-2.5">
                            ₦{item.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>
                        ₦{patient.invoice.subtotal.toLocaleString()}
                      </span>
                    </div>

                    {patient.invoice.discountAmount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Discount</span>
                        <span>
                          -₦
                          {patient.invoice.discountAmount.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Grand Total</span>
                      <span>
                        ₦{patient.invoice.grandTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Status</span>
                      <span className="capitalize">
                        {patient.invoice.status}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PLACEHOLDER MODULES */}
          {["Treatment", "Surgery", "Reports"].includes(activeTab) && (
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Stethoscope className="h-6 w-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                {activeTab} — Demo Data
              </h3>

              <p className="mx-auto max-w-sm text-xs text-slate-500">
                There is no {activeTab.toLowerCase()} data model in the system
                yet, so this tab is not connected to real records.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-900">
        {value === undefined || value === null || value === ""
          ? "Not provided"
          : String(value)}
      </p>
    </div>
  );
}