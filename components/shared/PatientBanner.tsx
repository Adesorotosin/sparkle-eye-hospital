"use client";

import React, { useState } from "react";
import {
  User,
  Eye,
  Pill,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Phone,
  ShieldCheck,
  Activity,
  X,
  Plus,
  CreditCard,
} from "lucide-react";

export type CareStage = "checkin" | "triage" | "consultation" | "optical" | "pharmacy" | "billing" | "completed";

export interface PatientBannerData {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  avatarUrl?: string;
  hmo: {
    name: string;
    type: "Self-Pay" | "HMO Private" | "NHIS";
    status: "Verified" | "Pending" | "Unverified";
  };
  allergies: string[];
  currentStage: CareStage;
  assignedDoctor?: string;
  visitDate: string;
}

interface PatientBannerProps {
  patient: PatientBannerData;
  activeModule?: "ehr" | "optical" | "pharmacy" | "billing";
}

type ActiveModal = "vitals" | "ehr" | "optical" | "pharmacy" | "billing" | null;

const STAGES: { key: CareStage; label: string }[] = [
  { key: "checkin", label: "Intake" },
  { key: "triage", label: "Triage & VA" },
  { key: "consultation", label: "Doctor EHR" },
  { key: "optical", label: "Optical" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "billing", label: "Billing" },
];

export default function PatientBanner({ patient, activeModule }: PatientBannerProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const currentStageIndex = STAGES.findIndex((s) => s.key === patient.currentStage);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mb-6 overflow-hidden">
      {/* UPPER CONTAINER: PATIENT IDENTITY */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#F8FAFC] to-[#EEF2FF]/30 border-b border-[#F1F5F9]">
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] text-[#4F46E5] font-bold text-xl flex items-center justify-center shadow-sm overflow-hidden">
              {patient.avatarUrl ? (
                <img src={patient.avatarUrl} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                patient.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
              )}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                patient.currentStage === "completed" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              }`}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">{patient.name}</h2>
              <span className="px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-xs font-semibold font-mono">
                {patient.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-medium border border-[#C7D2FE]">
                {patient.gender}, {patient.age} yrs
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-[#64748B]">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                {patient.phone}
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <strong className="text-[#0F172A]">{patient.hmo.name}</strong> ({patient.hmo.type})
              </span>
              {patient.assignedDoctor && (
                <span className="flex items-center gap-1 text-[#475569]">
                  <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                  Dr. {patient.assignedDoctor}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Allergy Warnings & Vitals Button */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          {patient.allergies.length > 0 ? (
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-semibold block sm:inline">Allergies: </span>
                <span>{patient.allergies.join(", ")}</span>
              </div>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
              No Known Allergies (NKDA)
            </div>
          )}

          <button
            onClick={() => setActiveModal("vitals")}
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#4F46E5] text-xs font-semibold text-[#0F172A] hover:text-[#4F46E5] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Activity className="w-4 h-4 text-[#4F46E5]" />
            <span className="hidden sm:inline">Recent Vitals</span>
          </button>
        </div>
      </div>

      {/* LOWER CONTAINER: MODAL TRIGGER TABS */}
      <div className="px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ehr" as const, label: "EHR / Clinical", icon: FileText },
            { id: "optical" as const, label: "Optical Rx", icon: Eye },
            { id: "pharmacy" as const, label: "Pharmacy", icon: Pill },
            { id: "billing" as const, label: "Billing & Cashier", icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveModal(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#4F46E5] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#64748B]"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Stage Progress Tracker */}
        <div className="hidden lg:flex items-center gap-1 text-xs">
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mr-1">
            Flow:
          </span>
          {STAGES.map((s, idx) => {
            const isPassed = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <React.Fragment key={s.key}>
                <div
                  className={`px-2 py-0.5 rounded-md font-medium text-[11px] flex items-center gap-1 ${
                    isCurrent
                      ? "bg-amber-100 text-amber-800 font-bold border border-amber-300"
                      : isPassed
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-[#94A3B8]"
                  }`}
                >
                  {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  {s.label}
                </div>
                {idx < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-[#CBD5E1]" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* --- MODALS OVERLAY --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center gap-2">
                {activeModal === "vitals" && <Activity className="w-5 h-5 text-[#4F46E5]" />}
                {activeModal === "ehr" && <FileText className="w-5 h-5 text-[#4F46E5]" />}
                {activeModal === "optical" && <Eye className="w-5 h-5 text-[#4F46E5]" />}
                {activeModal === "pharmacy" && <Pill className="w-5 h-5 text-[#4F46E5]" />}
                {activeModal === "billing" && <Receipt className="w-5 h-5 text-[#4F46E5]" />}

                <h3 className="font-bold text-[#0F172A] text-base capitalize">
                  {activeModal === "vitals" && "Triage & Visual Acuity"}
                  {activeModal === "ehr" && `Clinical History - ${patient.name}`}
                  {activeModal === "optical" && `Optical Prescription (${patient.id})`}
                  {activeModal === "pharmacy" && `Pharmacy Prescriptions`}
                  {activeModal === "billing" && `Billing & Cashier Summary`}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="space-y-3 text-xs text-[#334155]">
              {activeModal === "vitals" && (
                <>
                  <div className="flex justify-between p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                    <span className="text-[#64748B]">Right Eye (OD) VA:</span>
                    <span className="font-bold text-[#0F172A]">6/12 (UCVA)</span>
                  </div>
                  <div className="flex justify-between p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                    <span className="text-[#64748B]">Left Eye (OS) VA:</span>
                    <span className="font-bold text-[#0F172A]">6/18 (UCVA)</span>
                  </div>
                  <div className="flex justify-between p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                    <span className="text-[#64748B]">IOP Pressure:</span>
                    <span className="font-bold text-[#0F172A]">15 mmHg (OD) / 16 mmHg (OS)</span>
                  </div>
                  <div className="flex justify-between p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                    <span className="text-[#64748B]">Blood Pressure:</span>
                    <span className="font-bold text-[#0F172A]">120 / 80 mmHg</span>
                  </div>
                </>
              )}

              {activeModal === "ehr" && (
                <div className="space-y-2">
                  <p className="text-slate-600">Chief Complaint: Blurry vision in left eye for 3 days.</p>
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <p className="font-semibold text-indigo-900">Diagnosis Note:</p>
                    <p className="text-indigo-800 mt-0.5">Mild allergic conjunctivitis. Prescribed eye drops.</p>
                  </div>
                </div>
              )}

              {activeModal === "optical" && (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold block text-slate-800">OD (Right)</span>
                    <span className="text-[#4F46E5] font-mono mt-1 block">-1.25 SPH / -0.50 CYL</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold block text-slate-800">OS (Left)</span>
                    <span className="text-[#4F46E5] font-mono mt-1 block">-1.75 SPH / -0.75 CYL</span>
                  </div>
                </div>
              )}

              {activeModal === "pharmacy" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                    <div>
                      <p className="font-bold text-emerald-950">Ofloxacin Ophthalmic Solution 0.3%</p>
                      <p className="text-emerald-700 text-[11px]">1 drop in OS twice daily • 7 days</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 font-bold rounded text-[10px]">
                      READY
                    </span>
                  </div>
                </div>
              )}

              {activeModal === "billing" && (
                <div className="space-y-2">
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span>Consultation Fee:</span>
                    <span className="font-bold">₦15,000</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span>Medication (Pharmacy):</span>
                    <span className="font-bold">₦8,500</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-950 font-bold">
                    <span>Total Payable:</span>
                    <span>₦23,500</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-semibold hover:bg-black transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}