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
      visualAcuityODPinhole,
      visualAcuityOSPinhole,

      withCorrection,

      visualAcuityODNote,
      visualAcuityOSNote,
      visualAcuityOUNote,

      gonioscopyOD,
      gonioscopyOS,

      bpSystolic,
      bpDiastolic,
      pulse,
      temperature,
      spo2,
      rbs,
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

    /*
     * Visual acuity remains required for all three measurements
     * because the triage form records OD, OS and OU.
     */
    if (!visualAcuityOD || !visualAcuityOS || !visualAcuityOU) {
      return NextResponse.json(
        {
          error:
            "Visual acuity for OD, OS and OU is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: vitalsId, error: vitalsError } =
      await supabaseServer.rpc("record_patient_vitals", {
        p_patient_id: patient.id,

        p_visual_acuity_od: visualAcuityOD,

        p_visual_acuity_os: visualAcuityOS,

        p_visual_acuity_ou: visualAcuityOU,

        p_with_correction:
          withCorrection ?? false,

        p_visual_acuity_od_note:
          typeof visualAcuityODNote === "string"
            ? visualAcuityODNote.trim() || null
            : null,

        p_visual_acuity_os_note:
          typeof visualAcuityOSNote === "string"
            ? visualAcuityOSNote.trim() || null
            : null,

        p_visual_acuity_ou_note:
          typeof visualAcuityOUNote === "string"
            ? visualAcuityOUNote.trim() || null
            : null,

        p_gonioscopy_od:
          typeof gonioscopyOD === "string"
            ? gonioscopyOD.trim() || null
            : null,

        p_gonioscopy_os:
          typeof gonioscopyOS === "string"
            ? gonioscopyOS.trim() || null
            : null,

        p_bp_systolic:
          bpSystolic !== "" && bpSystolic != null
            ? Number(bpSystolic)
            : null,

        p_bp_diastolic:
          bpDiastolic !== "" && bpDiastolic != null
            ? Number(bpDiastolic)
            : null,

        p_pulse:
          pulse !== "" && pulse != null
            ? Number(pulse)
            : null,

        p_temperature:
          temperature !== "" && temperature != null
            ? Number(temperature)
            : null,

        p_spo2:
          spo2 !== "" && spo2 != null
            ? Number(spo2)
            : null,

        p_rbs:
          rbs !== "" && rbs != null
            ? Number(rbs)
            : null,

        p_recorded_by: staff.id,
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

    // Store pinhole readings on the vitals row created by the existing RPC.
    if (vitalsId && (visualAcuityODPinhole || visualAcuityOSPinhole)) {
      const { error: pinholeError } = await supabaseServer
        .from("vitals")
        .update({
          visual_acuity_od_pinhole:
            typeof visualAcuityODPinhole === "string"
              ? visualAcuityODPinhole.trim() || null
              : null,
          visual_acuity_os_pinhole:
            typeof visualAcuityOSPinhole === "string"
              ? visualAcuityOSPinhole.trim() || null
              : null,
        })
        .eq("id", vitalsId);

      if (pinholeError) {
        console.error("Failed to save pinhole visual acuity:", pinholeError);
        return NextResponse.json(
          { error: "Vitals were recorded, but pinhole results could not be saved. Please contact an administrator." },
          { status: 500 }
        );
      }
    }

    /*
     * The database function already moves the patient to
     * "in_consultation". We intentionally do not update the
     * status again here.
     */

    await addActivityLog(
      patient.id,
      "Triage",
      "Patient vitals recorded and sent to doctor queue.",
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