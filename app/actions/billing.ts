"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { getPatientRecord, recalcInvoice } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";
import type { PatientRecord } from "@/types/hospital";

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

export type BillingPatientResponse = {
  success: boolean;
  message: string;
  patient: PatientRecord | null;
};

async function findPatient(patientCode: string) {
  const code = patientCode?.trim();

  if (!code) {
    return {
      patient: null,
      error: "Patient code is required.",
    };
  }

  const { data: patient, error } = await supabaseServer
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

export async function getBillingPatient(
  patientCode?: string
): Promise<BillingPatientResponse> {
  try {
    if (patientCode?.trim()) {
      const { data: patient, error } = await supabaseServer
        .from("patients")
        .select("id, patient_code, full_name, coverage_plan")
        .eq("patient_code", patientCode.trim())
        .maybeSingle();

      if (error) {
        console.error("Billing patient lookup failed:", error);

        return {
          success: false,
          message: "Unable to find the patient record.",
          patient: null,
        };
      }

      if (!patient) {
        return {
          success: false,
          message: `Patient ${patientCode.trim()} was not found.`,
          patient: null,
        };
      }

      const record = await getPatientRecord(patient.patient_code);

      if (!record) {
        return {
          success: false,
          message: "Unable to load the patient's billing record.",
          patient: null,
        };
      }

      return {
        success: true,
        message: "Billing record loaded.",
        patient: record,
      };
    }

    const { data: invoice, error: invoiceError } = await supabaseServer
      .from("invoices")
      .select("patient_id, status, created_at")
      .in("status", ["draft", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoiceError) {
      console.error("Billing invoice lookup failed:", invoiceError);

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

    const { data: patient, error: patientError } = await supabaseServer
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

    if (!record) {
      return {
        success: false,
        message: "Unable to load the patient's billing record.",
        patient: null,
      };
    }

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

export async function applyBillingDiscount(input: {
  patientCode: string;
  discountType: DiscountType;
  value: number;
  reason: string;
  adminPin?: string;
}): Promise<BillingActionResponse> {
  try {
    const staff = await requireRole(["IT_ADMIN"]);

    const {
      patientCode,
      discountType,
      value,
      reason,
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

    if (
      discountType !== "fixed" &&
      discountType !== "percentage"
    ) {
      return {
        success: false,
        message: "Invalid discount type.",
      };
    }

    const { patient, error } = await findPatient(patientCode);

    if (!patient) {
      return {
        success: false,
        message: error ?? "Patient not found.",
      };
    }

    const { data: invoice, error: invoiceError } =
      await supabaseServer
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
        "Billing invoice lookup failed:",
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

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return {
        success: false,
        message:
          "Unable to calculate the invoice subtotal.",
      };
    }

    let discountAmount = numericValue;

    if (discountType === "percentage") {
      if (numericValue > 100) {
        return {
          success: false,
          message:
            "Percentage discount cannot exceed 100%.",
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

    const { error: updateError } =
      await supabaseServer
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
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoice_no,
        discountType,
        requestedValue: numericValue,
        discountAmount,
        reason: reason.trim(),
        grandTotal,
        authorizedBy: staff.name,
        authorizedByStaffId: staff.id,
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
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return {
          success: false,
          message:
            "You must be signed in to apply a billing discount.",
        };
      }

      if (error.message === "FORBIDDEN") {
        return {
          success: false,
          message:
            "Only an authorized billing administrator can apply discounts.",
        };
      }
    }

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
    const staff = await requireRole([
      "IT_ADMIN",
      "CASHIER",
    ]);

    const amountRendered = Number(
      input.amountRendered
    );

    if (
      !Number.isFinite(amountRendered) ||
      amountRendered < 0
    ) {
      return {
        success: false,
        message: "Invalid amount rendered.",
      };
    }

    const validPaymentMethods: BillingPaymentMethod[] = [
      "cash",
      "pos",
      "transfer",
      "card",
      "hmo",
    ];

    if (
      !validPaymentMethods.includes(
        input.paymentMethod
      )
    ) {
      return {
        success: false,
        message: "Invalid payment method.",
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

    /*
     * Load the patient's active invoice.
     */
    const {
      data: invoice,
      error: invoiceError,
    } = await supabaseServer
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
        message:
          "Unable to load the patient's invoice.",
      };
    }

    if (!invoice) {
      return {
        success: false,
        message:
          "No active invoice exists for this patient.",
      };
    }

    if (invoice.status === "paid") {
      return {
        success: false,
        message:
          "This invoice has already been paid.",
      };
    }

    /*
     * Recalculate immediately before payment so the
     * cashier always pays the current invoice amount.
     */
    const totals = await recalcInvoice(invoice.id);

    const grandTotal = Number(
      totals.grandTotal ?? 0
    );

    if (
      !Number.isFinite(grandTotal) ||
      grandTotal <= 0
    ) {
      return {
        success: false,
        message:
          "This invoice has no amount due.",
      };
    }

    /*
     * Cash payments may be greater than the invoice
     * total. Other payment methods must cover the
     * exact invoice amount.
     */
    if (
      input.paymentMethod === "cash" &&
      amountRendered < grandTotal
    ) {
      return {
        success: false,
        message:
          "The amount rendered is insufficient.",
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
        message:
          "The payment amount is insufficient.",
        grandTotal,
      };
    }

    /*
     * Load the actual items belonging to THIS invoice.
     *
     * This prevents another pending prescription or
     * diagnostic belonging to the same patient from
     * being unlocked accidentally.
     */
    const {
      data: invoiceItems,
      error: invoiceItemsError,
    } = await supabaseServer
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
        message:
          "Unable to verify the items on this invoice.",
        grandTotal,
      };
    }

    /*
     * Separate clinical items from the invoice.
     */
    const pharmacyItems =
      (invoiceItems ?? []).filter(
        (item) => item.category === "pharmacy"
      );

    const diagnosticItems =
      (invoiceItems ?? []).filter(
        (item) => item.category === "diagnostic"
      );

    /*
     * Match pharmacy invoice items to pending
     * prescriptions belonging to this patient.
     */
    let prescriptionsUnlocked = 0;
    const prescriptionIdsToUnlock: string[] = [];

    if (pharmacyItems.length > 0) {
      const {
        data: pendingPrescriptions,
        error: prescriptionLookupError,
      } = await supabaseServer
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

      const unmatchedPrescriptions = [
        ...(pendingPrescriptions ?? []),
      ];

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

        const matchIndex =
          unmatchedPrescriptions.findIndex(
            (prescription) => {
              const prescriptionName = String(
                prescription.drug_name ?? ""
              )
                .trim()
                .toLowerCase();

              const prescriptionQuantity =
                Number(
                  prescription.quantity ?? 0
                );

              const prescriptionUnitPrice =
                Number(
                  prescription.price_per_unit ?? 0
                );

              return (
                prescriptionName === invoiceName &&
                prescriptionQuantity ===
                  invoiceQuantity &&
                prescriptionUnitPrice ===
                  invoiceUnitPrice
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
       * Validate the complete invoice match BEFORE changing
       * any prescription status. This prevents partial unlocks
       * when one invoice item cannot be matched.
       */
      if (
        prescriptionIdsToUnlock.length !==
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

      if (prescriptionIdsToUnlock.length > 0) {
        const {
          error: prescriptionUpdateError,
        } = await supabaseServer
          .from("prescriptions")
          .update({
            status: "ready_for_dispensing",
          })
          .in(
            "id",
            prescriptionIdsToUnlock
          )
          .eq(
            "patient_id",
            patient.id
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
    }

    /*
     * Match diagnostic invoice items to ordered
     * diagnostic requests belonging to this patient.
     */
    let diagnosticsUnlocked = 0;
    const diagnosticIdsToUnlock: string[] = [];

    if (diagnosticItems.length > 0) {
      const {
        data: diagnosticOrders,
        error: diagnosticLookupError,
      } = await supabaseServer
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
                diagnosticName === invoiceName &&
                diagnosticPrice === invoicePrice
              );
            }
          );

        if (matchIndex !== -1) {
          const matched =
            unmatchedDiagnostics[matchIndex];

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
       * Validate the complete diagnostic match BEFORE changing
       * any diagnostic status. This prevents partial completion
       * when one invoice item cannot be matched.
       */
      if (
        diagnosticIdsToUnlock.length !==
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

      if (diagnosticIdsToUnlock.length > 0) {
        const {
          error: diagnosticUpdateError,
        } = await supabaseServer
          .from("diagnostic_orders")
          .update({
            status: "completed",
          })
          .in(
            "id",
            diagnosticIdsToUnlock
          )
          .eq(
            "patient_id",
            patient.id
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

          /*
           * Roll back any pharmacy unlock performed above.
           */
          if (prescriptionIdsToUnlock.length > 0) {
            await supabaseServer
              .from("prescriptions")
              .update({
                status: "pending_payment",
              })
              .in(
                "id",
                prescriptionIdsToUnlock
              )
              .eq(
                "status",
                "ready_for_dispensing"
              );
          }

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
    }

    /*
     * Mark the invoice as paid only after all invoice
     * items have been verified and processed.
     */
    const paidAt = new Date().toISOString();

    const {
      data: paidInvoice,
      error: paymentError,
    } = await supabaseServer
      .from("invoices")
      .update({
        status: "paid",
        grand_total: grandTotal,
        payment_method: input.paymentMethod,
        paid_at: paidAt,
      })
      .eq("id", invoice.id)
      .neq("status", "paid")
      .select("id")
      .maybeSingle();

    if (paymentError || !paidInvoice) {
      console.error(
        "Invoice payment update failed or invoice was already paid:",
        paymentError
      );

      /*
       * Keep clinical workflow states consistent if the final
       * invoice transition fails. Payment is only considered
       * successful when the invoice itself becomes paid.
       */
      if (prescriptionIdsToUnlock.length > 0) {
        await supabaseServer
          .from("prescriptions")
          .update({
            status: "pending_payment",
          })
          .in(
            "id",
            prescriptionIdsToUnlock
          )
          .eq(
            "status",
            "ready_for_dispensing"
          );
      }

      if (diagnosticIdsToUnlock.length > 0) {
        await supabaseServer
          .from("diagnostic_orders")
          .update({
            status: "ordered",
          })
          .in(
            "id",
            diagnosticIdsToUnlock
          )
          .eq(
            "status",
            "completed"
          );
      }

      return {
        success: false,
        message:
          "Payment could not be completed. The invoice was not marked as paid.",
        grandTotal,
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
      performedBy: staff.name,
      staffId: staff.id,
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
        processedBy: staff.name,
        processedByStaffId: staff.id,
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
      message:
        "Payment completed successfully.",
      grandTotal,
      changeDue,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return {
          success: false,
          message:
            "You must be signed in to process billing payments.",
        };
      }

      if (error.message === "FORBIDDEN") {
        return {
          success: false,
          message:
            "You are not authorized to process billing payments.",
        };
      }
    }

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