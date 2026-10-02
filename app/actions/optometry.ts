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