import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

function respond(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);
    const [patients, doctors, assignments, grants, audit] = await Promise.all([
      supabaseServer.from("patients").select("id, patient_code, full_name").order("created_at", { ascending: false }).limit(200),
      supabaseServer.from("staff").select("id, staff_id, name, role").in("role", ["DOCTOR", "OPHTHALMOLOGIST"]).eq("is_active", true).is("deleted_at", null).order("name"),
      supabaseServer.from("patient_assignments").select("id, patient_id, doctor_staff_id, assignment_reason, assigned_at, ended_at").order("assigned_at", { ascending: false }).limit(100),
      supabaseServer.from("patient_access_grants").select("id, patient_id, doctor_staff_id, grant_type, reason, starts_at, expires_at, revoked_at").order("created_at", { ascending: false }).limit(100),
      supabaseServer.from("patient_access_audit").select("id, patient_id, doctor_staff_id, performed_by, action, reason, created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    for (const result of [patients, doctors, assignments, grants, audit]) {
      if (result.error) throw result.error;
    }
    return respond({
      patients: patients.data ?? [],
      doctors: doctors.data ?? [],
      assignments: assignments.data ?? [],
      grants: grants.data ?? [],
      audit: audit.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return respond({ error: message === "UNAUTHENTICATED" ? "Authentication required." : message === "FORBIDDEN" ? "IT administrator access required." : "Unable to load patient access controls." }, message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["IT_ADMIN"]);
    const body = await request.json();
    const action = body?.action;
    const patientId = body?.patientId;
    const doctorStaffId = body?.doctorStaffId;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!["ASSIGN", "GRANT", "REVOKE"].includes(action) || typeof patientId !== "string" || typeof doctorStaffId !== "string" || reason.length < 5 || reason.length > 1000) {
      return respond({ error: "Choose a valid action, patient and doctor, and provide a reason of at least 5 characters." }, 400);
    }
    const grantType = body?.grantType;
    if (action === "GRANT" && !["SHARED_CARE", "EMERGENCY"].includes(grantType)) {
      return respond({ error: "Choose shared-care or emergency access." }, 400);
    }
    let expiresAt: string | null = null;
    if (action === "GRANT" && grantType === "EMERGENCY") {
      const hours = Number(body?.durationHours);
      if (!Number.isInteger(hours) || hours < 1 || hours > 24) return respond({ error: "Emergency access must last between 1 and 24 hours." }, 400);
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    } else if (action === "GRANT" && body?.expiresAt) {
      const parsed = new Date(body.expiresAt);
      if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) return respond({ error: "Grant expiry must be a future date." }, 400);
      expiresAt = parsed.toISOString();
    }
    if (action === "REVOKE" && typeof body?.grantId !== "string") return respond({ error: "Grant ID is required for revocation." }, 400);

    const { data, error } = await supabaseServer.rpc("manage_patient_access", {
      p_action: action,
      p_patient_id: patientId,
      p_doctor_staff_id: doctorStaffId,
      p_performed_by: actor.id,
      p_reason: reason,
      p_grant_type: action === "GRANT" ? grantType : null,
      p_expires_at: expiresAt,
      p_grant_id: action === "REVOKE" ? body.grantId : null,
    });
    if (error) {
      console.error("Patient access operation failed:", error);
      return respond({ error: error.message || "Unable to update patient access." }, 400);
    }
    return respond({ success: true, result: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return respond({ error: message === "UNAUTHENTICATED" ? "Authentication required." : message === "FORBIDDEN" ? "IT administrator access required." : "Unable to update patient access." }, message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500);
  }
}
