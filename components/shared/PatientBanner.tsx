"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Eye,
  Pill,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Phone,
  ShieldCheck,
  Activity,
  ArrowRight,
  MoreVertical,
} from "lucide-react";

// --- TYPES FOR PATIENT CONTEXT ---
export type CareStage = "checkin" | "triage" | "consultation" | "optical" | "pharmacy" | "billing" | "completed";

export interface PatientBannerData {
  id: string; // e.g., "SPK-2026-0891"
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

const STAGES: { key: CareStage; label: string }[] = [
  { key: "checkin", label: "Intake" },
  { key: "triage", label: "Triage & VA" },
  { key: "consultation", label: "Doctor EHR" },
  { key: "optical", label: "Optical" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "billing", label: "Billing" },
];

export default function PatientBanner({ patient, activeModule }: PatientBannerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  // Helper to determine module routing
  const getModuleLink = (moduleName: "ehr" | "optical" | "pharmacy" | "billing") => {
    switch (moduleName) {
      case "ehr":
        return `/admin/patients/${patient.id}`;
      case "optical":
        return `/admin/optical?patientId=${patient.id}`;
      case "pharmacy":
        return `/admin/pharmacy?patientId=${patient.id}`;
      case "billing":
        return `/admin/billing?patientId=${patient.id}`;
      default:
        return "#";
    }
  };

  // Determine current stage index for progress bar
  const currentStageIndex = STAGES.findIndex((s) => s.key === patient.currentStage);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm mb-6 overflow-hidden">
      {/* UPPER CONTAINER: PATIENT IDENTITY & QUICK METRICS */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#F8FAFC] to-[#EEF2FF]/30 border-b border-[#F1F5F9]">
        {/* Left: Patient Avatar & Key Info */}
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
              title={`Status: ${patient.currentStage}`}
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

        {/* Right: Allergy Warnings & Vitals CTA */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          {/* Allergies Warning Badge */}
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
            onClick={() => setShowVitalsModal(true)}
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#4F46E5] text-xs font-semibold text-[#0F172A] hover:text-[#4F46E5] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Activity className="w-4 h-4 text-[#4F46E5]" />
            <span className="hidden sm:inline">Recent Vitals</span>
          </button>
        </div>
      </div>

      {/* LOWER CONTAINER: MODULE ROUTING TABS & VISUAL JOURNEY TRACKER */}
      <div className="px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Module Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ehr", label: "EHR / Clinical", icon: FileText, href: getModuleLink("ehr") },
            { id: "optical", label: "Optical Rx", icon: Eye, href: getModuleLink("optical") },
            { id: "pharmacy", label: "Pharmacy", icon: Pill, href: getModuleLink("pharmacy") },
            { id: "billing", label: "Billing & Cashier", icon: Receipt, href: getModuleLink("billing") },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "bg-[#4F46E5] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#64748B]"}`} />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Mini Journey Stage Tracker */}
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

      {/* VITALS QUICK MODAL */}
      {showVitalsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-bold text-[#0F172A] text-sm">Triage & Visual Acuity</h3>
              </div>
              <button
                onClick={() => setShowVitalsModal(false)}
                className="text-xs text-[#64748B] hover:text-[#0F172A]"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 bg-[#F8FAFC] rounded-lg">
                <span className="text-[#64748B]">Visual Acuity Right Eye (OD):</span>
                <span className="font-bold text-[#0F172A]">6/12 (UCVA)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F8FAFC] rounded-lg">
                <span className="text-[#64748B]">Visual Acuity Left Eye (OS):</span>
                <span className="font-bold text-[#0F172A]">6/18 (UCVA)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F8FAFC] rounded-lg">
                <span className="text-[#64748B]">Intraocular Pressure (IOP):</span>
                <span className="font-bold text-[#0F172A]">15 mmHg (OD) / 16 mmHg (OS)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F8FAFC] rounded-lg">
                <span className="text-[#64748B]">Blood Pressure:</span>
                <span className="font-bold text-[#0F172A]">120 / 80 mmHg</span>
              </div>
            </div>

            <button
              onClick={() => setShowVitalsModal(false)}
              className="mt-5 w-full py-2 bg-[#0F172A] text-white rounded-xl text-xs font-semibold hover:bg-black transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}