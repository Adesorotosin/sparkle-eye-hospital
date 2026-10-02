"use server";

import { revalidatePath } from "next/cache";

import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

type OpticalOrderStatus =
  | "referred"
  | "measurements"
  | "ready_for_dispense"
  | "collected";

export type OpticalOrder = {
  id: string;

  patientId: string;
  patientCode: string;
  patientName: string;
  age: number | null;
  gender: string | null;

  optometryEncounterId: string | null;

  status: OpticalOrderStatus;

  visualAcuityOD: string;
  visualAcuityOS: string;
  visualAcuityOU: string;
  withCorrection: boolean;

  refractionOD: Record<string, unknown> | null;
  refractionOS: Record<string, unknown> | null;

  pdBinocular: string;
  pdOD: string;
  pdOS: string;

  segmentHeightOD: string;
  segmentHeightOS: string;

  frameSelection: string;
  lensType: string;
  lensMaterial: string;
  lensCoating: string;

  dispensingNotes: string;

  referredAt: string | null;
  measurementsStartedAt: string | null;
  readyAt: string | null;
  collectedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

export type OpticianActionResponse = {
  success: boolean;
  message: string;
  orderId?: string;
};

export type SaveOpticalOrderInput = {
  orderId: string;

  pdBinocular: string;
  pdOD: string;
  pdOS: string;

  segmentHeightOD: string;
  segmentHeightOS: string;

  frameSelection: string;
  lensType: string;
  lensMaterial: string;
  lensCoating: string;

  dispensingNotes: string;
};

function emptyToNull(
  value: string | undefined | null
) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function handleError(
  error: unknown,
  fallback: string
): OpticianActionResponse {
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
          "You are not authorized to perform this Optician action.",
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
 * Loads the real Optician queue.
 *
 * Orders are created from completed Optometry encounters.
 */
export async function getOpticianQueue(): Promise<{
  success: boolean;
  orders: OpticalOrder[];
  message?: string;
}> {
  try {
    await requireRole([
      "IT_ADMIN",
      "OPTICIAN",
    ]);

    const {
      data: orders,
      error: ordersError,
    } = await supabaseServer
      .from("optical_orders")
      .select(`
        id,
        patient_id,
        optometry_encounter_id,
        status,
        pd_binocular,
        pd_od,
        pd_os,
        segment_height_od,
        segment_height_os,
        frame_selection,
        lens_type,
        lens_material,
        lens_coating,
        dispensing_notes,
        referred_at,
        measurements_started_at,
        ready_at,
        collected_at,
        created_at,
        updated_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      return {
        success: true,
        orders: [],
      };
    }

    const patientIds = [
      ...new Set(
        orders.map(
          (order) => order.patient_id
        )
      ),
    ];

    const encounterIds = [
      ...new Set(
        orders
          .map(
            (order) =>
              order.optometry_encounter_id
          )
          .filter(Boolean)
      ),
    ];

    const [
      patientsResult,
      encountersResult,
    ] = await Promise.all([
      supabaseServer
        .from("patients")
        .select(`
          id,
          patient_code,
          full_name,
          age,
          gender
        `)
        .in("id", patientIds),

      encounterIds.length > 0
        ? supabaseServer
            .from("encounters")
            .select(`
              id,
              visual_acuity_od,
              visual_acuity_os,
              visual_acuity_ou,
              with_correction,
              refraction_od,
              refraction_os
            `)
            .in("id", encounterIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (patientsResult.error) {
      throw patientsResult.error;
    }

    if (encountersResult.error) {
      throw encountersResult.error;
    }

    const patientMap = new Map(
      (patientsResult.data ?? []).map(
        (patient) => [
          patient.id,
          patient,
        ]
      )
    );

    const encounterMap = new Map(
      (encountersResult.data ?? []).map(
        (encounter) => [
          encounter.id,
          encounter,
        ]
      )
    );

    const mappedOrders: OpticalOrder[] =
      orders
        .map((order: any) => {
          const patient =
            patientMap.get(
              order.patient_id
            );

          if (!patient) {
            return null;
          }

          const encounter =
            order.optometry_encounter_id
              ? encounterMap.get(
                  order.optometry_encounter_id
                )
              : null;

          return {
            id: order.id,

            patientId:
              patient.id,

            patientCode:
              patient.patient_code,

            patientName:
              patient.full_name,

            age:
              patient.age !== null &&
              patient.age !== undefined
                ? Number(patient.age)
                : null,

            gender:
              patient.gender ?? null,

            optometryEncounterId:
              order.optometry_encounter_id ??
              null,

            status:
              order.status as OpticalOrderStatus,

            visualAcuityOD:
              encounter?.visual_acuity_od ??
              "",

            visualAcuityOS:
              encounter?.visual_acuity_os ??
              "",

            visualAcuityOU:
              encounter?.visual_acuity_ou ??
              "",

            withCorrection:
              Boolean(
                encounter?.with_correction
              ),

            refractionOD:
              encounter?.refraction_od ??
              null,

            refractionOS:
              encounter?.refraction_os ??
              null,

            pdBinocular:
              order.pd_binocular ??
              "",

            pdOD:
              order.pd_od ??
              "",

            pdOS:
              order.pd_os ??
              "",

            segmentHeightOD:
              order.segment_height_od ??
              "",

            segmentHeightOS:
              order.segment_height_os ??
              "",

            frameSelection:
              order.frame_selection ??
              "",

            lensType:
              order.lens_type ??
              "",

            lensMaterial:
              order.lens_material ??
              "",

            lensCoating:
              order.lens_coating ??
              "",

            dispensingNotes:
              order.dispensing_notes ??
              "",

            referredAt:
              order.referred_at ??
              null,

            measurementsStartedAt:
              order.measurements_started_at ??
              null,

            readyAt:
              order.ready_at ??
              null,

            collectedAt:
              order.collected_at ??
              null,

            createdAt:
              order.created_at,

            updatedAt:
              order.updated_at,
          };
        })
        .filter(Boolean) as OpticalOrder[];

    return {
      success: true,
      orders: mappedOrders,
    };
  } catch (error) {
    const result = handleError(
      error,
      "Unable to load the Optician queue."
    );

    return {
      success: false,
      orders: [],
      message: result.message,
    };
  }
}

/**
 * Creates an Optical Order from the patient's
 * latest completed Optometry assessment.
 *
 * Optometry → Optician
 */
export async function createOpticalOrder(
  patientCode: string
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPTICIAN",
      "OPTOMETRIST",
      "DOCTOR",
      "OPHTHALMOLOGIST",
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

    const {
      data: patient,
      error: patientError,
    } = await supabaseServer
      .from("patients")
      .select(`
        id,
        patient_code,
        full_name
      `)
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

    const {
      data: optometryEncounter,
      error: encounterError,
    } = await supabaseServer
      .from("encounters")
      .select(`
        id,
        encounter_type,
        status,
        created_at
      `)
      .eq(
        "patient_id",
        patient.id
      )
      .eq(
        "encounter_type",
        "optometry"
      )
      .eq(
        "status",
        "completed"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (encounterError) {
      throw encounterError;
    }

    if (!optometryEncounter) {
      return {
        success: false,
        message:
          "The patient does not have a completed Optometry assessment yet.",
      };
    }

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabaseServer
      .from("optical_orders")
      .select(`
        id,
        status
      `)
      .eq(
        "patient_id",
        patient.id
      )
      .in("status", [
        "referred",
        "measurements",
        "ready_for_dispense",
      ])
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingOrderError) {
      throw existingOrderError;
    }

    if (existingOrder) {
      return {
        success: true,
        message:
          "This patient already has an active Optical Order.",
        orderId:
          existingOrder.id,
      };
    }

    const {
      data: createdOrder,
      error: createError,
    } = await supabaseServer
      .from("optical_orders")
      .insert({
        patient_id:
          patient.id,

        optometry_encounter_id:
          optometryEncounter.id,

        status:
          "referred",

        referred_at:
          new Date().toISOString(),

        recorded_by:
          staff.id,
      })
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    await logActivity({
      module: "Optician",
      category: "CLINICAL",
      action:
        "Patient referred to Optician",
      performedBy:
        staff.name,
      staffId:
        staff.id,
      patientId:
        patient.id,
      details:
        JSON.stringify({
          patientCode:
            patient.patient_code,
          patientName:
            patient.full_name,
          optometryEncounterId:
            optometryEncounter.id,
          opticalOrderId:
            createdOrder.id,
        }),
    });

    revalidatePath(
      "/optician"
    );

    revalidatePath(
      `/optician/${patient.patient_code}`
    );

    return {
      success: true,
      message:
        "Patient has been referred to Optician successfully.",
      orderId:
        createdOrder.id,
    };
  } catch (error) {
    return handleError(
      error,
      "Unable to refer the patient to Optician."
    );
  }
}

/**
 * Starts the physical optical measurements workflow.
 */
export async function startOpticianMeasurements(
  orderId: string
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPTICIAN",
    ]);

    const normalizedId =
      orderId?.trim();

    if (!normalizedId) {
      return {
        success: false,
        message:
          "Optical order ID is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("optical_orders")
      .select(`
        id,
        patient_id,
        status,
        patients (
          patient_code,
          full_name
        )
      `)
      .eq(
        "id",
        normalizedId
      )
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return {
        success: false,
        message:
          "Optical order was not found.",
      };
    }

    if (
      order.status ===
      "collected"
    ) {
      return {
        success: false,
        message:
          "This optical order has already been collected.",
      };
    }

    if (
      order.status ===
      "ready_for_dispense"
    ) {
      return {
        success: false,
        message:
          "This order is already ready for dispensing.",
      };
    }

    if (
      order.status ===
      "measurements"
    ) {
      return {
        success: true,
        message:
          "This order is already in measurements.",
        orderId:
          order.id,
      };
    }

    const now =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabaseServer
      .from("optical_orders")
      .update({
        status:
          "measurements",

        measurements_started_at:
          now,

        recorded_by:
          staff.id,

        updated_at:
          now,
      })
      .eq(
        "id",
        order.id
      );

    if (updateError) {
      throw updateError;
    }

    const patient = Array.isArray(
      order.patients
    )
      ? order.patients[0]
      : order.patients;

    await logActivity({
      module: "Optician",
      category: "CLINICAL",
      action:
        "Optical measurements started",
      performedBy:
        staff.name,
      staffId:
        staff.id,
      patientId:
        order.patient_id,
      details:
        JSON.stringify({
          opticalOrderId:
            order.id,
          patientCode:
            patient?.patient_code ??
            null,
          patientName:
            patient?.full_name ??
            null,
        }),
    });

    revalidatePath(
      "/optician"
    );

    return {
      success: true,
      message:
        "Optical measurements started.",
      orderId:
        order.id,
    };
  } catch (error) {
    return handleError(
      error,
      "Unable to start optical measurements."
    );
  }
}

/**
 * Loads one Optical Order and its completed
 * Optometry prescription.
 */
export async function getOpticianPatient(
  patientCode: string
) {
  try {
    await requireRole([
      "IT_ADMIN",
      "OPTICIAN",
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

    const {
      data: patient,
      error: patientError,
    } = await supabaseServer
      .from("patients")
      .select(`
        id,
        patient_code,
        full_name,
        age,
        gender,
        phone,
        allergies
      `)
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
        patient: null,
        message:
          `Patient ${normalizedCode} was not found.`,
      };
    }

    const {
      data: optometryEncounter,
      error: encounterError,
    } = await supabaseServer
      .from("encounters")
      .select(`
        id,
        visual_acuity_od,
        visual_acuity_os,
        visual_acuity_ou,
        with_correction,
        refraction_od,
        refraction_os,
        slit_lamp_od,
        slit_lamp_os,
        diagnosis,
        status,
        created_at
      `)
      .eq(
        "patient_id",
        patient.id
      )
      .eq(
        "encounter_type",
        "optometry"
      )
      .eq(
        "status",
        "completed"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (encounterError) {
      throw encounterError;
    }

    if (!optometryEncounter) {
      return {
        success: false,
        patient: null,
        message:
          "No completed Optometry assessment was found for this patient.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("optical_orders")
      .select(`
        id,
        optometry_encounter_id,
        status,
        pd_binocular,
        pd_od,
        pd_os,
        segment_height_od,
        segment_height_os,
        frame_selection,
        lens_type,
        lens_material,
        lens_coating,
        dispensing_notes,
        referred_at,
        measurements_started_at,
        ready_at,
        collected_at,
        created_at,
        updated_at
      `)
      .eq(
        "patient_id",
        patient.id
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    return {
      success: true,
      patient: {
        id:
          patient.id,

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
          patient.gender ??
          null,

        phone:
          patient.phone ??
          null,

        allergies:
          patient.allergies ??
          null,

        optometry: {
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

          refractionOD:
            optometryEncounter.refraction_od ??
            null,

          refractionOS:
            optometryEncounter.refraction_os ??
            null,

          slitLampOD:
            optometryEncounter.slit_lamp_od ??
            "",

          slitLampOS:
            optometryEncounter.slit_lamp_os ??
            "",

          diagnosis:
            optometryEncounter.diagnosis ??
            "",

          createdAt:
            optometryEncounter.created_at,
        },

        opticalOrder: order
          ? {
              id:
                order.id,

              status:
                order.status as OpticalOrderStatus,

              pdBinocular:
                order.pd_binocular ??
                "",

              pdOD:
                order.pd_od ??
                "",

              pdOS:
                order.pd_os ??
                "",

              segmentHeightOD:
                order.segment_height_od ??
                "",

              segmentHeightOS:
                order.segment_height_os ??
                "",

              frameSelection:
                order.frame_selection ??
                "",

              lensType:
                order.lens_type ??
                "",

              lensMaterial:
                order.lens_material ??
                "",

              lensCoating:
                order.lens_coating ??
                "",

              dispensingNotes:
                order.dispensing_notes ??
                "",

              referredAt:
                order.referred_at ??
                null,

              measurementsStartedAt:
                order.measurements_started_at ??
                null,

              readyAt:
                order.ready_at ??
                null,

              collectedAt:
                order.collected_at ??
                null,

              createdAt:
                order.created_at,

              updatedAt:
                order.updated_at,
            }
          : null,
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return {
        success: false,
        patient: null,
        message:
          "You are not authorized to access Optician records.",
      };
    }

    console.error(
      "Failed to load Optician patient:",
      error
    );

    return {
      success: false,
      patient: null,
      message:
        "Unable to load the Optician patient record.",
    };
  }
}

/**
 * Saves optical measurements, frame and lens selections,
 * and dispensing notes.
 *
 * This does NOT automatically mark the order ready.
 */
export async function saveOpticalOrder(
  input: SaveOpticalOrderInput
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPTICIAN",
    ]);

    const orderId =
      input.orderId?.trim();

    if (!orderId) {
      return {
        success: false,
        message:
          "Optical order ID is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("optical_orders")
      .select(`
        id,
        patient_id,
        status,
        measurements_started_at,
        patients (
          patient_code,
          full_name
        )
      `)
      .eq(
        "id",
        orderId
      )
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return {
        success: false,
        message:
          "Optical order was not found.",
      };
    }

    if (
      order.status ===
      "collected"
    ) {
      return {
        success: false,
        message:
          "This optical order has already been collected and cannot be edited.",
      };
    }

    const now =
      new Date().toISOString();

    const updatePayload = {
      pd_binocular:
        emptyToNull(
          input.pdBinocular
        ),

      pd_od:
        emptyToNull(
          input.pdOD
        ),

      pd_os:
        emptyToNull(
          input.pdOS
        ),

      segment_height_od:
        emptyToNull(
          input.segmentHeightOD
        ),

      segment_height_os:
        emptyToNull(
          input.segmentHeightOS
        ),

      frame_selection:
        emptyToNull(
          input.frameSelection
        ),

      lens_type:
        emptyToNull(
          input.lensType
        ),

      lens_material:
        emptyToNull(
          input.lensMaterial
        ),

      lens_coating:
        emptyToNull(
          input.lensCoating
        ),

      dispensing_notes:
        emptyToNull(
          input.dispensingNotes
        ),

      status:
        order.status ===
        "referred"
          ? "measurements"
          : order.status,

      measurements_started_at:
        order.measurements_started_at ??
        now,

      recorded_by:
        staff.id,

      updated_at:
        now,
    };

    const {
      error: updateError,
    } = await supabaseServer
      .from("optical_orders")
      .update(updatePayload)
      .eq(
        "id",
        order.id
      );

    if (updateError) {
      throw updateError;
    }

    const patient = Array.isArray(
      order.patients
    )
      ? order.patients[0]
      : order.patients;

    await logActivity({
      module: "Optician",
      category: "CLINICAL",
      action:
        "Optical order measurements saved",
      performedBy:
        staff.name,
      staffId:
        staff.id,
      patientId:
        order.patient_id,
      details:
        JSON.stringify({
          opticalOrderId:
            order.id,
          patientCode:
            patient?.patient_code ??
            null,
          patientName:
            patient?.full_name ??
            null,
        }),
    });

    revalidatePath(
      "/optician"
    );

    if (patient?.patient_code) {
      revalidatePath(
        `/optician/${patient.patient_code}`
      );
    }

    return {
      success: true,
      message:
        "Optical order saved successfully.",
      orderId:
        order.id,
    };
  } catch (error) {
    return handleError(
      error,
      "Unable to save the optical order."
    );
  }
}

/**
 * Marks an optical order as ready for dispensing.
 */
export async function markOpticalOrderReady(
  orderId: string
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPTICIAN",
    ]);

    const normalizedId =
      orderId?.trim();

    if (!normalizedId) {
      return {
        success: false,
        message:
          "Optical order ID is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("optical_orders")
      .select(`
        id,
        patient_id,
        status,
        pd_binocular,
        pd_od,
        pd_os,
        frame_selection,
        lens_type,
        patients (
          patient_code,
          full_name
        )
      `)
      .eq(
        "id",
        normalizedId
      )
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return {
        success: false,
        message:
          "Optical order was not found.",
      };
    }

    if (
      order.status ===
      "collected"
    ) {
      return {
        success: false,
        message:
          "This order has already been collected.",
      };
    }

    if (
      order.status ===
      "ready_for_dispense"
    ) {
      return {
        success: true,
        message:
          "This order is already ready for dispensing.",
        orderId:
          order.id,
      };
    }

    if (
      !order.pd_binocular &&
      (!order.pd_od ||
        !order.pd_os)
    ) {
      return {
        success: false,
        message:
          "Please record the patient's PD measurement before marking the order ready.",
      };
    }

    if (!order.frame_selection) {
      return {
        success: false,
        message:
          "Please select a frame before marking the order ready.",
      };
    }

    if (!order.lens_type) {
      return {
        success: false,
        message:
          "Please select a lens type before marking the order ready.",
      };
    }

    const {
      error: updateError,
    } = await supabaseServer
      .from("optical_orders")
      .update({
        status:
          "ready_for_dispense",

        ready_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),

        recorded_by:
          staff.id,
      })
      .eq(
        "id",
        order.id
      );

    if (updateError) {
      throw updateError;
    }

    const patient = Array.isArray(
      order.patients
    )
      ? order.patients[0]
      : order.patients;

    await logActivity({
      module: "Optician",
      category: "CLINICAL",
      action:
        "Optical order marked ready for dispensing",
      performedBy:
        staff.name,
      staffId:
        staff.id,
      patientId:
        order.patient_id,
      details:
        JSON.stringify({
          opticalOrderId:
            order.id,
          patientCode:
            patient?.patient_code ??
            null,
          patientName:
            patient?.full_name ??
            null,
        }),
    });

    revalidatePath(
      "/optician"
    );

    if (patient?.patient_code) {
      revalidatePath(
        `/optician/${patient.patient_code}`
      );
    }

    return {
      success: true,
      message:
        "Optical order is now ready for dispensing.",
      orderId:
        order.id,
    };
  } catch (error) {
    return handleError(
      error,
      "Unable to mark the optical order ready."
    );
  }
}

/**
 * Marks an optical order as collected by the patient.
 */
export async function markOpticalOrderCollected(
  orderId: string
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPTICIAN",
    ]);

    const normalizedId =
      orderId?.trim();

    if (!normalizedId) {
      return {
        success: false,
        message:
          "Optical order ID is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("optical_orders")
      .select(`
        id,
        patient_id,
        status,
        patients (
          patient_code,
          full_name
        )
      `)
      .eq(
        "id",
        normalizedId
      )
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return {
        success: false,
        message:
          "Optical order was not found.",
      };
    }

    if (
      order.status ===
      "collected"
    ) {
      return {
        success: true,
        message:
          "This optical order has already been collected.",
        orderId:
          order.id,
      };
    }

    if (
      order.status !==
      "ready_for_dispense"
    ) {
      return {
        success: false,
        message:
          "Only an order marked ready for dispensing can be collected.",
      };
    }

    const {
      error: updateError,
    } = await supabaseServer
      .from("optical_orders")
      .update({
        status:
          "collected",

        collected_at:
          new Date().toISOString(),

        collected_by:
          staff.id,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        order.id
      );

    if (updateError) {
      throw updateError;
    }

    const patient = Array.isArray(
      order.patients
    )
      ? order.patients[0]
      : order.patients;

    await logActivity({
      module: "Optician",
      category: "CLINICAL",
      action:
        "Optical order collected by patient",
      performedBy:
        staff.name,
      staffId:
        staff.id,
      patientId:
        order.patient_id,
      details:
        JSON.stringify({
          opticalOrderId:
            order.id,
          patientCode:
            patient?.patient_code ??
            null,
          patientName:
            patient?.full_name ??
            null,
        }),
    });

    revalidatePath(
      "/optician"
    );

    if (patient?.patient_code) {
      revalidatePath(
        `/optician/${patient.patient_code}`
      );
    }

    return {
      success: true,
      message:
        "Optical order marked as collected.",
      orderId:
        order.id,
    };
  } catch (error) {
    return handleError(
      error,
      "Unable to mark the optical order as collected."
    );
  }
}