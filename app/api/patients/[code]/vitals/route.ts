// app/api/patients/[code]/vitals/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOrCreatePatientByCode, addActivityLog, getPatientRecord } from "@/lib/patient-flow";

// --- POST: Record triage vitals for a patient ---
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const {
      visualAcuityOD,
      visualAcuityOS,
      visualAcuityOU,
      withCorrection,
      iopOD,
      iopOS,
      iopInstrument,
      bpSystolic,
      bpDiastolic,
      pulse,
      temperature,
      spo2,
      primaryComplaint,
      symptoms,
      severity,
      durationText,
    } = body;

    const patient = await getOrCreatePatientByCode(code);

    const { error } = await supabase.from("vitals").insert({
      patient_id: patient.id,
      visual_acuity_od: visualAcuityOD,
      visual_acuity_os: visualAcuityOS,
      visual_acuity_ou: visualAcuityOU ?? null,
      with_correction: withCorrection ?? false,
      iop_od: iopOD ?? null,
      iop_os: iopOS ?? null,
      iop_instrument: iopInstrument ?? null,
      bp_systolic: bpSystolic ?? null,
      bp_diastolic: bpDiastolic ?? null,
      pulse: pulse ?? null,
      temperature: temperature ?? null,
      spo2: spo2 ?? null,
      primary_complaint: primaryComplaint,
      symptoms: Array.isArray(symptoms) ? symptoms.join(", ") : symptoms ?? null,
      severity: severity ?? null,
      duration_text: durationText ?? null,
    });
    if (error) throw error;

    // Also bring the patient into the active triage stage
    await supabase.from("patients").update({ status: "in_consultation" }).eq("id", patient.id);

    await addActivityLog(patient.id, "Triage", "Patient vitals recorded.", "Nurse On-Duty");

    const updated = await getPatientRecord(code);
    return NextResponse.json({ patient: updated });
  } catch (error) {
    console.error("Update vitals error:", error);
    return NextResponse.json({ error: "Failed to record vitals" }, { status: 500 });
  }
}
