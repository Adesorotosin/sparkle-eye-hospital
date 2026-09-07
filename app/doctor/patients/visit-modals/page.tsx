"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, HelpCircle, ChevronDown, CheckCircle } from "lucide-react";

export default function InitiateVisitModalPage() {
  const [isOpen, setIsOpen] = useState(true);

  // Form states
  const [visitType, setVisitType] = useState("General Consultation");
  const [assignedDoctor, setAssignedDoctor] = useState("Dr. James Okoro — Ophthalmologist");
  const [priorityLevel, setPriorityLevel] = useState<"Normal" | "Urgent" | "Emergency">("Normal");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("AXA Mansard HMO (Group Plan)");

  return (
    <div className="relative min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-800 antialiased">
      {/* BACKGROUND SIMULATED PATIENT DIRECTORY & INTAKE PAGE */}
      <div className={`p-8 filter ${isOpen ? "blur-sm opacity-60 pointer-events-none transition-all duration-300" : ""}`}>
        <header className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Sparkle Eye Logo" width={32} height={32} />
            <span className="font-bold text-slate-900">Sparkle Eye Specialist</span>
          </div>
          <div className="text-sm font-medium text-slate-500">Patient Directory & Intake</div>
        </header>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Patient Directory & Intake</h1>
          <p className="text-slate-500 text-sm">Select a patient or manage active visit sessions.</p>
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-[#6D4AFF] text-white text-sm font-semibold rounded-xl hover:bg-[#5B3CE1] transition shadow-md"
          >
            Open Initiate Visit Modal
          </button>
        </div>
      </div>

      {/* MODAL OVERLAY & BACKDROP */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          {/* MODAL CONTAINER */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* HEADER */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  Initiate New Visit Session
                </h2>
                <p className="text-xs font-semibold text-[#6D4AFF] mt-0.5">
                  Sarah Adams (ID: SESH-2026-089)
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={(e) => e.preventDefault()} className="p-6 space-y-5">
              
              {/* Visit Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Visit Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition pr-10"
                  >
                    <option value="General Consultation">General Consultation</option>
                    <option value="Follow-up Appointment">Follow-up Appointment</option>
                    <option value="Comprehensive Eye Exam">Comprehensive Eye Exam</option>
                    <option value="Surgical Evaluation">Surgical Evaluation</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Assigned Doctor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assigned Doctor <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={assignedDoctor}
                    onChange={(e) => setAssignedDoctor(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition pr-10"
                  >
                    <option value="Dr. James Okoro — Ophthalmologist">Dr. James Okoro — Ophthalmologist</option>
                    <option value="Dr. Fatima Bello — Optometrist">Dr. Fatima Bello — Optometrist</option>
                    <option value="Dr. Chukwuma Eze — Retinal Specialist">Dr. Chukwuma Eze — Retinal Specialist</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Priority Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Priority Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Normal */}
                  <button
                    type="button"
                    onClick={() => setPriorityLevel("Normal")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                      priorityLevel === "Normal"
                        ? "bg-purple-50/60 border-[#6D4AFF] text-[#6D4AFF] ring-1 ring-[#6D4AFF]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#6D4AFF]"></span>
                    Normal
                  </button>

                  {/* Urgent */}
                  <button
                    type="button"
                    onClick={() => setPriorityLevel("Urgent")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                      priorityLevel === "Urgent"
                        ? "bg-amber-50/80 border-amber-500 text-amber-700 ring-1 ring-amber-500"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Urgent
                  </button>

                  {/* Emergency */}
                  <button
                    type="button"
                    onClick={() => setPriorityLevel("Emergency")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                      priorityLevel === "Emergency"
                        ? "bg-rose-50/80 border-rose-500 text-rose-700 ring-1 ring-rose-500"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Emergency
                  </button>
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chief Complaint <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief reason for visit..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl font-normal text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition resize-none"
                ></textarea>
              </div>

              {/* Insurance / Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Insurance / Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition pr-10"
                  >
                    <option value="AXA Mansard HMO (Group Plan)">AXA Mansard HMO (Group Plan)</option>
                    <option value="Hygeia HMO">Hygeia HMO</option>
                    <option value="Reliance HMO">Reliance HMO</option>
                    <option value="Self Pay / Cash">Self Pay / Cash</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 bg-[#6D4AFF] hover:bg-[#5B3CE1] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#6D4AFF]/20 transition"
                >
                  Confirm & Start Visit
                </button>
              </div>
            </form>

            {/* HELPER FOOTER NOTE */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Patient will be added to the active triage queue upon confirmation.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}