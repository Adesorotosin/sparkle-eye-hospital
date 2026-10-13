"use server";

import { revalidatePath } from "next/cache";

import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export type OptometryActionResponse = {
  success: boolean;
  message: string;
};

export type OptometryPatient = {
  id: string;
  patientCode: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  complaint: string;
  visualAcuityOD: string;
  visualAcuityOS: string;
  visualAcuityOU: string;
  withCorrection: boolean;
  optometryStatus:
    | "referred"
    | "in_examination"
    | "completed"
    | null;
  referredAt: string | null;
  optometrySource: "in_house" | "visiting";
  referralFacility: string | null;
  referringClinician: string | null;
  referralReason: string | null;
  referralNotes: string | null;
};

function handleError(
  error: unknown,
  fallback: string
): OptometryActionResponse {
  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") {
      return {
        success: false,
        message: "You must be signed in.",
      };
    }

    if (error.message === "FORBIDDEN") {
      return {
        success: false,
        message:
          "You are not authorized to perform this Optometry action.",
      };
    }
  }

  console.error(fallback, error);

  return {
    success: false,
    message: fallback,
  };
}

/**
 * Loads the real Optometry queue.
 *
 * Patients enter this queue when a doctor refers them by setting:
 * patients.optometry_status = "referred"
 */
export async function getOptometryQueue(): Promise<{
  success: boolean;
  patients: OptometryPatient[];
  message?: string;
}> {
  try {
    await requireRole([
      "IT_ADMIN",
      "OPTOMETRIST",
    ]);

    const { data, error } = await supabaseServer
      .from("patients")
      .select(`
        id,
        patient_code,
        full_name,
        age,
        gender,
        optometry_status,
        optometry_source,
        optometry_referral_facility,
        optometry_referring_clinician,
        optometry_referral_reason,
        optometry_referral_notes,
        created_at,
        vitals (
          primary_complaint,
          visual_acuity_od,
          visual_acuity_os,
          visual_acuity_ou,
          with_correction,
          recorded_at
        )
      `)
      .in("optometry_status", [
        "referred",
        "in_examination",
        "completed",
      ])
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Failed to load Optometry queue:",
        error
      );

      return {
        success: false,
        patients: [],
        message:
          "Unable to load the Optometry queue.",
      };
    }

    const patients: OptometryPatient[] = (
      data ?? []
    ).map((patient: any) => {
      const vitals = Array.isArray(patient.vitals)
        ? [...patient.vitals].sort(
            (a, b) =>
              new Date(
                b.recorded_at ?? 0
              ).getTime() -
              new Date(
                a.recorded_at ?? 0
              ).getTime()
          )[0]
        : patient.vitals;

      return {
        id: patient.id,
        patientCode: patient.patient_code,
        fullName: patient.full_name,
        age:
          patient.age !== null &&
          patient.age !== undefined
            ? Number(patient.age)
            : null,
        gender:
          patient.gender ?? null,
        complaint:
          vitals?.primary_complaint ??
          "No complaint recorded",
        visualAcuityOD:
          vitals?.visual_acuity_od ??
          "Not recorded",
        visualAcuityOS:
          vitals?.visual_acuity_os ??
          "Not recorded",
        visualAcuityOU:
          vitals?.visual_acuity_ou ??
          "Not recorded",
        withCorrection:
          Boolean(
            vitals?.with_correction
          ),
        optometryStatus:
          patient.optometry_status ?? null,
        referredAt:
          vitals?.recorded_at ??
          patient.created_at ??
          null,
        optometrySource:
          patient.optometry_source === "visiting"
            ? "visiting"
            : "in_house",
        referralFacility: patient.optometry_referral_facility ?? null,
        referringClinician: patient.optometry_referring_clinician ?? null,
        referralReason: patient.optometry_referral_reason ?? null,
        referralNotes: patient.optometry_referral_notes ?? null,
      };
    });

    return {
      success: true,
      patients,
    };
  } catch (error) {
    const result = handleError(
      error,
      "Unable to load the Optometry queue."
    );

    return {
      success: false,
      patients: [],
      message: result.message,
    };
  }
}

/**
 * Starts an Optometry examination.
 */
