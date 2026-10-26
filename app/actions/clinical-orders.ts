"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { recalcInvoice } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export type DiagnosticOrderInput = {
  patientCode: string;
  name: string;
  price: number;
};

export type PrescriptionInput = {
  patientCode: string;
  prescriptionText: string;
};

export type ClinicalOrderResponse = {
  success: boolean;
  message: string;
  id?: string;
};

async function findPatient(patientCode: string) {
  if (!patientCode?.trim()) {
    return {
      patient: null,
      error: "Patient code is required.",
    };
  }

  const { data: patient, error } = await supabaseServer
    .from("patients")
    .select("id, patient_code, full_name")
    .eq("patient_code", patientCode.trim())
    .maybeSingle();

  if (error) {
    console.error("Patient lookup failed:", error);

    return {
      patient: null,
      error: "Unable to find the patient record.",
    };
  }

  if (!patient) {
    return {
      patient: null,
      error: `Patient ${patientCode} was not found.`,
    };
  }

  return {
    patient,
    error: null,
  };
}

/**
 * Add a diagnostic order to the real patient's database record
 * and add the corresponding item to the patient's current invoice.
 */
export async function createDiagnosticOrder(
  input: DiagnosticOrderInput
): Promise<ClinicalOrderResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPHTHALMOLOGIST",
      "DOCTOR",
    ]);

    const name = input.name?.trim();
    const price = Number(input.price);

    if (!name) {
      return {
        success: false,
        message: "Diagnostic test name is required.",
      };
    }

    if (!Number.isFinite(price) || price < 0) {
      return {
        success: false,
        message: "Diagnostic price is invalid.",
      };
    }

    const { patient, error } = await findPatient(input.patientCode);

    if (!patient) {
      return {
        success: false,
        message: error ?? "Patient not found.",
      };
    }

    const { data: diagnosticResult, error: diagnosticError } = await supabaseServer.rpc(
      "create_diagnostic_order_atomic",
      {
        p_patient_id: patient.id,
        p_name: name,
        p_price: price,
        p_ordered_by: staff.id,
      }
    );

    if (diagnosticError || !diagnosticResult) {
      console.error("Atomic diagnostic order creation failed:", diagnosticError);
      return {
        success: false,
        message: "The investigation and its billing handoff could not be created together. Please retry.",
      };
    }

    const result = Array.isArray(diagnosticResult)
      ? diagnosticResult[0]
      : diagnosticResult;
    const diagnosticId = String(result.diagnostic_id);
    const { error: receptionHandoffError } = await supabaseServer
      .from("clinical_handoffs")
      .insert({
        patient_id: patient.id,
        destination: "RECEPTIONIST",
        handoff_type: "PROCEDURE",
        title: "Investigation request: " + name,
        details: "Doctor-requested investigation for " + patient.full_name + " (" + patient.patient_code + "). Test: " + name + ". The investigation queue receives the clinical order directly; Reception should coordinate patient readiness and follow-up. Order ID: " + diagnosticId,
        requested_by: staff.id,
      });
    if (receptionHandoffError) {
      console.error("Investigation Reception handoff failed after order creation:", receptionHandoffError);
    }
    const invoiceId = result.invoice_id ? String(result.invoice_id) : null;
    const pricePending = Boolean(result.price_pending);
    let invoiceRefreshFailed = false;

    if (invoiceId) {
      try {
        await recalcInvoice(invoiceId);
      } catch (recalcError) {
        invoiceRefreshFailed = true;
        console.error("Diagnostic invoice recalculation failed after atomic order save:", recalcError);
      }
    }

    await logActivity({
      module: "Diagnostics",
      category: "CLINICAL",
      action: pricePending
        ? "Investigation sent for pricing review: " + name
        : `Diagnostic order created: ${name}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        diagnosticOrderId: diagnosticId,
        testName: name,
        price,
        pricePending,
        invoiceId,
      }),
      financialAmount: price > 0 ? price : undefined,
    });

    revalidatePath("/diagnostics");
    revalidatePath("/receptionist");
    revalidatePath("/billing");
    revalidatePath("/cashier");
    revalidatePath("/doctor/patients/" + patient.patient_code + "/encounter");

    if (pricePending) {
      return {
        success: true,
        message: name + " has been sent to the investigation queue and Reception for coordination, and to Cashier for approved pricing. No zero-cost invoice item was created.",
        id: diagnosticId,
      };
    }

    return {
      success: true,
      message: invoiceRefreshFailed
        ? `${name} was ordered and its bill line was saved, but the displayed invoice total could not be refreshed. Do not create the order again; ask Cashier to refresh the bill before collecting payment.`
        : `${name} has been ordered and added to the patient's bill.`,
      id: diagnosticId,
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return {
          success: false,
          message: "You must be signed in to perform this action.",
        };
      }

      if (error.message === "FORBIDDEN") {
        return {
          success: false,
          message:
            "You are not authorized to create diagnostic orders.",
        };
      }
    }

    console.error("Create diagnostic order error:", error);

    return {
      success: false,
      message:
        "An unexpected error occurred while creating the diagnostic order.",
    };
  }
}

/**
 * Register a walk-in referred by another centre for investigation only.
 * The order still goes through the existing cashier payment workflow.
 */
