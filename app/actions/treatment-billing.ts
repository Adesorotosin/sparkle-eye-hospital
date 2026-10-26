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
    await requireRole(["IT_ADMIN", "DOCTOR", "OPHTHALMOLOGIST"]);
    void input;
    return {
      success: false,
      message: "Bundled treatment-plan handoff is disabled. Send individual prescription, investigation, laboratory, optical and procedure requests through their dedicated workflows.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, message: "You must be signed in to continue." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, message: "You are not authorized to send clinical requests." };
    }
    console.error("Disabled treatment-plan handoff was called:", error);
    return { success: false, message: "Unable to process the request." };
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
