"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/server-auth";
import { logActivity } from "@/lib/activity-log";

export type TreatmentBillingRequest = {
  id: string;
  patientCode: string;
  patientName: string;
  treatmentPlan: string;
  requestedByName: string;
  createdAt: string;
  status: "pending" | "reviewed";
  reviewedByName?: string | null;
};

export async function sendTreatmentPlanToCashier(input: {
  patientCode: string;
  encounterId: string;
}): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const staff = await requireRole(["IT_ADMIN", "DOCTOR", "OPHTHALMOLOGIST"]);
    const patientCode = input.patientCode?.trim();
    const encounterId = input.encounterId?.trim();

    if (!patientCode || !encounterId) {
      return { success: false, message: "Save the consultation before sending its treatment plan to Cashier." };
    }

    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code, full_name")
      .eq("patient_code", patientCode)
      .maybeSingle();

    if (patientError || !patient) {
      console.error("Treatment billing patient lookup failed:", patientError);
      return { success: false, message: "Unable to find this patient. Refresh the consultation and try again." };
    }

    const { data: encounter, error: encounterError } = await supabaseServer
      .from("encounters")
      .select("id, patient_id, treatment_plan")
      .eq("id", encounterId)
      .eq("patient_id", patient.id)
      .maybeSingle();

    if (encounterError || !encounter) {
      console.error("Treatment billing encounter lookup failed:", encounterError);
      return { success: false, message: "The saved consultation could not be verified. Save or refresh the consultation, then try again." };
    }

    const treatmentPlan = String(encounter.treatment_plan ?? "").trim();
    if (!treatmentPlan) {
      return { success: false, message: "Enter and save the treatment/follow-up plan before sending it to Cashier." };
    }

    const { data: existing, error: existingError } = await supabaseServer
      .from("treatment_billing_requests")
      .select("id, status")
      .eq("encounter_id", encounter.id)
      .maybeSingle();

    if (existingError) {
      console.error("Treatment billing duplicate check failed:", existingError);
      return { success: false, message: "Unable to check whether this plan has already been sent." };
    }

    if (existing) {
      return {
        success: true,
        id: existing.id,
        message: existing.status === "pending"
          ? "This treatment plan is already waiting in the Cashier queue."
          : "This treatment plan has already been sent to Cashier. Refresh the Cashier dashboard for its current status.",
      };
    }

    const { data: request, error: insertError } = await supabaseServer
      .from("treatment_billing_requests")
      .insert({
        patient_id: patient.id,
        encounter_id: encounter.id,
        treatment_plan: treatmentPlan,
        status: "pending",
        requested_by: staff.id,
        requested_by_name: staff.name,
      })
      .select("id")
      .single();

    if (insertError || !request) {
      console.error("Treatment billing request creation failed:", insertError);
      return { success: false, message: "Failed to send the treatment plan to Cashier. Please refresh before retrying." };
    }

    await logActivity({
      module: "Billing",
      category: "BILLING",
      action: "Doctor sent treatment plan to Cashier for billing review",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({ requestId: request.id, encounterId: encounter.id }),
    });

    revalidatePath("/cashier");
    revalidatePath("/billing");
    revalidatePath(`/doctor/patients/${patientCode}/encounter`);

    return { success: true, id: request.id, message: "Treatment plan sent to Cashier for billing review. No charge has been created automatically." };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, message: "You must be signed in as a doctor to send a treatment plan." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, message: "You are not authorized to send treatment plans to Cashier." };
    }
    console.error("Send treatment plan to Cashier failed:", error);
    return { success: false, message: "An unexpected error occurred while sending the treatment plan." };
  }
}

export async function getTreatmentBillingRequests(): Promise<{
  success: boolean;
  message: string;
  requests: TreatmentBillingRequest[];
}> {
  try {
    await requireRole(["IT_ADMIN", "CASHIER"]);
    const { data: rows, error } = await supabaseServer
      .from("treatment_billing_requests")
      .select("id, patient_id, treatment_plan, requested_by_name, created_at, status, reviewed_by_name")
      .in("status", ["pending", "reviewed"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    const patientIds = [...new Set((rows ?? []).map((row) => row.patient_id).filter(Boolean))];
    let patients: Record<string, { patient_code: string; full_name: string }> = {};
    if (patientIds.length) {
      const { data: patientRows, error: patientError } = await supabaseServer
        .from("patients")
        .select("id, patient_code, full_name")
        .in("id", patientIds);
      if (patientError) throw patientError;
      patients = Object.fromEntries((patientRows ?? []).map((p) => [p.id, { patient_code: p.patient_code, full_name: p.full_name }]));
    }

    return {
      success: true,
      message: "Treatment billing requests loaded.",
      requests: (rows ?? []).filter((row) => patients[row.patient_id]).map((row) => ({
        id: row.id,
        patientCode: patients[row.patient_id].patient_code,
        patientName: patients[row.patient_id].full_name,
        treatmentPlan: row.treatment_plan,
        requestedByName: row.requested_by_name,
        createdAt: row.created_at,
        status: row.status as "pending" | "reviewed",
        reviewedByName: row.reviewed_by_name,
      })),
    };
  } catch (error) {
    console.error("Treatment billing request queue failed:", error);
    return { success: false, message: "Unable to load treatment-plan requests.", requests: [] };
  }
}

export async function markTreatmentBillingRequestReviewed(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const staff = await requireRole(["IT_ADMIN", "CASHIER"]);
    if (!id?.trim()) return { success: false, message: "Treatment request ID is required." };

    const { data: updated, error } = await supabaseServer
      .from("treatment_billing_requests")
      .update({ status: "reviewed", reviewed_by: staff.id, reviewed_by_name: staff.name, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id.trim())
      .eq("status", "pending")
      .select("id, patient_id")
      .maybeSingle();

    if (error) throw error;
    if (!updated) return { success: false, message: "This request is already reviewed or no longer available. Refresh the queue." };

    await logActivity({
      module: "Billing",
      category: "BILLING",
      action: "Cashier reviewed doctor treatment-plan billing request",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: updated.patient_id,
      details: JSON.stringify({ requestId: updated.id }),
    });

    revalidatePath("/cashier");
    return { success: true, message: "Treatment-plan request marked as reviewed." };
  } catch (error) {
    console.error("Mark treatment billing request reviewed failed:", error);
    return { success: false, message: "Unable to mark this request as reviewed." };
  }
}