export async function startOptometryExam(
  patientCode: string
): Promise<OptometryActionResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPTOMETRIST",
    ]);

    const normalizedCode =
      patientCode?.trim();

    if (!normalizedCode) {
      return {
        success: false,
        message:
          "Patient code is required.",
      };
    }

    const { data: patient, error: patientError } =
      await supabaseServer
        .from("patients")
        .select(
          "id, patient_code, full_name, optometry_status"
        )
        .eq(
          "patient_code",
          normalizedCode
        )
        .maybeSingle();

    if (patientError) {
      throw patientError;
    }

    if (!patient) {
      return {
        success: false,
        message:
          `Patient ${normalizedCode} was not found.`,
      };
    }

    if (
      patient.optometry_status ===
      "completed"
    ) {
      return {
        success: false,
        message:
          "This Optometry assessment has already been completed.",
      };
    }

    if (
      patient.optometry_status ===
      "in_examination"
    ) {
      return {
        success: true,
        message:
          "This patient is already in examination.",
      };
    }

    const { error: updateError } =
      await supabaseServer
        .from("patients")
        .update({
          optometry_status:
            "in_examination",
        })
        .eq("id", patient.id);

    if (updateError) {
      throw updateError;
    }

    await logActivity({
      module: "Optometry",
      category: "CLINICAL",
      action:
        "Optometry examination started",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        patientCode:
          patient.patient_code,
        patientName:
          patient.full_name,
      }),
    });

    revalidatePath("/optometry");

    return {
      success: true,
      message:
        "Optometry examination started.",
    };
  } catch (error) {
    return handleError(
      error,
      "Unable to start the Optometry examination."
    );
  }
}

/**
 * Returns a patient and their latest clinical data
 * for the Optometry examination workspace.
 */
