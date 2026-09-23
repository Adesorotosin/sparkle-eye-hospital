"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getPatientRecord, recalcInvoice } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";

export type BillingPaymentMethod =
  | "cash"
  | "pos"
  | "transfer"
  | "card"
  | "hmo";

export type DiscountType = "fixed" | "percentage";

export type BillingActionResponse = {
  success: boolean;
  message: string;
  changeDue?: number;
  grandTotal?: number;
};

async function findPatient(patientCode: string) {
  const code = patientCode?.trim();

  if (!code) {
    return {
      patient: null,
      error: "Patient code is required.",
    };
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .select("id, patient_code, full_name, coverage_plan")
    .eq("patient_code", code)
    .maybeSingle();

  if (error) {
    console.error("Billing patient lookup failed:", error);

    return {
      patient: null,
      error: "Unable to find the patient record.",
    };
  }

  if (!patient) {
    return {
      patient: null,
      error: `Patient ${code} was not found.`,
    };
  }

  return {
    patient,
    error: null,
  };
}

/**
 * Load a real patient record for Billing.
 *
 * If a patient code is supplied, that patient is loaded.
 * If no code is supplied, the most recent patient with an unpaid
 * or draft invoice is returned.
 */
export async function getBillingPatient(patientCode?: string) {
  try {
    if (patientCode?.trim()) {
      const { patient, error } = await findPatient(patientCode);

      if (!patient) {
        return {
          success: false,
          message: error ?? "Patient not found.",
          patient: null,
        };
      }

      const record = await getPatientRecord(patient.patient_code);

      return {
        success: true,
        message: "Billing record loaded.",
        patient: record,
      };
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("patient_id, status, created_at")
      .in("status", ["draft", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoiceError) {
      console.error(
        "Billing invoice lookup failed:",
        invoiceError
      );

      return {
        success: false,
        message: "Unable to load the billing queue.",
        patient: null,
      };
    }

    if (!invoice) {
      return {
        success: false,
        message: "There are no pending invoices.",
        patient: null,
      };
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("patient_code")
      .eq("id", invoice.patient_id)
      .maybeSingle();

    if (patientError || !patient) {
      return {
        success: false,
        message: "The patient attached to this invoice could not be found.",
        patient: null,
      };
    }

    const record = await getPatientRecord(patient.patient_code);

    return {
      success: true,
      message: "Billing record loaded.",
      patient: record,
    };
  } catch (error) {
    console.error("Get billing patient error:", error);

    return {
      success: false,
      message: "An unexpected error occurred while loading billing.",
      patient: null,
    };
  }
}

/**
 * Apply an authorized discount to the patient's current invoice.
 *
 * The admin PIN is deliberately checked on the server.
 *
 * Set:
 *
 * BILLING_ADMIN_PIN=your-secret-pin
 *
 * in your environment variables.
 */
export async function applyBillingDiscount(input: {
  patientCode: string;
  discountType: DiscountType;
  value: number;
  reason: string;
  adminPin: string;
}): Promise<BillingActionResponse> {
  try {
    const {
      patientCode,
      discountType,
      value,
      reason,
      adminPin,
    } = input;

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return {
        success: false,
        message: "Enter a valid discount amount.",
      };
    }

    if (!reason?.trim()) {
      return {
        success: false,
        message: "A reason for the discount is required.",
      };
    }

    const configuredPin = process.env.BILLING_ADMIN_PIN;

    if (!configuredPin) {
      console.error(
        "BILLING_ADMIN_PIN is not configured."
      );

      return {
        success: false,
        message:
          "Billing administrator authorization is not configured.",
      };
    }

    if (!adminPin || adminPin !== configuredPin) {
      return {
        success: false,
        message: "Invalid administrator PIN.",
      };
    }

    const { patient, error } = await findPatient(patientCode);

    if (!patient) {
      return {
        success: false,
        message: error ?? "Patient not found.",
      };
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("patient_id", patient.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoiceError) {
      console.error(
        "Invoice lookup failed:",
        invoiceError
      );

      return {
        success: false,
        message: "Unable to load the patient's invoice.",
      };
    }

    if (!invoice) {
      return {
        success: false,
        message: "No active invoice exists for this patient.",
      };
    }

    if (invoice.status === "paid") {
      return {
        success: false,
        message: "A paid invoice cannot be discounted.",
      };
    }

    /*
     * Recalculate first so the discount is applied to the
     * current invoice subtotal.
     */
    const recalculated = await recalcInvoice(invoice.id);

    const subtotal = Number(
      recalculated.subtotal ?? invoice.subtotal ?? 0
    );

    let discountAmount = numericValue;

    if (discountType === "percentage") {
      if (numericValue > 100) {
        return {
          success: false,
          message: "Percentage discount cannot exceed 100%.",
        };
      }

      discountAmount = subtotal * (numericValue / 100);
    }

    discountAmount = Math.min(
      Math.max(0, discountAmount),
      subtotal
    );

    const grandTotal = Math.max(
      0,
      subtotal - discountAmount
    );

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        discount_amount: discountAmount,
        discount_reason: reason.trim(),
        approved_by_pin: "AUTHORIZED",
        subtotal,
        grand_total: grandTotal,
      })
      .eq("id", invoice.id);

    if (updateError) {
      console.error(
        "Invoice discount update failed:",
        updateError
      );

      return {
        success: false,
        message: "Failed to apply the discount.",
      };
    }

    await logActivity({
      module: "Billing",
      category: "BILLING",
      action: `Discount applied to invoice ${invoice.invoice_no}`,
      performedBy: "Billing Administrator",
      patientId: patient.id,
      details: JSON.stringify({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoice_no,
        discountType,
        requestedValue: numericValue,
        discountAmount,
        reason: reason.trim(),
        grandTotal,
      }),
      financialAmount: discountAmount,
    });

    revalidatePath("/billing");
    revalidatePath("/cashier");

    return {
      success: true,
      message: `Discount of ₦${discountAmount.toLocaleString()} applied successfully.`,
      grandTotal,
    };
  } catch (error) {
    console.error("Apply billing discount error:", error);

    return {
      success: false,
      message:
        "An unexpected error occurred while applying the discount.",
    };
  }
}

/**
 * Process payment for the current invoice.
 *
 * There is currently no separate payments table in the repository,
 * so the invoice itself becomes the source of truth for payment
 * completion while the payment method is preserved in the audit log.
 */
export async function processBillingPayment(input: {
  patientCode: string;
  paymentMethod: BillingPaymentMethod;
  amountRendered: number;
}): Promise<BillingActionResponse> {
  try {
    const amountRendered = Number(input.amountRendered);

    if (
      !Number.isFinite(amountRendered) ||
      amountRendered < 0
    ) {
      return {
        success: false,
        message: "Invalid amount rendered.",
      };
    }

    const { patient, error } = await findPatient(
      input.patientCode
    );

    if (!patient) {
      return {
        success: false,
        message: error ?? "Patient not found.",
      };
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("patient_id", patient.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoiceError) {
      console.error(
        "Payment invoice lookup failed:",
        invoiceError
      );

      return {
        success: false,
        message: "Unable to load the patient's invoice.",
      };
    }

    if (!invoice) {
      return {
        success: false,
        message: "No active invoice exists for this patient.",
      };
    }

    if (invoice.status === "paid") {
      return {
        success: false,
        message: "This invoice has already been paid.",
      };
    }

    /*
     * Always recalculate immediately before payment.
     */
    const totals = await recalcInvoice(invoice.id);

    const grandTotal = Number(totals.grandTotal ?? 0);

    if (grandTotal <= 0) {
      return {
        success: false,
        message:
          "This invoice has no amount due and cannot be processed as a normal payment.",
      };
    }

    if (input.paymentMethod === "cash" && amountRendered < grandTotal) {
      return {
        success: false,
        message: "The amount rendered is insufficient.",
        grandTotal,
      };
    }

    /*
     * For POS, transfer, card and HMO, the entered amount is not
     * treated as physical cash. The system still requires the
     * transaction amount to cover the invoice.
     */
    const effectivePaymentAmount =
      input.paymentMethod === "cash"
        ? amountRendered
        : grandTotal;

    if (
      input.paymentMethod !== "cash" &&
      effectivePaymentAmount < grandTotal
    ) {
      return {
        success: false,
        message: "The payment amount is insufficient.",
        grandTotal,
      };
    }

    const { error: paymentError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        grand_total: grandTotal,
      })
      .eq("id", invoice.id)
      .neq("status", "paid");

    if (paymentError) {
      console.error(
        "Invoice payment update failed:",
        paymentError
      );

      return {
        success: false,
        message: "Failed to complete the payment.",
      };
    }

    /*
     * Once the invoice is paid:
     *
     * 1. Diagnostics become completed.
     * 2. Prescriptions become ready for dispensing.
     */
    const { error: diagnosticError } = await supabase
      .from("diagnostic_orders")
      .update({
        status: "completed",
      })
      .eq("patient_id", patient.id)
      .eq("status", "ordered");

    if (diagnosticError) {
      console.error(
        "Diagnostic status update failed:",
        diagnosticError
      );
    }

    const { error: prescriptionError } = await supabase
      .from("prescriptions")
      .update({
        status: "ready_for_dispensing",
      })
      .eq("patient_id", patient.id)
      .eq("status", "pending_payment");

    if (prescriptionError) {
      console.error(
        "Prescription status update failed:",
        prescriptionError
      );
    }

    await logActivity({
      module: "Billing",
      category: "BILLING",
      action: `Payment completed for invoice ${invoice.invoice_no}`,
      performedBy: "Cashier",
      patientId: patient.id,
      details: JSON.stringify({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoice_no,
        paymentMethod: input.paymentMethod,
        amountDue: grandTotal,
        amountRendered:
          input.paymentMethod === "cash"
            ? amountRendered
            : grandTotal,
        changeDue:
          input.paymentMethod === "cash"
            ? Math.max(0, amountRendered - grandTotal)
            : 0,
        diagnosticsUnlocked: !diagnosticError,
        prescriptionsUnlocked: !prescriptionError,
      }),
      financialAmount: grandTotal,
    });

    revalidatePath("/billing");
    revalidatePath("/cashier");
    revalidatePath("/pharmacy");

    revalidatePath(
      `/doctor/patients/${patient.patient_code}/encounter`
    );

    return {
      success: true,
      message: "Payment completed successfully.",
      grandTotal,
      changeDue:
        input.paymentMethod === "cash"
          ? Math.max(0, amountRendered - grandTotal)
          : 0,
    };
  } catch (error) {
    console.error(
      "Process billing payment error:",
      error
    );

    return {
      success: false,
      message:
        "An unexpected error occurred while processing the payment.",
    };
  }
}
