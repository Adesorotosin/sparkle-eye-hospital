import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { getPatientRecord } from "@/lib/patient-flow";

const READ_ROLES = ["IT_ADMIN", "OPHTHALMOLOGIST", "DOCTOR", "NURSE", "RECEPTIONIST", "PHARMACIST"] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireRole([...READ_ROLES]);
    const { id } = await params;
    if (!id || id.length > 100) return NextResponse.json({ error: "A valid patient identifier is required." }, { status: 400 });

    const { data: patientRow, error: patientError } = await supabaseServer
      .from("patients").select("id, patient_code").eq("patient_code", id).maybeSingle();
    if (patientError) throw patientError;
    if (!patientRow) return NextResponse.json({ error: "Patient not found." }, { status: 404 });

    if (staff.role === "DOCTOR" || staff.role === "OPHTHALMOLOGIST") {
      const { data: allowed, error: accessError } = await supabaseServer.rpc("can_doctor_access_patient", {
        p_doctor_staff_id: staff.id,
        p_patient_id: patientRow.id,
      });
      if (accessError) {
        console.error("Patient chart access check failed:", accessError);
        return NextResponse.json({ error: "Unable to verify patient access." }, { status: 500 });
      }
      if (allowed !== true) return NextResponse.json({ error: "You are not authorised to view this patient record." }, { status: 403 });

      const { error: auditError } = await supabaseServer.from("patient_access_audit").insert({
        patient_id: patientRow.id,
        doctor_staff_id: staff.id,
        performed_by: staff.id,
        action: "PATIENT_RECORD_ACCESSED",
        reason: "Doctor opened patient chart",
      });
      if (auditError) {
        console.error("Patient chart access audit failed:", auditError);
        return NextResponse.json({ error: "Patient access could not be audited. Please retry." }, { status: 500 });
      }
    }

    const patient = await getPatientRecord(patientRow.patient_code);
    if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    const response = NextResponse.json({ patient });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "You are not authorised to view this patient record." }, { status: 403 });
    console.error("Patient chart fetch failed:", error);
    return NextResponse.json({ error: "Unable to load patient record." }, { status: 500 });
  }
}
