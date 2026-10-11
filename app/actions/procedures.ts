"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrCreateDraftInvoice, recalcInvoice } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export type ProcedureRegistrationInput = {
  patientCode: string;
  procedureName: string;
  referralType: "doctor_order" | "external_referral";
  orderReference: string;
  scheduledDate?: string;
  notes?: string;
  price: number;
};

export async function registerProcedure(input: ProcedureRegistrationInput) {
  try {
    const staff = await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    const patientCode = input.patientCode?.trim();
    const procedureName = input.procedureName?.trim();
    const orderReference = input.orderReference?.trim();
    const price = Number(input.price);

    if (!patientCode || !procedureName || !orderReference) {
      return { success: false, message: "Choose a patient, enter the procedure, and provide the clinician's order/reference." };
    }
    if (!["doctor_order", "external_referral"].includes(input.referralType)) {
      return { success: false, message: "Choose a valid referral source." };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { success: false, message: "Enter a valid approved procedure price." };
    }
    if (input.scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate)) {
      return { success: false, message: "Choose a valid procedure date." };
    }

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
        referral_type: input.referralType,
        order_reference: orderReference,
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
      return { success: false, message: "Could not register the procedure. Check that the procedure database migration has been applied." };
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
        referralType: input.referralType,
        orderReference,
        scheduledDate: input.scheduledDate || null,
        price,
      }),
      financialAmount: price,
    });

    revalidatePath("/receptionist");
    revalidatePath("/billing");
    revalidatePath("/cashier");

    return { success: true, message: `${procedureName} registered for ${patient.full_name}. The bill is ready for the cashier; clinical staff must confirm the procedure before performing it.` };
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