export async function getOptometryPatient(
  patientCode: string
) {
  try {
    await requireRole([
      "IT_ADMIN",
      "OPTOMETRIST",
      "DOCTOR",
      "OPHTHALMOLOGIST",
    ]);

    const normalizedCode =
      patientCode?.trim();

    if (!normalizedCode) {
      return {
        success: false,
        patient: null,
        message:
          "Patient code is required.",
      };
    }

    const { data: patient, error } =
      await supabaseServer
        .from("patients")
        .select(`
          id,
          patient_code,
          full_name,
          age,
          gender,
          phone,
          allergies,
          status,
          optometry_status,
          vitals (
            id,
            visual_acuity_od,
            visual_acuity_os,
            visual_acuity_ou,
            visual_acuity_od_pinhole,
            visual_acuity_os_pinhole,
            visual_acuity_od_glasses,
            visual_acuity_os_glasses,
            visual_acuity_ou_glasses,
            visual_acuity_od_near,
            visual_acuity_os_near,
            visual_acuity_ou_near,
            with_correction,
            iop_od,
            iop_os,
            primary_complaint,
            symptoms,
            severity,
            duration_text,
            recorded_at
          ),
          encounters (
  id,
  encounter_type,
  visual_acuity_od,
  visual_acuity_os,
  visual_acuity_ou,
  with_correction,
  slit_lamp_od,
  slit_lamp_os,
  refraction_od,
  refraction_os,
  diagnosis,
  status,
  created_at,
  updated_at
)
        `)
        .eq(
          "patient_code",
          normalizedCode
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!patient) {
      return {
        success: false,
        patient: null,
        message:
          `Patient ${normalizedCode} was not found.`,
      };
    }

    const vitals = Array.isArray(patient.vitals)
      ? [...patient.vitals].sort(
          (a, b) =>
            new Date(
              b.recorded_at ?? 0
            ).getTime() -
            new Date(
              a.recorded_at ?? 0
            ).getTime()
        )[0]
      : patient.vitals;

    const encounters =
      Array.isArray(patient.encounters)
        ? [...patient.encounters].sort(
            (a, b) =>
              new Date(
                b.created_at ?? 0
              ).getTime() -
              new Date(
                a.created_at ?? 0
              ).getTime()
          )
        : [];

    const optometryEncounter =
      encounters.find(
        (encounter: any) =>
          encounter.encounter_type ===
          "optometry"
      );

    return {
      success: true,
      patient: {
        id: patient.id,
        patientCode:
          patient.patient_code,
        fullName:
          patient.full_name,
        age:
          patient.age !== null &&
          patient.age !== undefined
            ? Number(patient.age)
            : null,
        gender:
          patient.gender ?? null,
        phone:
          patient.phone ?? null,
        allergies:
          patient.allergies ?? null,
        status:
          patient.status,
        optometryStatus:
          patient.optometry_status ??
          null,
        vitals: vitals
          ? {
              visualAcuityOD:
                vitals.visual_acuity_od ??
                "",
              visualAcuityOS:
                vitals.visual_acuity_os ??
                "",
              visualAcuityOU:
                vitals.visual_acuity_ou ??
                "",
              visualAcuityODPinhole: vitals.visual_acuity_od_pinhole ?? "",
              visualAcuityOSPinhole: vitals.visual_acuity_os_pinhole ?? "",
              visualAcuityODGlasses: vitals.visual_acuity_od_glasses ?? "",
              visualAcuityOSGlasses: vitals.visual_acuity_os_glasses ?? "",
              visualAcuityOUGlasses: vitals.visual_acuity_ou_glasses ?? "",
              visualAcuityODNear: vitals.visual_acuity_od_near ?? "",
              visualAcuityOSNear: vitals.visual_acuity_os_near ?? "",
              visualAcuityOUNear: vitals.visual_acuity_ou_near ?? "",
              withCorrection:
                Boolean(
                  vitals.with_correction
                ),
              iopOD:
                vitals.iop_od !== null &&
                vitals.iop_od !== undefined
                  ? Number(vitals.iop_od)
                  : null,
              iopOS:
                vitals.iop_os !== null &&
                vitals.iop_os !== undefined
                  ? Number(vitals.iop_os)
                  : null,
              primaryComplaint:
                vitals.primary_complaint ??
                "",
              symptoms:
                vitals.symptoms ?? null,
              severity:
                vitals.severity ?? null,
              durationText:
                vitals.duration_text ??
                null,
              recordedAt:
                vitals.recorded_at ??
                null,
            }
          : null,
        previousOptometryEncounter:
  optometryEncounter
    ? {
        id:
          optometryEncounter.id,

        visualAcuityOD:
          optometryEncounter.visual_acuity_od ??
          "",

        visualAcuityOS:
          optometryEncounter.visual_acuity_os ??
          "",

        visualAcuityOU:
          optometryEncounter.visual_acuity_ou ??
          "",

        withCorrection:
          Boolean(
            optometryEncounter.with_correction
          ),

        slitLampOD:
          optometryEncounter.slit_lamp_od ??
          "",

        slitLampOS:
          optometryEncounter.slit_lamp_os ??
          "",

        refractionOD:
          optometryEncounter.refraction_od ??
          null,

        refractionOS:
          optometryEncounter.refraction_os ??
          null,

        diagnosis:
          optometryEncounter.diagnosis ??
          "",

        status:
          optometryEncounter.status,

        createdAt:
          optometryEncounter.created_at,
      }
    : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      patient: null,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to access Optometry records."
          : "Unable to load the patient record.",
    };
  }
}

/**
 * Categorizes an existing Optometry queue patient as internal or visiting.
 * Only Optometry staff and IT administrators can change this classification.
 */
export async function updateOptometrySource(
  patientCode: string,
  source: "in_house" | "visiting"
): Promise<OptometryActionResponse> {
  try {
    const staff = await requireRole(["IT_ADMIN", "OPTOMETRIST"]);
    const normalizedCode = patientCode?.trim();

    if (!normalizedCode) {
      return { success: false, message: "Patient code is required." };
    }

    if (source !== "in_house" && source !== "visiting") {
      return { success: false, message: "Invalid patient source." };
    }

    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code, full_name, optometry_status")
      .eq("patient_code", normalizedCode)
      .maybeSingle();

    if (patientError) throw patientError;
    if (!patient) {
      return { success: false, message: "Patient was not found." };
    }
    if (!patient.optometry_status) {
      return {
        success: false,
        message: "Only patients already referred to Optometry can be categorized here.",
      };
    }

    const { error } = await supabaseServer
      .from("patients")
      .update({ optometry_source: source })
      .eq("id", patient.id);

    if (error) throw error;

    await logActivity({
      module: "Optometry",
      category: "CLINICAL",
      action: "Optometry patient source updated",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        patientCode: patient.patient_code,
        patientName: patient.full_name,
        source,
      }),
    });

    revalidatePath("/optometry");
    return {
      success: true,
      message: source === "visiting"
        ? "Patient marked as visiting."
        : "Patient marked as in-house.",
    };
  } catch (error) {
    return handleError(error, "Unable to update the patient's source.");
  }
}


