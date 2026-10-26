"use client";

import Image from "next/image";
import React, {
  useEffect,
  useState,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PatientBanner, {
  PatientBannerData,
} from "@/components/shared/PatientBanner";

import {
  Search,
  ChevronRight,
  ChevronLeft,
  Info,
  Printer,
  CheckCircle,
  Pill,
  Check,
  Syringe,
  Plus,
  X,
  UserPlus,
  LogOut,
} from "lucide-react";

import {
  getPharmacyPatient,
  getPharmacyQueue,
  createPharmacyPrescription,
  dispensePatientPrescriptions,
  markPrescriptionRequestReviewed,
  deferPrescriptionsDueToCost,
  restoreDeferredPrescriptionToBill,
  type PharmacyPatient,
  type PharmacyQueueItem,
} from "@/app/actions/pharmacy";

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
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

  /*
   * --------------------------------------------------
   * PATIENT / QUEUE STATE
   * --------------------------------------------------
   */

  const patientId = searchParams.get("patientId") || "";

  const [patient, setPatient] =
    useState<PharmacyPatient | null>(null);

  const [pharmacyQueue, setPharmacyQueue] =
    useState<PharmacyQueueItem[]>([]);

  const [queueSearch, setQueueSearch] = useState("");

  const [isLoadingPatient, setIsLoadingPatient] =
    useState(false);

  const [isLoadingQueue, setIsLoadingQueue] =
    useState(false);

  const [patientLoadError, setPatientLoadError] =
    useState<string | null>(null);

  /*
   * --------------------------------------------------
   * GENERAL STATE
   * --------------------------------------------------
   */

  const [isDispensing, setIsDispensing] =
    useState(false);

  const [dispenseSuccess, setDispenseSuccess] =
    useState(false);

  const [actionError, setActionError] =
    useState<string | null>(null);
  const [affordabilityNotice, setAffordabilityNotice] = useState<string | null>(null);
  const [selectedForDeferral, setSelectedForDeferral] = useState<Record<string, boolean>>({});
  const [isDeferring, setIsDeferring] = useState(false);

  const [administeredDrugs, setAdministeredDrugs] =
    useState<Record<string, boolean>>({});

  /*
   * --------------------------------------------------
   * ADD MEDICATION STATE
   * --------------------------------------------------
   */

  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);

  const [isAddingMedication, setIsAddingMedication] =
    useState(false);

  const [addMedicationError, setAddMedicationError] =
    useState<string | null>(null);

  const [newDrug, setNewDrug] = useState({
    drugName: "",
    dosage: "",
    quantity: "",
    unitPrice: "",
  });

  /*
   * --------------------------------------------------
   * REGISTER PATIENT STATE
   * --------------------------------------------------
   */

  const [isRegisterModalOpen, setIsRegisterModalOpen] =
    useState(false);

  const [isRegisteringPatient, setIsRegisteringPatient] =
    useState(false);

  const [registerError, setRegisterError] =
    useState<string | null>(null);

  const [newPatient, setNewPatient] = useState({
    fullName: "",
    coveragePlan: "Self-Pay",
    age: "",
    gender: "Female",
    phone: "",
    allergies: "",
  });

  /*
   * --------------------------------------------------
   * INVENTORY STATE
   * --------------------------------------------------
   */

  const [drugInventory, setDrugInventory] =
    useState<DrugStockItem[]>([]);

  const [isLoadingDrugInventory, setIsLoadingDrugInventory] =
    useState(false);

  /*
   * --------------------------------------------------
   * LOAD PATIENT
   * --------------------------------------------------
   */

  const loadPatient = async (code: string) => {
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      setPatient(null);
      setPatientLoadError(null);
      return;
    }

    setIsLoadingPatient(true);
    setPatientLoadError(null);

    try {
      const result =
        await getPharmacyPatient(normalizedCode);

      if (!result.success || !result.patient) {
        setPatient(null);
        setPatientLoadError(
          result.message ||
            "Unable to load the patient."
        );
        return;
      }

      setPatient(result.patient);
    } catch (error) {
      console.error(
        "Load pharmacy patient error:",
        error
      );

      setPatient(null);

      setPatientLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load the patient."
      );
    } finally {
      setIsLoadingPatient(false);
    }
  };

  /*
   * --------------------------------------------------
   * LOAD PHARMACY QUEUE
   * --------------------------------------------------
   */

  const loadQueue = async () => {
    setIsLoadingQueue(true);

    try {
      const result =
        await getPharmacyQueue();

      if (!result.success) {
        setPharmacyQueue([]);
        return;
      }

      setPharmacyQueue(
        result.queue ?? []
      );
    } catch (error) {
      console.error(
        "Load pharmacy queue error:",
        error
      );

      setPharmacyQueue([]);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  /*
   * --------------------------------------------------
   * INITIAL / URL-BASED DATA LOAD
   * --------------------------------------------------
   */

  useEffect(() => {
    if (patientId) {
      loadPatient(patientId);
    } else {
      setPatient(null);
      setPatientLoadError(null);
    }

    loadQueue();
  }, [patientId]);

  /*
   * --------------------------------------------------
   * RESET UI WHEN PATIENT CHANGES
   * --------------------------------------------------
   */

  useEffect(() => {
    setDispenseSuccess(false);
    setActionError(null);
    setAffordabilityNotice(null);
    setSelectedForDeferral({});
    setAdministeredDrugs({});
  }, [patientId]);

  /*
   * --------------------------------------------------
   * PATIENT BANNER
   * --------------------------------------------------
   */

  const bannerPatient: PatientBannerData | null =
  patient
    ? {
        id: patient.patientId,
        name: patient.fullName,
        age: patient.age ?? 0,
        gender: (patient.gender as "Female" | "Male" | "Other") ?? "Other",
        phone:
          patient.phone ??
          "Not provided",

        hmo: {
          name:
            patient.coveragePlan ||
            "Self-Pay",

          type:
            patient.coveragePlan
              ?.toLowerCase()
              .includes("hmo")
              ? "HMO Private"
              : "Self-Pay",

          status: "Verified",
        },

        allergies: patient.allergies
          ? patient.allergies
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : ["None"],

        currentStage: "pharmacy",

        assignedDoctor:
          "Assigned Physician",

        visitDate:
          new Date().toLocaleDateString(),
      }
    : null;

  const [selectedPrescription, setSelectedPrescription] =
    useState("");

  useEffect(() => {
    if (bannerPatient) {
      setSelectedPrescription(
        bannerPatient.name
      );
    }
  }, [bannerPatient?.name]);

  /*
   * --------------------------------------------------
   * PHARMACY QUEUES
   * --------------------------------------------------
   *
   * The READY queue now comes from Supabase.
   *
   * We don't fabricate patients here anymore.
   */

  const pharmacyOrders = pharmacyQueue.map(
    (item) => ({
      id: item.patientId,
      name: item.fullName,
      time: new Date(
        item.createdAt
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: item.status,
    })
  );

  const filteredPharmacyOrders = pharmacyOrders.filter((item) => {
    const query = queueSearch.trim().toLowerCase();
    return !query || [item.name, item.id, item.status].some((value) =>
      value.toLowerCase().includes(query)
    );
  });

  const readyOrders =
    pharmacyOrders.filter(
      (item) =>
        item.status ===
        "ready_for_dispensing"
    );

  const awaitingPaymentOrders =
    pharmacyOrders.filter(
      (item) =>
        item.status ===
        "pending_payment"
    );

  const pharmacyReviewOrders = pharmacyOrders.filter(
    (item) => item.status === "awaiting_pharmacy_review"
  );

  /*
   * Patients with the currently selected patient
   * displayed as the unfulfilled/current patient.
   *
   * The old hardcoded Amina/Jamess/etc. entries
   * have been removed.
   */

  const unfulfilledOrders = patient
    ? [
        {
          id: patient.patientId,
          name: patient.fullName,
          time: "Current",
        },
      ]
    : [];

  /*
   * --------------------------------------------------
   * ACTIVE PRESCRIPTIONS
   * --------------------------------------------------
   *
   * These come directly from the database.
   */

  const activePrescriptions: PrescriptionItem[] =
    patient?.prescriptions.map(
      (rx) => ({
        id: rx.id,
        drugName: rx.drugName,
        dosage: rx.dosage,
        quantity: Number(
          rx.quantity ?? 0
        ),
        unitPrice: Number(
          rx.pricePerUnit ?? 0
        ),
        totalPrice: Number(
          rx.totalPrice ?? 0
        ),
        status: rx.status,
      })
    ) ?? [];

  const deferredPrescriptions = activePrescriptions.filter(
    (item) => item.status === "deferred_due_to_cost"
  );

  const selectedDeferralIds = activePrescriptions
    .filter((item) => item.status === "pending_payment" && selectedForDeferral[item.id])
    .map((item) => item.id);

  const totalPrescriptionPrice =
    activePrescriptions
      .filter((item) => item.status !== "deferred_due_to_cost")
      .reduce(
        (sum, item) => sum + Number(item.totalPrice || 0),
        0
      );

  const isHMO =
    patient?.coveragePlan
      ?.toLowerCase()
      .includes("hmo") ?? false;

  const hmoCoverage =
    isHMO
      ? totalPrescriptionPrice * 0.8
      : 0;

  const coPayDue =
    totalPrescriptionPrice -
    hmoCoverage;

  /*
   * --------------------------------------------------
   * PATIENT SELECT
   * --------------------------------------------------
   */

  const handlePatientSelect = (
    id: string,
    name: string
  ) => {
    setSelectedPrescription(name);
    setDispenseSuccess(false);
    setActionError(null);

    router.push(
      `/pharmacy?patientId=${encodeURIComponent(
        id
      )}`
    );
  };

  /*
   * --------------------------------------------------
   * ADD MEDICATION
   * --------------------------------------------------
   */

  const handleAddDrug = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setAddMedicationError(null);

    const drugName =
      newDrug.drugName.trim();

    const dosage =
      newDrug.dosage.trim();

    const quantity =
      Number(newDrug.quantity);

    const unitPrice =
      Number(newDrug.unitPrice);

    if (!patientId) {
      setAddMedicationError(
        "No patient is currently selected."
      );
      return;
    }

    if (!drugName) {
      setAddMedicationError(
        "Drug name is required."
      );
      return;
    }

    if (!dosage) {
      setAddMedicationError(
        "Dosage and instructions are required."
      );
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setAddMedicationError(
        "Quantity must be a whole number greater than zero."
      );
      return;
    }

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      setAddMedicationError(
        "Please enter a valid medication price."
      );
      return;
    }
    const selectedStockItem = drugInventory.find((drug) => drug.name === drugName);
    if (!selectedStockItem || selectedStockItem.stock <= 0) {
      setAddMedicationError("Select a medication that is currently in stock.");
      return;
    }
    if (quantity > selectedStockItem.stock) {
      setAddMedicationError("Only " + selectedStockItem.stock + " unit(s) are currently in stock.");
      return;
    }

    setIsAddingMedication(true);

    try {
      const result =
        await createPharmacyPrescription({
          patientCode: patientId,
          drugName,
          dosage,
          quantity,
          pricePerUnit: Number(selectedStockItem.price),
        });

      if (!result.success) {
        throw new Error(
          result.message ||
            "Failed to add medication."
        );
      }

      setNewDrug({
        drugName: "",
        dosage: "",
        quantity: "",
        unitPrice: "",
      });

      setIsAddModalOpen(false);

      /*
       * The database is the source of truth.
       * Reload instead of maintaining a second
       * local prescription list.
       */

      await loadPatient(patientId);
      await loadQueue();

      setActionError(null);
    } catch (error) {
      console.error(
        "Add medication error:",
        error
      );

      setAddMedicationError(
        error instanceof Error
          ? error.message
          : "Failed to add medication."
      );
    } finally {
      setIsAddingMedication(false);
    }
  };

  const handleMarkRequestReviewed = async (prescriptionId: string) => {
    setActionError(null);
    try {
      const result = await markPrescriptionRequestReviewed(prescriptionId);
      if (!result.success) throw new Error(result.message);
      if (patientId) await loadPatient(patientId);
      await loadQueue();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update the prescription request.");
    }
  };

  const handleDeferUnaffordable = async () => {
    if (!patientId || selectedDeferralIds.length === 0) {
      setActionError("Select the unpaid medication(s) the patient cannot afford.");
      return;
    }
    setIsDeferring(true);
    setActionError(null);
    setAffordabilityNotice(null);
    try {
      const result = await deferPrescriptionsDueToCost(patientId, selectedDeferralIds);
      if (!result.success) throw new Error(result.message);
      setAffordabilityNotice(result.message);
      setSelectedForDeferral({});
      await loadPatient(patientId);
      await loadQueue();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to defer the selected medication.");
    } finally {
      setIsDeferring(false);
    }
  };

  const handleRestoreDeferred = async (prescriptionId: string) => {
    setActionError(null);
    setAffordabilityNotice(null);
    try {
      const result = await restoreDeferredPrescriptionToBill(prescriptionId);
      if (!result.success) throw new Error(result.message);
      setAffordabilityNotice(result.message);
      await loadPatient(patientId);
      await loadQueue();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to restore the medication.");
    }
  };

  /*
   * --------------------------------------------------
   * DISPENSE
   * --------------------------------------------------
   */

  const handleDispense =
    async () => {
      if (!patientId) {
        setActionError(
          "No patient is currently selected."
        );
        return;
      }

      const readyPrescriptions =
        activePrescriptions.filter(
          (rx) =>
            rx.status ===
            "ready_for_dispensing"
        );

      if (readyPrescriptions.length === 0) {
        setActionError(
          activePrescriptions.some(
            (rx) =>
              rx.status ===
              "pending_payment"
          )
            ? "This medication is waiting for Cashier payment before it can be dispensed."
            : "No prescription is ready for dispensing."
        );
        return;
      }

      setActionError(null);
      setDispenseSuccess(false);
      setIsDispensing(true);

      try {
        const result =
          await dispensePatientPrescriptions(
            patientId
          );

        if (!result.success) {
          throw new Error(
            result.message ||
              "Failed to dispense prescription."
          );
        }

        setDispenseSuccess(true);

        await loadPatient(patientId);
        await loadQueue();
      } catch (error) {
        console.error(
          "Dispensing error:",
          error
        );

        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to dispense prescription."
        );
      } finally {
        setIsDispensing(false);
      }
    };

  /*
   * --------------------------------------------------
   * ADMINISTRATION
   * --------------------------------------------------
   */

  const toggleAdminister = (
    drugId: string
  ) => {
    setAdministeredDrugs(
      (previous) => ({
        ...previous,
        [drugId]:
          !previous[drugId],
      })
    );
  };

  /*
   * --------------------------------------------------
   * PRINT
   * --------------------------------------------------
   */

  const handlePrintLabel = () => {
    if (
      typeof window !==
      "undefined"
    ) {
      window.print();
    }
  };

  /*
   * --------------------------------------------------
   * REGISTER PATIENT
   * --------------------------------------------------
   */

  const handleRegisterPatient =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      setRegisterError(null);

      if (
        !newPatient.fullName.trim()
      ) {
        setRegisterError(
          "Full name is required."
        );
        return;
      }

      setIsRegisteringPatient(true);

      try {
        const response =
          await fetch(
            "/api/patients",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                fullName:
                  newPatient.fullName.trim(),

                coveragePlan:
                  newPatient.coveragePlan,

                age: newPatient.age
                  ? Number(
                      newPatient.age
                    )
                  : undefined,

                gender:
                  newPatient.gender,

                phone:
                  newPatient.phone.trim() ||
                  undefined,

                allergies:
                  newPatient.allergies.trim() ||
                  undefined,
              }),
            }
          );

        if (!response.ok) {
          const body =
            await response
              .json()
              .catch(
                () => ({})
              );

          throw new Error(
            body.error ||
              "Failed to register patient."
          );
        }

        const {
          patient: created,
        } =
          await response.json();

        if (!created?.patientId) {
          throw new Error(
            "Patient was created but no patient ID was returned."
          );
        }

        setIsRegisterModalOpen(
          false
        );

        setNewPatient({
          fullName: "",
          coveragePlan:
            "Self-Pay",
          age: "",
          gender: "Female",
          phone: "",
          allergies: "",
        });

        /*
         * Open the newly created patient's
         * real pharmacy record.
         */

        handlePatientSelect(
          created.patientId,
          created.fullName
        );
      } catch (error) {
        console.error(
          "Register patient error:",
          error
        );

        setRegisterError(
          error instanceof Error
            ? error.message
            : "Failed to register patient."
        );
      } finally {
        setIsRegisteringPatient(
          false
        );
      }
    };

  /*
   * --------------------------------------------------
   * INVENTORY
   * --------------------------------------------------
   */

  const loadDrugInventory =
    async () => {
      setIsLoadingDrugInventory(
        true
      );

      try {
        const response =
          await fetch(
            "/api/inventory?domain=pharmacy"
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load drug inventory."
          );
        }

        const {
          items,
        } =
          await response.json();

        setDrugInventory(
          items || []
        );
      } catch (error) {
        console.error(
          "Inventory load error:",
          error
        );

        setDrugInventory([]);
      } finally {
        setIsLoadingDrugInventory(
          false
        );
      }
    };

  /*
   * --------------------------------------------------
   * LOGOUT
   * --------------------------------------------------
   */

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        console.error("Logout request failed:", response.status);
      }
    } catch (error) {
      console.error("Logout request error:", error);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
      }
    }
  };

  /*
   * --------------------------------------------------
   * LOADING STATE
   * --------------------------------------------------
   */

  if (
    patientId &&
    isLoadingPatient
  ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm font-bold text-slate-700">
            Loading patient...
          </p>

          <p className="text-xs text-slate-400 mt-1">
            Fetching pharmacy records
          </p>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * PATIENT ERROR
   * --------------------------------------------------
   */

  if (
    patientId &&
    patientLoadError
  ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Info className="w-6 h-6" />
          </div>

          <h2 className="font-extrabold text-slate-900">
            Patient not found
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            {patientLoadError}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/pharmacy"
              )
            }
            className="mt-5 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold"
          >
            Back to Pharmacy
          </button>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * EMPTY STATE
   * --------------------------------------------------
   */

  if (!patient) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex text-slate-800 font-sans antialiased">
        <aside className="w-64 bg-[#0B132B] text-white flex flex-col shrink-0 border-r border-slate-800 print:hidden">
          <div className="p-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <Image src="/Logo.png" alt="Sparkle Eye Specialist Hospital Logo" width={36} height={36} className="object-contain" priority />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-white leading-tight">Sparkle Eye</h1>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Pharmacy workspace</p>
              </div>
            </div>
          </div>
          <nav aria-label="Pharmacy navigation" className="flex-1 p-3 space-y-2">
            <button type="button" onClick={() => router.push("/pharmacy")} className="w-full flex items-center gap-3 rounded-xl bg-slate-800 px-3 py-3 text-sm font-bold text-white">
              <Pill className="h-4 w-4 text-violet-300" />
              Dashboard & queue
            </button>
            <button type="button" onClick={() => setIsRegisterModalOpen(true)} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800/70 hover:text-white">
              <UserPlus className="h-4 w-4" />
              Register patient
            </button>
          </nav>
          <div className="border-t border-slate-800 p-3">
            <button type="button" onClick={() => void handleLogout()} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800/70 hover:text-rose-300" aria-label="Log out of the pharmacy module">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>
                Dispensing Queue
              </span>

              <span>›</span>

              <span className="text-slate-900 font-bold">
                Pharmacy
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span>Terminal active — Gate 4</span>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-rose-600"
                aria-label="Log out of the pharmacy module"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Pharmacy overview</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Prescription queue</h2>
                  <p className="mt-1 text-sm text-slate-500">Find a patient and open their prescription to review or dispense.</p>
                </div>
                <button type="button" onClick={() => void loadQueue()} disabled={isLoadingQueue} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                  <Search className="h-4 w-4" />
                  {isLoadingQueue ? "Refreshing…" : "Refresh queue"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Needs pharmacy review</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{isLoadingQueue ? "—" : pharmacyReviewOrders.length}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Awaiting payment</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{isLoadingQueue ? "—" : awaitingPaymentOrders.length}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Ready for dispensing</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{isLoadingQueue ? "—" : readyOrders.length}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Active queue</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{isLoadingQueue ? "—" : pharmacyOrders.length}</p></div>
              </div>
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4 sm:p-5">
                  <label htmlFor="pharmacy-queue-search" className="mb-2 block text-sm font-bold text-slate-700">Search queue</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="pharmacy-queue-search" type="search" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Search patient name, patient code or status…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-bold">Patient</th><th className="px-5 py-3 font-bold">Patient code</th><th className="px-5 py-3 font-bold">Received</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 text-right font-bold">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingQueue ? (
                        <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Loading pharmacy queue…</td></tr>
                      ) : filteredPharmacyOrders.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">{queueSearch.trim() ? "No queue entries match your search." : "No active prescriptions in the queue right now."}</td></tr>
                      ) : filteredPharmacyOrders.map((item) => (
                        <tr key={`${item.id}-${item.status}`} className="transition hover:bg-violet-50/40">
                          <td className="px-5 py-4"><p className="font-bold text-slate-900">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">Prescription record</p></td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-600">{item.id}</td>
                          <td className="px-5 py-4 text-slate-600">{item.time}</td>
                          <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "ready_for_dispensing" ? "bg-emerald-50 text-emerald-700" : item.status === "pending_payment" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"}`}>{item.status.replaceAll("_", " ")}</span></td>
                          <td className="px-5 py-4 text-right"><button type="button" onClick={() => handlePatientSelect(item.id, item.name)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700">Open <ChevronRight className="h-3.5 w-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </main>
        </div>

        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-600" />
                  Register New Patient
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setIsRegisterModalOpen(
                      false
                    )
                  }
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={
                  handleRegisterPatient
                }
                className="space-y-4 text-xs pt-4"
              >
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Full Name
                  </label>

                  <input
                    type="text"
                    required
                    value={
                      newPatient.fullName
                    }
                    onChange={(e) =>
                      setNewPatient(
                        (previous) => ({
                          ...previous,
                          fullName:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
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
                      value={
                        newPatient.age
                      }
                      onChange={(e) =>
                        setNewPatient(
                          (previous) => ({
                            ...previous,
                            age:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      Gender
                    </label>

                    <select
                      value={
                        newPatient.gender
                      }
                      onChange={(e) =>
                        setNewPatient(
                          (previous) => ({
                            ...previous,
                            gender:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    >
                      <option>
                        Female
                      </option>
                      <option>
                        Male
                      </option>
                      <option>
                        Other
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    value={
                      newPatient.phone
                    }
                    onChange={(e) =>
                      setNewPatient(
                        (previous) => ({
                          ...previous,
                          phone:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Coverage Plan
                  </label>

                  <input
                    type="text"
                    value={
                      newPatient.coveragePlan
                    }
                    onChange={(e) =>
                      setNewPatient(
                        (previous) => ({
                          ...previous,
                          coveragePlan:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Known Allergies
                  </label>

                  <input
                    type="text"
                    value={
                      newPatient.allergies
                    }
                    onChange={(e) =>
                      setNewPatient(
                        (previous) => ({
                          ...previous,
                          allergies:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                {registerError && (
                  <p className="text-red-600 font-bold">
                    {registerError}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      setIsRegisterModalOpen(
                        false
                      )
                    }
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isRegisteringPatient
                    }
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold"
                  >
                    {isRegisteringPatient
                      ? "Registering..."
                      : "Register Patient"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        </div>
    );
  }

  /*
   * --------------------------------------------------
   * MAIN PHARMACY UI
   * --------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex text-slate-800 font-sans antialiased">

      {/* SIDEBAR */}

        <aside className="w-64 bg-[#0B132B] text-white flex flex-col shrink-0 border-r border-slate-800 print:hidden">
          <div className="p-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <Image src="/Logo.png" alt="Sparkle Eye Specialist Hospital Logo" width={36} height={36} className="object-contain" priority />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-white leading-tight">Sparkle Eye</h1>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Pharmacy workspace</p>
              </div>
            </div>
          </div>
          <nav aria-label="Pharmacy navigation" className="flex-1 p-3 space-y-2">
            <button type="button" onClick={() => router.push("/pharmacy")} className="w-full flex items-center gap-3 rounded-xl bg-slate-800 px-3 py-3 text-sm font-bold text-white">
              <Pill className="h-4 w-4 text-violet-300" />
              Dashboard & queue
            </button>
<button type="button" onClick={() => setIsRegisterModalOpen(true)} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800/70 hover:text-white">
              <UserPlus className="h-4 w-4" />
              Register patient
            </button>
          </nav>
          <div className="border-t border-slate-800 p-3">
            <button type="button" onClick={() => void handleLogout()} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800/70 hover:text-rose-300" aria-label="Log out of the pharmacy module">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

      {/* MAIN */}

      <div className="flex-1 flex flex-col min-w-0">

        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between print:hidden">

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            {patientId && (
              <button
                type="button"
                onClick={() => router.push("/pharmacy")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                aria-label="Back to pharmacy queue"
                title="Back to pharmacy queue"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <span>Dispensing Queue</span>
            <span>›</span>
            <span className="text-slate-900 font-bold">
              {patientId ? "Order Detail" : "Queue"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Terminal active — Gate 4</span>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-rose-600"
              aria-label="Log out of the pharmacy module"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>

        </header>

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">

          {bannerPatient && (
            <PatientBanner
              patient={bannerPatient}
              activeModule="pharmacy"
            />
          )}

          {actionError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 font-medium">
              {actionError}
            </div>
          )}
          {affordabilityNotice && (
            <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
              {affordabilityNotice}
            </div>
          )}

          {dispenseSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-emerald-900">

              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <Check className="w-4 h-4" />
              </div>

              <div>

                <strong className="font-bold block">
                  Prescription Dispensed
                </strong>

                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  Medication has been dispensed
                  and the pharmacy record has been
                  updated.
                </p>

              </div>

            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">

            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">

              <div>

                <div className="flex items-center gap-3 flex-wrap">

                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {selectedPrescription ||
                      patient.fullName}
                  </h1>

                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {patient.age ?? "—"}Y /{" "}
                    {patient.gender
                      ? patient.gender[0]
                      : "—"}
                  </span>

                  <span className="text-xs font-mono text-slate-400">
                    MRN #{patient.patientId}
                  </span>

                </div>

              </div>

              <div className="flex items-center gap-3">

                <button
                  type="button"
                  onClick={() => {
                    setAddMedicationError(null);
                    setIsAddModalOpen(true);
                    loadDrugInventory();
                  }}
                  className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Medication
                </button>

                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold capitalize border ${
                    dispenseSuccess
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {dispenseSuccess
                    ? "Dispensed"
                    : activePrescriptions.some(
                        (rx) =>
                          rx.status ===
                          "ready_for_dispensing"
                      )
                      ? "Ready for Dispensing"
                      : activePrescriptions.some(
                          (rx) =>
                            rx.status ===
                            "pending_payment"
                        )
                        ? "Awaiting Cashier Payment"
                        : activePrescriptions.length > 0
                          ? "Prescription Pending"
                          : "No Prescription"}
                </span>

              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

              <div>

                <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                  PRESCRIBING PHYSICIAN
                </span>

                <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                  Assigned Physician —
                  Ophthalmology
                </strong>

              </div>

              <div className="md:text-right">

                <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                  PATIENT RECORD
                </span>

                <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {patient.patientId}
                </strong>

              </div>

            </div>

            <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5 flex items-center gap-2 text-xs">

              <span className="text-slate-400 font-bold uppercase text-[10px]">
                PHARMACY RECORD:
              </span>

              <strong className="font-bold text-slate-800">
                {activePrescriptions.length > 0
                  ? `${activePrescriptions.length} medication${
                      activePrescriptions.length ===
                      1
                        ? ""
                        : "s"
                    } on prescription`
                  : "No medication prescribed yet"}
              </strong>

            </div>

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
                    <th className="pb-3">
                      AFFORDABILITY
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">

                  {activePrescriptions.length >
                  0 ? (
                    activePrescriptions.map(
                      (rx) => {

                        const isAdministered =
                          administeredDrugs[
                            rx.id
                          ];

                        const isDispensed =
                          rx.status ===
                            "dispensed" ||
                          dispenseSuccess;

                        return (
                          <tr
                            key={
                              rx.id
                            }
                          >

                            <td className="py-3.5">

                              <strong className="font-bold text-slate-900 block">
                                {
                                  rx.drugName
                                }
                              </strong>

                            </td>

                            <td className="py-3.5">
                              {
                                rx.dosage
                              }
                            </td>

                            <td className="py-3.5 font-bold text-slate-900">
                              {
                                rx.quantity
                              }
                            </td>

                            <td className="py-3.5 font-bold text-slate-900">
                              {rx.status === "awaiting_pharmacy_review" ? (
                                <span className="text-violet-700">To be confirmed</span>
                              ) : (
                                <>₦{Number(rx.totalPrice).toLocaleString()}</>
                              )}
                            </td>

                            <td className="py-3.5">

                              <button
                                type="button"
                                disabled={rx.status !== "ready_for_dispensing"}
                                onClick={() => toggleAdminister(rx.id)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
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

                              {rx.status === "awaiting_pharmacy_review" ? (
                                <button type="button" onClick={() => handleMarkRequestReviewed(rx.id)} className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 font-bold text-[10px] uppercase text-violet-700 hover:bg-violet-100">
                                  Mark Reviewed
                                </button>
                              ) : (
                                <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase border ${
                                  isDispensed
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : rx.status === "ready_for_dispensing"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : rx.status === "deferred_due_to_cost"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {isDispensed ? "dispensed" : rx.status.replace(/_/g, " ")}
                                </span>
                              )}

                            </td>

                            <td className="py-3.5">
                              {rx.status === "pending_payment" ? (
                                <label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(selectedForDeferral[rx.id])}
                                    onChange={(event) => setSelectedForDeferral((current) => ({ ...current, [rx.id]: event.target.checked }))}
                                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  Defer
                                </label>
                              ) : rx.status === "deferred_due_to_cost" ? (
                                <button type="button" onClick={() => void handleRestoreDeferred(rx.id)} className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-[10px] font-bold text-purple-700 hover:bg-purple-100">
                                  Restore to bill
                                </button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                          </tr>
                        );
                      }
                    )
                  ) : (
                    <tr>

                      <td
                        colSpan={
                          7
                        }
                        className="py-6 text-center text-slate-400"
                      >
                        No medications
                        prescribed yet.
                      </td>

                    </tr>
                  )}

                </tbody>

              </table>
            </div>

            {selectedDeferralIds.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
                <div>
                  <p className="text-xs font-extrabold text-amber-900">Patient cannot afford all prescribed medicines?</p>
                  <p className="mt-1 text-[11px] text-amber-800">Defer selected unpaid items. They will not be billed or dispensed until restored and paid.</p>
                </div>
                <button type="button" disabled={isDeferring} onClick={() => void handleDeferUnaffordable()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-60">
                  {isDeferring ? "Updating bill…" : `Defer ${selectedDeferralIds.length} item(s)`}
                </button>
              </div>
            )}
            {deferredPrescriptions.length > 0 && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                <p className="text-xs font-extrabold text-rose-900">Deferred due to cost ({deferredPrescriptions.length})</p>
                <p className="mt-1 text-[11px] text-rose-800">These medicines remain in the prescription record and are not included in the current bill or dispensing queue.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {deferredPrescriptions.map((rx) => (
                    <span key={rx.id} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700">
                      {rx.drugName}
                      <button type="button" onClick={() => void handleRestoreDeferred(rx.id)} className="font-extrabold text-purple-700 hover:text-purple-900">Restore to bill</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-900 print:hidden">

              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />

              <div>

                <strong className="font-bold block">
                  Pharmacy Workflow
                </strong>

                <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                  Medication added here is saved
                  to the patient&apos;s real prescription
                  record and added to billing.
                  Dispensing deducts pharmacy stock.
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

            <div className="flex items-center gap-3 mt-0.5 flex-wrap">

              <span className="text-xl font-extrabold text-slate-900">
                ₦
                {totalPrescriptionPrice.toLocaleString()}
              </span>

              {isHMO ? (
                <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold">
                  {patient.coveragePlan} —
                  Covers 80%
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                  Private Cash
                </span>
              )}

              <span className="text-xs text-slate-600 font-medium">
                CO-PAY DUE AT CASHIER:{" "}
                <strong className="font-extrabold text-purple-700">
                  ₦
                  {coPayDue.toLocaleString()}
                </strong>
              </span>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={
                handlePrintLabel
              }
              type="button"
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print Label
            </button>

            <button
              onClick={
                handleDispense
              }
              disabled={
                isDispensing ||
                dispenseSuccess ||
                !activePrescriptions.some(
                  (rx) =>
                    rx.status ===
                    "ready_for_dispensing"
                )
              }
              type="button"
              className={`px-5 py-2.5 font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 ${
                dispenseSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
              ) : activePrescriptions.some(
                  (rx) =>
                    rx.status ===
                    "pending_payment"
                ) ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Awaiting Cashier Payment
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Dispense Medication
                </>
              )}

            </button>

          </div>

        </footer>

      </div>

      {/* ADD MEDICATION MODAL */}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">

              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-600" />
                Add New Medication
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsAddModalOpen(
                    false
                  )
                }
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <form
              onSubmit={
                handleAddDrug
              }
              className="space-y-4 text-xs pt-4"
            >

              <div>

                <label className="block text-slate-600 font-bold mb-1">
                  Drug Name
                </label>

                <select
                  required
                  value={newDrug.drugName}
                  onChange={(e) => {
                    const selected = drugInventory.find((drug) => drug.name === e.target.value);
                    setNewDrug((previous) => ({
                      ...previous,
                      drugName: selected?.name ?? "",
                      unitPrice: selected ? String(selected.price) : "",
                    }));
                  }}
                  disabled={isLoadingDrugInventory || drugInventory.filter((drug) => drug.stock > 0).length === 0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600 disabled:opacity-60"
                >
                  <option value="">{isLoadingDrugInventory ? "Loading stock..." : "Select medication from available stock"}</option>
                  {drugInventory.filter((drug) => drug.stock > 0).map((drug) => (
                    <option key={drug.id} value={drug.name}>
                      {drug.name} — {drug.stock} in stock — ₦{Number(drug.price).toLocaleString()}
                    </option>
                  ))}
                </select>
                {drugInventory.filter((drug) => drug.stock > 0).length === 0 && !isLoadingDrugInventory && (
                  <p className="mt-1 text-[10px] text-rose-600">No medication is currently in stock. Add or replenish stock before creating a billable prescription.</p>
                )}

              </div>

              <div>

                <label className="block text-slate-600 font-bold mb-1">
                  Dosage & Instruction
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. 1 drop OS qid for 7 days"
                  value={
                    newDrug.dosage
                  }
                  onChange={(e) =>
                    setNewDrug(
                      (previous) => ({
                        ...previous,
                        dosage:
                          e.target.value,
                      })
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                />

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-slate-600 font-bold mb-1">
                    Quantity
                  </label>

                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="e.g. 1"
                    value={
                      newDrug.quantity
                    }
                    onChange={(e) =>
                      setNewDrug(
                        (previous) => ({
                          ...previous,
                          quantity:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />

                </div>

                <div>

                  <label className="block text-slate-600 font-bold mb-1">
                    Price Per Unit (₦)
                  </label>

                  <input
                    type="number"
                    min="0"
                    readOnly
                    value={newDrug.unitPrice}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Price is taken from the selected stock item.</p>

                </div>

              </div>

              {addMedicationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 font-medium">
                  {addMedicationError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() =>
                    setIsAddModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isAddingMedication
                  }
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold shadow-md"
                >
                  {isAddingMedication
                    ? "Adding..."
                    : "Add to Prescription"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* REGISTER PATIENT MODAL */}

      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">

              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
                Register New Patient
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsRegisterModalOpen(
                    false
                  )
                }
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <form
              onSubmit={
                handleRegisterPatient
              }
              className="space-y-4 text-xs pt-4"
            >

              <div>

                <label className="block text-slate-600 font-bold mb-1">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Ngozi Umeh"
                  value={
                    newPatient.fullName
                  }
                  onChange={(e) =>
                    setNewPatient(
                      (previous) => ({
                        ...previous,
                        fullName:
                          e.target.value,
                      })
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
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
                    value={
                      newPatient.age
                    }
                    onChange={(e) =>
                      setNewPatient(
                        (previous) => ({
                          ...previous,
                          age:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />

                </div>

                <div>

                  <label className="block text-slate-600 font-bold mb-1">
                    Gender
                  </label>

                  <select
                    value={
                      newPatient.gender
                    }
                    onChange={(e) =>
                      setNewPatient(
                        (previous) => ({
                          ...previous,
                          gender:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <option>
                      Female
                    </option>

                    <option>
                      Male
                    </option>

                    <option>
                      Other
                    </option>
                  </select>

                </div>

              </div>

              <div>

                <label className="block text-slate-600 font-bold mb-1">
                  Phone Number
                </label>

                <input
                  type="tel"
                  placeholder="+234 803 000 0000"
                  value={
                    newPatient.phone
                  }
                  onChange={(e) =>
                    setNewPatient(
                      (previous) => ({
                        ...previous,
                        phone:
                          e.target.value,
                      })
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />

              </div>

              <div>

                <label className="block text-slate-600 font-bold mb-1">
                  Coverage Plan
                </label>

                <input
                  type="text"
                  value={
                    newPatient.coveragePlan
                  }
                  onChange={(e) =>
                    setNewPatient(
                      (previous) => ({
                        ...previous,
                        coveragePlan:
                          e.target.value,
                      })
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />

              </div>

              <div>

                <label className="block text-slate-600 font-bold mb-1">
                  Known Allergies
                </label>

                <input
                  type="text"
                  placeholder="e.g. Penicillin"
                  value={
                    newPatient.allergies
                  }
                  onChange={(e) =>
                    setNewPatient(
                      (previous) => ({
                        ...previous,
                        allergies:
                          e.target.value,
                      })
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />

              </div>

              {registerError && (
                <p className="text-red-600 font-bold">
                  {registerError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() =>
                    setIsRegisterModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isRegisteringPatient
                  }
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold"
                >
                  {isRegisteringPatient
                    ? "Registering..."
                    : "Register Patient"}
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
        <div className="p-6 text-xs text-slate-500">
          Loading Pharmacy Console...
        </div>
      }
    >
      <PharmacyContent />
    </Suspense>
  );
}         