"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export type HandoffDestination = "CASHIER" | "RECEPTIONIST";
export type HandoffType = "TREATMENT_PLAN" | "PROCEDURE" | "FOLLOW_UP";
export type HandoffStatus = "pending" | "acknowledged" | "completed" | "cancelled";

export type ClinicalHandoff = {
  id: string;
  patientCode: string;
  patientName: string;
  destination: HandoffDestination;
  handoffType: HandoffType;
  title: string;
  details: string;
  intervalValue?: number | null;
  intervalUnit?: "days" | "months" | null;
  targetDate?: string | null;
  preferredTime?: string | null;
  status: HandoffStatus;
  createdAt: string;
};

function getLagosDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addIntervalToDate(intervalValue: number, intervalUnit: "days" | "months") {
  const [year, month, day] = getLagosDate().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (intervalUnit === "days") {
    date.setUTCDate(date.getUTCDate() + intervalValue);
  } else {
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + intervalValue);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay, lastDay));
  }
  return date.toISOString().slice(0, 10);
}

export async function createClinicalHandoff(input: {
  patientCode: string;
  destination: HandoffDestination;
  handoffType: HandoffType;
  title: string;
  details: string;
  intervalValue?: number;
  intervalUnit?: "days" | "months";
  preferredTime?: string;
  encounterId?: string;
}) {
  try {
    const staff = await requireRole(["IT_ADMIN", "DOCTOR", "OPHTHALMOLOGIST"]);
    const patientCode = input.patientCode?.trim();
    const title = input.title?.trim();
    const details = input.details?.trim();

    if (!patientCode || !title || !details) {
      return { success: false, message: "Patient, title, and details are required." };
    }
    if (!["CASHIER", "RECEPTIONIST"].includes(input.destination)) {
      return { success: false, message: "Choose a valid receiving department." };
    }
    if (!["TREATMENT_PLAN", "PROCEDURE", "FOLLOW_UP"].includes(input.handoffType)) {
      return { success: false, message: "Choose a valid request type." };
    }
    if (input.handoffType === "TREATMENT_PLAN" && input.destination !== "CASHIER") {
      return { success: false, message: "Treatment plans must be routed to the Cashier." };
    }
    if (input.handoffType !== "TREATMENT_PLAN" && input.destination !== "RECEPTIONIST") {
      return { success: false, message: "Procedure and follow-up requests must be routed to Reception." };
    }

    let intervalValue: number | null = null;
    let intervalUnit: "days" | "months" | null = null;
    let targetDate: string | null = null;
    if (input.handoffType === "FOLLOW_UP") {
      const numericInterval = Number(input.intervalValue);
      if (!Number.isInteger(numericInterval) || numericInterval < 1 || numericInterval > 120) {
        return { success: false, message: "Follow-up interval must be a whole number from 1 to 120." };
      }
      if (input.intervalUnit !== "days" && input.intervalUnit !== "months") {
        return { success: false, message: "Choose days or months for the follow-up interval." };
      }
      intervalValue = numericInterval;
      intervalUnit = input.intervalUnit;
      targetDate = addIntervalToDate(numericInterval, intervalUnit);
    }

    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code, full_name")
      .eq("patient_code", patientCode)
      .maybeSingle();
    if (patientError || !patient) {
      return { success: false, message: "Patient not found. Refresh the record and try again." };
    }

    if (input.encounterId) {
      const { data: encounter, error: encounterError } = await supabaseServer
        .from("encounters")
        .select("id")
        .eq("id", input.encounterId)
        .eq("patient_id", patient.id)
        .maybeSingle();
      if (encounterError || !encounter) {
        return { success: false, message: "The consultation record does not belong to this patient. Refresh the patient record and try again." };
      }
    }

    const { data: handoff, error } = await supabaseServer
      .from("clinical_handoffs")
      .insert({
        patient_id: patient.id,
        encounter_id: input.encounterId || null,
        destination: input.destination,
        handoff_type: input.handoffType,
        title,
        details,
        interval_value: intervalValue,
        interval_unit: intervalUnit,
        target_date: targetDate,
        preferred_time: input.preferredTime?.trim() || null,
        requested_by: staff.id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logActivity({
      module: "Consultation",
      category: "CLINICAL",
      action: `Doctor request sent to ${input.destination}: ${title}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        handoffId: handoff.id,
        destination: input.destination,
        handoffType: input.handoffType,
        targetDate,
      }),
    });

    revalidatePath("/cashier");
    revalidatePath("/billing");
    revalidatePath("/receptionist");
    revalidatePath("/appointments");
    revalidatePath(`/doctor/patients/${patient.patient_code}/encounter`);
    return {
      success: true,
      message: input.handoffType === "FOLLOW_UP"
        ? `Follow-up request sent to Reception for ${targetDate}.`
        : `${title} sent to ${input.destination === "CASHIER" ? "Cashier" : "Reception"}.`,
      id: handoff.id,
      targetDate,
    };
  } catch (error) {
    console.error("Creating clinical handoff failed:", error);
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, message: "Please sign in again to continue." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, message: "You are not authorized to send this request." };
    }
    return { success: false, message: "Unable to send the request. Confirm the clinical handoff migration has been applied." };
  }
}

export async function getClinicalHandoffs(destination: HandoffDestination) {
  try {
    if (destination === "CASHIER") {
      await requireRole(["IT_ADMIN", "CASHIER"]);
    } else {
      await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    }

    const { data, error } = await supabaseServer
      .from("clinical_handoffs")
      .select("id, destination, handoff_type, title, details, interval_value, interval_unit, target_date, preferred_time, status, created_at, patients!inner(patient_code, full_name)")
      .eq("destination", destination)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return {
      success: true,
      requests: (data ?? []).map((row: any) => ({
        id: row.id,
        destination: row.destination,
        handoffType: row.handoff_type,
        title: row.title,
        details: row.details ?? "",
        intervalValue: row.interval_value,
        intervalUnit: row.interval_unit,
        targetDate: row.target_date,
        preferredTime: row.preferred_time,
        status: row.status,
        createdAt: row.created_at,
        patientCode: row.patients.patient_code,
        patientName: row.patients.full_name,
      })) as ClinicalHandoff[],
    };
  } catch (error) {
    console.error("Loading clinical handoffs failed:", error);

    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, requests: [] as ClinicalHandoff[], message: "Your session has expired. Please sign in again." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, requests: [] as ClinicalHandoff[], message: "Your account does not have permission to view Reception requests. Sign in with a Receptionist or IT Admin account." };
    }

    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
    if (code === "42P01" || code === "PGRST205" || code === "PGRST200") {
      return {
        success: false,
        requests: [] as ClinicalHandoff[],
        message: "The doctor-request inbox is not configured in the database yet. Apply migration 20261014010000_clinical_handoffs.sql in Supabase, then refresh this page.",
      };
    }
    if (code === "42501") {
      return { success: false, requests: [] as ClinicalHandoff[], message: "The database denied access to doctor requests. Check the clinical_handoffs table permissions and server database configuration." };
    }
    return { success: false, requests: [] as ClinicalHandoff[], message: "Unable to load department requests. Check the server logs for “Loading clinical handoffs failed” to identify the database or connection error." };
  }
}

export async function updateClinicalHandoffStatus(input: {
  id: string;
  destination: HandoffDestination;
  status: "acknowledged" | "completed" | "cancelled";
}) {
  try {
    const staff = input.destination === "CASHIER"
      ? await requireRole(["IT_ADMIN", "CASHIER"])
      : await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    if (!input.id?.trim()) return { success: false, message: "Request ID is required." };

    const updates: Record<string, unknown> = {
      status: input.status,
      received_by: staff.id,
      updated_at: new Date().toISOString(),
    };
    if (input.status === "completed") updates.completed_at = new Date().toISOString();

    const { data, error } = await supabaseServer
      .from("clinical_handoffs")
      .update(updates)
      .eq("id", input.id)
      .eq("destination", input.destination)
      .in("status", ["pending", "acknowledged"])
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { success: false, message: "Request not found or already processed." };

    revalidatePath(input.destination === "CASHIER" ? "/cashier" : "/receptionist");
    return { success: true, message: input.status === "completed" ? "Request marked completed." : input.status === "acknowledged" ? "Request acknowledged." : "Request cancelled." };
  } catch (error) {
    console.error("Updating clinical handoff failed:", error);
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return { success: false, message: "Please sign in again to continue." };
    if (error instanceof Error && error.message === "FORBIDDEN") return { success: false, message: "You are not authorized to update this request." };
    return { success: false, message: "Unable to update this request." };
  }
}
