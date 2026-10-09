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
  drugName: string;
  dosage: string;
  quantity: number;
  pricePerUnit: number;
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

    /*
     * Get the patient's active invoice.
     */
    const invoice = await getOrCreateDraftInvoice(patient.id);

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

    await recalcInvoice(invoice.id);

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

    const drugName = input.drugName?.trim();
    const dosage = input.dosage?.trim();

    const quantity = Number(input.quantity);
    const pricePerUnit = Number(input.pricePerUnit);

    if (!drugName) {
      return {
        success: false,
        message: "Medication name is required.",
      };
    }

    if (!dosage) {
      return {
        success: false,
        message: "Dosage and medication instructions are required.",
      };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        success: false,
        message: "Quantity must be a whole number greater than zero.",
      };
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      return {
        success: false,
        message: "Price per unit is invalid.",
      };
    }

    const totalPrice = quantity * pricePerUnit;

    const { patient, error } = await findPatient(input.patientCode);

    if (!patient) {
      return {
        success: false,
        message: error ?? "Patient not found.",
      };
    }

    /*
     * Create the actual prescription.
     */
    const { data: prescription, error: prescriptionError } =
      await supabaseServer
        .from("prescriptions")
        .insert({
          patient_id: patient.id,
          drug_name: drugName,
          dosage,
          quantity,
          price_per_unit: pricePerUnit,
          total_price: totalPrice,
          status: "pending_payment",
          prescribed_by: staff.id,
        })
        .select("id")
        .single();

    if (prescriptionError) {
      console.error(
        "Prescription creation failed:",
        prescriptionError
      );

      return {
        success: false,
        message: "Failed to create the prescription.",
      };
    }

    /*
     * Get the active invoice.
     */
    const invoice = await getOrCreateDraftInvoice(patient.id);

    /*
     * Add the medication to billing.
     */
    const { error: itemError } = await supabaseServer
      .from("invoice_items")
      .insert({
        invoice_id: invoice.id,
        category: "pharmacy",
        name: drugName,
        quantity,
        unit_price: pricePerUnit,
        total_price: totalPrice,
      });

    if (itemError) {
      console.error(
        "Prescription invoice item creation failed:",
        itemError
      );

      return {
        success: false,
        message:
          "Prescription was created, but it could not be added to the invoice.",
        id: prescription.id,
      };
    }

    await recalcInvoice(invoice.id);

    /*
     * Record the pharmacy activity using the actual
     * authenticated staff member.
     */
    await logActivity({
      module: "Pharmacy",
      category: "CLINICAL",
      action: `Prescription created: ${drugName}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        prescriptionId: prescription.id,
        drugName,
        dosage,
        quantity,
        pricePerUnit,
        totalPrice,
      }),
      financialAmount: totalPrice,
    });

    revalidatePath(
      `/doctor/patients/${patient.patient_code}/encounter`
    );

    revalidatePath("/billing");
    revalidatePath("/cashier");
    revalidatePath("/pharmacy");

    return {
      success: true,
      message: `${drugName} has been prescribed and added to the patient's bill.`,
      id: prescription.id,
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
            "You are not authorized to create prescriptions.",
        };
      }
    }

    console.error("Create prescription error:", error);

    return {
      success: false,
      message:
        "An unexpected error occurred while creating the prescription.",
    };
  }
}