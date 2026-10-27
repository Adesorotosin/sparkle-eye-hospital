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
    ).map((rawPatient: unknown) => {
      const patient = rawPatient as Record<string, unknown>;
      const vitals = Array.isArray(patient.vitals)
        ? [...(patient.vitals as Record<string, unknown>[])].sort(
            (a, b) =>
              new Date(String(b.recorded_at ?? "")).getTime() -
              new Date(String(a.recorded_at ?? "")).getTime()
          )[0]
        : (patient.vitals as Record<string, unknown> | null);

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
      } as OptometryPatient;
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
 * Registers an outside/walk-in patient directly from Optometry, without
 * requiring the normal Reception -> Triage -> Doctor route.
 */
export async function registerVisitingOptometryPatient(input: {
  fullName: string;
  age?: number | null;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  visitType: "external_referral" | "self_presenting";
}): Promise<OptometryActionResponse & { patientCode?: string }> {
  try {
    const staff = await requireRole(["IT_ADMIN", "OPTOMETRIST"]);
    const fullName = input.fullName?.trim();
    if (!fullName) return { success: false, message: "Patient full name is required." };

    if (input.visitType !== "external_referral" && input.visitType !== "self_presenting") {
      return { success: false, message: "Choose whether the patient was externally referred or self-presenting." };
    }

    const age = input.age;
    if (age !== undefined && age !== null && (!Number.isInteger(age) || age < 0 || age > 150)) {
      return { success: false, message: "Age must be a valid number between 0 and 150." };
    }

    let dateOfBirth: string | undefined;
    if (input.dateOfBirth?.trim()) {
      const parsed = new Date(`${input.dateOfBirth}T00:00:00`);
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        return { success: false, message: "Enter a valid date of birth that is not in the future." };
      }
      dateOfBirth = input.dateOfBirth;
    }

    let patient: { id: string; patient_code: string; full_name: string } | null = null;

    // The database function creates the patient and encounter in one transaction.
    // Retry only when the internal patient code collides with its unique constraint.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const patientCode = `SPK-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data, error } = await supabaseServer.rpc(
        "register_visiting_optometry_patient",
        {
          p_patient_code: patientCode,
          p_full_name: fullName,
          p_age: age ?? null,
          p_date_of_birth: dateOfBirth ?? null,
          p_gender: input.gender?.trim() || null,
          p_phone: input.phone?.trim() || null,
          p_address: input.address?.trim() || null,
          p_visit_type: input.visitType,
          p_recorded_by: staff.id,
        }
      );

      if (!error) {
        const result = Array.isArray(data) ? data[0] : data;
        if (!result) {
          throw new Error("Optometry registration returned no patient record.");
        }
        patient = result as { id: string; patient_code: string; full_name: string };
        break;
      }

      const errorContext = `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`;
      if (error.code === "23505" && /patient_code/i.test(errorContext) && attempt < 4) {
        continue;
      }
      if (error.code === "23505" && /patient_code/i.test(errorContext)) {
        throw new Error("Unable to generate a unique patient code. Please retry registration.");
      }
      throw error;
    }

    if (!patient) {
      throw new Error("Unable to register the visiting optometry patient. Please retry.");
    }

    await logActivity({
      patientId: patient.id,
      module: "Optometry",
      category: "CLINICAL",
      action: "Outside patient registered directly by Optometry",
      performedBy: staff.name,
      staffId: staff.id,
      details: JSON.stringify({
        patientCode: patient.patient_code,
        patientName: patient.full_name,
        source: "visiting",
        visitType: input.visitType,
      }),
    });

    revalidatePath("/optometry");
    return {
      success: true,
      message: "Outside patient registered and added to the Optometry queue.",
      patientCode: patient.patient_code,
    };
  } catch (error) {
    return handleError(error, "Unable to register the outside Optometry patient.");
  }
}

/**
 * Adds an already-registered visiting patient to the Optometry queue.
 * Reception must register the patient first; the assessment form records
 * external-referral versus self-presenting details.
 */
export async function addVisitingPatientToQueue(
  patientCode: string
): Promise<OptometryActionResponse> {
  try {
    const staff = await requireRole(["IT_ADMIN", "OPTOMETRIST"]);
    const normalizedCode = patientCode?.trim();
    if (!normalizedCode) return { success: false, message: "Enter the registered patient's code." };

    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code, full_name, optometry_status")
      .eq("patient_code", normalizedCode)
      .maybeSingle();
    if (patientError) throw patientError;
    if (!patient) return { success: false, message: `Patient ${normalizedCode} was not found. Register the patient at Reception first.` };
    if (patient.optometry_status === "completed") {
      return { success: false, message: "This patient already has a completed Optometry assessment and cannot be re-added to the same visit." };
    }
    if (patient.optometry_status === "referred" || patient.optometry_status === "in_examination") {
      return { success: true, message: `${patient.full_name} is already in the Optometry queue.` };
    }

    const { error: updateError } = await supabaseServer
      .from("patients")
      .update({ optometry_status: "referred" })
      .eq("id", patient.id);
    if (updateError) throw updateError;

    await logActivity({
      patientId: patient.id,
      module: "Optometry",
      category: "CLINICAL",
      action: "Visiting patient added to Optometry queue",
      performedBy: staff.name,
      staffId: staff.id,
      details: JSON.stringify({ patientCode: normalizedCode, source: "visiting" }),
    });
    revalidatePath("/optometry");
    revalidatePath(`/optometry/${encodeURIComponent(normalizedCode)}`);
    return { success: true, message: `${patient.full_name} added to the Optometry queue. Choose Visiting optometrist and the correct visit type when opening the assessment.` };
  } catch (error) {
    return handleError(error, "Unable to add the visiting patient to Optometry.");
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
  optometry_source,
  optometry_visit_type,
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
        (encounter: Record<string, unknown>) =>
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

        optometrySource:
          optometryEncounter.optometry_source ?? "in_house",

        optometryVisitType:
          optometryEncounter.optometry_visit_type ?? "doctor_referral",

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