"use server";

import { revalidatePath } from "next/cache";

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
    // Simulate async database/API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log(`Encounter ${formData.status} saved for patient ID:`, formData.patientId);

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