export async function createExternalDiagnosticOrder(input: {
  fullName: string;
  age?: number | null;
  gender?: string;
  phone?: string;
  referringCenter: string;
  testName: string;
  price: number;
}): Promise<ClinicalOrderResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "RECEPTIONIST",
      "NURSE",
      "DOCTOR",
      "OPHTHALMOLOGIST",
    ]);

    const fullName = input.fullName?.trim();
    const referringCenter = input.referringCenter?.trim();
    const name = input.testName?.trim();
    const price = Number(input.price);

    if (!fullName || !referringCenter || !name) {
      return {
        success: false,
        message: "Patient name, referring centre, and investigation are required.",
      };
    }

    if (!Number.isFinite(price) || price < 0) {
      return { success: false, message: "Enter a valid investigation price." };
    }

    const age = input.age == null ? undefined : Number(input.age);
    if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 150)) {
      return { success: false, message: "Age must be a whole number between 0 and 150." };
    }

    let result: Record<string, unknown> | null = null;
    let lastError: { code?: string; message?: string; details?: string; hint?: string } | null = null;

    // Patient + investigation + invoice line/handoff are one database transaction.
    // Retry only patient-code collisions; never repeat unrelated failures.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const patientCode = `SPK-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data, error } = await supabaseServer.rpc(
        "create_external_diagnostic_order_atomic",
        {
          p_patient_code: patientCode,
          p_full_name: fullName,
          p_age: age ?? null,
          p_gender: input.gender?.trim() || null,
          p_phone: input.phone?.trim() || null,
          p_referring_center: referringCenter,
          p_test_name: name,
          p_price: price,
          p_ordered_by: staff.id,
        }
      );

      if (!error) {
        const value = Array.isArray(data) ? data[0] : data;
        if (!value || typeof value !== "object") {
          throw new Error("External diagnostic registration returned incomplete data.");
        }
        result = value as Record<string, unknown>;
        break;
      }

      lastError = error;
      const errorContext = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
      if (error.code === "23505" && /patient_code/i.test(errorContext) && attempt < 4) {
        continue;
      }
      throw error;
    }

    if (!result) {
      throw lastError ?? new Error("Unable to register the external diagnostic patient.");
    }

    const patient = {
      id: String(result.patient_id),
      patient_code: String(result.patient_code),
      full_name: String(result.patient_name),
    };
    const diagnosticId = String(result.diagnostic_id);
    const invoiceId = result.invoice_id ? String(result.invoice_id) : null;
    const pricePending = Boolean(result.price_pending);
    let invoiceRefreshFailed = false;

    if (invoiceId) {
      try {
        await recalcInvoice(invoiceId);
      } catch (recalcError) {
        invoiceRefreshFailed = true;
        console.error("External diagnostic invoice recalculation failed after atomic registration:", recalcError);
      }
    }

    await logActivity({
      module: "Diagnostics",
      category: "CLINICAL",
      action: "External investigation registered: " + name,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        diagnosticOrderId: diagnosticId,
        patientCode: patient.patient_code,
        testName: name,
        price,
        referringCenter,
        externalReferral: true,
      }),
      financialAmount: price,
    });

    revalidatePath("/diagnostics");
    revalidatePath("/cashier");
    revalidatePath("/billing");

    return {
      success: true,
      message: pricePending
        ? `${patient.full_name} has been registered for investigation only and sent to Cashier for approved pricing. Do not treat this as a free test.`
        : invoiceRefreshFailed
          ? `${patient.full_name} and the investigation were registered, and the bill line was saved, but the displayed total could not be refreshed. Do not register the investigation again; ask Cashier to refresh the bill.`
          : `${patient.full_name} has been registered for investigation only. Please complete payment at the cashier before testing.`,
      id: diagnosticId,
    };
  } catch (error) {
    console.error("External diagnostic registration failed:", error);
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, message: "Please sign in again to continue." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, message: "You are not authorized to register external investigation patients." };
    }
    return { success: false, message: "Unable to register the external investigation patient. Ensure the database migration has been applied and try again." };
  }
}

/**
 * Add a prescription to the real patient's database record
 * and add the corresponding pharmacy item to the patient's invoice.
 */
export async function createPrescription(
  input: PrescriptionInput
): Promise<ClinicalOrderResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPHTHALMOLOGIST",
      "DOCTOR",
    ]);

    const prescriptionText = input.prescriptionText?.trim();
    if (!prescriptionText) {
      return { success: false, message: "Prescription instructions are required." };
    }
    if (prescriptionText.length > 5000) {
      return { success: false, message: "Prescription instructions must be 5,000 characters or fewer." };
    }

    const { patient, error } = await findPatient(input.patientCode);
    if (!patient) {
      return { success: false, message: error ?? "Patient not found." };
    }

    // This is a clinical request only. Pharmacy confirms the stock item,
    // quantity and approved price before creating the billable medication.
    const { data: prescription, error: prescriptionError } = await supabaseServer
      .from("prescriptions")
      .insert({
        patient_id: patient.id,
        drug_name: "Doctor's prescription request — review required",
        dosage: prescriptionText,
        quantity: 1,
        price_per_unit: 0,
        total_price: 0,
        status: "awaiting_pharmacy_review",
        prescribed_by: staff.id,
      })
      .select("id")
      .single();

    if (prescriptionError) {
      console.error("Prescription request creation failed:", prescriptionError);
      return { success: false, message: "Failed to send the prescription request to Pharmacy." };
    }

    await logActivity({
      module: "Pharmacy",
      category: "CLINICAL",
      action: "Prescription request sent for pharmacy review",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({ prescriptionRequestId: prescription.id }),
    });

    revalidatePath(`/doctor/patients/${patient.patient_code}/encounter`);
    revalidatePath("/pharmacy");

    return {
      success: true,
      message: "Prescription sent to Pharmacy for review. No charge has been added; Pharmacy must confirm the medication and price.",
      id: prescription.id,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return { success: false, message: "You must be signed in to perform this action." };
      }
      if (error.message === "FORBIDDEN") {
        return { success: false, message: "You are not authorized to create prescription requests." };
      }
    }
    console.error("Create prescription request error:", error);
    return { success: false, message: "An unexpected error occurred while sending the prescription request." };
  }
}
