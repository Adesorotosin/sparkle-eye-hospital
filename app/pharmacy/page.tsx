"use client";

import Image from "next/image";
import React, {
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePatientFlow } from "@/context/PatientFlowContext";
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
  createPharmacyPrescription,
  dispensePatientPrescriptions,
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

const MOCK_PATIENTS: Record<string, PatientBannerData> = {
  "SPK-30892": {
    id: "SPK-30892",
    name: "Mrs. Chidinma Okafor",
    age: 42,
    gender: "Female",
    phone: "+234 803 123 4567",
    hmo: {
      name: "Private Cash",
      type: "Self-Pay",
      status: "Verified",
    },
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
    hmo: {
      name: "Hygeia HMO",
      type: "HMO Private",
      status: "Verified",
    },
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
    quantity: 1,
    unitPrice: 8500,
    totalPrice: 8500,
    status: "pending",
  },
];

function PharmacyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  /*
   * PatientFlow is still used for the existing legacy display data
   * while the pharmacy write operations now go directly to Supabase.
   */
  const patientContext = usePatientFlow() as any;

  const patient = patientContext?.patient || {
    patientId: "SPK-30892",
    fullName: "Mrs. Chidinma Okafor",
    coveragePlan: "Private Cash",
    invoice: {
      status: "unbilled",
      amountDue: 0,
      totalAmount: 0,
    },
    prescriptions: FALLBACK_PRESCRIPTIONS,
    vitals: {
      primaryComplaint:
        "Post-Operative Cataract Care — OD",
    },
  };

  const patientId =
    searchParams.get("patientId") || patient.patientId;

  const isContextPatient =
    patientId === patient.patientId;

  /*
   * ---------------------------------------
   * GENERAL STATE
   * ---------------------------------------
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
   * ---------------------------------------
   * ADD MEDICATION STATE
   * ---------------------------------------
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
   * Keep newly-added prescriptions in local UI state.
   *
   * They have already been saved to Supabase by the Server Action.
   * This simply lets the user see them immediately without waiting
   * for another page render.
   */
  const [addedPrescriptions, setAddedPrescriptions] =
    useState<PrescriptionItem[]>([]);

  /*
   * ---------------------------------------
   * REGISTER PATIENT STATE
   * ---------------------------------------
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
   * ---------------------------------------
   * INVENTORY STATE
   * ---------------------------------------
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
   * ---------------------------------------
   * PATIENT BANNER
   * ---------------------------------------
   */

  const bannerPatient: PatientBannerData =
    isContextPatient
      ? {
          id: patient.patientId,
          name:
            patient.fullName ||
            "Mrs. Chidinma Okafor",
          age: patient.age ?? 42,
          gender: patient.gender || "Female",
          phone:
            patient.phone ||
            "+234 803 123 4567",

          hmo: {
            name:
              patient.coveragePlan ||
              "Private Cash",

            type: (
              patient.coveragePlan || ""
            ).includes("HMO")
              ? "HMO Private"
              : "Self-Pay",

            status: "Verified",
          },

          allergies: patient.allergies
            ? patient.allergies
                .split(",")
                .map((a: string) => a.trim())
            : ["None"],

          currentStage: "pharmacy",
          assignedDoctor: "Dr. James Okoro",
          visitDate: "27 Aug 2026",
        }
      : MOCK_PATIENTS[patientId] ||
        MOCK_PATIENTS["SPK-30892"];

  const [selectedPrescription, setSelectedPrescription] =
    useState(bannerPatient.name);

  useEffect(() => {
    setSelectedPrescription(
      bannerPatient.name
    );

    setDispenseSuccess(false);
    setActionError(null);
    setAddedPrescriptions([]);
  }, [patientId, bannerPatient.name]);

  /*
   * ---------------------------------------
   * QUEUES
   * ---------------------------------------
   */

  const unfulfilledOrders = [
    {
      id: patient.patientId,
      name:
        patient.fullName ||
        "Mrs. Chidinma Okafor",
      time: "09:15 AM",
    },

    {
      id: "SPK-2026-0891",
      name: "Amina Bello",
      time: "10:45 AM",
    },

    {
      id: "1",
      name: "Adebayo Funmi",
      time: "10:42 AM",
    },
  ];

  const readyOrders = [
    {
      id: "6",
      name: "James Mitchell",
      time: "09:12 AM",
    },

    {
      id: "7",
      name: "Oluwaseun Adeyemi",
      time: "08:55 AM",
    },
  ];

  /*
   * ---------------------------------------
   * ACTIVE PRESCRIPTIONS
   * ---------------------------------------
   */

  const databasePrescriptions: PrescriptionItem[] =
    isContextPatient
      ? (patient.prescriptions || []).map(
          (rx: any) => ({
            id: rx.id,
            drugName:
              rx.drugName ??
              rx.drug_name ??
              "",
            dosage: rx.dosage ?? "",
            quantity:
              typeof rx.quantity === "number"
                ? rx.quantity
                : Number(rx.quantity) || 1,
            unitPrice:
              Number(
                rx.unitPrice ??
                  rx.pricePerUnit ??
                  rx.price_per_unit ??
                  0
              ),
            totalPrice:
              Number(
                rx.totalPrice ??
                  rx.total_price ??
                  0
              ),
            status:
              rx.status ??
              "pending_payment",
          })
        )
      : [];

  const activePrescriptions: PrescriptionItem[] =
    databasePrescriptions.length > 0
      ? [
          ...databasePrescriptions,
          ...addedPrescriptions,
        ]
      : [
          ...(isContextPatient
            ? []
            : FALLBACK_PRESCRIPTIONS),
          ...addedPrescriptions,
        ];

  const totalPrescriptionPrice =
    activePrescriptions.reduce(
      (sum, item) =>
        sum + Number(item.totalPrice || 0),
      0
    );

  const isHMO =
    bannerPatient.hmo.type.includes("HMO");

  const hmoCoverage =
    isHMO
      ? totalPrescriptionPrice * 0.8
      : 0;

  const coPayDue =
    totalPrescriptionPrice -
    hmoCoverage;

  /*
   * ---------------------------------------
   * PATIENT SELECT
   * ---------------------------------------
   */

  const handlePatientSelect = (
    id: string,
    name: string
  ) => {
    setSelectedPrescription(name);
    setDispenseSuccess(false);
    setActionError(null);

    router.push(
      `/pharmacy?patientId=${id}`
    );
  };

  /*
   * ---------------------------------------
   * ADD MEDICATION
   * ---------------------------------------
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

    /*
     * The selected patient MUST be a real patient code.
     */
    if (!patientId) {
      setAddMedicationError(
        "No patient is currently selected."
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

      const totalPrice =
        result.totalPrice ??
        quantity * unitPrice;

      /*
       * Immediately reflect the successful
       * database write in the UI.
       */
      setAddedPrescriptions(
        (previous) => [
          ...previous,
          {
            id:
              result.id ??
              `rx-${Date.now()}`,

            drugName,
            dosage,
            quantity,
            unitPrice,
            totalPrice,
            status: "pending_payment",
          },
        ]
      );

      setNewDrug({
        drugName: "",
        dosage: "",
        quantity: "",
        unitPrice: "",
      });

      setIsAddModalOpen(false);
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
   * ---------------------------------------
   * DISPENSE
   * ---------------------------------------
   */

  const handleDispenseAndSend =
    async () => {
      setActionError(null);
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
         * Update local statuses so the UI
         * immediately reflects the action.
         */
        setAddedPrescriptions(
          (previous) =>
            previous.map((rx) => ({
              ...rx,
              status: "dispensed",
            }))
        );
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
   * ---------------------------------------
   * ADMINISTRATION
   * ---------------------------------------
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
   * ---------------------------------------
   * PRINT
   * ---------------------------------------
   */

  const handlePrintLabel = () => {
    if (
      typeof window !== "undefined"
    ) {
      window.print();
    }
  };

  /*
   * ---------------------------------------
   * REGISTER PATIENT
   * ---------------------------------------
   */

  const handleRegisterPatient =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (!newPatient.fullName.trim()) {
        setRegisterError(
          "Full name is required."
        );
        return;
      }

      setIsRegisteringPatient(true);
      setRegisterError(null);

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
                  newPatient.fullName,
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
                  newPatient.phone ||
                  undefined,
                allergies:
                  newPatient.allergies ||
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

        handlePatientSelect(
          created.patientId,
          created.fullName
        );
      } catch (error) {
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
   * ---------------------------------------
   * DRUG SEARCH
   * ---------------------------------------
   */

  const handleDrugNameChange = (
    value: string
  ) => {
    setNewDrugStock({
      ...newDrugStock,
      name: value,
    });

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

            const data =
              await response.json();

            setDrugSuggestions(
              data.suggestions ||
                []
            );
          } catch (error) {
            console.error(
              error
            );
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
   * ---------------------------------------
   * INVENTORY
   * ---------------------------------------
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
          error
        );
      } finally {
        setIsLoadingDrugInventory(
          false
        );
      }
    };

  const handleOpenDrugInventory =
    () => {
      setIsDrugInventoryOpen(
        true
      );

      loadDrugInventory();
    };

  const handleAddDrugStock =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (
        !newDrugStock.name ||
        !newDrugStock.stock ||
        !newDrugStock.price
      ) {
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
                  newDrugStock.name,
                category:
                  newDrugStock.category,
                stock:
                  Number(
                    newDrugStock.stock
                  ),
                reorderLevel:
                  newDrugStock.reorderLevel
                    ? Number(
                        newDrugStock.reorderLevel
                      )
                    : 5,
                price:
                  Number(
                    newDrugStock.price
                  ),
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
        setShowDrugSuggestions(
          false
        );

        setIsAddDrugStockModalOpen(
          false
        );
      } catch (error) {
        console.error(
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
   * ---------------------------------------
   * LOGOUT
   * ---------------------------------------
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
                UNFULFILLED ({unfulfilledOrders.length})
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
                          Received: {item.time}
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
                READY FOR PICKUP ({readyOrders.length})
              </h2>

            </div>

            <div className="space-y-1">

              {readyOrders.map(
                (item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSelectedPrescription(
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
                        Received: {item.time}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500" />

                  </button>
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
            <span>Dispensing Queue</span>
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

          <PatientBanner
            patient={bannerPatient}
            activeModule="pharmacy"
          />

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
                  Medication has been dispensed and the pharmacy record has been updated.
                </p>
              </div>

            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">

            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">

              <div>

                <div className="flex items-center gap-3 flex-wrap">

                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {selectedPrescription}
                  </h1>

                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {bannerPatient.age}Y /{" "}
                    {bannerPatient.gender[0]}
                  </span>

                  <span className="text-xs font-mono text-slate-400">
                    MRN #{bannerPatient.id}
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
                    : patient.invoice?.status ||
                      "Unfulfilled"}
                </span>

              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

              <div>
                <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                  PRESCRIBING PHYSICIAN
                </span>

                <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                  {bannerPatient.assignedDoctor} — Ophthalmology
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
                {patient.vitals?.primaryComplaint ||
                  "Post-Operative Evaluation"}
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

                  {activePrescriptions.length > 0 ? (
                    activePrescriptions.map(
                      (rx) => {

                        const isAdministered =
                          administeredDrugs[
                            rx.id
                          ];

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
                                  dispenseSuccess ||
                                  rx.status ===
                                    "dispensed"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {dispenseSuccess ||
                                rx.status ===
                                  "dispensed"
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
                        colSpan={6}
                        className="py-6 text-center text-slate-400"
                      >
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

                <strong className="font-bold block">
                  Pharmacy Workflow
                </strong>

                <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                  Medication added here is saved to the patient's real prescription record and added to billing. Dispensing deducts pharmacy stock.
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
                  {bannerPatient.hmo.name} — Covers 80%
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
              onClick={handlePrintLabel}
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
                dispenseSuccess
              }
              type="button"
              className={`px-5 py-2.5 font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 ${
                dispenseSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
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
                    setNewDrug({
                      ...newDrug,
                      drugName:
                        e.target.value,
                    })
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
                    setNewDrug({
                      ...newDrug,
                      dosage:
                        e.target.value,
                    })
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
                      setNewDrug({
                        ...newDrug,
                        quantity:
                          e.target.value,
                      })
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
                      setNewDrug({
                        ...newDrug,
                        unitPrice:
                          e.target.value,
                      })
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
                    setNewPatient({
                      ...newPatient,
                      fullName:
                        e.target.value,
                    })
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
                      setNewPatient({
                        ...newPatient,
                        age:
                          e.target.value,
                      })
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
                      setNewPatient({
                        ...newPatient,
                        gender:
                          e.target.value,
                      })
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
                    setNewPatient({
                      ...newPatient,
                      phone:
                        e.target.value,
                    })
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
                    setNewPatient({
                      ...newPatient,
                      coveragePlan:
                        e.target.value,
                    })
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
                    setNewPatient({
                      ...newPatient,
                      allergies:
                        e.target.value,
                    })
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
                  onClick={() =>
                    setIsAddDrugStockModalOpen(
                      true
                    )
                  }
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Drug
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIsDrugInventoryOpen(
                      false
                    )
                  }
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>

              </div>

            </div>

            {isLoadingDrugInventory ? (
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
                          {drug.price.toLocaleString()}
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

      {/* ADD STOCK MODAL */}

      {isAddDrugStockModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">

              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
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
                className="text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <form
              onSubmit={
                handleAddDrugStock
              }
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
                    handleDrugNameChange(
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
                              onClick={() => {
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
                  Suggestions from the NIH RxTerms drug database.
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
                    setNewDrugStock({
                      ...newDrugStock,
                      category:
                        e.target.value,
                    })
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
                      setNewDrugStock({
                        ...newDrugStock,
                        stock:
                          e.target.value,
                      })
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
                      setNewDrugStock({
                        ...newDrugStock,
                        reorderLevel:
                          e.target.value,
                      })
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
                    value={
                      newDrugStock.price
                    }
                    onChange={(e) =>
                      setNewDrugStock({
                        ...newDrugStock,
                        price:
                          e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />

                </div>

              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() =>
                    setIsAddDrugStockModalOpen(
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
                    isSubmittingDrugStock
                  }
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-bold"
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
        <div className="p-6 text-xs text-slate-500">
          Loading Pharmacy Console...
        </div>
      }
    >
      <PharmacyContent />
    </Suspense>
  );
}
