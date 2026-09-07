// types/hospital.ts

export type InvoiceStatus = "draft" | "pending" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "pos" | "transfer" | "card" | "hmo";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  patientId: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: "unpaid" | "paid" | "pending" | "partially_paid";
  createdAt: string;
  dueDate?: string;
}

export interface TriageVitals {
  visualAcuityOD: string; // Right eye
  visualAcuityOS: string; // Left eye
  iop: number; // Intraocular Pressure in mmHg
  primaryComplaint: string;
  recordedAt: string;
}

export interface DiagnosticOrder {
  id: string;
  name: string;
  price: number;
  status: "ordered" | "completed";
}

export interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status: "pending_payment" | "ready_for_dispensing" | "dispensed";
}

export interface LineItem {
  id: string;
  category: "consultation" | "diagnostic" | "pharmacy" | "consumable";
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PatientInvoice {
  invoiceNo: string;
  patientId: string;
  patientName: string;
  coveragePlan: string;
  status: InvoiceStatus;
  items: LineItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  approvedByPin?: string;
  grandTotal: number;
  createdAt: string;
}

export type ActivityLog = {
  id: string;
  timestamp: string;
  module: "Billing" | "Pharmacy" | "Diagnostics" | "Triage";
  action: string;
  performedBy: string;
};

export interface PatientRecord {
  patientId: string;
  fullName: string;
  coveragePlan: string;
  vitals?: TriageVitals;
  diagnostics: DiagnosticOrder[];
  prescriptions: Prescription[];
  invoice: PatientInvoice;
  activityLogs?: ActivityLog[];
}