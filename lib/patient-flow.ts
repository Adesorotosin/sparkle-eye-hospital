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
  Encounter,
} from "@/types/hospital";

/**
 * Finds a patient by patient code.
 *
 * If the patient does not exist, this keeps the existing application's
 * behaviour of creating a minimal patient record.
 *
 * NOTE:
 * For workflows where the patient must already exist (such as triage),
 * use a strict lookup in the API route rather than this helper.
 */
export async function getOrCreatePatientByCode(patientCode: string) {
  const code = patientCode?.trim();

  if (!code) {
    throw new Error("Patient code is required.");
  }

  const { data: existing, error: findError } = await supabase
    .from("patients")
    .select("*")
    .eq("patient_code", code)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("patients")
    .insert({
      patient_code: code,
      full_name: code,
    })
    .select("*")
    .single();

  if (createError) throw createError;

  return created;
}

/**
 * Finds an existing patient's current invoice or creates a draft invoice.
 */
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

  const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const { data: created, error: createError } = await supabase
    .from("invoices")
    .insert({
      invoice_no: invoiceNo,
      patient_id: patientId,
      status: "draft",
    })
    .select("*")
    .single();

  if (createError) throw createError;

  return created;
}

/**
 * Recalculates an invoice from its line items.
 */
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

  const subtotal = (items ?? []).reduce(
    (sum, item) => sum + Number(item.total_price ?? 0),
    0
  );

  const discountAmount = Number(invoice.discount_amount ?? 0);

  const grandTotal = Math.max(0, subtotal - discountAmount);

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      subtotal,
      grand_total: grandTotal,
    })
    .eq("id", invoiceId);

  if (updateError) throw updateError;

  return {
    subtotal,
    grandTotal,
  };
}

/**
 * Shared activity-log helper used by older parts of the application.
 */
export async function addActivityLog(
  patientId: string,
  module: ActivityLog["module"],
  action: string,
  performedBy: string
) {
  await logActivity({
    patientId,
    module,
    action,
    performedBy,
  });
}

/**
 * Converts a database vitals row into the application's TriageVitals shape.
 *
 * The database now contains richer triage information than the original
 * application model, so this mapper deliberately exposes all of it.
 */
