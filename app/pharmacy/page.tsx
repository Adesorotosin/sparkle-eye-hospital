"use client";

import Image from "next/image";
import React, {
  useEffect,
  useRef,
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
  createPharmacyPrescription,
  dispensePatientPrescriptions,
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

  const [isDrugInventoryOpen, setIsDrugInventoryOpen] =
    useState(false);

  const [drugInventory, setDrugInventory] =
    useState<DrugStockItem[]>([]);

  const [isLoadingDrugInventory, setIsLoadingDrugInventory] =
    useState(false);

  const [isAddDrugStockModalOpen, setIsAddDrugStockModalOpen] =
    useState(false);

  const [isSubmittingDrugStock, setIsSubmittingDrugStock] =
    useState(false);

  const [newDrugStock, setNewDrugStock] = useState({
    name: "",
    category: "Antibiotics",
    stock: "",
    reorderLevel: "",
    price: "",
  });

  const [drugSuggestions, setDrugSuggestions] =
    useState<string[]>([]);

  const [showDrugSuggestions, setShowDrugSuggestions] =
    useState(false);

  const [isSearchingDrugs, setIsSearchingDrugs] =
    useState(false);

  const drugSearchTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setAdministeredDrugs({});
  }, [patientId]);

  /*
   * --------------------------------------------------
   * PATIENT BANNER
   * --------------------------------------------------
   */

  const validGender = (g?: string): "Female" | "Male" | "Other" => {
  if (g === "Female" || g === "Male" || g === "Other") return g;
  return "Female"; // Default fallback matching PatientBannerData
};

