// app/api/patients/[code]/vitals/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getPatientByCode,
  addActivityLog,
  getPatientRecord,
} from "@/lib/patient-flow";

// --- POST: Record triage vitals for an existing patient ---
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ code: string }>;
  }
) {
  try {
    const { code } = await params;

    const patientCode = code?.trim();

    if (!patientCode) {
      return NextResponse.json(
        {
          error: "Patient code is required.",
        },
        {
          status: 400,
        }
      );
    }

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

    /*
     * IMPORTANT:
     * Triage must never create a patient.
     *
     * If the code does not exist, return 404.
     */
    const patient =
      await getPatientByCode(
        patientCode
      );

    if (!patient) {
      return NextResponse.json(
        {
          error: `Patient ${patientCode} was not found.`,
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Basic validation.
     */
    if (
      !visualAcuityOD &&
      !visualAcuityOS
    ) {
      return NextResponse.json(
        {
          error:
            "Visual acuity for at least one eye is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!primaryComplaint?.trim()) {
      return NextResponse.json(
        {
          error:
            "Primary complaint is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Save the actual triage record.
     */
    const { error: vitalsError } =
      await supabase
        .from("vitals")
        .insert({
          patient_id:
            patient.id,

          visual_acuity_od:
            visualAcuityOD ??
            null,

          visual_acuity_os:
            visualAcuityOS ??
            null,

          visual_acuity_ou:
            visualAcuityOU ??
            null,

          with_correction:
            withCorrection ??
            false,

          iop_od:
            iopOD ??
            null,

          iop_os:
            iopOS ??
            null,

          iop_instrument:
            iopInstrument ??
            null,

          bp_systolic:
            bpSystolic ??
            null,

          bp_diastolic:
            bpDiastolic ??
            null,

          pulse:
            pulse ??
            null,

          temperature:
            temperature ??
            null,

          spo2:
            spo2 ??
            null,

          primary_complaint:
            primaryComplaint.trim(),

          symptoms:
            Array.isArray(symptoms)
              ? symptoms.join(", ")
              : symptoms ?? null,

          severity:
            severity ??
            null,

          duration_text:
            durationText ??
            null,
        });

    if (vitalsError) {
      console.error(
        "Vitals creation failed:",
        vitalsError
      );

      return NextResponse.json(
        {
          error:
            "Failed to record patient vitals.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Move the patient into the consultation workflow.
     */
    const {
      error: statusError,
    } = await supabase
      .from("patients")
      .update({
        status: "in_consultation",
      })
      .eq("id", patient.id);

    if (statusError) {
      console.error(
        "Patient status update failed:",
        statusError
      );
    }

    /*
     * Audit trail.
     */
    await addActivityLog(
      patient.id,
      "Triage",
      "Patient vitals recorded.",
      "Nurse On-Duty"
    );

    /*
     * Return the complete updated patient record.
     */
    const updated =
      await getPatientRecord(
        patientCode
      );

    return NextResponse.json({
      patient: updated,
    });
  } catch (error) {
    console.error(
      "Update vitals error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to record patient vitals.",
      },
      {
        status: 500,
      }
    );
  }
}
