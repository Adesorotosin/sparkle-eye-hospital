"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

export interface ConsultationFormData {
  patientId: string;
  slitLampOD: string;
  slitLampOS: string;
  refractionOD: { sphere: string; cylinder: string; axis: string };
  refractionOS: { sphere: string; cylinder: string; axis: string };
  diagnosis: string;
  status: "draft" | "completed";
}

export interface ConsultationResponse {
  success: boolean;
  message: string;
}

export async function saveConsultationEncounter(
  formData: ConsultationFormData
): Promise<ConsultationResponse> {
  try {
    // Resolve the patient by their human-readable code (e.g. "SPK-30892").
    // Other pages in this app still use separate hardcoded mock patient
    // lists that haven't been migrated to the database yet, so if the
    // code isn't found, create a lightweight patient record on the fly
    // rather than failing the save outright.
    let { data: patient, error: findError } = await supabase
      .from("patients")
      .select("id")
      .eq("patient_code", formData.patientId)
      .maybeSingle();

    if (findError) throw findError;

    if (!patient) {
      const { data: created, error: createError } = await supabase
        .from("patients")
        .insert({ patient_code: formData.patientId, full_name: formData.patientId })
        .select("id")
        .single();
      if (createError) throw createError;
      patient = created;
    }

    const { error: encounterError } = await supabase.from("encounters").insert({
      patient_id: patient.id,
      slit_lamp_od: formData.slitLampOD,
      slit_lamp_os: formData.slitLampOS,
      refraction_od: formData.refractionOD,
      refraction_os: formData.refractionOS,
      diagnosis: formData.diagnosis,
      status: formData.status,
    });

    if (encounterError) throw encounterError;

    await logActivity({
      module: "Consultation",
      category: "CLINICAL",
      action: `Consultation ${formData.status === "completed" ? "completed" : "saved as draft"}${
        formData.diagnosis ? `: ${formData.diagnosis}` : ""
      }`,
      performedBy: "Attending Physician",
      patientId: patient.id,
    });

    // Revalidate relevant patient routes
    revalidatePath(`/doctor/patients/${formData.patientId}/encounter`);
    revalidatePath(`/doctor/patients/${formData.patientId}`);
    revalidatePath(`/doctor/patients`);

    return {
      success: true,
      message: `Encounter successfully ${
        formData.status === "completed" ? "completed" : "saved as draft"
      }!`,
    };
  } catch (error) {
    console.error("Failed to save encounter:", error);
    return {
      success: false,
      message: "Failed to save record. Please try again.",
    };
  }
}
