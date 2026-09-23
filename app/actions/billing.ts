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
        message:
          "The patient attached to this invoice could not be found.",
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
      message:
        "An unexpected error occurred while loading billing.",
      patient: null,
    };
  }
}

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

    if (invoiceError || !invoice) {
      return {
        success: false,
        message: "Unable to load the patient's invoice.",
      };
    }

    if (invoice.status === "paid") {
      return {
        success: false,
        message: "A paid invoice cannot be discounted.",
      };
    }

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

      discountAmount =
        subtotal * (numericValue / 100);
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
    console.error(
      "Apply billing discount error:",
      error
    );

    return {
      success: false,
      message:
        "An unexpected error occurred while applying the discount.",
    };
  }
}

export async function processBillingPayment(input: {
  patientCode: string;
  paymentMethod: BillingPaymentMethod;
  amountRendered: number;
}): Promise<BillingActionResponse> {
  try {
    const amountRendered = Number(input.amountRendered);

    if (!Number.isFinite(amountRendered) || amountRendered < 0) {
      return {
        success: false,
        message: "Invalid amount rendered.",
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
     * Load the patient's active invoice.
     */
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("patient_id", patient.id)
      .neq("status", "cancelled")
      .order("created_at", {
        ascending: false,
      })
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
     * Recalculate immediately before payment so the cashier
     * always pays the current invoice amount.
     */
    const totals = await recalcInvoice(invoice.id);

    const grandTotal = Number(totals.grandTotal ?? 0);

    if (grandTotal <= 0) {
      return {
        success: false,
        message: "This invoice has no amount due.",
      };
    }

    /*
     * Cash payments may be greater than the invoice total.
     * Other payment methods must cover the exact invoice amount.
     */
    if (
      input.paymentMethod === "cash" &&
      amountRendered < grandTotal
    ) {
      return {
        success: false,
        message: "The amount rendered is insufficient.",
        grandTotal,
      };
    }

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

    /*
     * Load the actual items belonging to THIS invoice.
     *
     * This is important because the patient's other pending
     * prescriptions/diagnostics must not be unlocked.
     */
    const { data: invoiceItems, error: invoiceItemsError } =
      await supabase
        .from("invoice_items")
        .select(
          "id, category, name, quantity, unit_price, total_price"
        )
        .eq("invoice_id", invoice.id);

    if (invoiceItemsError) {
      console.error(
        "Invoice items lookup failed:",
        invoiceItemsError
      );

      return {
        success: false,
        message: "Unable to verify the items on this invoice.",
        grandTotal,
      };
    }

    /*
     * Separate clinical items from the invoice.
     */
    const pharmacyItems = (invoiceItems ?? []).filter(
      (item) => item.category === "pharmacy"
    );

    const diagnosticItems = (invoiceItems ?? []).filter(
      (item) => item.category === "diagnostic"
    );

    /*
     * Find only pending prescriptions belonging to this patient.
     *
     * We then match them against the pharmacy line items from
     * this exact invoice.
     */
    let prescriptionsUnlocked = 0;

    if (pharmacyItems.length > 0) {
      const { data: pendingPrescriptions, error: prescriptionLookupError } =
        await supabase
          .from("prescriptions")
          .select(
            "id, drug_name, quantity, price_per_unit, total_price, created_at"
          )
          .eq("patient_id", patient.id)
          .eq("status", "pending_payment")
          .order("created_at", {
            ascending: true,
          });

      if (prescriptionLookupError) {
        console.error(
          "Pending prescription lookup failed:",
          prescriptionLookupError
        );

        return {
          success: false,
          message:
            "Payment could not be completed because prescriptions could not be verified.",
          grandTotal,
        };
      }

      /*
       * Build a working list of pending prescriptions.
       *
       * We remove a prescription from this list once it is matched
       * so two identical medications on the invoice can still be
       * matched correctly.
       */
      const unmatchedPrescriptions = [
        ...(pendingPrescriptions ?? []),
      ];

      const prescriptionIdsToUnlock: string[] = [];

      for (const invoiceItem of pharmacyItems) {
        const invoiceName = String(
          invoiceItem.name ?? ""
        )
          .trim()
          .toLowerCase();

        const invoiceQuantity = Number(
          invoiceItem.quantity ?? 0
        );

        const invoiceUnitPrice = Number(
          invoiceItem.unit_price ?? 0
        );

        const matchIndex = unmatchedPrescriptions.findIndex(
          (prescription) => {
            const prescriptionName = String(
              prescription.drug_name ?? ""
            )
              .trim()
              .toLowerCase();

            const prescriptionQuantity = Number(
              prescription.quantity ?? 0
            );

            const prescriptionUnitPrice = Number(
              prescription.price_per_unit ?? 0
            );

            return (
              prescriptionName === invoiceName &&
              prescriptionQuantity === invoiceQuantity &&
              prescriptionUnitPrice === invoiceUnitPrice
            );
          }
        );

        if (matchIndex !== -1) {
          const matched =
            unmatchedPrescriptions[matchIndex];

          prescriptionIdsToUnlock.push(
            matched.id
          );

          unmatchedPrescriptions.splice(
            matchIndex,
            1
          );
        }
      }

      /*
       * Only the prescriptions matched to this invoice are unlocked.
       */
      if (prescriptionIdsToUnlock.length > 0) {
        const { error: prescriptionUpdateError } =
          await supabase
            .from("prescriptions")
            .update({
              status: "ready_for_dispensing",
            })
            .in(
              "id",
              prescriptionIdsToUnlock
            )
            .eq(
              "status",
              "pending_payment"
            );

        if (prescriptionUpdateError) {
          console.error(
            "Prescription status update failed:",
            prescriptionUpdateError
          );

          return {
            success: false,
            message:
              "Payment could not be completed because the prescription status could not be updated.",
            grandTotal,
          };
        }

        prescriptionsUnlocked =
          prescriptionIdsToUnlock.length;
      }

      /*
       * Safety check:
       *
       * Every pharmacy item on the invoice should correspond to
       * a pending prescription.
       */
      if (
        prescriptionsUnlocked !==
        pharmacyItems.length
      ) {
        console.error(
          "Invoice/prescription mismatch:",
          {
            invoiceId: invoice.id,
            pharmacyItems,
            matchedPrescriptionIds:
              prescriptionIdsToUnlock,
          }
        );

        return {
          success: false,
          message:
            "Payment could not be completed because one or more pharmacy items could not be matched to a prescription.",
          grandTotal,
        };
      }
    }

    /*
     * Diagnostics follow the same principle.
     *
     * Only diagnostic orders represented on this invoice are
     * marked completed/unlocked.
     */
    let diagnosticsUnlocked = 0;

    if (diagnosticItems.length > 0) {
      const { data: diagnosticOrders, error: diagnosticLookupError } =
        await supabase
          .from("diagnostic_orders")
          .select(
            "id, name, price, status, created_at"
          )
          .eq("patient_id", patient.id)
          .eq("status", "ordered")
          .order("created_at", {
            ascending: true,
          });

      if (diagnosticLookupError) {
        console.error(
          "Diagnostic order lookup failed:",
          diagnosticLookupError
        );

        return {
          success: false,
          message:
            "Payment could not be completed because diagnostic orders could not be verified.",
          grandTotal,
        };
      }

      const unmatchedDiagnostics = [
        ...(diagnosticOrders ?? []),
      ];

      const diagnosticIdsToUnlock: string[] = [];

      for (const invoiceItem of diagnosticItems) {
        const invoiceName = String(
          invoiceItem.name ?? ""
        )
          .trim()
          .toLowerCase();

        const invoicePrice = Number(
          invoiceItem.unit_price ?? 0
        );

        const matchIndex =
          unmatchedDiagnostics.findIndex(
            (diagnostic) => {
              const diagnosticName = String(
                diagnostic.name ?? ""
              )
                .trim()
                .toLowerCase();

              const diagnosticPrice = Number(
                diagnostic.price ?? 0
              );

              return (
                diagnosticName ===
                  invoiceName &&
                diagnosticPrice ===
                  invoicePrice
              );
            }
          );

        if (matchIndex !== -1) {
          const matched =
            unmatchedDiagnostics[
              matchIndex
            ];

          diagnosticIdsToUnlock.push(
            matched.id
          );

          unmatchedDiagnostics.splice(
            matchIndex,
            1
          );
        }
      }

      /*
       * Only diagnostic orders matched to this invoice
       * are marked completed.
       */
      if (diagnosticIdsToUnlock.length > 0) {
        const { error: diagnosticUpdateError } =
          await supabase
            .from("diagnostic_orders")
            .update({
              status: "completed",
            })
            .in(
              "id",
              diagnosticIdsToUnlock
            )
            .eq(
              "status",
              "ordered"
            );

        if (diagnosticUpdateError) {
          console.error(
            "Diagnostic status update failed:",
            diagnosticUpdateError
          );

          return {
            success: false,
            message:
              "Payment could not be completed because the diagnostic status could not be updated.",
            grandTotal,
          };
        }

        diagnosticsUnlocked =
          diagnosticIdsToUnlock.length;
      }

      /*
       * Safety check:
       *
       * Every diagnostic item on the invoice should correspond
       * to an actual diagnostic order.
       */
      if (
        diagnosticsUnlocked !==
        diagnosticItems.length
      ) {
        console.error(
          "Invoice/diagnostic mismatch:",
          {
            invoiceId: invoice.id,
            diagnosticItems,
            matchedDiagnosticIds:
              diagnosticIdsToUnlock,
          }
        );

        return {
          success: false,
          message:
            "Payment could not be completed because one or more diagnostic items could not be matched to a diagnostic order.",
          grandTotal,
        };
      }
    }

    /*
     * Now that the invoice contents have been verified and its
     * clinical items have been identified, mark the invoice paid.
     */
    const paidAt = new Date().toISOString();

    const { error: paymentError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        grand_total: grandTotal,
        payment_method: input.paymentMethod,
        paid_at: paidAt,
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

    const changeDue =
      input.paymentMethod === "cash"
        ? Math.max(
            0,
            amountRendered - grandTotal
          )
        : 0;

    await logActivity({
      module: "Billing",
      category: "BILLING",
      action: `Payment completed for invoice ${invoice.invoice_no}`,
      performedBy: "Cashier",
      patientId: patient.id,
      details: JSON.stringify({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoice_no,
        paymentMethod:
          input.paymentMethod,
        amountDue: grandTotal,
        amountRendered:
          input.paymentMethod === "cash"
            ? amountRendered
            : grandTotal,
        changeDue,
        paidAt,
        diagnosticsUnlocked,
        prescriptionsUnlocked,
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
      changeDue,
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