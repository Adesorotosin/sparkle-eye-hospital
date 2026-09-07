"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  PatientRecord,
  LineItem,
  PaymentMethod,
  TriageVitals,
  DiagnosticOrder,
  Prescription,
  ActivityLog,
} from "@/types/hospital";

// Mock Initial Data for Mrs. Chidinma Okafor
const initialPatientRecord: PatientRecord = {
  patientId: "SPK-30892",
  fullName: "Mrs. Chidinma Okafor",
  coveragePlan: "Self-Pay",
  vitals: {
    visualAcuityOD: "6/18",
    visualAcuityOS: "6/12",
    iop: 22,
    primaryComplaint: "Eye redness and elevated pressure",
    recordedAt: "2026-08-27T08:30:00Z",
  },
  diagnostics: [
    { id: "diag-1", name: "Comprehensive Eye Exam", price: 15000, status: "completed" },
    { id: "diag-2", name: "Tonometer (IOP Test)", price: 8500, status: "completed" },
  ],
  prescriptions: [
    {
      id: "rx-1",
      drugName: "Timolol Maleate 0.5%",
      dosage: "1 drop twice daily",
      quantity: 1,
      pricePerUnit: 6200,
      totalPrice: 6200,
      status: "pending_payment",
    },
    {
      id: "rx-2",
      drugName: "Prednisolone Acetate 1%",
      dosage: "1 drop 4x daily",
      quantity: 1,
      pricePerUnit: 8500,
      totalPrice: 8500,
      status: "pending_payment",
    },
  ],
  invoice: {
    invoiceNo: "INV-2026-4851",
    patientId: "SPK-30892",
    patientName: "Mrs. Chidinma Okafor",
    coveragePlan: "Self-Pay",
    status: "draft",
    items: [
      { id: "item-1", category: "consultation", name: "Consultation Fee", quantity: 1, unitPrice: 25000, totalPrice: 25000 },
      { id: "item-2", category: "diagnostic", name: "Comprehensive Eye Exam", quantity: 1, unitPrice: 15000, totalPrice: 15000 },
      { id: "item-3", category: "diagnostic", name: "Tonometer (IOP Test)", quantity: 1, unitPrice: 8500, totalPrice: 8500 },
      { id: "item-4", category: "pharmacy", name: "Timolol Maleate 0.5%", quantity: 1, unitPrice: 6200, totalPrice: 6200 },
      { id: "item-5", category: "pharmacy", name: "Prednisolone Acetate 1%", quantity: 1, unitPrice: 8500, totalPrice: 8500 },
      { id: "item-6", category: "consumable", name: "Protective Eye Shield", quantity: 1, unitPrice: 6500, totalPrice: 6500 },
    ],
    subtotal: 69700,
    discountAmount: 0,
    grandTotal: 69700,
    createdAt: "2026-08-27T09:15:00Z",
  },
  activityLogs: [
    {
      id: "log-init",
      timestamp: "2026-08-27T09:15:00Z",
      module: "Billing",
      action: "Invoice INV-2026-4851 generated.",
      performedBy: "System",
    },
  ],
};

interface PatientFlowContextType {
  patient: PatientRecord;
  updateVitals: (vitals: TriageVitals) => void;
  addDiagnosticOrder: (order: Omit<DiagnosticOrder, "id">) => void;
  addPrescription: (prescription: Omit<Prescription, "id" | "status">) => void;
  dispensePrescription: (prescriptionId: string) => void;
  applyDiscount: (
    type: "fixed" | "percentage",
    value: number,
    reason: string,
    pin: string
  ) => boolean;
  processPayment: (
    paymentMethod: PaymentMethod,
    amountRendered: number
  ) => { success: boolean; changeDue: number };
}

const PatientFlowContext = createContext<PatientFlowContextType | undefined>(undefined);

