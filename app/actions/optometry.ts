"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export type OptometryRefraction = {
  sphere: string;
  cylinder: string;
  axis: string;
};

export interface OptometryAssessmentFormData {
  patientId: string;

  visualAcuityOD: string;
  visualAcuityOS: string;
  visualAcuityOU?: string;

  withCorrection?: boolean;

  slitLampOD: string;
  slitLampOS: string;

  refractionOD: OptometryRefraction;
  refractionOS: OptometryRefraction;

  diagnosis: string;

  status: "draft" | "completed";
}

export interface OptometryAssessmentResponse {
  success: boolean;
  message: string;
  encounterId?: string;
}

/**
 * Saves an Optometry assessment as a clinical encounter.
 *
 * Optometry uses the existing encounters table rather than creating
 * a second, separate clinical-record system.
 */
export async function saveOptometryAssessment(
  formData: OptometryAssessmentFormData
): Promise<OptometryAssessmentResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPTOMETRIST",
      "OPHTHALMOLOGIST",
      "DOCTOR",
    ]);

    const patientCode =
      formData.patientId?.trim();

    if (!patientCode) {
      return {
        success: false,
        message: "Patient ID is required.",
      };
    }

    /*
     * Optometry is a clinical workflow.
     * Never create a patient from this screen.
     */
    const { data: patient, error: patientError } =
      await supabaseServer
        .from("patients")
        .select("id, patient_code, full_name")
        .eq("patient_code", patientCode)
        .maybeSingle();

    if (patientError) {
      console.error(
        "Optometry patient lookup failed:",
        patientError
      );

      return {
        success: false,
        message:
          "Unable to find the patient record.",
      };
    }

    if (!patient) {
      return {
        success: false,
        message: `Patient ${patientCode} was not found. Please return to the patient queue.`,
      };
    }

    /*
     * A completed Optometry assessment must contain a diagnosis.
     *
     * Drafts may be saved without a diagnosis.
     */
    if (
      formData.status === "completed" &&
      !formData.diagnosis.trim()
    ) {
      return {
        success: false,
        message:
          "A diagnosis or clinical impression is required before completing the assessment.",
      };
    }

    /*
     * Save the examination as an encounter.
     *
     * Visual acuity is stored in the existing vitals structure,
     * while refraction and examination findings remain part of
     * the encounter itself.
     *
     * We do not create a new table just for Optometry.
     */
    const { data: encounter, error: encounterError } =
      await supabaseServer
        .from("encounters")
        .insert({
          patient_id: patient.id,

          slit_lamp_od:
            formData.slitLampOD.trim() || null,

          slit_lamp_os:
            formData.slitLampOS.trim() || null,

          refraction_od: {
            sphere:
              formData.refractionOD.sphere.trim(),

            cylinder:
              formData.refractionOD.cylinder.trim(),

            axis:
              formData.refractionOD.axis.trim(),
          },

          refraction_os: {
            sphere:
              formData.refractionOS.sphere.trim(),

            cylinder:
              formData.refractionOS.cylinder.trim(),

            axis:
              formData.refractionOS.axis.trim(),
          },

          diagnosis:
            formData.diagnosis.trim() || null,

          status: formData.status,

          recorded_by: staff.id,
        })
        .select("id")
        .single();

    if (encounterError) {
      console.error(
        "Optometry encounter save failed:",
        encounterError
      );

      return {
        success: false,
        message:
          "Failed to save the Optometry assessment.",
      };
    }

    /*
     * If the assessment is completed, keep the patient workflow
     * consistent with the existing clinical workflow.
     *
     * Draft:
     *   patient remains in consultation/clinical workflow.
     *
     * Completed:
     *   patient is marked as completed for the current clinical stage.
     */
    const nextPatientStatus =
      formData.status === "completed"
        ? "completed_today"
        : "in_consultation";

    const { error: patientUpdateError } =
      await supabaseServer
        .from("patients")
        .update({
          status: nextPatientStatus,
        })
        .eq("id", patient.id);

    if (patientUpdateError) {
      /*
       * The encounter has already been saved.
       * Do not pretend the clinical record was lost.
       */
      console.error(
        "Optometry patient status update failed:",
        patientUpdateError
      );
    }

    /*
     * Keep an auditable record of who performed the assessment.
     */
    await logActivity({
      module: "Optometry",
      category: "CLINICAL",

      action:
        formData.status === "completed"
          ? `Optometry assessment completed${
              formData.diagnosis.trim()
                ? `: ${formData.diagnosis.trim()}`
                : ""
            }`
          : "Optometry assessment saved as draft.",

      performedBy: staff.name,
      staffId: staff.id,

      patientId: patient.id,

      details: JSON.stringify({
        encounterId: encounter.id,
        patientCode: patient.patient_code,
        patientName: patient.full_name,

        visualAcuityOD:
          formData.visualAcuityOD.trim(),

        visualAcuityOS:
          formData.visualAcuityOS.trim(),

        visualAcuityOU:
          formData.visualAcuityOU?.trim() || null,

        withCorrection:
          formData.withCorrection ?? false,

        status: formData.status,
      }),
    });

    /*
     * Refresh the Optometry and patient clinical pages.
     */
    revalidatePath("/optometry");

    revalidatePath(
      `/doctor/patients/${patientCode}`
    );

    revalidatePath(
      `/doctor/patients/${patientCode}/encounter`
    );

    return {
      success: true,

      message:
        formData.status === "completed"
          ? "Optometry assessment completed successfully."
          : "Optometry assessment draft saved successfully.",

      encounterId: encounter.id,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
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
            "You are not authorized to perform Optometry assessments.",
        };
      }
    }

    console.error(
      "Optometry assessment error:",
      error
    );

    return {
      success: false,
      message:
        "An unexpected error occurred while saving the Optometry assessment.",
    };
  }
}