import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import {
  getPatientByCode,
  addActivityLog,
  getPatientRecord,
} from "@/lib/patient-flow";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ code: string }>;
  }
) {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPHTHALMOLOGIST",
      "DOCTOR",
      "NURSE",
    ]);

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
    } = body ?? {};

    const patient = await getPatientByCode(patientCode);

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

    if (!visualAcuityOD && !visualAcuityOS) {
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

    if (
      typeof primaryComplaint !== "string" ||
      !primaryComplaint.trim()
    ) {
      return NextResponse.json(
        {
          error: "Primary complaint is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: vitalsId, error: vitalsError } =
      await supabaseServer.rpc("record_patient_vitals", {
        p_patient_id: patient.id,
        p_visual_acuity_od:
          visualAcuityOD ?? null,
        p_visual_acuity_os:
          visualAcuityOS ?? null,
        p_visual_acuity_ou:
          visualAcuityOU ?? null,
        p_with_correction:
          withCorrection ?? false,
        p_iop_od:
          iopOD ?? null,
        p_iop_os:
          iopOS ?? null,
        p_iop_instrument:
          iopInstrument ?? null,
        p_bp_systolic:
          bpSystolic ?? null,
        p_bp_diastolic:
          bpDiastolic ?? null,
        p_pulse:
          pulse ?? null,
        p_temperature:
          temperature ?? null,
        p_spo2:
          spo2 ?? null,
        p_primary_complaint:
          primaryComplaint.trim(),
        p_symptoms:
          Array.isArray(symptoms)
            ? symptoms.join(", ")
            : symptoms ?? null,
        p_severity:
          severity ?? null,
        p_duration_text:
          durationText ?? null,
        p_recorded_by:
          staff.id,
      });

    if (vitalsError) {
      console.error(
        "Atomic vitals recording failed:",
        vitalsError
      );

      return NextResponse.json(
        {
          error: "Failed to record patient vitals.",
        },
        {
          status: 500,
        }
      );
    }

    await addActivityLog(
      patient.id,
      "Triage",
      "Patient vitals recorded.",
      staff.name
    );

    const updated = await getPatientRecord(patientCode);

    return NextResponse.json({
      patient: updated,
      vitalsId,
    });
  } catch (error) {
    console.error("Update vitals error:", error);

    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to record patient vitals.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to record patient vitals.",
      },
      {
        status: 500,
      }
    );
  }
}