function mapVitals(row: any): TriageVitals {
  const visualAcuityOD = row.visual_acuity_od ?? "";
  const visualAcuityOS = row.visual_acuity_os ?? "";

  const iopOD =
    row.iop_od !== null && row.iop_od !== undefined
      ? Number(row.iop_od)
      : undefined;

  const iopOS =
    row.iop_os !== null && row.iop_os !== undefined
      ? Number(row.iop_os)
      : undefined;

  /**
   * `iop` is retained for backwards compatibility with existing UI.
   *
   * Prefer OD when available, otherwise OS, otherwise the legacy
   * `iop` database column.
   */
  const legacyIop =
    row.iop !== null && row.iop !== undefined
      ? Number(row.iop)
      : iopOD ?? iopOS ?? 0;

  const rawSymptoms = row.symptoms;

  let symptoms: string[] | undefined;

  if (Array.isArray(rawSymptoms)) {
    symptoms = rawSymptoms.filter(Boolean).map(String);
  } else if (typeof rawSymptoms === "string" && rawSymptoms.trim()) {
    symptoms = rawSymptoms
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  return {
    visualAcuityOD,
    visualAcuityOS,

    visualAcuityOU: row.visual_acuity_ou ?? undefined,

    withCorrection:
      row.with_correction !== null && row.with_correction !== undefined
        ? Boolean(row.with_correction)
        : undefined,

    iopOD,
    iopOS,

    // Legacy compatibility field.
    iop: Number.isFinite(legacyIop) ? legacyIop : 0,

    iopInstrument: row.iop_instrument ?? undefined,

    bpSystolic:
      row.bp_systolic !== null && row.bp_systolic !== undefined
        ? Number(row.bp_systolic)
        : undefined,

    bpDiastolic:
      row.bp_diastolic !== null && row.bp_diastolic !== undefined
        ? Number(row.bp_diastolic)
        : undefined,

    pulse:
      row.pulse !== null && row.pulse !== undefined
        ? Number(row.pulse)
        : undefined,

    temperature:
      row.temperature !== null && row.temperature !== undefined
        ? Number(row.temperature)
        : undefined,

    spo2:
      row.spo2 !== null && row.spo2 !== undefined
        ? Number(row.spo2)
        : undefined,

    primaryComplaint: row.primary_complaint ?? "",

    symptoms,

    severity:
      row.severity === "Mild" ||
      row.severity === "Moderate" ||
      row.severity === "Severe"
        ? row.severity
        : undefined,

    durationText: row.duration_text ?? undefined,

    recordedAt:
      row.recorded_at ??
      row.created_at ??
      new Date().toISOString(),
  };
}

/**
 * Assembles the complete patient record from Supabase.
 *
 * This is the shared data source used by:
 * - Doctor
 * - Nurse/Triage
 * - Diagnostics
 * - Pharmacy
 * - Billing
 * - Cashier
 * - Patient EHR
 */
export async function getPatientRecord(
  patientCode: string
): Promise<PatientRecord | null> {
  const code = patientCode?.trim();

  if (!code) return null;

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("patient_code", code)
    .maybeSingle();

  if (patientError) throw patientError;

  if (!patient) return null;

  const [
    vitalsRes,
    diagnosticsRes,
    prescriptionsRes,
    invoiceRes,
    logsRes,
    encountersRes,
  ] = await Promise.all([
    /**
     * Latest triage/vitals record.
     */
    supabase
      .from("vitals")
      .select("*")
      .eq("patient_id", patient.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    /**
     * Diagnostic orders.
     */
    supabase
      .from("diagnostic_orders")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: true }),

    /**
     * Prescriptions.
     */
    supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: true }),

    /**
     * Latest non-cancelled invoice.
     */
    supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("patient_id", patient.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    /**
     * Activity/audit trail.
     */
    supabase
      .from("activity_logs")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false }),

    /**
     * Doctor encounters.
     */
    supabase
      .from("encounters")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false }),
  ]);

  if (vitalsRes.error) throw vitalsRes.error;
  if (diagnosticsRes.error) throw diagnosticsRes.error;
  if (prescriptionsRes.error) throw prescriptionsRes.error;
  if (invoiceRes.error) throw invoiceRes.error;
  if (logsRes.error) throw logsRes.error;
  if (encountersRes.error) throw encountersRes.error;

  /**
   * -----------------------------
   * TRIAGE / VITALS
   * -----------------------------
   */
  const vitals: TriageVitals | undefined = vitalsRes.data
    ? mapVitals(vitalsRes.data)
    : undefined;

  /**
   * -----------------------------
   * DIAGNOSTICS
   * -----------------------------
   */
  const diagnostics: DiagnosticOrder[] = (diagnosticsRes.data ?? []).map(
    (diagnostic) => ({
      id: diagnostic.id,
      name: diagnostic.name,
      price: Number(diagnostic.price ?? 0),
      status:
        diagnostic.status === "completed"
          ? "completed"
          : "ordered",
    })
  );

  /**
   * -----------------------------
   * PRESCRIPTIONS
   * -----------------------------
   */
  const prescriptions: Prescription[] = (prescriptionsRes.data ?? []).map(
    (prescription) => ({
      id: prescription.id,
      drugName: prescription.drug_name,
      dosage: prescription.dosage,
      quantity: Number(prescription.quantity ?? 0),
      pricePerUnit: Number(prescription.price_per_unit ?? 0),
      totalPrice: Number(prescription.total_price ?? 0),
      status:
        prescription.status === "ready_for_dispensing"
          ? "ready_for_dispensing"
          : prescription.status === "dispensed"
            ? "dispensed"
            : "pending_payment",
    })
  );

  /**
   * -----------------------------
   * INVOICE
   * -----------------------------
   */
  const invoiceRow = invoiceRes.data;

  const items: LineItem[] = (
    invoiceRow?.invoice_items ?? []
  ).map((item: any) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    quantity: Number(item.quantity ?? 0),
    unitPrice: Number(item.unit_price ?? 0),
    totalPrice: Number(item.total_price ?? 0),
  }));

  const invoice: PatientInvoice = {
    invoiceNo: invoiceRow?.invoice_no ?? "",
    patientId: patient.patient_code,
    patientName: patient.full_name,
    coveragePlan: patient.coverage_plan ?? "Self-Pay",

    status: (invoiceRow?.status ?? "draft") as PatientInvoice["status"],

    items,

    subtotal: Number(invoiceRow?.subtotal ?? 0),

    discountAmount: Number(
      invoiceRow?.discount_amount ?? 0
    ),

    discountReason:
      invoiceRow?.discount_reason ?? undefined,

    approvedByPin:
      invoiceRow?.approved_by_pin ?? undefined,

    grandTotal: Number(
      invoiceRow?.grand_total ?? 0
    ),

    createdAt:
      invoiceRow?.created_at ??
      new Date().toISOString(),
  };

  /**
   * -----------------------------
   * ACTIVITY LOGS
   * -----------------------------
   */
  const activityLogs: ActivityLog[] = (
    logsRes.data ?? []
  ).map((log) => ({
    id: log.id,
    timestamp: log.created_at,
    module: log.module,
    action: log.action,
    performedBy: log.performed_by,
  }));

  /**
   * -----------------------------
   * DOCTOR ENCOUNTERS
   * -----------------------------
   */
  const encounters: Encounter[] = (
    encountersRes.data ?? []
  ).map((encounter) => ({
    id: encounter.id,

    slitLampOD:
      encounter.slit_lamp_od ??
      undefined,

    slitLampOS:
      encounter.slit_lamp_os ??
      undefined,

    refractionOD:
      encounter.refraction_od ??
      undefined,

    refractionOS:
      encounter.refraction_os ??
      undefined,

    diagnosis:
      encounter.diagnosis ??
      undefined,

    status:
      encounter.status === "completed"
        ? "completed"
        : "draft",

    createdAt:
      encounter.created_at ??
      new Date().toISOString(),
  }));

  /**
   * -----------------------------
   * FINAL PATIENT RECORD
   * -----------------------------
   */
  return {
    patientId: patient.patient_code,
    fullName: patient.full_name,
    coveragePlan:
      patient.coverage_plan ?? "Self-Pay",

    age:
      patient.age !== null &&
      patient.age !== undefined
        ? Number(patient.age)
        : undefined,

    gender:
      patient.gender ??
      undefined,

    phone:
      patient.phone ??
      undefined,

    allergies:
      patient.allergies ??
      undefined,

    vitals,

    diagnostics,

    prescriptions,

    invoice,

    activityLogs,

    encounters,
  };
}

/**
 * Registers a brand-new patient.
 *
 * Used by the patient-registration flow.
 */
export async function registerPatient(input: {
  fullName: string;
  coveragePlan?: string;
  age?: number;
  gender?: string;
  phone?: string;
  allergies?: string;
  status?:
    | "waiting_triage"
    | "in_consultation"
    | "completed_today";
  isWalkIn?: boolean;
}) {
  const fullName = input.fullName?.trim();

  if (!fullName) {
    throw new Error("Patient full name is required.");
  }

  const patientCode = `SPK-${Math.floor(
    10000 + Math.random() * 90000
  )}`;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      patient_code: patientCode,

      full_name: fullName,

      coverage_plan:
        input.coveragePlan ||
        "Self-Pay",

      age:
        input.age ??
        null,

      gender:
        input.gender ??
        null,

      phone:
        input.phone ??
        null,

      allergies:
        input.allergies ??
        null,

      status:
        input.status ??
        "waiting_triage",

      is_walk_in:
        input.isWalkIn ??
        false,

      last_visit_at:
        new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}
