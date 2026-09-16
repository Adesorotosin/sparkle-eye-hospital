"use client";
import Image from "next/image";
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
  UserPlus,
  Boxes,
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

  // Register Patient modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isRegisteringPatient, setIsRegisteringPatient] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [newPatient, setNewPatient] = useState({
    fullName: "",
    coveragePlan: "Self-Pay",
    age: "",
    gender: "Female",
    phone: "",
    allergies: "",
  });

  // Drug Inventory modal state
  const [isDrugInventoryOpen, setIsDrugInventoryOpen] = useState(false);
  interface DrugStockItem {
    id: string;
    name: string;
    category: string;
    stock: number;
    reorderLevel: number;
    price: number;
  }
  const [drugInventory, setDrugInventory] = useState<DrugStockItem[]>([]);
  const [isLoadingDrugInventory, setIsLoadingDrugInventory] = useState(false);
  const [isAddDrugStockModalOpen, setIsAddDrugStockModalOpen] = useState(false);
  const [isSubmittingDrugStock, setIsSubmittingDrugStock] = useState(false);
  const [newDrugStock, setNewDrugStock] = useState({
    name: "",
    category: "Antibiotics",
    stock: "",
    reorderLevel: "",
    price: "",
  });

  const loadDrugInventory = async () => {
    setIsLoadingDrugInventory(true);
    try {
      const res = await fetch("/api/inventory?domain=pharmacy");
      const data = await res.json();

      if (!res.ok) {
        console.error("API Error Details:", data);
        throw new Error(data.error || "Failed to load drug inventory");
      }

      setDrugInventory(data.items || []);
    } catch (err: any) {
      console.error("Inventory Fetch Error:", err.message);
    } finally {
      setIsLoadingDrugInventory(false);
    }
  };

  const handleOpenDrugInventory = () => {
    setIsDrugInventoryOpen(true);
    loadDrugInventory();
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.fullName) return;
    setIsRegisteringPatient(true);
    setRegisterError(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newPatient.fullName,
          coveragePlan: newPatient.coveragePlan,
          age: newPatient.age ? Number(newPatient.age) : undefined,
          gender: newPatient.gender,
          phone: newPatient.phone || undefined,
          allergies: newPatient.allergies || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to register patient");
      }
      const { patient: created } = await res.json();

      setIsRegisterModalOpen(false);
      setNewPatient({ fullName: "", coveragePlan: "Self-Pay", age: "", gender: "Female", phone: "", allergies: "" });

      // Jump straight to viewing the newly registered patient
      handlePatientSelect(created.patientId, created.fullName);
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Failed to register patient");
    } finally {
      setIsRegisteringPatient(false);
    }
  };

  const handleAddDrugStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrugStock.name || !newDrugStock.stock || !newDrugStock.price) return;
    setIsSubmittingDrugStock(true);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDrugStock.name,
          category: newDrugStock.category,
          stock: Number(newDrugStock.stock),
          reorderLevel: newDrugStock.reorderLevel ? Number(newDrugStock.reorderLevel) : 5,
          price: Number(newDrugStock.price),
          domain: "pharmacy",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add drug");
      }
      const { item } = await res.json();
      setDrugInventory((prev) => [item, ...prev]);
      setNewDrugStock({ name: "", category: "Antibiotics", stock: "", reorderLevel: "", price: "" });
      setIsAddDrugStockModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to add drug");
    } finally {
      setIsSubmittingDrugStock(false);
    }
  };

  const patientId = searchParams.get("patientId") || patient.patientId;
  const isContextPatient = patientId === patient.patientId;

  const bannerPatient: PatientBannerData = isContextPatient
    ? {
        id: patient.patientId,
        name: patient.fullName || "Mrs. Chidinma Okafor",
        age: patient.age ?? 42,
        gender: patient.gender || "Female",
        phone: patient.phone || "+234 803 123 4567",
        hmo: {
          name: patient.coveragePlan || "Private Cash",
          type: (patient.coveragePlan || "").includes("HMO") ? "HMO Private" : "Self-Pay",
          status: "Verified",
        },
        allergies: patient.allergies ? patient.allergies.split(",").map((a: string) => a.trim()) : ["None"],
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

  const handleAddDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrug.drugName || !newDrug.dosage || !newDrug.quantity) return;

    if (isContextPatient && typeof patientContext?.addPrescription === "function") {
      await patientContext.addPrescription({
        drugName: newDrug.drugName,
        dosage: newDrug.dosage,
        quantity: Number(newDrug.quantity) || 1,
        pricePerUnit: Number(newDrug.unitPrice),
        totalPrice: Number(newDrug.unitPrice) * (Number(newDrug.quantity) || 1),
      });
    } else {
      const newItem: PrescriptionItem = {
        id: `rx-${Date.now()}`,
        drugName: newDrug.drugName,
        dosage: newDrug.dosage,
        quantity: newDrug.quantity,
        unitPrice: Number(newDrug.unitPrice),
        totalPrice: Number(newDrug.unitPrice),
        status: "pending",
      };
      setFallbackDrugs((prev: any) => [...prev, newItem]);
    }

    setNewDrug({ drugName: "", dosage: "", quantity: "", unitPrice: 0 });
    setIsAddModalOpen(false);
  };

  const handleDispenseAndSend = async () => {
    setIsDispensing(true);

    if (isContextPatient && typeof patientContext?.dispensePrescription === "function") {
      const toDispense = (patient.prescriptions || []).filter(
        (rx: any) => rx.status === "ready_for_dispensing"
      );
      await Promise.all(toDispense.map((rx: any) => patientContext.dispensePrescription(rx.id)));
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
    <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center p-1 shadow-md overflow-hidden relative">
      <Image
        src="/logo.png"
        alt="Sparkle-Eye Logo"
        width={32}
        height={32}
        className="object-contain"
        priority
      />
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

  <div className="mt-3 grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setIsRegisterModalOpen(true)}
      className="px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
    >
      <UserPlus className="w-3.5 h-3.5" />
      Register Patient
    </button>
    <button
      type="button"
      onClick={handleOpenDrugInventory}
      className="px-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
    >
      <Boxes className="w-3.5 h-3.5" />
      Drug Stock
    </button>
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

      {/* REGISTER PATIENT MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
                Register New Patient
              </h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ngozi Umeh"
                  value={newPatient.fullName}
                  onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Age</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 35"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  >
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +234 803 000 0000"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Coverage Plan</label>
                <input
                  type="text"
                  placeholder="e.g. Self-Pay or HMO - AXA Mansard"
                  value={newPatient.coveragePlan}
                  onChange={(e) => setNewPatient({ ...newPatient, coveragePlan: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Known Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa drugs (or leave blank)"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              {registerError && <p className="text-red-600 font-bold">{registerError}</p>}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringPatient}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold transition shadow-md"
                >
                  {isRegisteringPatient ? "Registering…" : "Register Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRUG INVENTORY MODAL */}
      {isDrugInventoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Boxes className="w-4 h-4 text-purple-600" />
                Drug Stock & Inventory
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddDrugStockModalOpen(true)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Drug
                </button>
                <button
                  onClick={() => setIsDrugInventoryOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isLoadingDrugInventory ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading drug stock…</p>
            ) : drugInventory.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No drugs in stock yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase text-[10px] tracking-wide border-b border-slate-100">
                    <th className="py-2 font-bold">Drug</th>
                    <th className="py-2 font-bold">Category</th>
                    <th className="py-2 font-bold">Stock</th>
                    <th className="py-2 font-bold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {drugInventory.map((drug) => (
                    <tr key={drug.id} className="border-b border-slate-50">
                      <td className="py-2.5 font-bold text-slate-900">
                        {drug.name}
                        <span className="block text-[10px] font-medium text-slate-400">{drug.id}</span>
                      </td>
                      <td className="py-2.5 text-slate-600 font-medium">{drug.category}</td>
                      <td className="py-2.5">
                        <span
                          className={`font-bold ${
                            drug.stock <= drug.reorderLevel ? "text-rose-600" : "text-slate-800"
                          }`}
                        >
                          {drug.stock}
                        </span>
                        {drug.stock <= drug.reorderLevel && (
                          <span className="ml-1.5 text-[9px] font-bold uppercase text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Low
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 font-bold text-slate-900">₦{drug.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ADD DRUG TO STOCK MODAL */}
      {isAddDrugStockModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                Add New Drug to Stock
              </h3>
              <button
                onClick={() => setIsAddDrugStockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDrugStock} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Drug Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ciprofloxacin 500mg"
                  value={newDrugStock.name}
                  onChange={(e) => setNewDrugStock({ ...newDrugStock, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Category</label>
                <select
                  value={newDrugStock.category}
                  onChange={(e) => setNewDrugStock({ ...newDrugStock, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                >
                  <option>Antibiotics</option>
                  <option>Analgesics</option>
                  <option>Ophthalmic Drops</option>
                  <option>Antihistamines</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Stock Qty</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 50"
                    value={newDrugStock.stock}
                    onChange={(e) => setNewDrugStock({ ...newDrugStock, stock: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Reorder At</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 15"
                    value={newDrugStock.reorderLevel}
                    onChange={(e) => setNewDrugStock({ ...newDrugStock, reorderLevel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Price (₦)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 3500"
                    value={newDrugStock.price}
                    onChange={(e) => setNewDrugStock({ ...newDrugStock, price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDrugStockModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDrugStock}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold transition shadow-md"
                >
                  {isSubmittingDrugStock ? "Saving…" : "Add to Stock"}
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