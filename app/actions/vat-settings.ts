"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/server-auth";
import { getConfiguredVatPolicy, recalcInvoice } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";

export type BillingVatSettings = {
  vatEnabled: boolean;
  vatRate: number;
};

function normalizeBilling(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export async function getBillingVatSettings(): Promise<{
  success: boolean;
  message: string;
  settings?: BillingVatSettings;
}> {
  try {
    await requireRole(["IT_ADMIN"]);
    const policy = await getConfiguredVatPolicy();
    return {
      success: true,
      message: "VAT settings loaded.",
      settings: { vatEnabled: policy.enabled, vatRate: policy.rate },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      success: false,
      message:
        message === "UNAUTHENTICATED"
          ? "Please sign in to access billing settings."
          : message === "FORBIDDEN"
            ? "Only an administrator can manage VAT settings."
            : "Unable to load VAT settings.",
    };
  }
}

export async function saveBillingVatSettings(input: {
  vatEnabled: boolean;
  vatRate: number;
}): Promise<{
  success: boolean;
  message: string;
  updatedInvoices?: number;
}> {
  try {
    const staff = await requireRole(["IT_ADMIN"]);
    const vatRate = Number(input?.vatRate);

    if (typeof input?.vatEnabled !== "boolean") {
      return { success: false, message: "Choose whether VAT is enabled." };
    }
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
      return { success: false, message: "VAT rate must be between 0 and 100." };
    }

    const { data: current, error: readError } = await supabaseServer
      .from("system_settings")
      .select("billing")
      .eq("id", "default")
      .maybeSingle();

    if (readError) throw readError;

    const previousBilling = normalizeBilling(current?.billing);
    const previousRate = Number(previousBilling.vatRate ?? 0);
    const previousEnabled =
      typeof previousBilling.vatEnabled === "boolean"
        ? previousBilling.vatEnabled
        : previousRate > 0;

    const nextBilling = {
      ...previousBilling,
      vatEnabled: input.vatEnabled,
      vatRate: Math.round(vatRate * 100) / 100,
    };

    const { error: saveError } = current
      ? await supabaseServer
          .from("system_settings")
          .update({ billing: nextBilling })
          .eq("id", "default")
      : await supabaseServer
          .from("system_settings")
          .insert({ id: "default", billing: nextBilling });

    if (saveError) throw saveError;

    const { data: activeInvoices, error: invoicesError } = await supabaseServer
      .from("invoices")
      .select("id")
      .in("status", ["draft", "pending"]);

    if (invoicesError) throw invoicesError;

    let updatedInvoices = 0;
    for (const invoice of activeInvoices ?? []) {
      await recalcInvoice(invoice.id);
      updatedInvoices += 1;
    }

    await logActivity({
      module: "Admin",
      category: "ADMIN",
      action: "Hospital VAT settings changed",
      performedBy: staff.name,
      staffId: staff.id,
      details: JSON.stringify({
        previous: {
          vatEnabled: previousEnabled,
          vatRate: previousRate,
        },
        updated: {
          vatEnabled: input.vatEnabled,
          vatRate: Math.round(vatRate * 100) / 100,
        },
        affectedDraftInvoices: updatedInvoices,
        changedAt: new Date().toISOString(),
      }),
    });

    revalidatePath("/admin");
    revalidatePath("/admin/billing-settings");
    revalidatePath("/billing");
    revalidatePath("/cashier");

    return {
      success: true,
      message: `VAT policy saved. ${updatedInvoices} unpaid invoice(s) recalculated; paid invoices were left unchanged.`,
      updatedInvoices,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED" || message === "FORBIDDEN") {
      return {
        success: false,
        message:
          message === "UNAUTHENTICATED"
            ? "Please sign in to change VAT settings."
            : "Only an administrator can change VAT settings.",
      };
    }
    console.error("Saving VAT settings failed:", error);
    return {
      success: false,
      message:
        "VAT settings could not be saved completely. Check the system logs before retrying.",
    };
  }
}
