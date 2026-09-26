export type InvoiceStatus =
  | "draft"
  | "pending"
  | "paid"
  | "cancelled";

export type PaymentMethod =
  | "cash"
  | "pos"
  | "transfer"
  | "card"
  | "hmo";

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
  status:
    | "unpaid"
    | "paid"
    | "pending"
    | "partially_paid";
  createdAt: string;
  dueDate?: string;
}

export interface TriageVitals {
  visualAcuityOD: string;
  visualAcuityOS: string;
  visualAcuityOU?: string;
  withCorrection?: boolean;
  iop: number;
  iopOD?: number;
  iopOS?: number;
  iopInstrument?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  primaryComplaint: string;
  symptoms?: string[];
  severity?: "Mild" | "Moderate" | "Severe";
  durationText?: string;
  recordedAt: string;
}

export interface DiagnosticOrder {
  id: string;
  name: string;
  price: number;
  status:
    | "ordered"
    | "ready_for_test"
    | "completed";
  findings?: string;
  interpretation?: string;
  completedAt?: string;
}

export interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status:
    | "pending_payment"
    | "ready_for_dispensing"
    | "dispensed";
}

export interface LineItem {
  id: string;
  category:
    | "consultation"
    | "diagnostic"
    | "pharmacy"
    | "consumable";
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

  /**
   * VAT percentage captured on this invoice
   * at the time the invoice was calculated.
   *
   * Example:
   * 5 means 5%.
   */
  vatRate: number;

  /**
   * Actual VAT amount charged on the invoice.
   *
   * Example:
   * ₦228.35
   */
  vatAmount: number;

  discountAmount: number;
  discountReason?: string;
  approvedByPin?: string;

  grandTotal: number;

  createdAt: string;
}

export type ActivityLog = {
  id: string;
  timestamp: string;
  module:
    | "Billing"
    | "Pharmacy"
    | "Diagnostics"
    | "Triage"
    | "Admin"
    | "Scheduling"
    | "Consultation";
  action: string;
  performedBy: string;
};

export type Encounter = {
  id: string;
  slitLampOD?: string;
  slitLampOS?: string;
  refractionOD?: {
    sphere: string;
    cylinder: string;
    axis: string;
  };
  refractionOS?: {
    sphere: string;
    cylinder: string;
    axis: string;
  };
  diagnosis?: string;
  status: "draft" | "completed";
  createdAt: string;
};

export interface PatientRecord {
  patientId: string;
  fullName: string;
  coveragePlan: string;
  age?: number;
  gender?: string;
  phone?: string;
  allergies?: string;

  vitals?: TriageVitals;

  diagnostics: DiagnosticOrder[];

  prescriptions: Prescription[];

  invoice: PatientInvoice;

  activityLogs?: ActivityLog[];

  encounters?: Encounter[];
}