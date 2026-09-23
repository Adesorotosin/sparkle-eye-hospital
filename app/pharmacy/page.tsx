"use client";

import Image from "next/image";
import React, {
  useState,
  useEffect,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PatientBanner, {
  PatientBannerData,
} from "@/components/shared/PatientBanner";

import {
  Search,
  ChevronRight,
  Info,
  Printer,
  CheckCircle,
  Pill,
  Check,
  Syringe,
  Plus,
  X,
  UserPlus,
  Boxes,
} from "lucide-react";

import {
  getPharmacyPatient,
  getPharmacyQueue,
  dispensePatientPrescriptions,
  type PharmacyPatient,
  type PharmacyQueueItem,
} from "@/app/actions/pharmacy";

import type { PharmacyPrescription } from "@/app/actions/pharmacy";

function formatCurrency(amount: number) {
  return `₦${Number(amount || 0).toLocaleString("en-NG")}`;
}

function formatTime(value: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDate(value: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

interface DrugStockItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
  price: number;
}

function PharmacyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlPatientId = searchParams.get("patientId");

  /* -------------------------------------------------------------------------- */
  /*                                PATIENT STATE                               */
  /* -------------------------------------------------------------------------- */

  const [patient, setPatient] = useState<PharmacyPatient | null>(null);
  const [queue, setQueue] = useState<PharmacyQueueItem[]>([]);

  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

  const [patientError, setPatientError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  /* -------------------------------------------------------------------------- */
  /*                              DISPENSING STATE                               */
  /* -------------------------------------------------------------------------- */

  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseSuccess, setDispenseSuccess] = useState(false);
  const [dispenseMessage, setDispenseMessage] = useState<string | null>(null);

  /* -------------------------------------------------------------------------- */
  /*                         IN-CLINIC ADMINISTRATION                            */
  /* -------------------------------------------------------------------------- */

  const [administeredDrugs, setAdministeredDrugs] = useState<
    Record<string, boolean>
  >({});

  /* -------------------------------------------------------------------------- */
  /*                             QUEUE SEARCH                                    */
  /* -------------------------------------------------------------------------- */

  const [queueSearch, setQueueSearch] = useState("");

  /* -------------------------------------------------------------------------- */
  /*                           REGISTER PATIENT                                  */
  /* -------------------------------------------------------------------------- */

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

  /* -------------------------------------------------------------------------- */
  /*                              DRUG INVENTORY                                 */
  /* -------------------------------------------------------------------------- */

  const [isDrugInventoryOpen, setIsDrugInventoryOpen] = useState(false);
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

  const [drugSuggestions, setDrugSuggestions] = useState<string[]>([]);
  const [showDrugSuggestions, setShowDrugSuggestions] = useState(false);
  const [isSearchingDrugs, setIsSearchingDrugs] = useState(false);

  const drugSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -------------------------------------------------------------------------- */
  /*                          LOAD PHARMACY QUEUE                                */
  /* -------------------------------------------------------------------------- */

  const loadQueue = async () => {
    setIsLoadingQueue(true);
    setQueueError(null);

    try {
      const result = await getPharmacyQueue();

      if (!result.success) {
        setQueueError(result.message);
        setQueue([]);
        return;
      }

      setQueue(result.queue || []);
    } catch (error) {
      console.error("Pharmacy queue error:", error);
      setQueueError("Unable to load the pharmacy queue.");
      setQueue([]);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                         LOAD SELECTED PATIENT                               */
  /* -------------------------------------------------------------------------- */

  const loadPatient = async (patientCode: string) => {
    if (!patientCode) {
      setPatient(null);
      setIsLoadingPatient(false);
      return;
    }

    setIsLoadingPatient(true);
    setPatientError(null);
    setDispenseSuccess(false);
    setDispenseMessage(null);
    setAdministeredDrugs({});

    try {
      const result = await getPharmacyPatient(patientCode);

      if (!result.success || !result.patient) {
        setPatient(null);
        setPatientError(result.message);
        return;
      }

      setPatient(result.patient);
    } catch (error) {
      console.error("Pharmacy patient error:", error);
      setPatient(null);
      setPatientError("Unable to load patient information.");
    } finally {
      setIsLoadingPatient(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                         INITIAL PAGE LOAD                                   */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (urlPatientId) {
      loadPatient(urlPatientId);
      return;
    }

    /*
     * If there is no patient in the URL, automatically select
     * the first patient currently waiting for dispensing.
     */
    if (!isLoadingQueue && queue.length > 0) {
      const firstPatient = queue[0];

      router.replace(
        `/pharmacy?patientId=${encodeURIComponent(firstPatient.patientId)}`
      );
    } else if (!isLoadingQueue) {
      setIsLoadingPatient(false);
      setPatient(null);
    }
  }, [urlPatientId, isLoadingQueue, queue, router]);

  /* -------------------------------------------------------------------------- */
  /*                         SELECT PATIENT                                      */
  /* -------------------------------------------------------------------------- */

  const handlePatientSelect = (patientCode: string) => {
    setDispenseSuccess(false);
    setDispenseMessage(null);

    router.push(
      `/pharmacy?patientId=${encodeURIComponent(patientCode)}`
    );
  };

  /* -------------------------------------------------------------------------- */
  /*                            QUEUE FILTER                                     */
  /* -------------------------------------------------------------------------- */

  const filteredQueue = queue.filter((item) => {
    const query = queueSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      item.fullName.toLowerCase().includes(query) ||
      item.patientId.toLowerCase().includes(query)
    );
  });

  /* -------------------------------------------------------------------------- */
  /*                        DRUG NAME SEARCH                                     */
  /* -------------------------------------------------------------------------- */

  const handleDrugNameChange = (value: string) => {
    setNewDrugStock({
      ...newDrugStock,
      name: value,
    });

    setShowDrugSuggestions(true);

    if (drugSearchTimer.current) {
      clearTimeout(drugSearchTimer.current);
    }

    if (value.trim().length < 2) {
      setDrugSuggestions([]);
      return;
    }

    drugSearchTimer.current = setTimeout(async () => {
      setIsSearchingDrugs(true);

      try {
        const response = await fetch(
          `/api/drug-search?q=${encodeURIComponent(value)}`
        );

        if (!response.ok) {
          setDrugSuggestions([]);
          return;
        }

        const data = await response.json();

        setDrugSuggestions(data.suggestions || []);
      } catch (error) {
        console.error("Drug search error:", error);
        setDrugSuggestions([]);
      } finally {
        setIsSearchingDrugs(false);
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (drugSearchTimer.current) {
        clearTimeout(drugSearchTimer.current);
      }
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                          LOAD DRUG INVENTORY                                */
  /* -------------------------------------------------------------------------- */

  const loadDrugInventory = async () => {
    setIsLoadingDrugInventory(true);

    try {
      const response = await fetch(
        "/api/inventory?domain=pharmacy"
      );

      if (!response.ok) {
        throw new Error("Failed to load drug inventory");
      }

      const data = await response.json();

      setDrugInventory(data.items || []);
    } catch (error) {
      console.error("Drug inventory error:", error);
      setDrugInventory([]);
    } finally {
      setIsLoadingDrugInventory(false);
    }
  };

  const handleOpenDrugInventory = () => {
    setIsDrugInventoryOpen(true);
    loadDrugInventory();
  };

  /* -------------------------------------------------------------------------- */
  /*                          REGISTER PATIENT                                   */
  /* -------------------------------------------------------------------------- */

  const handleRegisterPatient = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!newPatient.fullName.trim()) {
      return;
    }

    setIsRegisteringPatient(true);
    setRegisterError(null);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: newPatient.fullName.trim(),
          coveragePlan: newPatient.coveragePlan,
          age: newPatient.age
            ? Number(newPatient.age)
            : undefined,
          gender: newPatient.gender,
          phone: newPatient.phone || undefined,
          allergies: newPatient.allergies || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          body.error || "Failed to register patient"
        );
      }

      const data = await response.json();

      const createdPatient = data.patient;

      setIsRegisterModalOpen(false);

      setNewPatient({
        fullName: "",
        coveragePlan: "Self-Pay",
        age: "",
        gender: "Female",
        phone: "",
        allergies: "",
      });

      if (createdPatient?.patientId) {
        handlePatientSelect(createdPatient.patientId);
      }
    } catch (error) {
      console.error("Register patient error:", error);

      setRegisterError(
        error instanceof Error
          ? error.message
          : "Failed to register patient"
      );
    } finally {
      setIsRegisteringPatient(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                           ADD DRUG TO STOCK                                 */
  /* -------------------------------------------------------------------------- */

  const handleAddDrugStock = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !newDrugStock.name.trim() ||
      !newDrugStock.stock ||
      !newDrugStock.price
    ) {
      return;
    }

    setIsSubmittingDrugStock(true);

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newDrugStock.name.trim(),
          category: newDrugStock.category,
          stock: Number(newDrugStock.stock),
          reorderLevel: newDrugStock.reorderLevel
            ? Number(newDrugStock.reorderLevel)
            : 5,
          price: Number(newDrugStock.price),
          domain: "pharmacy",
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          body.error || "Failed to add drug"
        );
      }

      const data = await response.json();

      setDrugInventory((previous) => [
        data.item,
        ...previous,
      ]);

      setNewDrugStock({
        name: "",
        category: "Antibiotics",
        stock: "",
        reorderLevel: "",
        price: "",
      });

      setDrugSuggestions([]);
      setShowDrugSuggestions(false);
      setIsAddDrugStockModalOpen(false);
    } catch (error) {
      console.error("Add drug stock error:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to add drug"
      );
    } finally {
      setIsSubmittingDrugStock(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                             DISPENSE                                        */
  /* -------------------------------------------------------------------------- */

  const handleDispenseAndSend = async () => {
    if (!patient) {
      return;
    }

    const readyPrescriptions =
      patient.prescriptions.filter(
        (prescription) =>
          prescription.status ===
          "ready_for_dispensing"
      );

    if (readyPrescriptions.length === 0) {
      setDispenseMessage(
        "There are no paid prescriptions ready for dispensing."
      );

      return;
    }

    setIsDispensing(true);
    setDispenseMessage(null);
    setDispenseSuccess(false);

    try {
      const result =
        await dispensePatientPrescriptions(
          patient.patientId
        );

      if (!result.success) {
        setDispenseMessage(result.message);
        return;
      }

      setDispenseSuccess(true);

      setDispenseMessage(
        `${result.prescriptionCount || 0} prescription${
          result.prescriptionCount === 1 ? "" : "s"
        } dispensed successfully.`
      );

      /*
       * Reload both patient and queue so the UI reflects
       * the new "dispensed" state immediately.
       */
      await Promise.all([
        loadPatient(patient.patientId),
        loadQueue(),
      ]);
    } catch (error) {
      console.error("Dispensing error:", error);

      setDispenseMessage(
        "An unexpected error occurred while dispensing."
      );
    } finally {
      setIsDispensing(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                         PRINT PRESCRIPTION LABEL                             */
  /* -------------------------------------------------------------------------- */

  const handlePrintLabel = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                          ADMINISTRATION                                      */
  /* -------------------------------------------------------------------------- */

  const toggleAdminister = (drugId: string) => {
    setAdministeredDrugs((previous) => ({
      ...previous,
      [drugId]: !previous[drugId],
    }));
  };

  /* -------------------------------------------------------------------------- */
  /*                          PATIENT BANNER                                      */
  /* -------------------------------------------------------------------------- */

  const bannerPatient: PatientBannerData | null =
    patient
      ? {
          id: patient.patientId,
          name: patient.fullName,
          age: patient.age ?? 0,
          gender: patient.gender || "Not specified",
          phone: patient.phone || "Not provided",
          hmo: {
            name:
              patient.coveragePlan || "Self-Pay",
            type:
              patient.coveragePlan
                ?.toLowerCase()
                .includes("hmo")
                ? "HMO"
                : "Self-Pay",
            status: "Verified",
          },
          allergies: patient.allergies
            ? patient.allergies
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : ["None recorded"],
          currentStage: "pharmacy",
          assignedDoctor: "Clinical Team",
          visitDate: "Current Visit",
        }
      : null;

  /* -------------------------------------------------------------------------- */
  /*                             PRESCRIPTIONS                                   */
  /* -------------------------------------------------------------------------- */

  const activePrescriptions: PharmacyPrescription[] =
    patient?.prescriptions || [];

  const totalPrescriptionPrice =
    activePrescriptions.reduce(
      (sum, prescription) =>
        sum +
        Number(
          prescription.totalPrice || 0
        ),
      0
    );

  const readyPrescriptionCount =
    activePrescriptions.filter(
      (prescription) =>
        prescription.status ===
        "ready_for_dispensing"
    ).length;

  /* -------------------------------------------------------------------------- */
  /*                                LOADING                                      */
  /* -------------------------------------------------------------------------- */

  if (isLoadingPatient && !patient) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700 mt-4">
            Loading Pharmacy Console...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Loading patient and prescription data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex text-slate-800 font-sans antialiased">
      {/* -------------------------------------------------------------------- */}
      {/* LEFT SIDEBAR                                                         */}
      {/* -------------------------------------------------------------------- */}

      <aside className="w-80 bg-[#0B132B] text-white flex flex-col shrink-0 border-r border-slate-800 print:hidden">
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Sparkle Eye Specialist Hospital Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white leading-tight">
                Sparkle Eye
              </h1>

              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Dispensing Console
              </p>
            </div>
          </div>

          {/* Queue Search */}
          <div className="mt-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              placeholder="Search patients..."
              value={queueSearch}
              onChange={(event) =>
                setQueueSearch(event.target.value)
              }
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setIsRegisterModalOpen(true)
              }
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

        {/* Queue */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center gap-2 px-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />

            <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              READY FOR DISPENSING (
              {filteredQueue.length})
            </h2>
          </div>

          {isLoadingQueue ? (
            <div className="px-3 py-6 text-center">
              <div className="w-5 h-5 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin mx-auto" />

              <p className="text-[10px] text-slate-500 mt-2">
                Loading queue...
              </p>
            </div>
          ) : queueError ? (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl">
              <p className="text-[10px] text-rose-300">
                {queueError}
              </p>

              <button
                type="button"
                onClick={loadQueue}
                className="mt-2 text-[10px] font-bold text-white underline"
              >
                Try again
              </button>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="p-5 text-center border border-dashed border-slate-700 rounded-xl">
              <Pill className="w-5 h-5 text-slate-600 mx-auto" />

              <p className="text-[10px] text-slate-500 mt-2">
                {queueSearch
                  ? "No matching patients."
                  : "No prescriptions are ready for dispensing."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredQueue.map((item) => {
                const isSelected =
                  patient?.patientId ===
                  item.patientId;

                return (
                  <button
                    key={item.patientId}
                    type="button"
                    onClick={() =>
                      handlePatientSelect(
                        item.patientId
                      )
                    }
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? "bg-slate-800 text-white border border-slate-700 shadow-xs"
                        : "text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <strong className="text-xs font-bold block group-hover:text-white truncate">
                        {item.fullName}
                      </strong>

                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {item.patientId}
                      </span>

                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {item.prescriptionCount} prescription
                        {item.prescriptionCount === 1
                          ? ""
                          : "s"}{" "}
                        · {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN CONTAINER                                                       */}
      {/* -------------------------------------------------------------------- */}

      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between select-none print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Dispensing Queue</span>
            <span>&rsaquo;</span>

            <span className="text-slate-900 font-bold">
              Order Detail
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span>Terminal active — Gate 4</span>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {/* Patient Banner */}
          {bannerPatient && (
            <PatientBanner
              patient={bannerPatient}
              activeModule="pharmacy"
            />
          )}

          {/* Patient Loading */}
          {isLoadingPatient && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />

              <p className="text-xs text-slate-500 font-medium">
                Loading patient prescription...
              </p>
            </div>
          )}

          {/* Patient Error */}
          {patientError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-rose-600 shrink-0" />

                <div>
                  <strong className="block text-sm font-bold text-rose-900">
                    Unable to load patient
                  </strong>

                  <p className="text-xs text-rose-700 mt-1">
                    {patientError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      urlPatientId &&
                      loadPatient(urlPatientId)
                    }
                    className="mt-3 text-xs font-bold text-rose-800 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {dispenseSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <Check className="w-4 h-4" />
                </div>

                <div>
                  <strong className="font-bold block text-emerald-950">
                    Prescription Dispensed
                  </strong>

                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    {dispenseMessage ||
                      "Prescription has been successfully dispensed."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dispense Error */}
          {dispenseMessage && !dispenseSuccess && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-900">
              <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />

              <div>
                <strong className="font-bold block">
                  Dispensing could not be completed
                </strong>

                <p className="text-[11px] text-rose-700 font-medium mt-0.5">
                  {dispenseMessage}
                </p>
              </div>
            </div>
          )}

          {/* Order */}
          {patient && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              {/* Order Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {patient.fullName}
                    </h1>

                    {patient.age !== undefined && (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {patient.age}Y
                        {patient.gender
                          ? ` / ${patient.gender[0]}`
                          : ""}
                      </span>
                    )}

                    <span className="text-xs font-mono text-slate-400">
                      MRN #{patient.patientId}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1">
                    Coverage:{" "}
                    <strong className="text-slate-600">
                      {patient.coveragePlan ||
                        "Self-Pay"}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-bold capitalize border ${
                      dispenseSuccess ||
                      activePrescriptions.every(
                        (rx) =>
                          rx.status ===
                          "dispensed"
                      )
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                        : readyPrescriptionCount > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200/80"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {dispenseSuccess ||
                    activePrescriptions.length > 0 &&
                      activePrescriptions.every(
                        (rx) =>
                          rx.status ===
                          "dispensed"
                      )
                      ? "Dispensed"
                      : readyPrescriptionCount > 0
                      ? "Ready for Dispensing"
                      : "No Ready Prescription"}
                  </span>
                </div>
              </div>

              {/* Prescription Meta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                    PRESCRIBING TEAM
                  </span>

                  <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                    Clinical Team — Ophthalmology
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                    PATIENT CODE
                  </span>

                  <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                    {patient.patientId}
                  </strong>
                </div>

                <div className="md:text-right">
                  <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                    PRESCRIPTION STATUS
                  </span>

                  <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                    {readyPrescriptionCount > 0
                      ? `${readyPrescriptionCount} item${
                          readyPrescriptionCount === 1
                            ? ""
                            : "s"
                        } ready`
                      : "No items ready"}
                  </strong>
                </div>
              </div>

              {/* Allergies */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center gap-2 text-xs">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />

                <span className="text-amber-700 font-bold uppercase text-[10px]">
                  ALLERGIES:
                </span>

                <strong className="font-bold text-amber-900">
                  {patient.allergies ||
                    "None recorded"}
                </strong>
              </div>

              {/* Prescription Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">
                        DRUG NAME
                      </th>

                      <th className="pb-3">
                        DOSAGE
                      </th>

                      <th className="pb-3">
                        QTY
                      </th>

                      <th className="pb-3">
                        PRICE
                      </th>

                      <th className="pb-3">
                        ADMINISTER
                      </th>

                      <th className="pb-3">
                        STATUS
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {activePrescriptions.length > 0 ? (
                      activePrescriptions.map(
                        (rx) => {
                          const isAdministered =
                            administeredDrugs[
                              rx.id
                            ];

                          const isReady =
                            rx.status ===
                            "ready_for_dispensing";

                          const isDispensed =
                            rx.status ===
                            "dispensed";

                          return (
                            <tr key={rx.id}>
                              <td className="py-3.5">
                                <strong className="font-bold text-slate-900 block">
                                  {rx.drugName}
                                </strong>
                              </td>

                              <td className="py-3.5">
                                {rx.dosage}
                              </td>

                              <td className="py-3.5 font-bold text-slate-900">
                                {rx.quantity}
                              </td>

                              <td className="py-3.5 font-bold text-slate-900">
                                {formatCurrency(
                                  rx.totalPrice
                                )}
                              </td>

                              <td className="py-3.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleAdminister(
                                      rx.id
                                    )}
                                  disabled={
                                    isDispensed
                                  }
                                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isAdministered
                                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                  }`}
                                >
                                  <Syringe className="w-3.5 h-3.5" />

                                  {isAdministered
                                    ? "Administered"
                                    : "Mark Administered"}
                                </button>
                              </td>

                              <td className="py-3.5">
                                <span
                                  className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase border ${
                                    isDispensed
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                      : isReady
                                      ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {rx.status.replace(
                                    /_/g,
                                    " "
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center"
                        >
                          <Pill className="w-7 h-7 text-slate-300 mx-auto" />

                          <p className="text-xs text-slate-400 font-medium mt-2">
                            No prescriptions found
                            for this patient.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Information */}
              <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-900 print:hidden">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />

                <div>
                  <strong className="font-bold block">
                    Dispensing & Stock Control
                  </strong>

                  <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                    Only prescriptions that have
                    been paid and moved to
                    <strong>
                      {" "}
                      Ready for Dispensing
                    </strong>{" "}
                    can be dispensed. Dispensing
                    deducts the required quantity
                    from pharmacy stock and records
                    the pharmacy activity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* No Patient */}
          {!patient &&
            !isLoadingPatient &&
            !patientError && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <Pill className="w-8 h-8 text-slate-300 mx-auto" />

                <h2 className="text-sm font-bold text-slate-700 mt-3">
                  No patient selected
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Select a patient from the
                  dispensing queue.
                </p>
              </div>
            )}
        </main>

        {/* ------------------------------------------------------------------ */}
        {/* FOOTER                                                            */}
        {/* ------------------------------------------------------------------ */}

        {patient && (
          <footer className="bg-white border-t border-slate-200/80 px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-20 print:hidden">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                PRESCRIPTION TOTAL
              </span>

              <div className="flex flex-wrap items-center gap-3 mt-0.5">
                <span className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(
                    totalPrescriptionPrice
                  )}
                </span>

                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                  {patient.coveragePlan ||
                    "Self-Pay"}
                </span>

                <span className="text-xs text-slate-600 font-medium">
                  {readyPrescriptionCount > 0
                    ? `${readyPrescriptionCount} item${
                        readyPrescriptionCount ===
                        1
                          ? ""
                          : "s"
                      } ready for dispensing`
                    : "No items ready for dispensing"}
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
                disabled={
                  isDispensing ||
                  dispenseSuccess ||
                  readyPrescriptionCount === 0
                }
                type="button"
                className={`px-5 py-2.5 font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 ${
                  dispenseSuccess
                    ? "bg-emerald-600 text-white cursor-default"
                    : readyPrescriptionCount ===
                      0
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white cursor-pointer"
                }`}
              >
                {dispenseSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Dispensed
                  </>
                ) : isDispensing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Dispensing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Dispense Prescription
                  </>
                )}
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* REGISTER PATIENT MODAL                                               */}
      {/* -------------------------------------------------------------------- */}

      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
                Register New Patient
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsRegisterModalOpen(false)
                }
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleRegisterPatient}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Ngozi Umeh"
                  value={newPatient.fullName}
                  onChange={(event) =>
                    setNewPatient({
                      ...newPatient,
                      fullName:
                        event.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Age
                  </label>

                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 35"
                    value={newPatient.age}
                    onChange={(event) =>
                      setNewPatient({
                        ...newPatient,
                        age: event.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Gender
                  </label>

                  <select
                    value={newPatient.gender}
                    onChange={(event) =>
                      setNewPatient({
                        ...newPatient,
                        gender:
                          event.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  >
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Phone Number
                </label>

                <input
                  type="tel"
                  placeholder="e.g. +234 803 000 0000"
                  value={newPatient.phone}
                  onChange={(event) =>
                    setNewPatient({
                      ...newPatient,
                      phone:
                        event.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Coverage Plan
                </label>

                <input
                  type="text"
                  placeholder="e.g. Self-Pay or HMO - AXA Mansard"
                  value={newPatient.coveragePlan}
                  onChange={(event) =>
                    setNewPatient({
                      ...newPatient,
                      coveragePlan:
                        event.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Known Allergies
                </label>

                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  value={newPatient.allergies}
                  onChange={(event) =>
                    setNewPatient({
                      ...newPatient,
                      allergies:
                        event.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              {registerError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <p className="text-rose-700 font-bold">
                    {registerError}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setIsRegisterModalOpen(false)
                  }
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isRegisteringPatient}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold transition shadow-md"
                >
                  {isRegisteringPatient
                    ? "Registering…"
                    : "Register Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* DRUG INVENTORY MODAL                                                 */}
      {/* -------------------------------------------------------------------- */}

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
                  onClick={() =>
                    setIsAddDrugStockModalOpen(
                      true
                    )
                  }
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Drug
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIsDrugInventoryOpen(false)
                  }
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isLoadingDrugInventory ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />

                <p className="text-xs text-slate-400 mt-2">
                  Loading drug stock...
                </p>
              </div>
            ) : drugInventory.length === 0 ? (
              <div className="py-8 text-center">
                <Boxes className="w-7 h-7 text-slate-300 mx-auto" />

                <p className="text-xs text-slate-400 mt-2">
                  No drugs in stock yet.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase text-[10px] tracking-wide border-b border-slate-100">
                    <th className="py-2 font-bold">
                      Drug
                    </th>

                    <th className="py-2 font-bold">
                      Category
                    </th>

                    <th className="py-2 font-bold">
                      Stock
                    </th>

                    <th className="py-2 font-bold">
                      Price
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {drugInventory.map(
                    (drug) => (
                      <tr
                        key={drug.id}
                        className="border-b border-slate-50"
                      >
                        <td className="py-2.5 font-bold text-slate-900">
                          {drug.name}

                          <span className="block text-[10px] font-medium text-slate-400">
                            {drug.id}
                          </span>
                        </td>

                        <td className="py-2.5 text-slate-600 font-medium">
                          {drug.category}
                        </td>

                        <td className="py-2.5">
                          <span
                            className={`font-bold ${
                              drug.stock <=
                              drug.reorderLevel
                                ? "text-rose-600"
                                : "text-slate-800"
                            }`}
                          >
                            {drug.stock}
                          </span>

                          {drug.stock <=
                            drug.reorderLevel && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              Low
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 font-bold text-slate-900">
                          {formatCurrency(
                            drug.price
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* ADD DRUG TO STOCK MODAL                                              */}
      {/* -------------------------------------------------------------------- */}

      {isAddDrugStockModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                Add New Drug to Stock
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsAddDrugStockModalOpen(
                    false
                  )
                }
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleAddDrugStock}
              className="space-y-4 text-xs"
            >
              {/* Drug Name */}
              <div className="relative">
                <label className="block text-slate-600 font-bold mb-1">
                  Drug Name
                </label>

                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Start typing e.g. Ciprofloxacin..."
                  value={newDrugStock.name}
                  onChange={(event) =>
                    handleDrugNameChange(
                      event.target.value
                    )
                  }
                  onFocus={() =>
                    setShowDrugSuggestions(
                      true
                    )
                  }
                  onBlur={() =>
                    setTimeout(
                      () =>
                        setShowDrugSuggestions(
                          false
                        ),
                      150
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />

                {showDrugSuggestions &&
                  (isSearchingDrugs ||
                    drugSuggestions.length >
                      0) && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {isSearchingDrugs ? (
                        <p className="px-3 py-2 text-slate-400">
                          Searching...
                        </p>
                      ) : (
                        drugSuggestions.map(
                          (suggestion) => (
                            <button
                              type="button"
                              key={
                                suggestion
                              }
                              onMouseDown={(
                                event
                              ) => {
                                event.preventDefault();

                                setNewDrugStock(
                                  {
                                    ...newDrugStock,
                                    name: suggestion,
                                  }
                                );

                                setShowDrugSuggestions(
                                  false
                                );
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-purple-50 text-slate-700 border-b border-slate-50 last:border-0"
                            >
                              {suggestion}
                            </button>
                          )
                        )
                      )}
                    </div>
                  )}

                <p className="mt-1 text-[10px] text-slate-400">
                  Suggestions from the NIH
                  RxTerms drug database.
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Category
                </label>

                <select
                  value={
                    newDrugStock.category
                  }
                  onChange={(event) =>
                    setNewDrugStock({
                      ...newDrugStock,
                      category:
                        event.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                >
                  <option>
                    Antibiotics
                  </option>

                  <option>
                    Analgesics
                  </option>

                  <option>
                    Ophthalmic Drops
                  </option>

                  <option>
                    Antihistamines
                  </option>

                  <option>
                    Other
                  </option>
                </select>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Stock Qty
                  </label>

                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 50"
                    value={
                      newDrugStock.stock
                    }
                    onChange={(event) =>
                      setNewDrugStock({
                        ...newDrugStock,
                        stock:
                          event.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Reorder At
                  </label>

                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 15"
                    value={
                      newDrugStock.reorderLevel
                    }
                    onChange={(event) =>
                      setNewDrugStock({
                        ...newDrugStock,
                        reorderLevel:
                          event.target.value,
                      })
                    }
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
                    placeholder="e.g. 3500"
                    value={
                      newDrugStock.price
                    }
                    onChange={(event) =>
                      setNewDrugStock({
                        ...newDrugStock,
                        price:
                          event.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setIsAddDrugStockModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmittingDrugStock
                  }
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold transition shadow-md"
                >
                  {isSubmittingDrugStock
                    ? "Saving..."
                    : "Add to Stock"}
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />

            <p className="text-xs text-slate-500 mt-3 font-medium">
              Loading Pharmacy Console...
            </p>
          </div>
        </div>
      }
    >
      <PharmacyContent />
    </Suspense>
  );
}
