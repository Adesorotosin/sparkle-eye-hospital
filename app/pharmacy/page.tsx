"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePatientFlow } from "@/context/PatientFlowContext";
import PatientBanner, { PatientBannerData } from "@/components/shared/PatientBanner";
import {
  Search,
  ChevronRight,
  Info,
  Printer,
  CheckCircle,
  Pill,
} from "lucide-react";

// Mock fallback patients matching strict PatientBannerData shape
const MOCK_PATIENTS: Record<string, PatientBannerData> = {
  "SPK-30892": {
    id: "SPK-30892",
    name: "Mrs. Chidinma Okafor",
    age: 42,
    gender: "Female",
    phone: "+234 803 123 4567",
    hmo: { name: "Private Cash", type: "Self-Pay", status: "Verified" },
    allergies: ["None"],
    currentStage: "pharmacy",
    assignedDoctor: "Dr. James Okoro",
    visitDate: "27 Aug 2026",
  },
  "SPK-2026-0891": {
    id: "SPK-2026-0891",
    name: "Amina Bello",
    age: 34,
    gender: "Female",
    phone: "+234 802 345 6789",
    hmo: { name: "Hygeia HMO", type: "HMO Private", status: "Verified" },
    allergies: ["Penicillin"],
    currentStage: "pharmacy",
    assignedDoctor: "Dr. Adebayo",
    visitDate: "04 Sep 2026",
  },
};

function PharmacyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { patient } = usePatientFlow();

  const patientId = searchParams.get("patientId") || patient.patientId;
  
  // Use context patient data if MRN matches, otherwise fallback to mock
  const isContextPatient = patientId === patient.patientId;

  // Explicitly typed as PatientBannerData with valid HMO type unions
  const bannerPatient: PatientBannerData = isContextPatient
    ? {
        id: patient.patientId,
        name: patient.fullName,
        age: 42,
        gender: "Female",
        phone: "+234 803 123 4567",
        hmo: {
          name: patient.coveragePlan,
          type: patient.coveragePlan.includes("HMO") ? "HMO Private" : "Self-Pay",
          status: "Verified",
        },
        allergies: ["None"],
        currentStage: "pharmacy",
        assignedDoctor: "Dr. James Okoro",
        visitDate: "27 Aug 2026",
      }
    : MOCK_PATIENTS[patientId] || MOCK_PATIENTS["SPK-30892"];

  const [selectedPrescription, setSelectedPrescription] = useState(bannerPatient.name);

  // Unfulfilled vs Ready Orders Queue
  const unfulfilledOrders = [
    { id: patient.patientId, name: patient.fullName, time: "09:15 AM" },
    { id: "SPK-2026-0891", name: "Amina Bello", time: "10:45 AM" },
    { id: "1", name: "Adebayo Funmi", time: "10:42 AM" },
  ];

  const readyOrders = [
    { id: "6", name: "James Mitchell", time: "09:12 AM" },
    { id: "7", name: "Oluwaseun Adeyemi", time: "08:55 AM" },
  ];

  const activePrescriptions = isContextPatient ? patient.prescriptions : [];

  // Total pricing calculations based on context state
  const totalPrescriptionPrice = isContextPatient
    ? patient.prescriptions.reduce((sum, item) => sum + item.totalPrice, 0)
    : 18500;

  const isHMO = bannerPatient.hmo.type.includes("HMO");
  const hmoCoverage = isHMO ? totalPrescriptionPrice * 0.8 : 0;
  const coPayDue = totalPrescriptionPrice - hmoCoverage;

  const handlePatientSelect = (id: string, name: string) => {
    setSelectedPrescription(name);
    router.push(`/pharmacy?patientId=${id}`);
  };

  const handleDispenseAndSend = () => {
    router.push(`/billing?patientId=${bannerPatient.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex text-slate-800 font-sans antialiased">
      {/* LEFT SIDEBAR: PRESCRIPTION QUEUE */}
      <aside className="w-80 bg-[#0B132B] text-white flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-md">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white">
                HospitalRx
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Dispensing Console
              </p>
            </div>
          </div>

          <div className="mt-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prescriptions..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition"
            />
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          <div>
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                UNFULFILLED ({unfulfilledOrders.length})
              </h2>
            </div>
            <div className="space-y-1">
              {unfulfilledOrders.map((item) => {
                const isSelected = selectedPrescription === item.name;
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePatientSelect(item.id, item.name)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? "bg-slate-800 text-white border border-slate-700 shadow-xs"
                        : "text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div>
                      <strong className="text-xs font-bold block group-hover:text-white">
                        {item.name}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        Received: {item.time}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                READY FOR PICKUP ({readyOrders.length})
              </h2>
            </div>
            <div className="space-y-1">
              {readyOrders.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedPrescription(item.name)}
                  className="w-full text-left p-3 rounded-xl text-slate-300 hover:bg-slate-800/50 transition flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <strong className="text-xs font-bold block group-hover:text-white">
                      {item.name}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      Received: {item.time}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            COMPLETED
          </span>
          <span className="font-bold text-slate-300">12 today</span>
        </div>
      </aside>

      {/* RIGHT MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Dispensing Queue</span>
            <span>&rsaquo;</span>
            <span className="text-slate-900 font-bold">Order Detail</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            <span>Terminal active &mdash; Gate 4</span>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto max-w-[1400px] w-full mx-auto space-y-6">
          {/* PERSISTENT PATIENT HEADER BANNER */}
          <PatientBanner patient={bannerPatient} activeModule="pharmacy" />

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {selectedPrescription}
                  </h1>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {bannerPatient.age}Y / {bannerPatient.gender[0]}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    MRN #{bannerPatient.id}
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold capitalize">
                {isContextPatient ? patient.invoice.status : "Unfulfilled"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                  PRESCRIBING PHYSICIAN
                </span>
                <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                  Dr. {bannerPatient.assignedDoctor} &mdash; Ophthalmology
                </strong>
              </div>
              <div className="md:text-right">
                <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                  DATE PRESCRIBED
                </span>
                <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {bannerPatient.visitDate}
                </strong>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5 flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">
                DIAGNOSIS:
              </span>
              <strong className="font-bold text-slate-800">
                {isContextPatient
                  ? patient.vitals?.primaryComplaint || "Post-Operative Evaluation"
                  : "Post-Operative Cataract Care — OD"}
              </strong>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">DRUG NAME</th>
                    <th className="pb-3">DOSAGE</th>
                    <th className="pb-3">QTY TO DISPENSE</th>
                    <th className="pb-3">UNIT PRICE</th>
                    <th className="pb-3">TOTAL PRICE</th>
                    <th className="pb-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {isContextPatient && activePrescriptions.length > 0 ? (
                    activePrescriptions.map((rx) => (
                      <tr key={rx.id}>
                        <td className="py-3.5">
                          <strong className="font-bold text-slate-900 block">
                            {rx.drugName}
                          </strong>
                        </td>
                        <td className="py-3.5">{rx.dosage}</td>
                        <td className="py-3.5 font-bold text-slate-900">{rx.quantity}</td>
                        <td className="py-3.5">₦{rx.pricePerUnit.toLocaleString()}</td>
                        <td className="py-3.5 font-bold text-slate-900">
                          ₦{rx.totalPrice.toLocaleString()}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase border ${
                              rx.status === "ready_for_dispensing"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                : "bg-amber-50 text-amber-700 border-amber-200/60"
                            }`}
                          >
                            {rx.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3.5">
                        <strong className="font-bold text-slate-900 block">
                          Pred Forte Eye Drops 1%
                        </strong>
                        <span className="text-[10px] text-slate-400">Prednisolone Acetate</span>
                      </td>
                      <td className="py-3.5">1 drop OS q2h</td>
                      <td className="py-3.5 font-bold text-slate-900">1 bottle (5mL)</td>
                      <td className="py-3.5">₦8,500</td>
                      <td className="py-3.5 font-bold text-slate-900">₦8,500</td>
                      <td className="py-3.5">
                        <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-bold text-[10px] uppercase">
                          Pending Payment
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-900">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Stock Deduct on Dispense</strong>
                <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                  Dispensing will automatically deduct quantities from pharmacy inventory. Low-stock items will trigger a reorder notification to procurement.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                SPECIAL INSTRUCTIONS
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Patient advised on proper eye drop administration technique. Shake Pred Forte well before use. Wait 5 minutes between different eye drops.
              </p>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200/80 px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-20">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              PRESCRIPTION TOTAL
            </span>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">
                ₦{totalPrescriptionPrice.toLocaleString()}.00
              </span>

              {isHMO ? (
                <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold">
                  {bannerPatient.hmo.name} &mdash; Covers 80%
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                  Private Cash
                </span>
              )}

              <span className="text-xs text-slate-600 font-medium">
                CO-PAY DUE:{" "}
                <strong className="font-extrabold text-purple-700">
                  ₦{coPayDue.toLocaleString()}.00
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer">
              <Printer className="w-4 h-4 text-slate-500" />
              Print Label
            </button>

            <button
              onClick={handleDispenseAndSend}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              Dispense & Send to Billing
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function PharmacyDispensingQueue() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading Pharmacy Console...</div>}>
      <PharmacyContent />
    </Suspense>
  );
}