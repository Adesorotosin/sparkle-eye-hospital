// app/api/patients/[code]/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPatientRecord, getOrCreatePatientByCode } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";

// --- GET: Fetch the full patient record (vitals, diagnostics, rx, invoice) ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Ensure the patient exists (creates a bare record if this is the
    // first time this code has been seen) so the frontend always gets a
    // usable record back instead of a 404 on first load.
    await getOrCreatePatientByCode(code);

    const patient = await getPatientRecord(code);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("Fetch patient error:", error);
    return NextResponse.json({ error: "Failed to load patient record" }, { status: 500 });
  }
}

// --- PATCH: Update a patient's details and/or visit status ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { fullName, age, gender, phone, coveragePlan, isWalkIn, status } = body;

    const patch: Record<string, unknown> = {};
    if (fullName !== undefined) patch.full_name = fullName;
    if (age !== undefined) patch.age = age;
    if (gender !== undefined) patch.gender = gender;
    if (phone !== undefined) patch.phone = phone;
    if (coveragePlan !== undefined) patch.coverage_plan = coveragePlan;
    if (isWalkIn !== undefined) patch.is_walk_in = isWalkIn;
    if (status !== undefined) patch.status = status;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("patients")
      .update(patch)
      .eq("patient_code", code)
      .select("*")
      .single();
    if (error) throw error;

    await logActivity({
      module: "Admin",
      category: "ADMIN",
      action: `Patient record updated: ${data.full_name} (${data.patient_code})`,
      performedBy: "Doctor",
      patientId: data.id,
    });

    return NextResponse.json({
      patient: {
        patientId: data.patient_code,
        fullName: data.full_name,
        coveragePlan: data.coverage_plan,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        allergies: data.allergies,
        status: data.status,
        isWalkIn: data.is_walk_in,
        lastVisitAt: data.last_visit_at,
      },
    });
  } catch (error) {
    console.error("Update patient error:", error);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}