const bannerPatient: PatientBannerData | null =
  patient
    ? {
        id: patient.patientId,
        name: patient.fullName,
        age: patient.age ?? 0,
        gender: validGender(patient.gender),
        phone: patient.phone ?? "Not provided",

        hmo: {
          name: patient.coveragePlan || "Self-Pay",
          type: patient.coveragePlan
            ?.toLowerCase()
            .includes("hmo")
            ? "HMO Private"
            : "Self-Pay",
          status: "Verified",
        },

        allergies: patient.allergies
          ? patient.allergies
              .split(",")
              .map((item: string) => item.trim())
              .filter(Boolean)
          : ["None"],

        currentStage: "pharmacy",

        assignedDoctor: "Assigned Physician",

        visitDate: new Date().toLocaleDateString(),
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

  const readyOrders = pharmacyQueue.map(
    (item) => ({
      id: item.patientId,
      name: item.fullName,
      time: new Date(
        item.createdAt
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })
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

  const totalPrescriptionPrice =
    activePrescriptions.reduce(
      (sum, item) =>
        sum +
        Number(item.totalPrice || 0),
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

    setIsAddingMedication(true);

    try {
      const result =
        await createPharmacyPrescription({
          patientCode: patientId,
          drugName,
          dosage,
          quantity,
          pricePerUnit: unitPrice,
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

  /*
   * --------------------------------------------------
   * DISPENSE
   * --------------------------------------------------
   */

  const handleDispenseAndSend =
    async () => {
      if (!patientId) {
        setActionError(
          "No patient is currently selected."
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

        /*
         * Reload from Supabase so the displayed
         * status is the actual database status.
         */

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
   * DRUG SEARCH
   * --------------------------------------------------
   */

  const handleDrugNameChange = (
    value: string
  ) => {
    setNewDrugStock(
      (previous) => ({
        ...previous,
        name: value,
      })
    );

    setShowDrugSuggestions(true);

    if (drugSearchTimer.current) {
      clearTimeout(
        drugSearchTimer.current
      );
    }

    if (
      value.trim().length < 2
    ) {
      setDrugSuggestions([]);
      return;
    }

    drugSearchTimer.current =
      setTimeout(
        async () => {
          setIsSearchingDrugs(
            true
          );

          try {
            const response =
              await fetch(
                `/api/drug-search?q=${encodeURIComponent(
                  value
                )}`
              );

            if (!response.ok) {
              throw new Error(
                "Drug search failed."
              );
            }

            const data =
              await response.json();

            setDrugSuggestions(
              data.suggestions || []
            );
          } catch (error) {
            console.error(
              "Drug search error:",
              error
            );

            setDrugSuggestions([]);
          } finally {
            setIsSearchingDrugs(
              false
            );
          }
        },
        300
      );
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

  const handleOpenDrugInventory =
    () => {
      setIsDrugInventoryOpen(true);
      loadDrugInventory();
    };

  const handleAddDrugStock =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (
        !newDrugStock.name.trim() ||
        !newDrugStock.stock ||
        !newDrugStock.price
      ) {
        return;
      }

      const stock =
        Number(
          newDrugStock.stock
        );

      const reorderLevel =
        newDrugStock.reorderLevel
          ? Number(
              newDrugStock.reorderLevel
            )
          : 5;

      const price =
        Number(
          newDrugStock.price
        );

      if (
        !Number.isFinite(stock) ||
        stock < 0
      ) {
        alert(
          "Please enter a valid stock quantity."
        );
        return;
      }

      if (
        !Number.isFinite(
          reorderLevel
        ) ||
        reorderLevel < 0
      ) {
        alert(
          "Please enter a valid reorder level."
        );
        return;
      }

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        alert(
          "Please enter a valid price."
        );
        return;
      }

      setIsSubmittingDrugStock(
        true
      );

      try {
        const response =
          await fetch(
            "/api/inventory",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                name:
                  newDrugStock.name.trim(),

                category:
                  newDrugStock.category,

                stock,

                reorderLevel,

                price,

                domain:
                  "pharmacy",
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
              "Failed to add drug."
          );
        }

        const {
          item,
        } =
          await response.json();

        setDrugInventory(
          (previous) => [
            item,
            ...previous,
          ]
        );

        setNewDrugStock({
          name: "",
          category:
            "Antibiotics",
          stock: "",
          reorderLevel: "",
          price: "",
        });

        setDrugSuggestions([]);
        setShowDrugSuggestions(false);

        setIsAddDrugStockModalOpen(
          false
        );
      } catch (error) {
        console.error(
          "Add drug stock error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to add drug."
        );
      } finally {
        setIsSubmittingDrugStock(
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
      if (
        typeof window !==
        "undefined"
      ) {
        localStorage.clear();
        sessionStorage.clear();
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
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
                onClick={() =>
                  setIsRegisterModalOpen(
                    true
                  )
                }
                className="px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register Patient
              </button>

              <button
                type="button"
                onClick={
                  handleOpenDrugInventory
                }
                className="px-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Boxes className="w-3.5 h-3.5" />
                Drug Stock
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />

              <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                READY FOR PICKUP (
                {isLoadingQueue
                  ? "..."
                  : readyOrders.length}
                )
              </h2>
            </div>

            {readyOrders.length === 0 ? (
              <p className="px-2 py-4 text-xs text-slate-500">
                No prescriptions are ready
                for pickup.
              </p>
            ) : (
              <div className="space-y-1">
                {readyOrders.map(
                  (item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handlePatientSelect(
                          item.id,
                          item.name
                        )
                      }
                      className="w-full text-left p-3 rounded-xl text-slate-300 hover:bg-slate-800/50 transition flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-xs font-bold block">
                          {item.name}
                        </strong>

                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          Received:{" "}
                          {item.time}
                        </span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  )
                )}
              </div>
            )}
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

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>
                Terminal active — Gate 4
              </span>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-5">
                <Pill className="w-7 h-7" />
              </div>

              <h2 className="text-xl font-extrabold text-slate-900">
                Select a patient
              </h2>

              <p className="text-sm text-slate-500 mt-2">
                Select a patient from the pharmacy
                queue or register a new patient to
                begin dispensing.
              </p>
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

        {isDrugInventoryOpen && (
          <DrugInventoryModal
            drugInventory={
              drugInventory
            }
            isLoading={
              isLoadingDrugInventory
            }
            onClose={() =>
              setIsDrugInventoryOpen(
                false
              )
            }
            onAddDrug={() =>
              setIsAddDrugStockModalOpen(
                true
              )
            }
          />
        )}

        {isAddDrugStockModalOpen && (
          <AddDrugStockModal
            newDrugStock={
              newDrugStock
            }
            setNewDrugStock={
              setNewDrugStock
            }
            drugSuggestions={
              drugSuggestions
            }
            showDrugSuggestions={
              showDrugSuggestions
            }
            setShowDrugSuggestions={
              setShowDrugSuggestions
            }
            isSearchingDrugs={
              isSearchingDrugs
            }
            isSubmitting={
              isSubmittingDrugStock
            }
            onDrugNameChange={
              handleDrugNameChange
            }
            onSubmit={
              handleAddDrugStock
            }
            onClose={() =>
              setIsAddDrugStockModalOpen(
                false
              )
            }
          />
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
              onClick={() =>
                setIsRegisterModalOpen(
                  true
                )
              }
              className="px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register Patient
            </button>

            <button
              type="button"
              onClick={
                handleOpenDrugInventory
              }
              className="px-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Boxes className="w-3.5 h-3.5" />
              Drug Stock
            </button>

          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">

          <div>

            <div className="flex items-center gap-2 px-2 mb-2">

              <span className="w-2 h-2 rounded-full bg-rose-500" />

              <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                UNFULFILLED (
                {unfulfilledOrders.length}
                )
              </h2>

            </div>

            <div className="space-y-1">

              {unfulfilledOrders.map(
                (item) => {

                  const isSelected =
                    selectedPrescription ===
                    item.name;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handlePatientSelect(
                          item.id,
                          item.name
                        )
                      }
                      className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                        isSelected
                          ? "bg-slate-800 text-white border border-slate-700"
                          : "text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <div>

                        <strong className="text-xs font-bold block">
                          {item.name}
                        </strong>

                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          Received:{" "}
                          {item.time}
                        </span>

                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-500" />

                    </button>
                  );
                }
              )}

            </div>

          </div>

          <div>

            <div className="flex items-center gap-2 px-2 mb-2">

              <span className="w-2 h-2 rounded-full bg-emerald-500" />

              <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                READY FOR PICKUP (
                {isLoadingQueue
                  ? "..."
                  : readyOrders.length}
                )
              </h2>

            </div>

            <div className="space-y-1">

              {readyOrders.length === 0 ? (
                <p className="px-2 py-3 text-[10px] text-slate-500">
                  No prescriptions ready
                  for pickup.
                </p>
              ) : (
                readyOrders.map(
                  (item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handlePatientSelect(
                          item.id,
                          item.name
                        )
                      }
                      className="w-full text-left p-3 rounded-xl text-slate-300 hover:bg-slate-800/50 transition flex items-center justify-between"
                    >

                      <div>

                        <strong className="text-xs font-bold block">
                          {item.name}
                        </strong>

                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          Received:{" "}
                          {item.time}
                        </span>

                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-500" />

                    </button>
                  )
                )
              )}

            </div>

          </div>

        </div>

      </aside>

      {/* MAIN */}

      <div className="flex-1 flex flex-col min-w-0">

        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between print:hidden">

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>
              Dispensing Queue
            </span>

            <span>›</span>

            <span className="text-slate-900 font-bold">
              Order Detail
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">

            <span className="w-2 h-2 rounded-full bg-purple-600" />

            <span>
              Terminal active — Gate 4
            </span>

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
                    setAddMedicationError(
                      null
                    );

                    setIsAddModalOpen(
                      true
                    );
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
                      : activePrescriptions.length >
                          0
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
                              ₦
                              {Number(
                                rx.totalPrice
                              ).toLocaleString()}
                            </td>

                            <td className="py-3.5">

                              <button
                                type="button"
                                onClick={() =>
                                  toggleAdminister(
                                    rx.id
                                  )
                                }
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
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
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : rx.status ===
                                        "ready_for_dispensing"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {isDispensed
                                  ? "dispensed"
                                  : rx.status.replace(
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
                        colSpan={
                          6
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

            <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-900 print:hidden">

              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />

              <div>

                <strong className="font-bold block">
                  Pharmacy Workflow
                </strong>

                <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                  Medication added here is saved
                  to the patient's real prescription
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
                handleDispenseAndSend
              }
              disabled={
                isDispensing ||
                dispenseSuccess ||
                activePrescriptions.length ===
                  0
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

                <input
                  type="text"
                  required
                  placeholder="e.g. Moxifloxacin Eye Drops 0.5%"
                  value={
                    newDrug.drugName
                  }
                  onChange={(e) =>
                    setNewDrug(
                      (previous) => ({
                        ...previous,
                        drugName:
                          e.target.value,
                      })
                    )
                  }
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
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={
                      newDrug.unitPrice
                    }
                    onChange={(e) =>
                      setNewDrug(
                        (previous) => ({
                          ...previous,
                          unitPrice:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-600"
                  />

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

      {/* INVENTORY MODAL */}

      {isDrugInventoryOpen && (
        <DrugInventoryModal
          drugInventory={
            drugInventory
          }
          isLoading={
            isLoadingDrugInventory
          }
          onClose={() =>
            setIsDrugInventoryOpen(
              false
            )
          }
          onAddDrug={() =>
            setIsAddDrugStockModalOpen(
              true
            )
          }
        />
      )}

      {/* ADD STOCK MODAL */}

      {isAddDrugStockModalOpen && (
        <AddDrugStockModal
          newDrugStock={
            newDrugStock
          }
          setNewDrugStock={
            setNewDrugStock
          }
          drugSuggestions={
            drugSuggestions
          }
          showDrugSuggestions={
            showDrugSuggestions
          }
          setShowDrugSuggestions={
            setShowDrugSuggestions
          }
          isSearchingDrugs={
            isSearchingDrugs
          }
          isSubmitting={
            isSubmittingDrugStock
          }
          onDrugNameChange={
            handleDrugNameChange
          }
          onSubmit={
            handleAddDrugStock
          }
          onClose={() =>
            setIsAddDrugStockModalOpen(
              false
            )
          }
        />
      )}

    </div>
  );
}

/*
 * --------------------------------------------------
 * DRUG INVENTORY MODAL
 * --------------------------------------------------
 */

function DrugInventoryModal({
  drugInventory,
  isLoading,
  onClose,
  onAddDrug,
}: {
  drugInventory: DrugStockItem[];
  isLoading: boolean;
  onClose: () => void;
  onAddDrug: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b border-slate-100 pb-3">

          <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-purple-600" />
            Drug Stock & Inventory
          </h3>

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={onAddDrug}
              className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Drug
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

          </div>

        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Loading drug stock...
          </p>
        ) : drugInventory.length ===
          0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No drugs in stock yet.
          </p>
        ) : (
          <table className="w-full text-xs mt-4">

            <thead>

              <tr className="text-left text-slate-400 uppercase text-[10px] border-b border-slate-100">

                <th className="py-2">
                  Drug
                </th>

                <th className="py-2">
                  Category
                </th>

                <th className="py-2">
                  Stock
                </th>

                <th className="py-2">
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

                    <td className="py-2.5 text-slate-600">
                      {drug.category}
                    </td>

                    <td className="py-2.5">

                      <span
                        className={
                          drug.stock <=
                          drug.reorderLevel
                            ? "font-bold text-rose-600"
                            : "font-bold text-slate-800"
                        }
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
                      ₦
                      {Number(
                        drug.price
                      ).toLocaleString()}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>
        )}

      </div>

    </div>
  );
}

/*
 * --------------------------------------------------
 * ADD DRUG STOCK MODAL
 * --------------------------------------------------
 */

function AddDrugStockModal({
  newDrugStock,
  setNewDrugStock,
  drugSuggestions,
  showDrugSuggestions,
  setShowDrugSuggestions,
  isSearchingDrugs,
  isSubmitting,
  onDrugNameChange,
  onSubmit,
  onClose,
}: {
  newDrugStock: {
    name: string;
    category: string;
    stock: string;
    reorderLevel: string;
    price: string;
  };

  setNewDrugStock: React.Dispatch<
    React.SetStateAction<{
      name: string;
      category: string;
      stock: string;
      reorderLevel: string;
      price: string;
    }>
  >;

  drugSuggestions: string[];
  showDrugSuggestions: boolean;
  setShowDrugSuggestions: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  isSearchingDrugs: boolean;
  isSubmitting: boolean;

  onDrugNameChange: (
    value: string
  ) => void;

  onSubmit: (
    e: React.FormEvent
  ) => void;

  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">

        <div className="flex items-center justify-between border-b border-slate-100 pb-3">

          <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            Add New Drug to Stock
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>

        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 text-xs pt-4"
        >

          <div className="relative">

            <label className="block text-slate-600 font-bold mb-1">
              Drug Name
            </label>

            <input
              type="text"
              required
              autoComplete="off"
              placeholder="Start typing e.g. Ciprofloxacin..."
              value={
                newDrugStock.name
              }
              onChange={(e) =>
                onDrugNameChange(
                  e.target.value
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
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
                      (
                        suggestion
                      ) => (
                        <button
                          key={
                            suggestion
                          }
                          type="button"
                          onMouseDown={(
                            e
                          ) => {
                            e.preventDefault();

                            setNewDrugStock(
                              (
                                previous
                              ) => ({
                                ...previous,
                                name: suggestion,
                              })
                            );

                            setShowDrugSuggestions(
                              false
                            );
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 text-slate-700 border-b border-slate-50"
                        >
                          {
                            suggestion
                          }
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

          <div>

            <label className="block text-slate-600 font-bold mb-1">
              Category
            </label>

            <select
              value={
                newDrugStock.category
              }
              onChange={(e) =>
                setNewDrugStock(
                  (previous) => ({
                    ...previous,
                    category:
                      e.target.value,
                  })
                )
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
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

          <div className="grid grid-cols-3 gap-3">

            <div>

              <label className="block text-slate-600 font-bold mb-1">
                Stock Qty
              </label>

              <input
                type="number"
                required
                min="0"
                value={
                  newDrugStock.stock
                }
                onChange={(e) =>
                  setNewDrugStock(
                    (previous) => ({
                      ...previous,
                      stock:
                        e.target.value,
                    })
                  )
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />

            </div>

            <div>

              <label className="block text-slate-600 font-bold mb-1">
                Reorder At
              </label>

              <input
                type="number"
                min="0"
                value={
                  newDrugStock.reorderLevel
                }
                onChange={(e) =>
                  setNewDrugStock(
                    (previous) => ({
                      ...previous,
                      reorderLevel:
                        e.target.value,
                    })
                  )
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
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
                step="0.01"
                value={
                  newDrugStock.price
                }
                onChange={(e) =>
                  setNewDrugStock(
                    (previous) => ({
                      ...previous,
                      price:
                        e.target.value,
                    })
                  )
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />

            </div>

          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl font-bold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold"
            >
              {isSubmitting
                ? "Saving..."
                : "Add to Stock"}
            </button>

          </div>

        </form>

      </div>

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