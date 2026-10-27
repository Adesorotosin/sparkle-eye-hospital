"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole, type UserRole } from "@/lib/server-auth";

export type VisitDestination =
  | "TRIAGE"
  | "DOCTOR"
  | "PHARMACY"
  | "LABORATORY"
  | "DIAGNOSTICS"
  | "OPTOMETRY";

export type VisitRouteStatus = "pending" | "acknowledged" | "completed" | "cancelled";

export type PatientVisitRoute = {
  id: string;
  patientCode: string;
  registrationNumber: string | null;
  patientName: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  destination: VisitDestination;
  reason: string | null;
  status: VisitRouteStatus;
  createdAt: string;
};

const DESTINATION_ROLES: Record<VisitDestination, UserRole[]> = {
  TRIAGE: ["IT_ADMIN", "NURSE", "DOCTOR", "OPHTHALMOLOGIST"],
  DOCTOR: ["IT_ADMIN", "DOCTOR", "OPHTHALMOLOGIST"],
  PHARMACY: ["IT_ADMIN", "PHARMACIST", "NURSE", "DOCTOR", "OPHTHALMOLOGIST"],
  LABORATORY: ["IT_ADMIN", "LAB_SCIENTIST", "DOCTOR", "OPHTHALMOLOGIST", "NURSE"],
  DIAGNOSTICS: ["IT_ADMIN", "DOCTOR", "OPHTHALMOLOGIST", "NURSE", "LAB_SCIENTIST"],
  OPTOMETRY: ["IT_ADMIN", "OPTOMETRIST", "OPHTHALMOLOGIST", "DOCTOR", "NURSE"],
};

function isDestination(value: unknown): value is VisitDestination {
  return typeof value === "string" && value in DESTINATION_ROLES;
}

function toRoute(row: Record<string, unknown>): PatientVisitRoute {
  const patient = (Array.isArray(row.patient) ? row.patient[0] : row.patient) as Record<string, unknown> | null;
  return {
    id: String(row.id),
    patientCode: String(patient?.patient_code ?? ""),
    registrationNumber: patient?.registration_number ? String(patient.registration_number) : null,
    patientName: String(patient?.full_name ?? "Unknown patient"),
    age: patient?.age == null ? null : Number(patient.age),
    gender: patient?.gender == null ? null : String(patient.gender),
    phone: patient?.phone == null ? null : String(patient.phone),
    destination: row.destination as VisitDestination,
    reason: row.reason == null ? null : String(row.reason),
    status: row.status as VisitRouteStatus,
    createdAt: String(row.created_at),
  };
}

export async function createPatientVisitRoute(input: {
  patientCode: string;
  destination: VisitDestination;
  reason?: string;
}) {
  try {
    const staff = await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    const patientCode = input.patientCode?.trim();
    const reason = input.reason?.trim() || null;

    if (!patientCode || !isDestination(input.destination)) {
      return { success: false, message: "Choose a valid visit destination and registered patient." };
    }

    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code, full_name")
      .eq("patient_code", patientCode)
      .maybeSingle();

    if (patientError || !patient) {
      return { success: false, message: "The patient is registered, but the routing request could not find that patient. Do not register them again; contact the administrator." };
    }

    const { data: existing, error: existingError } = await supabaseServer
      .from("patient_visit_routes")
      .select("id, destination, status")
      .eq("patient_id", patient.id)
      .eq("destination", input.destination)
      .in("status", ["pending", "acknowledged"])
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return {
        success: true,
        message: `${patient.full_name} already has an active ${input.destination.toLowerCase()} arrival request.`,
        routeId: existing.id,
      };
    }

    const { data: route, error } = await supabaseServer
      .from("patient_visit_routes")
      .insert({
        patient_id: patient.id,
        destination: input.destination,
        reason,
        status: "pending",
        created_by: staff.id,
      })
      .select("id")
      .single();

    if (error) throw error;

    await logActivity({
      module: "Reception",
      category: "ADMIN",
      action: `Patient routed to ${input.destination}: ${patient.full_name}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({ patientCode, destination: input.destination, routeId: route.id }),
    });

    revalidatePath("/receptionist");
    revalidatePath("/triage");
    revalidatePath("/doctor");
    revalidatePath("/pharmacy");
    revalidatePath("/laboratory");
    revalidatePath("/diagnostics");
    revalidatePath("/optometry");

    return { success: true, message: `${patient.full_name} registered and routed to ${input.destination.toLowerCase()} queue.`, routeId: route.id };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, message: "Your session has expired. Sign in again." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, message: "Only Reception or an administrator can route a newly registered patient." };
    }
    console.error("Creating patient visit route failed:", error);
    return { success: false, message: "The patient was registered, but their queue routing could not be saved. Do not register them again; contact the administrator." };
  }
}

export async function getPatientVisitRoutes(destination: VisitDestination) {
  try {
    if (!isDestination(destination)) {
      return { success: false, routes: [] as PatientVisitRoute[], message: "Invalid queue destination." };
    }
    await requireRole(DESTINATION_ROLES[destination]);

    const { data, error } = await supabaseServer
      .from("patient_visit_routes")
      .select("id, destination, reason, status, created_at, patient:patients!patient_visit_routes_patient_id_fkey(patient_code, registration_number, full_name, age, gender, phone)")
      .eq("destination", destination)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, routes: (data ?? []).map((row) => toRoute(row as unknown as Record<string, unknown>)) };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { success: false, routes: [] as PatientVisitRoute[], message: "Sign in to view the arrival queue." };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { success: false, routes: [] as PatientVisitRoute[], message: "You are not authorized to view this department's arrival queue." };
    }
    console.error("Loading patient visit routes failed:", error);
    return { success: false, routes: [] as PatientVisitRoute[], message: "Unable to load the arrival queue." };
  }
}

export async function updatePatientVisitRoute(input: {
  id: string;
  destination: VisitDestination;
  status: "acknowledged" | "completed";
}) {
  try {
    if (!isDestination(input.destination) || !input.id?.trim()) {
      return { success: false, message: "Choose a valid arrival request." };
    }
    const staff = await requireRole(DESTINATION_ROLES[input.destination]);
    const handledAt = input.status === "completed" ? new Date().toISOString() : null;
    const { data, error } = await supabaseServer
      .from("patient_visit_routes")
      .update({
        status: input.status,
        handled_by: staff.id,
        handled_at: handledAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("destination", input.destination)
      .in("status", ["pending", "acknowledged"])
      .select("id, patient_id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, message: "This arrival request was already handled or is no longer available." };

    await logActivity({
      module: "Reception routing",
      category: "ADMIN",
      action: `Patient arrival marked ${input.status}: ${input.destination}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: data.patient_id,
      details: JSON.stringify({ routeId: data.id, destination: input.destination, status: input.status }),
    });

    revalidatePath("/receptionist");
    revalidatePath("/triage");
    revalidatePath("/doctor");
    revalidatePath("/pharmacy");
    revalidatePath("/laboratory");
    revalidatePath("/diagnostics");
    revalidatePath("/optometry");
    return { success: true, message: input.status === "completed" ? "Arrival request marked as handled." : "Arrival request acknowledged." };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return { success: false, message: "Sign in to update the arrival queue." };
    if (error instanceof Error && error.message === "FORBIDDEN") return { success: false, message: "You are not authorized to update this department's arrival queue." };
    console.error("Updating patient visit route failed:", error);
    return { success: false, message: "Unable to update the arrival request." };
  }
}
