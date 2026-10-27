"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import {
  PatientRecord,
  PaymentMethod,
  TriageVitals,
  DiagnosticOrder,
  Prescription,
} from "@/types/hospital";

const DEFAULT_PATIENT_CODE = "SPK-30892";

function emptyPatientFor(code: string): PatientRecord {
  return {
    patientId: code,
    fullName: "Loading…",
    coveragePlan: "",
    diagnostics: [],
    laboratoryResults: [],
    prescriptions: [],

    invoice: {
      invoiceNo: "",
      patientId: code,
      patientName: "",
      coveragePlan: "",
      status: "draft",
      items: [],
      subtotal: 0,
      discountAmount: 0,

      // VAT defaults for a new/empty invoice
      vatRate: 0,
      vatAmount: 0,

      grandTotal: 0,
      createdAt: new Date().toISOString(),
    },

    activityLogs: [],
  };
}

interface PatientFlowContextType {
  patient: PatientRecord;

  activePatientCode: string;

  setActivePatientCode: (code: string) => void;

  isLoading: boolean;

  updateVitals: (
    vitals: TriageVitals
  ) => Promise<void>;

  addDiagnosticOrder: (
    order: Omit<DiagnosticOrder, "id">
  ) => Promise<void>;

  addPrescription: (
    prescription: Omit<
      Prescription,
      "id" | "status"
    >
  ) => Promise<void>;

  dispensePrescription: (
    prescriptionId: string
  ) => Promise<void>;

  applyDiscount: (
    type: "fixed" | "percentage",
    value: number,
    reason: string,
    pin: string
  ) => Promise<boolean>;

  processPayment: (
    paymentMethod: PaymentMethod,
    amountRendered: number
  ) => Promise<{
    success: boolean;
    changeDue: number;
  }>;
}

const PatientFlowContext =
  createContext<PatientFlowContextType | undefined>(
    undefined
  );

export const PatientFlowProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [activePatientCode, setActivePatientCode] =
    useState(DEFAULT_PATIENT_CODE);

  const [storedPatient, setStoredPatient] =
    useState<PatientRecord>(
      emptyPatientFor(DEFAULT_PATIENT_CODE)
    );
  const [loadedPatientCode, setLoadedPatientCode] =
    useState<string | null>(null);

  const isValidPatientCode =
    Boolean(activePatientCode) &&
    activePatientCode !== "undefined" &&
    activePatientCode !== "null";

  const patient =
    loadedPatientCode === activePatientCode
      ? storedPatient
      : emptyPatientFor(activePatientCode);
  const isLoading =
    isValidPatientCode && loadedPatientCode !== activePatientCode;

  useEffect(() => {
    let cancelled = false;

    if (!isValidPatientCode) {
      return () => {
        cancelled = true;
      };
    }

    async function loadPatient() {
      try {
        const res = await fetch(
          `/api/patients/${encodeURIComponent(
            activePatientCode
          )}`
        );

        if (!res.ok) {
          console.warn(
            `Patient API returned status ${res.status} for code: ${activePatientCode}`
          );

          if (!cancelled) {
            setStoredPatient(emptyPatientFor(activePatientCode));
          }
          return;
        }

        const data = await res.json();

        if (!cancelled) {
          setStoredPatient(
            data.patient ?? emptyPatientFor(activePatientCode)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setStoredPatient(emptyPatientFor(activePatientCode));
        }

        console.error("Error loading patient record:", err);
      } finally {
        if (!cancelled) {
          setLoadedPatientCode(activePatientCode);
        }
      }
    }

    void loadPatient();

    return () => {
      cancelled = true;
    };
  }, [activePatientCode, isValidPatientCode]);

  const updateVitals = async (
    vitals: TriageVitals
  ) => {
    const res = await fetch(
      `/api/patients/${activePatientCode}/vitals`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vitals),
      }
    );

    if (res.ok) {
      const { patient: updated } =
        await res.json();

      setStoredPatient(updated);
    }
  };

  const addDiagnosticOrder = async (
    order: Omit<DiagnosticOrder, "id">
  ) => {
    const res = await fetch(
      `/api/patients/${activePatientCode}/diagnostics`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      }
    );

    if (res.ok) {
      const { patient: updated } =
        await res.json();

      setStoredPatient(updated);
    }
  };

  const addPrescription = async (
    prescription: Omit<
      Prescription,
      "id" | "status"
    >
  ) => {
    const res = await fetch(
      `/api/patients/${activePatientCode}/prescriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prescription),
      }
    );

    if (res.ok) {
      const { patient: updated } =
        await res.json();

      setStoredPatient(updated);
    }
  };

  const dispensePrescription = async (
    prescriptionId: string
  ) => {
    const res = await fetch(
      `/api/patients/${activePatientCode}/prescriptions/${prescriptionId}`,
      {
        method: "PATCH",
      }
    );

    if (res.ok) {
      const { patient: updated } =
        await res.json();

      setStoredPatient(updated);
    }
  };

  const applyDiscount = async (
    type: "fixed" | "percentage",
    value: number,
    reason: string,
    pin: string
  ): Promise<boolean> => {
    const res = await fetch(
      `/api/patients/${activePatientCode}/discount`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          value,
          reason,
          pin,
        }),
      }
    );

    const body = await res.json();

    if (
      body.success &&
      body.patient
    ) {
      setStoredPatient(body.patient);
    }

    return Boolean(body.success);
  };

  const processPayment = async (
    paymentMethod: PaymentMethod,
    amountRendered: number
  ): Promise<{
    success: boolean;
    changeDue: number;
  }> => {
    const res = await fetch(
      `/api/patients/${activePatientCode}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod,
          amountRendered,
        }),
      }
    );

    const body = await res.json();

    if (
      body.success &&
      body.patient
    ) {
      setStoredPatient(body.patient);
    }

    return {
      success: Boolean(body.success),
      changeDue: Number(
        body.changeDue ?? 0
      ),
    };
  };

  return (
    <PatientFlowContext.Provider
      value={{
        patient,
        activePatientCode,
        setActivePatientCode,
        isLoading,
        updateVitals,
        addDiagnosticOrder,
        addPrescription,
        dispensePrescription,
        applyDiscount,
        processPayment,
      }}
    >
      {children}
    </PatientFlowContext.Provider>
  );
};

export const usePatientFlow = () => {
  const context =
    useContext(PatientFlowContext);

  if (!context) {
    throw new Error(
      "usePatientFlow must be used within a PatientFlowProvider"
    );
  }

  return context;
};