"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrCreateDraftInvoice, recalcInvoice } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export type ProcedurePrice = {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  active: boolean;
};

export async function getProcedurePriceCatalog() {
  try {
    await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    const { data, error } = await supabaseServer
      .from("procedure_price_catalog")
      .select("id, code, name, category, price, active")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return {
      success: true,
      procedures: (data ?? []).map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        price: Number(row.price ?? 0),
        active: Boolean(row.active),
      })) as ProcedurePrice[],
    };
  } catch (error) {
    console.error("Loading procedure price catalogue failed:", error);
    return {
      success: false,
      procedures: [] as ProcedurePrice[],
      message: "Unable to load procedure prices. Confirm that the procedure price catalogue migration has been applied.",
    };
  }
}

export async function updateProcedurePrice(input: {
  id: string;
  price: number;
  active: boolean;
}) {
  try {
    await requireRole(["IT_ADMIN"]);
    const price = Number(input.price);
    if (!input.id || !Number.isFinite(price) || price < 0) {
      return { success: false, message: "Enter a valid price." };
    }

    const { error } = await supabaseServer
      .from("procedure_price_catalog")
      .update({
        price,
        active: Boolean(input.active),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);

    if (error) throw error;
    revalidatePath("/admin/procedure-prices");
    revalidatePath("/receptionist");
    return { success: true, message: "Procedure price updated." };
  } catch (error) {
    console.error("Updating procedure price failed:", error);
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, message: "Please sign in again to continue." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, message: "Only an administrator can change procedure prices." };
    }
    return { success: false, message: "Could not update this procedure price." };
  }
}

export type ProcedureRegistrationInput = {
  patientCode: string;
  procedureCode: string;
  scheduledDate?: string;
  notes?: string;
};

export async function registerProcedure(input: ProcedureRegistrationInput) {
  try {
    const staff = await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    const patientCode = input.patientCode?.trim();
    const procedureCode = input.procedureCode?.trim();

    if (!patientCode || !procedureCode) {
      return { success: false, message: "Choose a patient and select a procedure." };
    }
    if (input.scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate)) {
      return { success: false, message: "Choose a valid procedure date." };
    }

    // Always obtain the name and price from the server-side catalogue.
    // Never trust a price sent by the browser.
    const { data: catalogueItem, error: catalogueError } = await supabaseServer
      .from("procedure_price_catalog")
      .select("code, name, price, active")
      .eq("code", procedureCode)
      .eq("active", true)
      .maybeSingle();

    if (catalogueError || !catalogueItem) {
      return { success: false, message: "That procedure is unavailable. Refresh the form or ask the administrator to review the price catalogue." };
    }

    const procedureName = String(catalogueItem.name);
    const price = Number(catalogueItem.price);

    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code, full_name")
      .eq("patient_code", patientCode)
      .maybeSingle();

    if (patientError || !patient) {
      return { success: false, message: "Patient not found. Search for the patient again and retry." };
    }

    const invoice = await getOrCreateDraftInvoice(patient.id);
    const { data: procedure, error: procedureError } = await supabaseServer
      .from("procedure_orders")
      .insert({
        patient_id: patient.id,
        procedure_name: procedureName,
        referral_type: "doctor_order",
        order_reference: "In-house after doctor's review",
        scheduled_date: input.scheduledDate || null,
        notes: input.notes?.trim() || null,
        price,
        status: "scheduled",
        invoice_id: invoice.id,
        registered_by: staff.id,
      })
      .select("id")
      .single();

    if (procedureError || !procedure) {
      console.error("Procedure registration failed:", procedureError);
      return { success: false, message: "Could not register the procedure. Check that the procedure database migrations have been applied." };
    }

    const { error: itemError } = await supabaseServer.from("invoice_items").insert({
      invoice_id: invoice.id,
      category: "procedure",
      name: procedureName,
      quantity: 1,
      unit_price: price,
      total_price: price,
    });

    if (itemError) {
      console.error("Procedure billing item creation failed:", itemError);
      return { success: false, message: "Procedure was recorded, but its bill could not be created. Please contact the administrator before registering it again.", id: procedure.id };
    }

    await recalcInvoice(invoice.id);
    await logActivity({
      module: "Procedures",
      category: "CLINICAL",
      action: `Procedure scheduled: ${procedureName}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        procedureOrderId: procedure.id,
        patientCode: patient.patient_code,
        workflow: "in_house_after_doctors_review",
        scheduledDate: input.scheduledDate || null,
        price,
      }),
      financialAmount: price,
    });

    revalidatePath("/receptionist");
    revalidatePath("/billing");
    revalidatePath("/cashier");

    return { success: true, message: `${procedureName} registered for ${patient.full_name} at ₦${price.toLocaleString("en-NG")}. The bill is ready for the cashier; clinical staff must confirm the procedure before performing it.` };
  } catch (error) {
    console.error("Procedure registration error:", error);
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, message: "Please sign in again to continue." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, message: "Only reception staff or an administrator can register procedures." };
    }
    return { success: false, message: "Unable to register this procedure. Please try again." };
  }
}

export async function getRecentProcedures() {
  try {
    await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    const { data, error } = await supabaseServer
      .from("procedure_orders")
      .select("id, procedure_name, referral_type, order_reference, scheduled_date, price, status, created_at, patients!inner(patient_code, registration_number, full_name)")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    return {
      success: true,
      procedures: (data ?? []).map((row: any) => ({
        id: row.id,
        procedureName: row.procedure_name,
        referralType: row.referral_type,
        orderReference: row.order_reference,
        scheduledDate: row.scheduled_date,
        price: Number(row.price ?? 0),
        status: row.status,
        createdAt: row.created_at,
        patientCode: row.patients.patient_code,
        registrationNumber: row.patients.registration_number ?? null,
        patientName: row.patients.full_name,
      })),
    };
  } catch (error) {
    console.error("Loading procedures failed:", error);
    return { success: false, procedures: [], message: "Unable to load procedure registrations." };
  }
}
