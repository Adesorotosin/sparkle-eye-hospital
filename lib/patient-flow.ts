// lib/patients.ts
//
// Data-access helpers for the shared "active patient" workflow record
// (triage -> diagnostics -> pharmacy -> billing -> cashier). Assembles rows
// from several tables into the same PatientRecord shape the frontend
// (context/PatientFlowContext.tsx) already expects, so the pages consuming
// that context don't need to change.

import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";
import {
  PatientRecord,
  TriageVitals,
  DiagnosticOrder,
  Prescription,
  PatientInvoice,
  LineItem,
  ActivityLog,
} from "@/types/hospital";

export async function getOrCreatePatientByCode(patientCode: string) {
  const { data: existing, error: findError } = await supabase
    .from("patients")
    .select("*")
    .eq("patient_code", patientCode)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("patients")
    .insert({ patient_code: patientCode, full_name: patientCode })
    .select("*")
    .single();
  if (createError) throw createError;
  return created;
}

// Finds the patient's current (non-cancelled) invoice, creating a fresh
// draft one if none exists yet.
export async function getOrCreateDraftInvoice(patientId: string) {
  const { data: existing, error: findError } = await supabase
    .from("invoices")
    .select("*")
    .eq("patient_id", patientId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data: created, error: createError } = await supabase
    .from("invoices")
    .insert({ invoice_no: invoiceNo, patient_id: patientId, status: "draft" })
    .select("*")
    .single();
  if (createError) throw createError;
  return created;
}

// Recomputes subtotal/grand_total for an invoice from its line items and
// whatever discount is already applied, then persists it.
export async function recalcInvoice(invoiceId: string) {
  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("total_price")
    .eq("invoice_id", invoiceId);
  if (itemsError) throw itemsError;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("discount_amount")
    .eq("id", invoiceId)
    .single();
  if (invoiceError) throw invoiceError;

  const subtotal = (items ?? []).reduce((sum, item) => sum + Number(item.total_price), 0);
  const grandTotal = Math.max(0, subtotal - Number(invoice.discount_amount ?? 0));

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ subtotal, grand_total: grandTotal })
    .eq("id", invoiceId);
  if (updateError) throw updateError;

  return { subtotal, grandTotal };
}

export async function addActivityLog(
  patientId: string,
  module: ActivityLog["module"],
  action: string,
  performedBy: string
) {
  await logActivity({ patientId, module, action, performedBy });
}

// Assembles the full PatientRecord shape from all related tables.
export async function getPatientRecord(patientCode: string): Promise<PatientRecord | null> {
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("patient_code", patientCode)
    .maybeSingle();
  if (patientError) throw patientError;
  if (!patient) return null;

  const [vitalsRes, diagnosticsRes, prescriptionsRes, invoiceRes, logsRes] = await Promise.all([
    supabase
      .from("vitals")
      .select("*")
      .eq("patient_id", patient.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("diagnostic_orders")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("patient_id", patient.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false }),
  ]);

  if (vitalsRes.error) throw vitalsRes.error;
  if (diagnosticsRes.error) throw diagnosticsRes.error;
  if (prescriptionsRes.error) throw prescriptionsRes.error;
  if (invoiceRes.error) throw invoiceRes.error;
  if (logsRes.error) throw logsRes.error;

  const vitals: TriageVitals | undefined = vitalsRes.data
    ? {
        visualAcuityOD: vitalsRes.data.visual_acuity_od ?? "",
        visualAcuityOS: vitalsRes.data.visual_acuity_os ?? "",
        iop: Number(vitalsRes.data.iop ?? 0),
        primaryComplaint: vitalsRes.data.primary_complaint ?? "",
        recordedAt: vitalsRes.data.recorded_at,
      }
    : undefined;

  const diagnostics: DiagnosticOrder[] = (diagnosticsRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    price: Number(d.price),
    status: d.status,
  }));

  const prescriptions: Prescription[] = (prescriptionsRes.data ?? []).map((p) => ({
    id: p.id,
    drugName: p.drug_name,
    dosage: p.dosage,
    quantity: p.quantity,
    pricePerUnit: Number(p.price_per_unit),
    totalPrice: Number(p.total_price),
    status: p.status,
  }));

  const invoiceRow = invoiceRes.data;
  const items: LineItem[] = (invoiceRow?.invoice_items ?? []).map((i: any) => ({
    id: i.id,
    category: i.category,
    name: i.name,
    quantity: i.quantity,
    unitPrice: Number(i.unit_price),
    totalPrice: Number(i.total_price),
  }));

  const invoice: PatientInvoice = {
    invoiceNo: invoiceRow?.invoice_no ?? "",
    patientId: patient.patient_code,
    patientName: patient.full_name,
    coveragePlan: patient.coverage_plan,
    status: (invoiceRow?.status ?? "draft") as PatientInvoice["status"],
    items,
    subtotal: Number(invoiceRow?.subtotal ?? 0),
    discountAmount: Number(invoiceRow?.discount_amount ?? 0),
    discountReason: invoiceRow?.discount_reason ?? undefined,
    approvedByPin: invoiceRow?.approved_by_pin ?? undefined,
    grandTotal: Number(invoiceRow?.grand_total ?? 0),
    createdAt: invoiceRow?.created_at ?? new Date().toISOString(),
  };

  const activityLogs: ActivityLog[] = (logsRes.data ?? []).map((l) => ({
    id: l.id,
    timestamp: l.created_at,
    module: l.module,
    action: l.action,
    performedBy: l.performed_by,
  }));

  return {
    patientId: patient.patient_code,
    fullName: patient.full_name,
    coveragePlan: patient.coverage_plan,
    age: patient.age ?? undefined,
    gender: patient.gender ?? undefined,
    phone: patient.phone ?? undefined,
    allergies: patient.allergies ?? undefined,
    vitals,
    diagnostics,
    prescriptions,
    invoice,
    activityLogs,
  };
}

// Registers a brand-new patient (e.g. from the Pharmacy "Register Patient"
// flow) with a freshly generated human-facing code.
export async function registerPatient(input: {
  fullName: string;
  coveragePlan?: string;
  age?: number;
  gender?: string;
  phone?: string;
  allergies?: string;
  status?: "waiting_triage" | "in_consultation" | "completed_today";
  isWalkIn?: boolean;
}) {
  const patientCode = `SPK-${Math.floor(10000 + Math.random() * 90000)}`;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      patient_code: patientCode,
      full_name: input.fullName,
      coverage_plan: input.coveragePlan || "Self-Pay",
      age: input.age ?? null,
      gender: input.gender ?? null,
      phone: input.phone ?? null,
      allergies: input.allergies ?? null,
      status: input.status ?? "waiting_triage",
      is_walk_in: input.isWalkIn ?? false,
      last_visit_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  return data;
}