export const PatientFlowProvider = ({ children }: { children: ReactNode }) => {
  const [patient, setPatient] = useState<PatientRecord>(initialPatientRecord);

  // Helper to recalculate invoice subtotal and grand total dynamically
  const recalculateInvoice = (items: LineItem[], currentDiscount: number) => {
    const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
    const grandTotal = Math.max(0, subtotal - currentDiscount);
    return { subtotal, grandTotal };
  };

  // Helper to construct real-time audit log entry
  const createLog = (module: ActivityLog["module"], action: string, performedBy: string): ActivityLog => ({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    timestamp: new Date().toISOString(),
    module,
    action,
    performedBy,
  });

  // 1. Triage: Record Vitals
  const updateVitals = (vitals: TriageVitals) => {
    setPatient((prev) => ({
      ...prev,
      vitals,
      activityLogs: [
        createLog("Triage", "Patient vitals updated.", "Nurse On-Duty"),
        ...(prev.activityLogs || []),
      ],
    }));
  };

  // 2. Diagnostics: Add new test order and auto-append to Invoice
  const addDiagnosticOrder = (order: Omit<DiagnosticOrder, "id">) => {
    const newId = `diag-${Date.now()}`;
    const newOrder: DiagnosticOrder = { ...order, id: newId };

    const newLineItem: LineItem = {
      id: `item-${Date.now()}`,
      category: "diagnostic",
      name: order.name,
      quantity: 1,
      unitPrice: order.price,
      totalPrice: order.price,
    };

    setPatient((prev) => {
      const updatedItems = [...prev.invoice.items, newLineItem];
      const { subtotal, grandTotal } = recalculateInvoice(
        updatedItems,
        prev.invoice.discountAmount
      );

      return {
        ...prev,
        diagnostics: [...prev.diagnostics, newOrder],
        invoice: {
          ...prev.invoice,
          items: updatedItems,
          subtotal,
          grandTotal,
        },
        activityLogs: [
          createLog("Diagnostics", `Diagnostic order added: ${order.name}`, "Attending Physician"),
          ...(prev.activityLogs || []),
        ],
      };
    });
  };

  // 3. Pharmacy: Add new prescription order and auto-append to Invoice
  const addPrescription = (prescription: Omit<Prescription, "id" | "status">) => {
    const newId = `rx-${Date.now()}`;
    const newPrescription: Prescription = { ...prescription, id: newId, status: "pending_payment" };

    const newLineItem: LineItem = {
      id: `item-${Date.now()}`,
      category: "pharmacy",
      name: prescription.drugName,
      quantity: prescription.quantity,
      unitPrice: prescription.pricePerUnit,
      totalPrice: prescription.totalPrice,
    };

    setPatient((prev) => {
      const updatedItems = [...prev.invoice.items, newLineItem];
      const { subtotal, grandTotal } = recalculateInvoice(
        updatedItems,
        prev.invoice.discountAmount
      );

      return {
        ...prev,
        prescriptions: [...prev.prescriptions, newPrescription],
        invoice: {
          ...prev.invoice,
          items: updatedItems,
          subtotal,
          grandTotal,
        },
        activityLogs: [
          createLog("Pharmacy", `Prescription added: ${prescription.drugName}`, "Attending Physician"),
          ...(prev.activityLogs || []),
        ],
      };
    });
  };

  // 4. Pharmacy: Post-payment Dispensing Action
  const dispensePrescription = (prescriptionId: string) => {
    setPatient((prev) => {
      let dispensedDrugName = "";
      const updatedPrescriptions = prev.prescriptions.map((rx) => {
        if (rx.id === prescriptionId) {
          dispensedDrugName = rx.drugName;
          return { ...rx, status: "dispensed" as const };
        }
        return rx;
      });

      return {
        ...prev,
        prescriptions: updatedPrescriptions,
        activityLogs: [
          createLog("Pharmacy", `Medication dispensed: ${dispensedDrugName}`, "Pharmacist On-Duty"),
          ...(prev.activityLogs || []),
        ],
      };
    });
  };

  // 5. Billing: Apply Discount with Admin Authorization & Multi-Type Support
  const applyDiscount = (
    type: "fixed" | "percentage",
    value: number,
    reason: string,
    pin: string
  ): boolean => {
    // PIN Validation Check
    if (pin !== "1234" && pin !== "••••") {
      return false;
    }

    setPatient((prev) => {
      const { subtotal } = prev.invoice;
      let calculatedDiscount = 0;

      if (type === "percentage") {
        const percentage = Math.min(Math.max(0, value), 100);
        calculatedDiscount = (subtotal * percentage) / 100;
      } else {
        calculatedDiscount = Math.min(Math.max(0, value), subtotal);
      }

      const grandTotal = Math.max(0, subtotal - calculatedDiscount);

      return {
        ...prev,
        invoice: {
          ...prev.invoice,
          discountAmount: calculatedDiscount,
          discountReason: reason,
          approvedByPin: pin,
          grandTotal,
        },
        activityLogs: [
          createLog("Billing", `Discount of ₦${calculatedDiscount.toLocaleString()} approved. Reason: "${reason}"`, "Admin (PIN: ****)"),
          ...(prev.activityLogs || []),
        ],
      };
    });

    return true;
  };

  // 6. Billing: Complete Payment & Cross-Module State Sync
  const processPayment = (paymentMethod: PaymentMethod, amountRendered: number) => {
    if (amountRendered < patient.invoice.grandTotal) {
      return { success: false, changeDue: 0 };
    }

    const changeDue = amountRendered - patient.invoice.grandTotal;

    setPatient((prev) => {
      // Transition Prescriptions to ready_for_dispensing
      const updatedPrescriptions = prev.prescriptions.map((rx) => ({
        ...rx,
        status: "ready_for_dispensing" as const,
      }));

      // Transition Diagnostics to completed
      const updatedDiagnostics = prev.diagnostics.map((diag) => ({
        ...diag,
        status: "completed" as const,
      }));

      // Write audit logs for post-payment transitions
      const paymentLog = createLog(
        "Billing",
        `Payment of ₦${prev.invoice.grandTotal.toLocaleString()} processed via ${paymentMethod.toUpperCase()}.`,
        "Cashier (Folake Adeyemi)"
      );

      const pharmacySyncLog = createLog(
        "Pharmacy",
        `${prev.prescriptions.length} Prescription(s) cleared and unlocked for dispensing.`,
        "System Sync Engine"
      );

      const diagnosticsSyncLog = createLog(
        "Diagnostics",
        `Diagnostic orders cleared for lab release.`,
        "System Sync Engine"
      );

      return {
        ...prev,
        invoice: {
          ...prev.invoice,
          status: "paid",
        },
        prescriptions: updatedPrescriptions,
        diagnostics: updatedDiagnostics,
        activityLogs: [paymentLog, pharmacySyncLog, diagnosticsSyncLog, ...(prev.activityLogs || [])],
      };
    });

    return { success: true, changeDue };
  };

  return (
    <PatientFlowContext.Provider
      value={{
        patient,
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
  const context = useContext(PatientFlowContext);
  if (!context) {
    throw new Error("usePatientFlow must be used within a PatientFlowProvider");
  }
  return context;
};