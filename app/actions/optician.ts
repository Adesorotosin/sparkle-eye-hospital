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

  dispensingNotes?: string;

  opticalCharge: number;
  invoiceId: string | null;
  chargeApprovalStatus: "not_submitted" | "pending" | "approved" | "rejected";
  chargeApprovalNote: string | null;
  chargeApprovedAt: string | null;

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

  dispensingNotes?: string;

  /**
   * Total optical charge for the complete eyewear order.
   *
   * Optional here so the existing Optician page can continue
   * saving measurements while the billing field is introduced.
   *
   * Mark Ready for Dispense will require a value greater than 0.
   */
  opticalCharge?: number | string;
};

function emptyToNull(
  value: string | undefined | null
) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeMoney(
  value: number | string | null | undefined
): number {
  const numericValue = Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    return 0;
  }

  return Math.round(
    numericValue * 100
  ) / 100;
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
      "INVENTORY_MANAGER",
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
        optical_charge,
        invoice_id,
        charge_approval_status,
        charge_approval_note,
        charge_approved_at,
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

            opticalCharge:
              normalizeMoney(
                order.optical_charge
              ),

            invoiceId:
              order.invoice_id ??
              null,

            chargeApprovalStatus:
              (order.charge_approval_status ?? "not_submitted") as OpticalOrder["chargeApprovalStatus"],

            chargeApprovalNote:
              order.charge_approval_note ?? null,

            chargeApprovedAt:
              order.charge_approved_at ?? null,

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
 * Optometry → Doctor review → Optician
 */
