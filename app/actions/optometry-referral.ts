"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export interface OptometryReferralResponse {
  success: boolean;
  message: string;
}

export async function referPatientToOptometry(
  patientCode: string
): Promise<OptometryReferralResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPHTHALMOLOGIST",
      "DOCTOR",
    ]);

    const normalizedCode = patientCode?.trim();

    if (!normalizedCode) {
      return {
        success: false,
        message: "Patient code is required.",
      };
    }

    const { data: patient, error: patientError } =
      await supabaseServer
        .from("patients")
        .select("id, patient_code, full_name, optometry_status")
        .eq("patient_code", normalizedCode)
        .maybeSingle();

    if (patientError) {
      console.error("Optometry referral patient lookup failed:", patientError);

      return {
        success: false,
        message: "Unable to find the patient record.",
      };
    }

    if (!patient) {
      return {
        success: false,
        message: `Patient ${normalizedCode} was not found.`,
      };
    }

    if (patient.optometry_status === "referred") {
      return {
        success: false,
        message: "This patient is already in the Optometry queue.",
      };
    }

    if (patient.optometry_status === "in_examination") {
      return {
        success: false,
        message: "This patient is already being examined by Optometry.",
      };
    }

    const { error: updateError } = await supabaseServer
      .from("patients")
      .update({
        optometry_status: "referred",
        status: "in_consultation",
      })
      .eq("id", patient.id);

    if (updateError) {
      console.error("Optometry referral update failed:", updateError);

      return {
        success: false,
        message: "Failed to refer the patient to Optometry.",
      };
    }

    await logActivity({
      module: "Optometry",
      category: "CLINICAL",
      action: "Patient referred to Optometry",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        patientCode: patient.patient_code,
        patientName: patient.full_name,
      }),
    });

    revalidatePath(`/doctor/patients/${normalizedCode}/encounter`);
    revalidatePath("/doctor/patients");
    revalidatePath("/optometry");

    return {
      success: true,
      message: "Patient referred to Optometry successfully.",
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return {
          success: false,
          message: "You must be signed in to refer a patient.",
        };
      }

      if (error.message === "FORBIDDEN") {
        return {
          success: false,
          message: "You are not authorized to refer patients to Optometry.",
        };
      }
    }

    console.error("Failed to refer patient to Optometry:", error);

    return {
      success: false,
      message: "An unexpected error occurred while referring the patient.",
    };
  }
}
