"use client";

import React, { useState, useEffect, Suspense } from "react";
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
  LogOut,
  Check,
  Syringe,
  Plus,
  X,
} from "lucide-react";

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  quantity: string;
  unitPrice: number;
  totalPrice: number;
  status: string;
}

// Fallback patients matching strict PatientBannerData shape
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

const FALLBACK_PRESCRIPTIONS: PrescriptionItem[] = [
  {
    id: "demo-1",
    drugName: "Pred Forte Eye Drops 1%",
    dosage: "1 drop OS q2h",
    quantity: "1 bottle (5mL)",
    unitPrice: 8500,
    totalPrice: 8500,
    status: "pending",
  },
];

function PharmacyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Safely destructure context properties
  const patientContext = usePatientFlow() as any;
  const patient = patientContext?.patient || {
    patientId: "SPK-30892",
    fullName: "Mrs. Chidinma Okafor",
    coveragePlan: "Private Cash",
    invoice: { status: "unbilled", amountDue: 0, totalAmount: 0 },
    prescriptions: FALLBACK_PRESCRIPTIONS,
    vitals: { primaryComplaint: "Post-Operative Cataract Care — OD" },
  };
  const setPatient = patientContext?.setPatient;

  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseSuccess, setDispenseSuccess] = useState(false);
  
  // Track administered medications locally
  const [administeredDrugs, setAdministeredDrugs] = useState<Record<string, boolean>>({});

  // Modal & Form State for adding a new drug
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDrug, setNewDrug] = useState({
    drugName: "",
    dosage: "",
    quantity: "",
    unitPrice: 0,
  });

  const [fallbackDrugs, setFallbackDrugs] = useState<PrescriptionItem[]>(FALLBACK_PRESCRIPTIONS);

  const patientId = searchParams.get("patientId") || patient.patientId;
  const isContextPatient = patientId === patient.patientId;

  const bannerPatient: PatientBannerData = isContextPatient
    ? {
        id: patient.patientId,
        name: patient.fullName || "Mrs. Chidinma Okafor",
        age: 42,
        gender: "Female",
        phone: "+234 803 123 4567",
        hmo: {
          name: patient.coveragePlan || "Private Cash",
          type: (patient.coveragePlan || "").includes("HMO") ? "HMO Private" : "Self-Pay",
          status: "Verified",
        },
        allergies: ["None"],
        currentStage: "pharmacy",
        assignedDoctor: "Dr. James Okoro",
        visitDate: "27 Aug 2026",
      }
    : MOCK_PATIENTS[patientId] || MOCK_PATIENTS["SPK-30892"];

  const [selectedPrescription, setSelectedPrescription] = useState(bannerPatient.name);

  useEffect(() => {
    setSelectedPrescription(bannerPatient.name);
  }, [patientId, bannerPatient.name]);

  const unfulfilledOrders = [
    { id: patient.patientId, name: patient.fullName || "Mrs. Chidinma Okafor", time: "09:15 AM" },
    { id: "SPK-2026-0891", name: "Amina Bello", time: "10:45 AM" },
    { id: "1", name: "Adebayo Funmi", time: "10:42 AM" },
  ];

  const readyOrders = [
    { id: "6", name: "James Mitchell", time: "09:12 AM" },
    { id: "7", name: "Oluwaseun Adeyemi", time: "08:55 AM" },
  ];

  const activePrescriptions: PrescriptionItem[] = isContextPatient
    ? patient.prescriptions || fallbackDrugs
    : fallbackDrugs;

  const totalPrescriptionPrice = activePrescriptions.reduce((sum, item) => sum + item.totalPrice, 0);

  const isHMO = bannerPatient.hmo.type.includes("HMO");
  const hmoCoverage = isHMO ? totalPrescriptionPrice * 0.8 : 0;
  const coPayDue = totalPrescriptionPrice - hmoCoverage;

  const handlePatientSelect = (id: string, name: string) => {
    setSelectedPrescription(name);
    setDispenseSuccess(false);
    router.push(`/pharmacy?patientId=${id}`);
  };

  const handlePrintLabel = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const toggleAdminister = (drugId: string) => {
    setAdministeredDrugs((prev: any) => ({
      ...prev,
      [drugId]: !prev[drugId],
    }));
  };

  const handleAddDrug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrug.drugName || !newDrug.dosage || !newDrug.quantity) return;

    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      drugName: newDrug.drugName,
      dosage: newDrug.dosage,
      quantity: newDrug.quantity,
      unitPrice: Number(newDrug.unitPrice),
      totalPrice: Number(newDrug.unitPrice),
      status: "pending",
    };

    if (isContextPatient && typeof setPatient === "function") {
      setPatient((prev: any) => ({
        ...prev,
        prescriptions: [...(prev.prescriptions || []), newItem],
      }));
    } else {
      setFallbackDrugs((prev: any) => [...prev, newItem]);
    }

    setNewDrug({ drugName: "", dosage: "", quantity: "", unitPrice: 0 });
    setIsAddModalOpen(false);
  };

  const handleDispenseAndSend = () => {
    setIsDispensing(true);

    if (isContextPatient && typeof setPatient === "function") {
      setPatient((prev: any) => ({
        ...prev,
        stage: "billing",
        invoice: {
          ...prev.invoice,
          status: "pending_payment",
          amountDue: coPayDue,
          totalAmount: totalPrescriptionPrice,
        },
        prescriptions: (prev.prescriptions || []).map((rx: any) => ({
          ...rx,
          status: "dispensed",
        })),
      }));
    }

    setTimeout(() => {
      setIsDispensing(false);
      setDispenseSuccess(true);
    }, 800);
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex text-slate-800 font-sans antialiased">
      {/* LEFT SIDEBAR: PRESCRIPTION QUEUE */}
      <aside className="w-80 bg-[#0B132B] text-white flex flex-col shrink-0 border-r border-slate-800 print:hidden">
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-md">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white">
                Sparkle-Eye
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

        {/* SIDEBAR FOOTER WITH LOGOUT */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 text-xs space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              COMPLETED
            </span>
            <span className="font-bold text-slate-300">12 today</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between select-none print:hidden">
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

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          <PatientBanner patient={bannerPatient} activeModule="pharmacy" />

          {dispenseSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold block text-emerald-950">
                    Prescription Dispensed & Billed
                  </strong>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Order has been sent to Cashier Queue. Co-pay due: ₦{coPayDue.toLocaleString()}.00
                  </p>
                </div>
              </div>
            </div>
          )}

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

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Medication
                </button>

                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold capitalize border ${
                    dispenseSuccess
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                      : "bg-amber-50 text-amber-800 border-amber-200/80"
                  }`}
                >
                  {dispenseSuccess
                    ? "Dispensed & Sent to Cashier"
                    : isContextPatient
                    ? patient.invoice?.status || "Unfulfilled"
                    : "Unfulfilled"}
                </span>
              </div>
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

            {/* TABLE WITH IN-CLINIC ADMINISTRATION ACTION */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">DRUG NAME</th>
                    <th className="pb-3">DOSAGE</th>
                    <th className="pb-3">QTY TO DISPENSE</th>
                    <th className="pb-3">PRICE</th>
                    <th className="pb-3">ADMINISTER (IN-CLINIC)</th>
                    <th className="pb-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {activePrescriptions.length > 0 ? (
                    activePrescriptions.map((rx: any) => {
                      const isAdministered = administeredDrugs[rx.id];
                      return (
                        <tr key={rx.id}>
                          <td className="py-3.5">
                            <strong className="font-bold text-slate-900 block">
                              {rx.drugName}
                            </strong>
                          </td>
                          <td className="py-3.5">{rx.dosage}</td>
                          <td className="py-3.5 font-bold text-slate-900">{rx.quantity}</td>
                          <td className="py-3.5 font-bold text-slate-900">
                            ₦{rx.totalPrice?.toLocaleString() || "0"}
                          </td>
                          <td className="py-3.5">
                            <button
                              type="button"
                              onClick={() => toggleAdminister(rx.id)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                                isAdministered
                                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                              }`}
                            >
                              <Syringe className="w-3.5 h-3.5" />
                              {isAdministered ? "Administered" : "Mark Administered"}
                            </button>
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase border ${
                                dispenseSuccess || rx.status === "dispensed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                  : "bg-amber-50 text-amber-700 border-amber-200/60"
                              }`}
                            >
                              {dispenseSuccess ? "dispensed" : rx.status?.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-normal">
                        No medications prescribed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-900 print:hidden">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Stock Deduct & Administration Log</strong>
                <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                  Use "Mark Administered" for immediate in-clinic drop application. Clicking dispense updates stock and queues billing directly to the Cashier.
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200/80 px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-20 print:hidden">
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
                CO-PAY DUE AT CASHIER:{" "}
                <strong className="font-extrabold text-purple-700">
                  ₦{coPayDue.toLocaleString()}.00
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintLabel}
              type="button"
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print Label
            </button>

            <button
              onClick={handleDispenseAndSend}
              disabled={isDispensing || dispenseSuccess}
              type="button"
              className={`px-5 py-2.5 font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 cursor-pointer ${
                dispenseSuccess
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white"
              }`}
            >
              {dispenseSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Sent to Cashier Queue
                </>
              ) : isDispensing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Sending to Cashier...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Dispense & Send to Cashier
                </>
              )}
            </button>
          </div>
        </footer>
      </div>

      {/* ADD MEDICATION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-600" />
                Add New Medication
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDrug} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Drug Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Moxifloxacin Eye Drops 0.5%"
                  value={newDrug.drugName}
                  onChange={(e) => setNewDrug({ ...newDrug, drugName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Dosage & Instruction
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1 drop OS qid for 7 days"
                  value={newDrug.dosage}
                  onChange={(e) => setNewDrug({ ...newDrug, dosage: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 bottle (5mL)"
                    value={newDrug.quantity}
                    onChange={(e) => setNewDrug({ ...newDrug, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Price (₦)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 5000"
                    value={newDrug.unitPrice || ""}
                    onChange={(e) => setNewDrug({ ...newDrug, unitPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition shadow-md"
                >
                  Add to Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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