"use server";

import { revalidatePath } from "next/cache";

import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

type EncounterStatus = "draft" | "completed";

export type SaveOptometryEncounterInput = {
  patientCode: string;

  visualAcuityOD: string;
  visualAcuityOS: string;
  visualAcuityOU: string;

  withCorrection: boolean;

  refractionOD: {
    sphere: string;
    cylinder: string;
    axis: string;
    add: string;
  };

  refractionOS: {
    sphere: string;
    cylinder: string;
    axis: string;
    add: string;
  };

  slitLampOD: string;
  slitLampOS: string;

  clinicalImpression: string;

  status: EncounterStatus;
};

export type SaveOptometryEncounterResponse = {
  success: boolean;
  message: string;
  encounterId?: string;
};

function emptyToNull(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeRefraction(
  refraction: SaveOptometryEncounterInput["refractionOD"]
) {
  return {
    sphere: emptyToNull(refraction.sphere),
    cylinder: emptyToNull(refraction.cylinder),
    axis: emptyToNull(refraction.axis),
    add: emptyToNull(refraction.add),
  };
}

export async function saveOptometryEncounter(
  input: SaveOptometryEncounterInput
): Promise<SaveOptometryEncounterResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPTOMETRIST",
    ]);

    const patientCode = input.patientCode?.trim();

    if (!patientCode) {
      return {
        success: false,
        message: "Patient code is required.",
      };
    }

    if (
      input.status !== "draft" &&
      input.status !== "completed"
    ) {
      return {
        success: false,
        message: "Invalid encounter status.",
      };
    }

    if (
      input.status === "completed" &&
      !input.clinicalImpression.trim()
    ) {
      return {
        success: false,
        message:
          "Clinical impression is required before completing the assessment.",
      };
    }

    const { data: patient, error: patientError } =
      await supabaseServer
        .from("patients")
        .select(
          "id, patient_code, full_name, optometry_status"
        )
        .eq("patient_code", patientCode)
        .maybeSingle();

    if (patientError) {
      throw patientError;
    }

    if (!patient) {
      return {
        success: false,
        message: `Patient ${patientCode} was not found.`,
      };
    }

    if (patient.optometry_status === null) {
      return {
        success: false,
        message:
          "This patient has not been referred to Optometry.",
      };
    }

    if (patient.optometry_status === "completed") {
      return {
        success: false,
        message:
          "This Optometry assessment has already been completed.",
      };
    }

    /*
     * Look for the patient's existing draft Optometry encounter.
     *
     * This allows Save Draft to update the same encounter instead
     * of creating a new row every time the Optometrist saves.
     */
    const {
      data: existingEncounter,
      error: existingError,
    } = await supabaseServer
      .from("encounters")
      .select("id")
      .eq("patient_id", patient.id)
      .eq("encounter_type", "optometry")
      .eq("status", "draft")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const encounterPayload = {
      patient_id: patient.id,

      encounter_type: "optometry",

      /*
       * Optometry visual acuity is stored on the encounter itself.
       * This is important because these values may differ from the
       * original triage measurements.
       */
      visual_acuity_od: emptyToNull(
        input.visualAcuityOD
      ),

      visual_acuity_os: emptyToNull(
        input.visualAcuityOS
      ),

      visual_acuity_ou: emptyToNull(
        input.visualAcuityOU
      ),

      with_correction: Boolean(
        input.withCorrection
      ),

      slit_lamp_od: emptyToNull(
        input.slitLampOD
      ),

      slit_lamp_os: emptyToNull(
        input.slitLampOS
      ),

      refraction_od: normalizeRefraction(
        input.refractionOD
      ),

      refraction_os: normalizeRefraction(
        input.refractionOS
      ),

      diagnosis: emptyToNull(
        input.clinicalImpression
      ),

      status: input.status,

      recorded_by: staff.id,

      updated_at: new Date().toISOString(),
    };

    let encounterId =
      existingEncounter?.id;

    if (existingEncounter) {
      const { error: updateError } =
        await supabaseServer
          .from("encounters")
          .update(encounterPayload)
          .eq("id", existingEncounter.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const {
        data: createdEncounter,
        error: createError,
      } = await supabaseServer
        .from("encounters")
        .insert(encounterPayload)
        .select("id")
        .single();

      if (createError) {
        throw createError;
      }

      encounterId = createdEncounter.id;
    }

    /*
     * Update the patient's Optometry workflow status.
     */
    if (input.status === "completed") {
      const { error: patientUpdateError } =
        await supabaseServer
          .from("patients")
          .update({
            optometry_status: "completed",
            status: "in_consultation",
          })
          .eq("id", patient.id);

      if (patientUpdateError) {
        throw patientUpdateError;
      }
    } else {
      const { error: patientUpdateError } =
        await supabaseServer
          .from("patients")
          .update({
            optometry_status: "in_examination",
          })
          .eq("id", patient.id);

      if (patientUpdateError) {
        throw patientUpdateError;
      }
    }

    /*
     * Record the clinical activity.
     */
    await logActivity({
      module: "Optometry",
      category: "CLINICAL",
      action:
        input.status === "completed"
          ? "Optometry assessment completed"
          : "Optometry assessment saved as draft",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        patientCode: patient.patient_code,
        patientName: patient.full_name,
        encounterId,
        status: input.status,
        visualAcuityOD:
          input.visualAcuityOD,
        visualAcuityOS:
          input.visualAcuityOS,
        visualAcuityOU:
          input.visualAcuityOU,
        withCorrection:
          input.withCorrection,
      }),
    });

    /*
     * Refresh the pages that depend on the updated record.
     */
    revalidatePath("/optometry");

    revalidatePath(
      `/optometry/${patient.patient_code}`
    );

    revalidatePath(
      `/doctor/patients/${patient.patient_code}/encounter`
    );

    return {
      success: true,
      message:
        input.status === "completed"
          ? "Optometry assessment completed successfully."
          : "Optometry assessment saved as draft.",
      encounterId,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "UNAUTHENTICATED"
      ) {
        return {
          success: false,
          message:
            "You must be signed in to save an Optometry assessment.",
        };
      }

      if (error.message === "FORBIDDEN") {
        return {
          success: false,
          message:
            "You are not authorized to save Optometry assessments.",
        };
      }
    }

    console.error(
      "Failed to save Optometry encounter:",
      error
    );

    return {
      success: false,
      message:
        "Unable to save the Optometry assessment.",
    };
  }
}