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
    } = body;

    const patient =
      await getPatientByCode(patientCode);

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

    if (
      typeof primaryComplaint !== "string" ||
      !primaryComplaint.trim()
    ) {
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

    const { error: vitalsError } =
      await supabaseServer
        .from("vitals")
        .insert({
          patient_id:
            patient.id,

          visual_acuity_od:
            visualAcuityOD ?? null,

          visual_acuity_os:
            visualAcuityOS ?? null,

          visual_acuity_ou:
            visualAcuityOU ?? null,

          with_correction:
            withCorrection ?? false,

          iop_od:
            iopOD ?? null,

          iop_os:
            iopOS ?? null,

          iop_instrument:
            iopInstrument ?? null,

          bp_systolic:
            bpSystolic ?? null,

          bp_diastolic:
            bpDiastolic ?? null,

          pulse:
            pulse ?? null,

          temperature:
            temperature ?? null,

          spo2:
            spo2 ?? null,

          primary_complaint:
            primaryComplaint.trim(),

          symptoms:
            Array.isArray(symptoms)
              ? symptoms.join(", ")
              : symptoms ?? null,

          severity:
            severity ?? null,

          duration_text:
            durationText ?? null,

          recorded_by:
            staff.id,
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

    const {
      error: statusError,
    } = await supabaseServer
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

    await addActivityLog(
      patient.id,
      "Triage",
      "Patient vitals recorded.",
      staff.name
    );

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
        error:
          "Failed to record patient vitals.",
      },
      {
        status: 500,
      }
    );
  }
}