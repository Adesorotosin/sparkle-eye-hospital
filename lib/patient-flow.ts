// lib/patient-flow.ts

import { supabaseServer } from "@/lib/supabase-server";
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
 * Finds an existing patient by patient code.
 *
 * IMPORTANT:
 * This function NEVER creates a patient.
 *
 * Use this for clinical workflows where the patient must already
 * exist, such as:
 * - Triage
 * - Doctor consultation
 * - Diagnostics
 * - Pharmacy
 * - Billing
 * - Cashier
 */
export async function getPatientByCode(patientCode: string) {
  const code = patientCode?.trim();

  if (!code) {
    throw new Error("Patient code is required.");
  }

  const { data: patient, error } = await supabaseServer
    .from("patients")
    .select("*")
    .eq("patient_code", code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return patient;
}

/**
 * Finds a patient by patient code.
 *
 * If the patient does not exist, this creates a minimal patient record.
 *
 * IMPORTANT:
 * This function should ONLY be used by legacy/general workflows
 * where automatic patient creation is explicitly intended.
 *
 * Clinical workflows should use getPatientByCode() instead.
 */
export async function getOrCreatePatientByCode(patientCode: string) {
  const code = patientCode?.trim();

  if (!code) {
    throw new Error("Patient code is required.");
  }

  const existing = await getPatientByCode(code);

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabaseServer
    .from("patients")
    .insert({
      patient_code: code,
      full_name: code,
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}

/**
 * Finds the patient's active billing invoice or creates a new draft invoice.
 *
 * IMPORTANT:
 * Only draft/pending invoices can receive new clinical items.
 * Paid and cancelled invoices must never be reused.
 */
export async function getOrCreateDraftInvoice(patientId: string) {
  if (!patientId?.trim()) {
    throw new Error("Patient ID is required.");
  }

  /*
   * Only an invoice that is still open for billing can receive
   * new diagnostic or pharmacy items.
   */
  const { data: existing, error: findError } = await supabaseServer
    .from("invoices")
    .select("*")
    .eq("patient_id", patientId)
    .in("status", ["draft", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing;
  }

  /*
   * No active invoice exists.
   * Create a completely new draft invoice.
   */
  const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const { data: created, error: createError } = await supabaseServer
    .from("invoices")
    .insert({
      invoice_no: invoiceNo,
      patient_id: patientId,
      status: "draft",
      vat_rate: 0,
      vat_amount: 0,
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}

/**
 * Rounds a monetary value to two decimal places.
 *
 * Keeping currency values at two decimal places prevents floating-point
 * precision issues such as 228.349999999.
 */
function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Reads the currently configured VAT percentage from system settings.
 *
 * The Admin Settings page stores the billing configuration in:
 * system_settings.billing
 *
 * Example:
 * {
 *   "vatRate": "5%",
 *   "invoiceDueDays": "30 Days"
 * }
 *
 * If the setting is missing or invalid, VAT defaults to 0%.
 */
async function getConfiguredVatRate(): Promise<number> {
  const { data: settings, error } = await supabaseServer
    .from("system_settings")
    .select("billing")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.error("Failed to load billing settings:", error);
    throw error;
  }

  if (!settings) {
    console.warn(
      "Default system settings were not found. VAT will default to 0%."
    );
    return 0;
  }

  const billing = settings.billing;

  if (
    typeof billing !== "object" ||
    billing === null ||
    Array.isArray(billing)
  ) {
    console.warn(
      "Billing settings are not stored as an object. VAT will default to 0%."
    );
    return 0;
  }

  const rawVatRate = (
    billing as Record<string, unknown>
  ).vatRate;

  if (rawVatRate === undefined || rawVatRate === null) {
    console.warn(
      "vatRate was not found in billing settings. VAT will default to 0%."
    );
    return 0;
  }

  const normalizedVatRate = String(rawVatRate)
    .trim()
    .replace(/%/g, "");

  const vatRate = Number(normalizedVatRate);

  if (
    !Number.isFinite(vatRate) ||
    vatRate < 0 ||
    vatRate > 100
  ) {
    console.warn(
      `Invalid VAT rate "${String(rawVatRate)}". VAT will default to 0%.`
    );
    return 0;
  }

  return roundCurrency(vatRate);
}

/**
 * Recalculates an invoice from its line items.
 *
 * Calculation order:
 *
 * 1. Sum invoice line items -> subtotal
 * 2. Apply existing discount
 * 3. Read current Admin VAT setting
 * 4. Calculate VAT on the discounted amount
 * 5. Add VAT -> grand total
 *
 * VAT rate and VAT amount are persisted on the invoice so the
 * invoice retains the actual tax information used during calculation.
 */
export async function recalcInvoice(invoiceId: string) {
  if (!invoiceId?.trim()) {
    throw new Error("Invoice ID is required.");
  }

  const { data: items, error: itemsError } = await supabaseServer
    .from("invoice_items")
    .select("total_price")
    .eq("invoice_id", invoiceId);

  if (itemsError) {
    throw itemsError;
  }

  const { data: invoice, error: invoiceError } = await supabaseServer
    .from("invoices")
    .select("discount_amount")
    .eq("id", invoiceId)
    .single();

  if (invoiceError) {
    throw invoiceError;
  }

  const subtotal = roundCurrency(
    (items ?? []).reduce(
      (sum, item) =>
        sum + Number(item.total_price ?? 0),
      0
    )
  );

  const discountAmount = roundCurrency(
    Math.min(
      Math.max(
        0,
        Number(invoice.discount_amount ?? 0)
      ),
      subtotal
    )
  );

  const taxableAmount = roundCurrency(
    Math.max(
      0,
      subtotal - discountAmount
    )
  );

  const vatRate = await getConfiguredVatRate();

  const vatAmount = roundCurrency(
    taxableAmount * (vatRate / 100)
  );

  const grandTotal = roundCurrency(
    taxableAmount + vatAmount
  );

  const { error: updateError } = await supabaseServer
    .from("invoices")
    .update({
      subtotal,
      discount_amount: discountAmount,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      grand_total: grandTotal,
    })
    .eq("id", invoiceId);

  if (updateError) {
    throw updateError;
  }

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    vatRate,
    vatAmount,
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
   * Legacy IOP field retained for older UI components.
   */
  const legacyIop =
    row.iop !== null && row.iop !== undefined
      ? Number(row.iop)
      : iopOD ?? iopOS ?? 0;

  const rawSymptoms = row.symptoms;

  let symptoms: string[] | undefined;

  if (Array.isArray(rawSymptoms)) {
    symptoms = rawSymptoms
      .filter(Boolean)
      .map(String);
  } else if (
    typeof rawSymptoms === "string" &&
    rawSymptoms.trim()
  ) {
    symptoms = rawSymptoms
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  return {
    visualAcuityOD,
    visualAcuityOS,

    visualAcuityOU:
      row.visual_acuity_ou ?? undefined,

    withCorrection:
      row.with_correction !== null &&
      row.with_correction !== undefined
        ? Boolean(row.with_correction)
        : undefined,

    iopOD,
    iopOS,

    iop:
      Number.isFinite(legacyIop)
        ? legacyIop
        : 0,

    iopInstrument:
      row.iop_instrument ?? undefined,

    bpSystolic:
      row.bp_systolic !== null &&
      row.bp_systolic !== undefined
        ? Number(row.bp_systolic)
        : undefined,

    bpDiastolic:
      row.bp_diastolic !== null &&
      row.bp_diastolic !== undefined
        ? Number(row.bp_diastolic)
        : undefined,

    pulse:
      row.pulse !== null &&
      row.pulse !== undefined
        ? Number(row.pulse)
        : undefined,

    temperature:
      row.temperature !== null &&
      row.temperature !== undefined
        ? Number(row.temperature)
        : undefined,

    spo2:
      row.spo2 !== null &&
      row.spo2 !== undefined
        ? Number(row.spo2)
        : undefined,

    primaryComplaint:
      row.primary_complaint ?? "",

    symptoms,

    severity:
      row.severity === "Mild" ||
      row.severity === "Moderate" ||
      row.severity === "Severe"
        ? row.severity
        : undefined,

    durationText:
      row.duration_text ?? undefined,

    recordedAt:
      row.recorded_at ??
      row.created_at ??
      new Date().toISOString(),
  };
}

/**
 * Assembles the complete patient record from Supabase.
 *
 * Shared by:
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

  if (!code) {
    return null;
  }

  const { data: patient, error: patientError } =
    await supabaseServer
      .from("patients")
      .select("*")
      .eq("patient_code", code)
      .maybeSingle();

  if (patientError) {
    throw patientError;
  }

  if (!patient) {
    return null;
  }

  const [
    vitalsRes,
    diagnosticsRes,
    prescriptionsRes,
    invoiceRes,
    logsRes,
    encountersRes,
  ] = await Promise.all([
    supabaseServer
      .from("vitals")
      .select("*")
      .eq("patient_id", patient.id)
      .order("recorded_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),

    supabaseServer
      .from("diagnostic_orders")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", {
        ascending: true,
      }),

    supabaseServer
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", {
        ascending: true,
      }),

    supabaseServer
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("patient_id", patient.id)
      .neq("status", "cancelled")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),

    supabaseServer
      .from("activity_logs")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", {
        ascending: false,
      }),

    supabaseServer
      .from("encounters")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (vitalsRes.error) {
    throw vitalsRes.error;
  }

  if (diagnosticsRes.error) {
    throw diagnosticsRes.error;
  }

  if (prescriptionsRes.error) {
    throw prescriptionsRes.error;
  }

  if (invoiceRes.error) {
    throw invoiceRes.error;
  }

  if (logsRes.error) {
    throw logsRes.error;
  }

  if (encountersRes.error) {
    throw encountersRes.error;
  }

  const vitals: TriageVitals | undefined =
    vitalsRes.data
      ? mapVitals(vitalsRes.data)
      : undefined;

  const diagnostics: DiagnosticOrder[] =
    (diagnosticsRes.data ?? []).map(
      (diagnostic) => ({
        id: diagnostic.id,
        name: diagnostic.name,
        price: Number(
          diagnostic.price ?? 0
        ),
        status:
          diagnostic.status === "completed"
            ? "completed"
            : diagnostic.status === "ready_for_test"
              ? "ready_for_test"
              : "ordered",
        findings: diagnostic.findings ?? undefined,
        interpretation: diagnostic.interpretation ?? undefined,
        completedAt: diagnostic.completed_at ?? undefined,
      })
    );

  const prescriptions: Prescription[] =
    (prescriptionsRes.data ?? []).map(
      (prescription) => ({
        id: prescription.id,
        drugName: prescription.drug_name,
        dosage: prescription.dosage,
        quantity: Number(
          prescription.quantity ?? 0
        ),
        pricePerUnit: Number(
          prescription.price_per_unit ?? 0
        ),
        totalPrice: Number(
          prescription.total_price ?? 0
        ),
        status:
          prescription.status ===
          "ready_for_dispensing"
            ? "ready_for_dispensing"
            : prescription.status ===
                "dispensed"
              ? "dispensed"
              : "pending_payment",
      })
    );

  const invoiceRow = invoiceRes.data;

  const items: LineItem[] = (
    invoiceRow?.invoice_items ?? []
  ).map((item: any) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    quantity: Number(
      item.quantity ?? 0
    ),
    unitPrice: Number(
      item.unit_price ?? 0
    ),
    totalPrice: Number(
      item.total_price ?? 0
    ),
  }));

  const invoice: PatientInvoice = {
    invoiceNo:
      invoiceRow?.invoice_no ?? "",

    patientId:
      patient.patient_code,

    patientName:
      patient.full_name,

    coveragePlan:
      patient.coverage_plan ??
      "Self-Pay",

    status:
      (invoiceRow?.status ??
        "draft") as PatientInvoice["status"],

    items,

    subtotal:
      Number(invoiceRow?.subtotal ?? 0),

    vatRate:
      Number(invoiceRow?.vat_rate ?? 0),

    vatAmount:
      Number(invoiceRow?.vat_amount ?? 0),

    discountAmount:
      Number(
        invoiceRow?.discount_amount ?? 0
      ),

    discountReason:
      invoiceRow?.discount_reason ??
      undefined,

    grandTotal:
      Number(
        invoiceRow?.grand_total ?? 0
      ),

    createdAt:
      invoiceRow?.created_at ??
      new Date().toISOString(),
  };

  const activityLogs: ActivityLog[] =
    (logsRes.data ?? []).map(
      (log) => ({
        id: log.id,
        timestamp: log.created_at,
        module: log.module,
        action: log.action,
        performedBy: log.performed_by,
      })
    );

  const encounters: Encounter[] =
    (encountersRes.data ?? []).map(
      (encounter) => ({
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
          encounter.status ===
          "completed"
            ? "completed"
            : "draft",

        createdAt:
          encounter.created_at ??
          new Date().toISOString(),
      })
    );

  return {
    patientId:
      patient.patient_code,

    fullName:
      patient.full_name,

    coveragePlan:
      patient.coverage_plan ??
      "Self-Pay",

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
 * This is the correct place for patient creation.
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
  const fullName =
    input.fullName?.trim();

  if (!fullName) {
    throw new Error(
      "Patient full name is required."
    );
  }

  const patientCode =
    `SPK-${Math.floor(
      10000 +
        Math.random() * 90000
    )}`;

  const { data, error } =
    await supabaseServer
      .from("patients")
      .insert({
        patient_code:
          patientCode,

        full_name:
          fullName,

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

  if (error) {
    throw error;
  }

  return data;
}