export async function createOpticalOrder(
  patientCode: string,
  instructions: { lensType?: string; refractionNotes?: string } = {}
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
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
      const orderUpdates: Record<string, string> = {};
      if (instructions.lensType?.trim()) orderUpdates.lens_type = instructions.lensType.trim();
      if (instructions.refractionNotes?.trim()) orderUpdates.dispensing_notes = instructions.refractionNotes.trim();
      if (Object.keys(orderUpdates).length > 0) {
        const { error: updateOrderError } = await supabaseServer
          .from("optical_orders")
          .update({ ...orderUpdates, updated_at: new Date().toISOString() })
          .eq("id", existingOrder.id);
        if (updateOrderError) throw updateOrderError;
      }
      return {
        success: true,
        message: "This patient already has an active Optical Order. The latest lens instructions have been saved.",
        orderId: existingOrder.id,
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

        lens_type: instructions.lensType?.trim() || null,
        dispensing_notes: instructions.refractionNotes?.trim() || null,

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

    const { error: receptionHandoffError } = await supabaseServer
      .from("clinical_handoffs")
      .insert({
        patient_id: patient.id,
        destination: "RECEPTIONIST",
        handoff_type: "PROCEDURE",
        title: "Spectacle / optical request",
        details: "Doctor-requested spectacles for " + patient.full_name + " (" + patient.patient_code + "). Lens type: " + (instructions.lensType?.trim() || "See spectacle prescription") + ". The Inventory module manages frame selection, optical lab production, readiness and collection. Reception should coordinate patient readiness and follow-up.",
        requested_by: staff.id,
      });
    if (receptionHandoffError) {
      console.error("Optical Reception handoff failed after order creation:", receptionHandoffError);
    }
    revalidatePath("/receptionist");

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
      "INVENTORY_MANAGER",
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
        optical_charge,
        invoice_id,
        charge_approval_status,
        charge_approval_note,
        charge_approved_at,
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

              opticalCharge:
                normalizeMoney(
                  order.optical_charge
                ),

              invoiceId:
                order.invoice_id ??
                null,

              chargeApprovalStatus:
                (order.charge_approval_status ?? "not_submitted") as "not_submitted" | "pending" | "approved" | "rejected",

              chargeApprovalNote:
                order.charge_approval_note ?? null,

              chargeApprovedAt:
                order.charge_approved_at ?? null,

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
 * dispensing notes, and optionally the optical charge.
 *
 * This does NOT automatically mark the order ready.
 */
export async function saveOpticalOrder(
  input: SaveOpticalOrderInput
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "INVENTORY_MANAGER",
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
        optical_charge,
        charge_approval_status,
        frame_selection,
        lens_type,
        lens_material,
        lens_coating,
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

    const numericOpticalCharge =
      input.opticalCharge !== undefined
        ? Number(input.opticalCharge)
        : null;

    if (
      numericOpticalCharge !== null &&
      (!Number.isFinite(
        numericOpticalCharge
      ) ||
        numericOpticalCharge < 0)
    ) {
      return {
        success: false,
        message:
          "Please enter a valid optical charge.",
      };
    }

    const updatePayload: Record<
      string,
      unknown
    > = {
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

    const normalizedCharge = numericOpticalCharge !== null
      ? normalizeMoney(numericOpticalCharge)
      : normalizeMoney(order.optical_charge);

    if (numericOpticalCharge !== null) {
      updatePayload.optical_charge = normalizedCharge;
    }

    const chargeRelevantDetailsChanged =
      normalizedCharge !== normalizeMoney(order.optical_charge) ||
      emptyToNull(input.frameSelection) !== (order.frame_selection ?? null) ||
      emptyToNull(input.lensType) !== (order.lens_type ?? null) ||
      emptyToNull(input.lensMaterial) !== (order.lens_material ?? null) ||
      emptyToNull(input.lensCoating) !== (order.lens_coating ?? null);

    if (
      chargeRelevantDetailsChanged &&
      ["pending", "approved", "rejected"].includes(order.charge_approval_status ?? "")
    ) {
      updatePayload.charge_approval_status = "not_submitted";
      updatePayload.charge_approval_note = null;
      updatePayload.charge_approved_by = null;
      updatePayload.charge_approved_at = null;
      updatePayload.charge_submitted_at = null;
    }

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
          opticalCharge:
            numericOpticalCharge !== null
              ? normalizeMoney(
                  numericOpticalCharge
                )
              : undefined,
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


type OpticalChargeApprovalStatus = "not_submitted" | "pending" | "approved" | "rejected";

export interface OpticalChargeApprovalItem {
  id: string;
  patientCode: string;
  patientName: string;
  opticalCharge: number;
  frameSelection: string;
  lensType: string;
  lensMaterial: string;
  lensCoating: string;
  chargeApprovalStatus: string;
  submittedAt: string;
}

export async function submitOpticalChargeForApproval(orderId: string): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole(["IT_ADMIN", "INVENTORY_MANAGER"]);
    const normalizedId = orderId?.trim();
    if (!normalizedId) return { success: false, message: "Optical order ID is required." };

    const { data: order, error } = await supabaseServer
      .from("optical_orders")
      .select("id, patient_id, status, optical_charge, charge_approval_status, patients(patient_code, full_name)")
      .eq("id", normalizedId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return { success: false, message: "Optical order was not found." };
    if (!["measurements", "referred"].includes(order.status)) {
      return { success: false, message: "Only an optical order still in preparation can be submitted for approval." };
    }

    const charge = normalizeMoney(order.optical_charge);
    if (charge <= 0) return { success: false, message: "Enter a proposed optical charge greater than ₦0 first." };

    if (order.charge_approval_status === "pending") {
      return { success: true, message: "This optical charge is already awaiting Doctor approval.", orderId: order.id };
    }
    if (order.charge_approval_status === "approved") {
      return { success: false, message: "This charge is already approved. Change and save the charge to request a new approval." };
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseServer
      .from("optical_orders")
      .update({
        charge_approval_status: "pending",
        charge_approval_note: null,
        charge_approved_by: null,
        charge_approved_at: null,
        charge_submitted_at: now,
        updated_at: now,
        recorded_by: staff.id,
      })
      .eq("id", order.id);
    if (updateError) throw updateError;

    const patient = Array.isArray(order.patients) ? order.patients[0] : order.patients;
    await logActivity({
      module: "Optician",
      category: "BILLING",
      action: "Optical charge submitted for Doctor approval",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: order.patient_id,
      details: JSON.stringify({ opticalOrderId: order.id, patientCode: patient?.patient_code ?? null, proposedCharge: charge }),
      financialAmount: charge,
    });
    revalidatePath("/doctor/optical-approvals");
    revalidatePath("/optician");
    if (patient?.patient_code) revalidatePath(`/optician/${patient.patient_code}`);
    return { success: true, message: "Proposed optical charge submitted to the Doctor for approval.", orderId: order.id };
  } catch (error) {
    return handleError(error, "Unable to submit the optical charge for approval.");
  }
}

export async function getPendingOpticalChargeApprovals(): Promise<{ success: boolean; message?: string; items: OpticalChargeApprovalItem[] }> {
  try {
    await requireRole(["IT_ADMIN", "DOCTOR", "OPHTHALMOLOGIST"]);
    const { data: orders, error } = await supabaseServer
      .from("optical_orders")
      .select("id, patient_id, status, optical_charge, frame_selection, lens_type, lens_material, lens_coating, charge_approval_status, charge_submitted_at, patients(patient_code, full_name)")
      .in("status", ["measurements", "referred"])
      .eq("charge_approval_status", "pending")
      .order("charge_submitted_at", { ascending: true, nullsFirst: true });
    if (error) throw error;

    const items: OpticalChargeApprovalItem[] = (orders ?? []).map((order: any) => {
      const patient = Array.isArray(order.patients) ? order.patients[0] : order.patients;
      return {
        id: order.id,
        patientCode: patient?.patient_code ?? "",
        patientName: patient?.full_name ?? "Unknown patient",
        opticalCharge: normalizeMoney(order.optical_charge),
        frameSelection: order.frame_selection ?? "",
        lensType: order.lens_type ?? "",
        lensMaterial: order.lens_material ?? "",
        lensCoating: order.lens_coating ?? "",
        chargeApprovalStatus: order.charge_approval_status ?? "not_submitted",
        submittedAt: order.charge_submitted_at ?? "",
      };
    });
    return { success: true, items };
  } catch (error) {
    const result = handleError(error, "Unable to load pending optical charge approvals.");
    return { success: false, message: result.message, items: [] };
  }
}

export async function decideOpticalChargeApproval(
  orderId: string,
  decision: "approved" | "rejected",
  note = "",
  approvedCharge?: number
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole(["IT_ADMIN", "DOCTOR", "OPHTHALMOLOGIST"]);
    const normalizedId = orderId?.trim();
    if (!normalizedId) return { success: false, message: "Optical order ID is required." };
    const normalizedNote = note.trim();

    const { data: order, error } = await supabaseServer
      .from("optical_orders")
      .select("id, patient_id, status, optical_charge, charge_approval_status, patients(patient_code, full_name)")
      .eq("id", normalizedId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return { success: false, message: "Optical order was not found." };
    if (!["measurements", "referred"].includes(order.status) || order.charge_approval_status !== "pending") {
      return { success: false, message: "This optical order is no longer awaiting Doctor billing review. Refresh the page and try again." };
    }
    const finalCharge = Number(approvedCharge);
    if (decision === "approved" && (!Number.isFinite(finalCharge) || finalCharge <= 0)) {
      return { success: false, message: "Enter a final optical charge greater than ₦0 before approving." };
    }
    if (decision === "rejected" && !normalizedNote) {
      return { success: false, message: "Please add a reason when rejecting the proposed charge." };
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseServer
      .from("optical_orders")
      .update({
        ...(decision === "approved" ? { optical_charge: finalCharge } : {}),
        charge_approval_status: decision === "approved" ? "approved" : "rejected",
        charge_approval_note: normalizedNote || null,
        charge_approved_by: staff.id,
        charge_approved_at: now,
        updated_at: now,
      })
      .eq("id", order.id)
      .eq("charge_approval_status", "pending")
      .in("status", ["measurements", "referred"])
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return { success: false, message: "The charge approval was already updated. Refresh and try again." };

    const patient = Array.isArray(order.patients) ? order.patients[0] : order.patients;
    await logActivity({
      module: "Optician",
      category: "BILLING",
      action: decision === "approved" ? "Optical charge approved by Doctor" : "Optical charge rejected by Doctor",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: order.patient_id,
      details: JSON.stringify({ opticalOrderId: order.id, patientCode: patient?.patient_code ?? null, decision, approvedCharge: decision === "approved" ? finalCharge : null, previousCharge: normalizeMoney(order.optical_charge), note: normalizedNote || null }),
      financialAmount: decision === "approved" ? finalCharge : normalizeMoney(order.optical_charge),
    });
    revalidatePath("/doctor/optical-approvals");
    revalidatePath("/optician");
    if (patient?.patient_code) revalidatePath(`/optician/${patient.patient_code}`);
    return { success: true, message: decision === "approved" ? "Final optical charge set and approved. The Optician can now mark the order ready for dispensing." : "Optical billing request rejected. The Doctor can review it again after the order is updated.", orderId: order.id };
  } catch (error) {
    return handleError(error, "Unable to update the optical charge approval.");
  }
}

/**
 * Marks an optical order as ready for dispensing.
 *
 * Billing flow:
 *
 * Optician measurements
 *       ↓
 * Optical charge
 *       ↓
 * Draft/Pending Invoice
 *       ↓
 * Optical Invoice Item
 *       ↓
 * Invoice recalculated
 *       ↓
 * Optical Order Ready
 *
 * Payment is intentionally handled later by Billing/Cashier.
 */
export async function markOpticalOrderReady(
  orderId: string
): Promise<OpticianActionResponse> {
  try {
    const staff = await requireRole(["IT_ADMIN", "INVENTORY_MANAGER"]);
    const normalizedId = orderId?.trim();
    if (!normalizedId) {
      return { success: false, message: "Optical order ID is required." };
    }

    const { data: order, error: orderError } = await supabaseServer
      .from("optical_orders")
      .select("id, patient_id, status, charge_approval_status, patients(patient_code, full_name)")
      .eq("id", normalizedId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return { success: false, message: "Optical order was not found." };

    const { data: result, error } = await supabaseServer.rpc(
      "finalize_optical_order_billing_atomic",
      {
        p_order_id: order.id,
        p_staff_id: staff.id,
      }
    );

    if (error || !result) {
      console.error("Atomic optical billing failed:", error);
      const reason = error?.message ?? "";
      if (/not found|already been collected|only optical orders|PD measurement|Select a frame|Select a lens type|Doctor approval|required|greater than zero|paid invoice|legacy optical bill lines/i.test(reason)) {
        return { success: false, message: reason };
      }
      return {
        success: false,
        message: "The optical order could not be billed and marked ready. No partial billing changes were committed; refresh and retry.",
      };
    }

    const patient = Array.isArray(order.patients) ? order.patients[0] : order.patients;
    await logActivity({
      module: "Optician",
      category: "CLINICAL",
      action: "Optical order marked ready for dispensing and billed",
      performedBy: staff.name,
      staffId: staff.id,
      patientId: order.patient_id,
      details: JSON.stringify({
        opticalOrderId: order.id,
        patientCode: patient?.patient_code ?? null,
        patientName: patient?.full_name ?? null,
        invoiceId: result.invoice_id,
        invoiceItemId: result.invoice_item_id,
        opticalCharge: Number(result.optical_charge ?? 0),
        invoiceGrandTotal: Number(result.grand_total ?? 0),
        invoiceVat: Number(result.vat_amount ?? 0),
        alreadyReady: Boolean(result.already_ready),
      }),
      financialAmount: Number(result.optical_charge ?? 0),
    });

    revalidatePath("/optician");
    if (patient?.patient_code) revalidatePath(`/optician/${patient.patient_code}`);
    revalidatePath("/billing");
    revalidatePath("/cashier");

    return {
      success: true,
      message: result.already_ready
        ? "This optical order is already ready and its billing link is verified."
        : `Optical order is ready for dispensing. ₦${Number(result.optical_charge ?? 0).toLocaleString()} has been added to the patient's invoice.`,
      orderId: order.id,
    };
  } catch (error) {
    return handleError(error, "Unable to mark the optical order ready.");
  }
}

/**
 * Marks an optical order as collected by the patient.
 *
 * NOTE:
 * The payment requirement will be enforced here in the
 * next billing step after Cashier payment processing is
 * connected to optical orders.
 */
export async function markOpticalOrderCollected(orderId: string) {
  const user = await requireRole(["IT_ADMIN", "INVENTORY_MANAGER"]);

  const { data: order, error: orderError } = await supabaseServer
    .from("optical_orders")
    .select(
      `
        id,
        patient_id,
        patient_code,
        patient_name,
        status,
        invoice_id
      `,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    throw new Error("Optical order not found.");
  }

  if (order.status !== "ready_for_dispense") {
    throw new Error(
      "This optical order is not ready for collection.",
    );
  }

  if (!order.invoice_id) {
    throw new Error(
      "This optical order has no linked invoice. Payment must be completed before collection.",
    );
  }

  const { data: invoice, error: invoiceError } = await supabaseServer
    .from("invoices")
    .select("id, status, grand_total, payment_method, paid_at")
    .eq("id", order.invoice_id)
    .maybeSingle();

  if (invoiceError) {
    throw new Error(invoiceError.message);
  }

  if (!invoice) {
    throw new Error(
      "The invoice linked to this optical order could not be found.",
    );
  }

  if (invoice.status !== "paid") {
    throw new Error(
      "Payment is required before the optical order can be collected.",
    );
  }

  const { data: updatedOrder, error: updateError } = await supabaseServer
    .from("optical_orders")
    .update({
      status: "collected",
      collected_at: new Date().toISOString(),
      collected_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "ready_for_dispense")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updatedOrder) {
    throw new Error(
      "The optical order could not be collected. It may have already been updated.",
    );
  }

  await logActivity({
  module: "OPTICIAN",
  action: "optical_order_collected",
  performedBy: user.id,
  patientId: order.patient_id,
  details: `Optical order collected for ${order.patient_name} (${order.patient_code}). Invoice ${invoice.id} was paid.`,
});

  revalidatePath("/optician");
  revalidatePath(`/optician/${order.patient_code}`);
  revalidatePath("/billing");
  revalidatePath("/cashier");

  return {
    success: true,
    message: "Optical order collected successfully.",
  };
}