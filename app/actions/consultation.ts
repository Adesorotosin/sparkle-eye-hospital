"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

export interface ConsultationFormData {
  patientId: string;

  slitLampOD: string;
  slitLampOS: string;

  refractionOD: {
    sphere: string;
    cylinder: string;
    axis: string;
  };

  refractionOS: {
    sphere: string;
    cylinder: string;
    axis: string;
  };

  diagnosis: string;

  status: "draft" | "completed";
}

export interface ConsultationResponse {
  success: boolean;
  message: string;
  encounterId?: string;
}

export async function saveConsultationEncounter(
  formData: ConsultationFormData
): Promise<ConsultationResponse> {
  try {
    if (!formData.patientId?.trim()) {
      return {
        success: false,
        message: "Patient ID is required.",
      };
    }

    /*
     * Resolve the real patient.
     *
     * patientId from the doctor route is the human-readable
     * patient code, for example:
     *
     * SPK-30892
     */
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, patient_code, full_name")
      .eq("patient_code", formData.patientId)
      .maybeSingle();

    if (patientError) {
      console.error("Patient lookup failed:", patientError);

      return {
        success: false,
        message: "Unable to find the patient record.",
      };
    }

    /*
     * Never create a patient automatically from the consultation
     * screen.
     *
     * Registration should be responsible for creating patients.
     */
    if (!patient) {
      return {
        success: false,
        message: `Patient ${formData.patientId} was not found. Please return to registration/patient queue.`,
      };
    }

    /*
     * Basic validation before writing clinical information.
     */
    if (formData.status === "completed" && !formData.diagnosis.trim()) {
      return {
        success: false,
        message: "A diagnosis is required before completing the encounter.",
      };
    }

    /*
     * Save the consultation as a new encounter.
     *
     * We intentionally INSERT instead of UPDATE because an encounter
     * represents a clinical event/history item.
     */
    const { data: encounter, error: encounterError } = await supabase
      .from("encounters")
      .insert({
        patient_id: patient.id,

        slit_lamp_od: formData.slitLampOD.trim() || null,
        slit_lamp_os: formData.slitLampOS.trim() || null,

        refraction_od: {
          sphere: formData.refractionOD.sphere.trim(),
          cylinder: formData.refractionOD.cylinder.trim(),
          axis: formData.refractionOD.axis.trim(),
        },

        refraction_os: {
          sphere: formData.refractionOS.sphere.trim(),
          cylinder: formData.refractionOS.cylinder.trim(),
          axis: formData.refractionOS.axis.trim(),
        },

        diagnosis: formData.diagnosis.trim() || null,

        status: formData.status,
      })
      .select("id")
      .single();

    if (encounterError) {
      console.error("Encounter save failed:", encounterError);

      return {
        success: false,
        message: "Failed to save the consultation record.",
      };
    }

    /*
     * Keep the patient's workflow status synchronized.
     */
    const { error: patientUpdateError } = await supabase
      .from("patients")
      .update({
        status:
          formData.status === "completed"
            ? "completed_today"
            : "in_consultation",
      })
      .eq("id", patient.id);

    if (patientUpdateError) {
      console.error(
        "Patient status update failed:",
        patientUpdateError
      );

      /*
       * The encounter itself was successfully saved, so we don't
       * report the whole operation as failed.
       */
    }

    /*
     * Write an auditable clinical activity entry.
     */
    await logActivity({
      module: "Consultation",
      category: "CLINICAL",

      action:
        formData.status === "completed"
          ? `Consultation completed${
              formData.diagnosis
                ? `: ${formData.diagnosis.trim()}`
                : ""
            }`
          : "Consultation saved as draft.",

      performedBy: "Attending Physician",

      patientId: patient.id,

      details: JSON.stringify({
        encounterId: encounter.id,
        patientCode: patient.patient_code,
        patientName: patient.full_name,
        status: formData.status,
      }),
    });

    /*
     * Refresh pages that depend on the patient's consultation state.
     */
    revalidatePath(
      `/doctor/patients/${formData.patientId}/encounter`
    );

    revalidatePath(
      `/doctor/patients/${formData.patientId}`
    );

    revalidatePath("/doctor/patients");

    return {
      success: true,

      message:
        formData.status === "completed"
          ? "Consultation completed successfully."
          : "Consultation draft saved successfully.",

      encounterId: encounter.id,
    };
  } catch (error) {
    console.error("Failed to save consultation:", error);

    return {
      success: false,
      message: "An unexpected error occurred while saving the consultation.",
    };
  }
}
