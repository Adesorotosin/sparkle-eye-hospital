// types/hospital.ts

export type InvoiceStatus = "draft" | "pending" | "paid" | "cancelled";

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
  status: "unpaid" | "paid" | "pending" | "partially_paid";
  createdAt: string;
  dueDate?: string;
}

/**
 * Triage information recorded by the nurse.
 *
 * The original application only stored:
 * - visual acuity OD
 * - visual acuity OS
 * - IOP
 * - primary complaint
 *
 * The clinical workflow now records a fuller set of vitals,
 * so the additional fields are optional for backwards compatibility
 * with older patient records.
 */
export interface TriageVitals {
  visualAcuityOD: string;
  visualAcuityOS: string;

  visualAcuityOU?: string;
  withCorrection?: boolean;

  /**
   * Individual intraocular pressure readings.
   */
  iopOD?: number;
  iopOS?: number;

  /**
   * Legacy/general IOP value.
   *
   * Kept because existing UI components still consume `iop`.
   * Newer UI should prefer iopOD/iopOS when available.
   */
  iop: number;

  iopInstrument?: string;

  /**
   * General vital signs.
   */
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;

  /**
   * Presenting complaint and symptoms.
   */
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
  status: "ordered" | "completed";
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