export type VisitingOptometryRegistrationInput = {
  fullName: string;
  age?: number | null;
  dateOfBirth?: string | null;
  gender: string;
  phone?: string | null;
  referralFacility: string;
  referringClinician?: string | null;
  referralReason: string;
  referralNotes?: string | null;
};

export type VisitingOptometryRegistrationResult =
  OptometryActionResponse & {
    patientCode?: string;
    registrationNumber?: string | null;
  };

/**
 * Creates a full hospital patient record for an outside referral and places
 * it directly in the Optometry queue as a visiting patient.
 */
export async function registerVisitingOptometryPatient(
  input: VisitingOptometryRegistrationInput
): Promise<VisitingOptometryRegistrationResult> {
  try {
    const staff = await requireRole(["IT_ADMIN", "OPTOMETRIST"]);
    const fullName = input.fullName?.trim();
    const gender = input.gender?.trim();
    const referralFacility = input.referralFacility?.trim();
    const referralReason = input.referralReason?.trim();

    if (!fullName || !gender || !referralFacility || !referralReason) {
      return {
        success: false,
        message: "Name, gender, referring facility, and reason for visit are required.",
      };
    }

    let age: number | undefined;
    if (input.age !== undefined && input.age !== null) {
      if (!Number.isInteger(input.age) || input.age < 0 || input.age > 150) {
        return { success: false, message: "Age must be a whole number between 0 and 150." };
      }
      age = input.age;
    }

    if (input.dateOfBirth) {
      const parsed = new Date(input.dateOfBirth + "T00:00:00");
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        return { success: false, message: "Enter a valid date of birth that is not in the future." };
      }
      const today = new Date();
      age = today.getFullYear() - parsed.getFullYear();
      const monthDifference = today.getMonth() - parsed.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < parsed.getDate())) {
        age -= 1;
      }
    }

    const { registerPatient } = await import("@/lib/patient-flow");
    const patient = await registerPatient({
      fullName,
      age,
      dateOfBirth: input.dateOfBirth || undefined,
      gender,
      phone: input.phone?.trim() || undefined,
      coveragePlan: "Self-Pay",
      status: "in_consultation",
      isWalkIn: true,
    });

    const { data: updatedPatient, error: updateError } = await supabaseServer
      .from("patients")
      .update({
        optometry_status: "referred",
        optometry_source: "visiting",
        optometry_referral_facility: referralFacility,
        optometry_referring_clinician: input.referringClinician?.trim() || null,
        optometry_referral_reason: referralReason,
        optometry_referral_notes: input.referralNotes?.trim() || null,
      })
      .eq("id", patient.id)
      .select("id, patient_code, registration_number, full_name")
      .single();

    if (updateError) {
      console.error("Visiting patient was registered but Optometry referral details could not be saved:", updateError);
      return {
        success: false,
        message: "The patient record was created, but the Optometry referral could not be saved. Please contact an administrator before registering this patient again.",
        patientCode: patient.patient_code,
        registrationNumber: patient.registration_number ?? null,
      };
    }

    await logActivity({
      module: "Optometry",
      category: "CLINICAL",
      action: "Visiting Optometry patient registered",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: updatedPatient.id,
      details: JSON.stringify({
        patientCode: updatedPatient.patient_code,
        registrationNumber: updatedPatient.registration_number ?? null,
        patientName: updatedPatient.full_name,
        referralFacility,
        referringClinician: input.referringClinician?.trim() || null,
        referralReason,
      }),
    });

    revalidatePath("/optometry");
    revalidatePath("/receptionist");

    return {
      success: true,
      message: "Visiting patient registered and added to the Optometry queue.",
      patientCode: updatedPatient.patient_code,
      registrationNumber: updatedPatient.registration_number ?? null,
    };
  } catch (error) {
    return handleError(error, "Unable to register the visiting Optometry patient.");
  }
}
