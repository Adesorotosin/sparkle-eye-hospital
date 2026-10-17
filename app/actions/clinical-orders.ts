"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import {
  getOrCreateDraftInvoice,
  recalcInvoice,
  registerPatient,
} from "@/lib/patient-flow";
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

    /*
     * Create the clinical diagnostic order.
     */
    const { data: diagnostic, error: diagnosticError } =
      await supabaseServer
        .from("diagnostic_orders")
        .insert({
          patient_id: patient.id,
          name,
          price,
          status: "ordered",
          ordered_by: staff.id,
        })
        .select("id")
        .single();

    if (diagnosticError) {
      console.error(
        "Diagnostic order creation failed:",
        diagnosticError
      );

      return {
        success: false,
        message: "Failed to create the diagnostic order.",
      };
    }

    if (price === 0) {
      const { error: pricingHandoffError } = await supabaseServer
        .from("clinical_handoffs")
        .insert({
          patient_id: patient.id,
          destination: "CASHIER",
          handoff_type: "PRICING_REVIEW",
          title: "Pricing review required: " + name,
          details: "An investigation order was created for " + name + ", but no approved price is configured. Add the approved investigation charge before billing; do not treat this as a free test. Order ID: " + diagnostic.id,
          requested_by: staff.id,
        });
      if (pricingHandoffError) {
        console.error("Investigation pricing-review handoff failed:", pricingHandoffError);
        return { success: false, message: "Investigation order was created, but its pricing-review request could not be sent to Cashier. Refresh the patient record and notify the administrator; do not retry blindly.", id: diagnostic.id };
      }
      await logActivity({
        module: "Diagnostics", category: "CLINICAL",
        action: "Investigation sent for pricing review: " + name,
        performedBy: staff.name, staffId: staff.id, patientId: patient.id,
        details: JSON.stringify({ diagnosticOrderId: diagnostic.id, testName: name, pricePending: true }),
      });
      revalidatePath("/diagnostics");
      revalidatePath("/billing");
      revalidatePath("/cashier");
      revalidatePath("/doctor/patients/" + patient.patient_code + "/encounter");
      return { success: true, message: name + " has been ordered and sent to Cashier for approved pricing. No zero-cost invoice item was created.", id: diagnostic.id };
    }

    /*
     * Get the patient's active invoice. The diagnostic row already exists,
     * so preserve its ID if billing setup fails; the UI can refresh and
     * show the order rather than encouraging a blind retry.
     */
    let invoice: Awaited<ReturnType<typeof getOrCreateDraftInvoice>>;
    try {
      invoice = await getOrCreateDraftInvoice(patient.id);
    } catch (invoiceError) {
      console.error("Diagnostic invoice lookup failed:", invoiceError);
      return {
        success: false,
        message:
          "Diagnostic order was created, but the patient's invoice could not be opened. Refresh the patient record before retrying.",
        id: diagnostic.id,
      };
    }

    /*
     * Add the diagnostic to the invoice.
     */
    const { error: itemError } = await supabaseServer
      .from("invoice_items")
      .insert({
        invoice_id: invoice.id,
        category: "diagnostic",
        name,
        quantity: 1,
        unit_price: price,
        total_price: price,
      });

    if (itemError) {
      console.error(
        "Diagnostic invoice item creation failed:",
        itemError
      );

      return {
        success: false,
        message:
          "Diagnostic order was created, but it could not be added to the invoice.",
        id: diagnostic.id,
      };
    }

    try {
      await recalcInvoice(invoice.id);
    } catch (recalcError) {
      console.error("Diagnostic invoice recalculation failed:", recalcError);
      return {
        success: false,
        message:
          "Diagnostic order and billing item were created, but the invoice total could not be recalculated. Refresh the patient record before retrying.",
        id: diagnostic.id,
      };
    }

    /*
     * Record the clinical activity using the actual
     * authenticated staff member.
     */
    await logActivity({
      module: "Diagnostics",
      category: "CLINICAL",
      action: `Diagnostic order created: ${name}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        diagnosticOrderId: diagnostic.id,
        testName: name,
        price,
      }),
      financialAmount: price,
    });

    revalidatePath(
      `/doctor/patients/${patient.patient_code}/encounter`
    );

    revalidatePath("/billing");
    revalidatePath("/cashier");

    return {
      success: true,
      message: `${name} has been ordered and added to the patient's bill.`,
      id: diagnostic.id,
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

    const patient = await registerPatient({
      fullName,
      age,
      gender: input.gender?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      status: "completed_today",
      isWalkIn: true,
    });

    const { data: diagnostic, error: diagnosticError } = await supabaseServer
      .from("diagnostic_orders")
      .insert({
        patient_id: patient.id,
        name,
        price,
        status: "ordered",
        ordered_by: staff.id,
        referral_source: referringCenter,
        external_referral: true,
      })
      .select("id")
      .single();

    if (diagnosticError) throw diagnosticError;

    const invoice = await getOrCreateDraftInvoice(patient.id);
    const { error: itemError } = await supabaseServer
      .from("invoice_items")
      .insert({
        invoice_id: invoice.id,
        category: "diagnostic",
        name,
        quantity: 1,
        unit_price: price,
        total_price: price,
      });

    if (itemError) {
      console.error("External diagnostic invoice item creation failed:", itemError);
      return {
        success: false,
        message: "Patient and investigation were registered, but the bill item could not be created. Please contact an administrator.",
        id: diagnostic.id,
      };
    }

    await recalcInvoice(invoice.id);
    await logActivity({
      module: "Diagnostics",
      category: "CLINICAL",
      action: "External investigation registered: " + name,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        diagnosticOrderId: diagnostic.id,
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
      message: patient.full_name + " has been registered for investigation only. Please complete payment at the cashier before testing.",
      id: diagnostic.id,
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
