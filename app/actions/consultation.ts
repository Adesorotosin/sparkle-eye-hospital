"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export interface ConsultationFormData {
  patientId: string;
  encounterId?: string;

  presentingComplaint: string;
  historyOfPresentingComplaint: string;
  pastMedicalHistory: string;
  pastOcularHistory: string;
  familyOcularHistory: string;

  ocularExamOD: string;
  ocularExamOS: string;
  slitLampOD: string;
  slitLampOS: string;
  otherExaminationFindings: string;

  iopOD: number | null;
  iopOS: number | null;
  iopInstrument: string;

  treatmentPlan: string;

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
    /*
     * Only authenticated clinical staff may create consultation
     * encounters.
     */
    const staff = await requireRole([
      "IT_ADMIN",
      "OPHTHALMOLOGIST",
      "DOCTOR",
    ]);

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
    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code, full_name")
      .eq("patient_code", formData.patientId.trim())
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
    if (
      formData.status === "completed" &&
      !formData.diagnosis.trim()
    ) {
      return {
        success: false,
        message:
          "A diagnosis is required before completing the encounter.",
      };
    }

    /*
     * Reuse the active draft when the doctor is continuing the same
     * encounter. A completed encounter remains a historical clinical
     * event; a new visit without a draft creates a new row.
     */
    const encounterValues = {
      patient_id: patient.id,

      presenting_complaint:
        formData.presentingComplaint.trim() || null,

      history_of_presenting_complaint:
        formData.historyOfPresentingComplaint.trim() || null,

      past_medical_history:
        formData.pastMedicalHistory.trim() || null,

      past_ocular_history:
        formData.pastOcularHistory.trim() || null,

      family_ocular_history:
        formData.familyOcularHistory.trim() || null,

      ocular_exam_od:
        formData.ocularExamOD.trim() || null,

      ocular_exam_os:
        formData.ocularExamOS.trim() || null,

      slit_lamp_od:
        formData.slitLampOD.trim() || null,

      slit_lamp_os:
        formData.slitLampOS.trim() || null,

      other_examination_findings:
        formData.otherExaminationFindings.trim() || null,

      iop_od: formData.iopOD,
      iop_os: formData.iopOS,
      iop_instrument:
        formData.iopInstrument.trim() || null,

      refraction_od: {
        sphere: String(formData.refractionOD?.sphere ?? "").trim(),
        cylinder: String(formData.refractionOD?.cylinder ?? "").trim(),
        axis: String(formData.refractionOD?.axis ?? "").trim(),
      },

      refraction_os: {
        sphere: String(formData.refractionOS?.sphere ?? "").trim(),
        cylinder: String(formData.refractionOS?.cylinder ?? "").trim(),
        axis: String(formData.refractionOS?.axis ?? "").trim(),
      },

      diagnosis: formData.diagnosis.trim() || null,

      treatment_plan:
        formData.treatmentPlan.trim() || null,

      status: formData.status,
    };

    let encounterId = "";
    const requestedEncounterId = formData.encounterId?.trim();

    if (requestedEncounterId) {
      const { data: updatedEncounter, error: updateEncounterError } =
        await supabaseServer
          .from("encounters")
          .update(encounterValues)
          .eq("id", requestedEncounterId)
          .eq("patient_id", patient.id)
          .eq("status", "draft")
          .select("id")
          .maybeSingle();

      if (updateEncounterError) {
        console.error("Encounter draft update failed:", updateEncounterError);
        return {
          success: false,
          message: "Failed to update the consultation draft.",
        };
      }

      if (!updatedEncounter) {
        return {
          success: false,
          message:
            "This consultation draft is no longer editable. Refresh the patient record before saving again.",
        };
      }

      encounterId = updatedEncounter.id;
    } else {
      const { data: createdEncounter, error: encounterError } =
        await supabaseServer
          .from("encounters")
          .insert({
            ...encounterValues,
            recorded_by: staff.id,
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

      encounterId = createdEncounter.id;
    }

    /*
     * Keep the patient's workflow status synchronized.
     */
    const { error: patientUpdateError } = await supabaseServer
      .from("patients")
      .update({
        status:
          formData.status === "completed"
            ? "completed_today"
            : "in_consultation",
        last_visit_at: new Date().toISOString(),
      })
      .eq("id", patient.id);

    const patientStatusUpdateFailed = Boolean(patientUpdateError);

    if (patientUpdateError) {
      console.error(
        "Patient status update failed after encounter save:",
        patientUpdateError
      );
    }

    /*
     * Write an auditable clinical activity entry using the
     * authenticated staff member instead of a hardcoded identity.
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

      performedBy: staff.name,
      staffId: staff.id,

      patientId: patient.id,

      details: JSON.stringify({
        encounterId,
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

      message: patientStatusUpdateFailed
        ? "Consultation record saved, but the patient's queue status could not be updated. Refresh and verify the queue before proceeding."
        : formData.status === "completed"
          ? "Consultation completed successfully."
          : "Consultation draft saved successfully.",

      encounterId,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return {
          success: false,
          message: "You must be signed in to save a consultation.",
        };
      }

      if (error.message === "FORBIDDEN") {
        return {
          success: false,
          message:
            "You are not authorized to save consultation records.",
        };
      }
    }

    console.error("Failed to save consultation:", error);

    return {
      success: false,
      message:
        "An unexpected error occurred while saving the consultation.",
    };
  }
}