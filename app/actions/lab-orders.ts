"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import {
  getOrCreateDraftInvoice,
  recalcInvoice,
} from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";
import {
  requireRole,
  type UserRole,
} from "@/lib/server-auth";

export type LabOrderPriority =
  | "NORMAL"
  | "URGENT"
  | "STAT";

export type LabOrderStatus =
  | "PENDING"
  | "COLLECTED"
  | "PROCESSING"
  | "AWAITING_VERIFICATION"
  | "COMPLETED"
  | "RECOLLECTION";

export type LabSampleCondition =
  | "ACCEPTABLE"
  | "INSUFFICIENT"
  | "CLOTTED"
  | "HAEMOLYSED"
  | "WRONG_CONTAINER"
  | "WRONG_SAMPLE"
  | "OTHER";

export type LabOrderInput = {
  patientCode: string;
  testCode: string;
  testName: string;
  specimenType: string;
  price: number;
  priority?: LabOrderPriority;
  clinicalNotes?: string;
};

export type LabOrderResponse = {
  success: boolean;
  message: string;
  id?: string;
};

type WorkflowResponse = {
  success: boolean;
  message: string;
  id?: string;
};

const LAB_STAFF_ROLES: UserRole[] = [
  "LAB_SCIENTIST",
  "IT_ADMIN",
];

const LAB_ORDER_CREATE_ROLES: UserRole[] = [
  "IT_ADMIN",
  "OPHTHALMOLOGIST",
  "DOCTOR",
];

const LAB_ORDER_VIEW_ROLES: UserRole[] = [
  "IT_ADMIN",
  "OPHTHALMOLOGIST",
  "DOCTOR",
  "LAB_SCIENTIST",
];

async function getLabStaff() {
  return requireRole(LAB_STAFF_ROLES);
}

async function getLabOrderCreators() {
  return requireRole(LAB_ORDER_CREATE_ROLES);
}

async function getLabOrderViewers() {
  return requireRole(LAB_ORDER_VIEW_ROLES);
}

async function findPatient(patientCode: string) {
  if (!patientCode?.trim()) {
    return {
      patient: null,
      error: "Patient code is required.",
    };
  }

  const { data: patient, error } = await supabaseServer
    .from("patients")
    .select("id, patient_code, full_name")
    .eq("patient_code", patientCode.trim())
    .maybeSingle();

  if (error) {
    console.error("Patient lookup failed:", error);

    return {
      patient: null,
      error: "Unable to find the patient record.",
    };
  }

  if (!patient) {
    return {
      patient: null,
      error: `Patient ${patientCode} was not found.`,
    };
  }

  return {
    patient,
    error: null,
  };
}

async function logLabActivity({
  action,
  staff,
  patientId,
  details,
}: {
  action: string;
  staff: {
    id: string;
    name: string;
  };
  patientId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await logActivity({
      module: "Laboratory",
      category: "CLINICAL",
      action,
      performedBy: staff.name,
      staffId: staff.id,
      patientId,
      details: details
        ? JSON.stringify(details)
        : undefined,
    });
  } catch (error) {
    console.error(
      "Laboratory activity logging failed:",
      error
    );
  }
}

/**
 * Create a laboratory order.
 */
export async function createLabOrder(
  input: LabOrderInput
): Promise<LabOrderResponse> {
  try {
    const staff = await getLabOrderCreators();

    const testCode =
      input.testCode?.trim().toUpperCase();

    const testName =
      input.testName?.trim();

    const specimenType =
      input.specimenType?.trim();

    const clinicalNotes =
      input.clinicalNotes?.trim() || null;

    const price = Number(input.price);

    const priority: LabOrderPriority =
      input.priority ?? "NORMAL";

    if (!testCode) {
      return {
        success: false,
        message:
          "Laboratory test code is required.",
      };
    }

    if (!testName) {
      return {
        success: false,
        message:
          "Laboratory test name is required.",
      };
    }

    if (!specimenType) {
      return {
        success: false,
        message:
          "Specimen type is required.",
      };
    }

    if (!Number.isFinite(price) || price < 0) {
      return {
        success: false,
        message:
          "Laboratory test price is invalid.",
      };
    }

    if (
      !["NORMAL", "URGENT", "STAT"].includes(
        priority
      )
    ) {
      return {
        success: false,
        message:
          "Invalid laboratory order priority.",
      };
    }

    const { patient, error } =
      await findPatient(input.patientCode);

    if (!patient) {
      return {
        success: false,
        message:
          error ?? "Patient not found.",
      };
    }

    const labOrderId =
      crypto.randomUUID();

    const { error: labOrderError } =
      await supabaseServer
        .from("lab_orders")
        .insert({
          id: labOrderId,
          patient_id: patient.id,
          test_code: testCode,
          test_name: testName,
          specimen_type: specimenType,
          priority,
          status: "PENDING",
          clinical_notes: clinicalNotes,
          ordered_by: staff.id,
        });

    if (labOrderError) {
      console.error(
        "Laboratory order creation failed:",
        labOrderError
      );

      return {
        success: false,
        message:
          labOrderError.message ||
          "Failed to create the laboratory order.",
      };
    }

    let invoice;

    try {
      invoice =
        await getOrCreateDraftInvoice(
          patient.id
        );
    } catch (invoiceError) {
      console.error(
        "Failed to get or create draft invoice:",
        invoiceError
      );

      return {
        success: false,
        message:
          invoiceError instanceof Error
            ? invoiceError.message
            : "Laboratory order was created, but the patient's invoice could not be opened.",
        id: labOrderId,
      };
    }

    const { error: itemError } =
      await supabaseServer
        .from("invoice_items")
        .insert({
          invoice_id: invoice.id,
          category: "laboratory",
          name: testName,
          quantity: 1,
          unit_price: price,
          total_price: price,
        });

    if (itemError) {
      console.error(
        "Laboratory invoice item creation failed:",
        itemError
      );

      return {
        success: false,
        message:
          "Laboratory order was created, but it could not be added to the invoice.",
        id: labOrderId,
      };
    }

    try {
      await recalcInvoice(invoice.id);
    } catch (recalcError) {
      console.error(
        "Laboratory invoice recalculation failed:",
        recalcError
      );

      return {
        success: false,
        message:
          "Laboratory order and billing item were created, but the invoice total could not be recalculated.",
        id: labOrderId,
      };
    }

    await logLabActivity({
      action:
        `Laboratory test ordered: ${testName}`,
      staff,
      patientId: patient.id,
      details: {
        labOrderId,
        testCode,
        testName,
        specimenType,
        priority,
        clinicalNotes,
        price,
      },
    });

    revalidatePath(
      `/doctor/patients/${patient.patient_code}/encounter`
    );

    revalidatePath("/laboratory");
    revalidatePath("/billing");
    revalidatePath("/cashier");

    return {
      success: true,
      message:
        `${testName} has been ordered and added to the patient's laboratory bill.`,
      id: labOrderId,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "UNAUTHENTICATED"
      ) {
        return {
          success: false,
          message:
            "You must be signed in to perform this action.",
        };
      }

      if (
        error.message === "FORBIDDEN"
      ) {
        return {
          success: false,
          message:
            "You are not authorized to create laboratory orders.",
        };
      }
    }

    console.error(
      "Create laboratory order error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while creating the laboratory order.",
    };
  }
}

export type LaboratoryDashboardOrder = {
  id: string;
  patientId: string;
  patientName: string;
  age?: number;
  sex?: string;
  test: string;
  orderedBy: string;
  priority: LabOrderPriority;
  status: LabOrderStatus;
  orderedAt: string;

  sampleType?: string;
  sampleId?: string;
  collectedAt?: string;
  collectedBy?: string;
  collectionNotes?: string;

  receivedAt?: string;
  receivedBy?: string;
  sampleCondition?: LabSampleCondition;
  receptionNotes?: string;

  processingAt?: string;
  processedBy?: string;
  processingNotes?: string;

  result?: {
    parameters: Array<{
      name: string;
      result: string;
      unit: string;
      referenceRange: string;
      flag:
        | "LOW"
        | "NORMAL"
        | "HIGH"
        | "CRITICAL";
    }>;
    comments: string;
  };

  resultEnteredAt?: string;
  resultEnteredBy?: string;

  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;

  recollectionReason?: string;
  clinicalNotes?: string;
};

export type GetLabOrdersResponse = {
  success: boolean;
  message: string;
  orders: LaboratoryDashboardOrder[];
};

function formatLabDate(
  value?: string | null
) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

/**
 * Load laboratory orders.
 */
export async function getLabOrders(): Promise<GetLabOrdersResponse> {
  try {
    await getLabOrderViewers();

    const {
      data: orders,
      error: ordersError,
    } = await supabaseServer
      .from("lab_orders")
      .select("*")
      .order("ordered_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error(
        "Laboratory orders lookup failed:",
        ordersError
      );

      return {
        success: false,
        message:
          ordersError.message ||
          "Unable to load laboratory orders.",
        orders: [],
      };
    }

    if (!orders?.length) {
      return {
        success: true,
        message:
          "No laboratory orders found.",
        orders: [],
      };
    }

    const patientIds = [
      ...new Set(
        orders
          .map(
            (order) =>
              order.patient_id
          )
          .filter(Boolean)
      ),
    ];

    const staffIds = [
      ...new Set(
        orders
          .flatMap((order) => [
            order.ordered_by,
            order.collected_by,
            order.received_by,
            order.processed_by,
          ])
          .filter(Boolean)
      ),
    ];

    const orderIds =
      orders.map(
        (order) => order.id
      );

    const [
      patientsResult,
      staffResult,
      resultsResult,
    ] = await Promise.all([
      patientIds.length
        ? supabaseServer
            .from("patients")
            .select(
              "id, patient_code, full_name"
            )
            .in(
              "id",
              patientIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      staffIds.length
        ? supabaseServer
            .from("staff")
            .select("id, name")
            .in(
              "id",
              staffIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      supabaseServer
        .from("lab_results")
        .select(
          "id, lab_order_id, sample_id, result_data, laboratory_comments, entered_by, entered_at, verified_by, verified_at, verification_notes"
        )
        .in(
          "lab_order_id",
          orderIds
        ),
    ]);

    if (patientsResult.error) {
      console.error(
        "Laboratory patient lookup failed:",
        patientsResult.error
      );
    }

    if (staffResult.error) {
      console.error(
        "Laboratory staff lookup failed:",
        staffResult.error
      );
    }

    if (resultsResult.error) {
      console.error(
        "Laboratory results lookup failed:",
        resultsResult.error
      );
    }

    const patientMap =
      new Map(
        (patientsResult.data ?? []).map(
          (patient) => [
            patient.id,
            patient,
          ]
        )
      );

    const staffMap =
      new Map(
        (staffResult.data ?? []).map(
          (staff) => [
            staff.id,
            staff.name,
          ]
        )
      );

    const resultMap =
      new Map(
        (resultsResult.data ?? []).map(
          (result) => [
            result.lab_order_id,
            result,
          ]
        )
      );

    const dashboardOrders: LaboratoryDashboardOrder[] =
      orders.map((order) => {
        const patient =
          patientMap.get(
            order.patient_id
          );

        const result =
          resultMap.get(
            order.id
          );

        const resultData =
          Array.isArray(
            result?.result_data
          )
            ? result.result_data
            : [];

        const parameters =
          resultData
            .map(
              (
                parameter: unknown
              ) => {
                if (
                  !parameter ||
                  typeof parameter !==
                    "object"
                ) {
                  return null;
                }

                const item =
                  parameter as Record<
                    string,
                    unknown
                  >;

                return {
                  name: String(
                    item.name ?? ""
                  ),

                  result: String(
                    item.result ?? ""
                  ),

                  unit: String(
                    item.unit ?? ""
                  ),

                  referenceRange:
                    String(
                      item.referenceRange ??
                        ""
                    ),

                  flag:
                    item.flag ===
                      "LOW" ||
                    item.flag ===
                      "HIGH" ||
                    item.flag ===
                      "CRITICAL"
                      ? item.flag
                      : "NORMAL",
                };
              }
            )
            .filter(
              (
                parameter
              ): parameter is {
                name: string;
                result: string;
                unit: string;
                referenceRange: string;
                flag:
                  | "LOW"
                  | "NORMAL"
                  | "HIGH"
                  | "CRITICAL";
              } =>
                parameter !==
                null
            );

        return {
          id: order.id,

          patientId:
            patient?.patient_code ??
            order.patient_id,

          patientName:
            patient?.full_name ??
            "Unknown patient",

          age: undefined,
          sex: undefined,

          test:
            order.test_name,

          orderedBy:
            staffMap.get(
              order.ordered_by
            ) ??
            "Clinical Staff",

          priority:
            order.priority,

          status:
            order.status,

          orderedAt:
            formatLabDate(
              order.ordered_at
            ),

          sampleType:
            order.sample_type ??
            undefined,

          sampleId:
            order.sample_id ??
            undefined,

          collectedAt:
            formatLabDate(
              order.collected_at
            ),

          collectedBy:
            staffMap.get(
              order.collected_by
            ) ??
            undefined,

          collectionNotes:
            order.collection_notes ??
            undefined,

          receivedAt:
            formatLabDate(
              order.received_at
            ),

          receivedBy:
            staffMap.get(
              order.received_by
            ) ??
            undefined,

          sampleCondition:
            order.sample_condition ??
            undefined,

          receptionNotes:
            order.reception_notes ??
            undefined,

          processingAt:
            formatLabDate(
              order.processing_at
            ),

          processedBy:
            staffMap.get(
              order.processed_by
            ) ??
            undefined,

          processingNotes:
            order.processing_notes ??
            undefined,

          result: result
            ? {
                parameters,
                comments:
                  result.laboratory_comments ??
                  "",
              }
            : undefined,

          resultEnteredAt:
            result?.entered_at
              ? formatLabDate(
                  result.entered_at
                )
              : undefined,

          resultEnteredBy:
            result?.entered_by
              ? staffMap.get(
                  result.entered_by
                )
              : undefined,

          verifiedAt:
            result?.verified_at
              ? formatLabDate(
                  result.verified_at
                )
              : undefined,

          verifiedBy:
            result?.verified_by
              ? staffMap.get(
                  result.verified_by
                )
              : undefined,

          verificationNotes:
            result?.verification_notes ??
            undefined,

          recollectionReason:
            order.recollection_reason ??
            undefined,

          clinicalNotes:
            order.clinical_notes ??
            undefined,
        };
      });

    return {
      success: true,
      message:
        "Laboratory orders loaded.",
      orders:
        dashboardOrders,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "UNAUTHENTICATED"
      ) {
        return {
          success: false,
          message:
            "You must be signed in to view laboratory orders.",
          orders: [],
        };
      }

      if (
        error.message === "FORBIDDEN"
      ) {
        return {
          success: false,
          message:
            "You are not authorized to view laboratory orders.",
          orders: [],
        };
      }
    }

    console.error(
      "Get laboratory orders error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading laboratory orders.",
      orders: [],
    };
  }
}

/**
 * Collect a laboratory sample.
 *
 * This creates the actual lab_samples record.
 *
 * lab_samples.id
 *   = internal UUID
 *
 * lab_samples.sample_id
 *   = human-readable specimen number
 *
 * lab_orders.sample_id
 *   = same human-readable specimen number
 */
export async function collectLabSample(input: {
  labOrderId: string;
  sampleType: string;
  collectionNotes?: string;
}): Promise<WorkflowResponse> {
  try {
    const staff =
      await getLabStaff();

    const labOrderId =
      input.labOrderId?.trim();

    const sampleType =
      input.sampleType?.trim();

    if (!labOrderId) {
      return {
        success: false,
        message:
          "Laboratory order ID is required.",
      };
    }

    if (!sampleType) {
      return {
        success: false,
        message:
          "Sample type is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("lab_orders")
      .select(
        "id, patient_id, test_name, specimen_type, status"
      )
      .eq("id", labOrderId)
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      console.error(
        "Laboratory order lookup failed:",
        orderError
      );

      return {
        success: false,
        message:
          "Laboratory order could not be found.",
      };
    }

    if (
      order.status !== "PENDING" &&
      order.status !== "RECOLLECTION"
    ) {
      return {
        success: false,
        message:
          `This laboratory order cannot be collected while its status is ${order.status}.`,
      };
    }

    const sampleId =
      `SP-${new Date()
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${crypto
        .randomUUID()
        .slice(0, 6)
        .toUpperCase()}`;

    /*
     * Determine the next sample number for this order.
     *
     * Example:
     * First specimen  -> 1
     * Recollection    -> 2
     * Second recollection -> 3
     */
    const {
      data: previousSamples,
      error: previousSamplesError,
    } = await supabaseServer
      .from("lab_samples")
      .select("sample_number")
      .eq(
        "lab_order_id",
        labOrderId
      )
      .order(
        "sample_number",
        {
          ascending: false,
        }
      )
      .limit(1);

    if (previousSamplesError) {
      console.error(
        "Previous laboratory sample lookup failed:",
        previousSamplesError
      );

      return {
        success: false,
        message:
          "Unable to determine the laboratory sample number.",
      };
    }

    const sampleNumber =
      previousSamples?.[0]?.sample_number
        ? previousSamples[0]
            .sample_number + 1
        : 1;

    const now =
      new Date().toISOString();

    /*
     * Create the actual specimen record first.
     */
    const {
      data: sample,
      error: sampleError,
    } = await supabaseServer
      .from("lab_samples")
      .insert({
        lab_order_id:
          labOrderId,

        sample_number:
          sampleNumber,

        sample_type:
          sampleType,

        sample_id:
          sampleId,

        status:
          "COLLECTED",

        collection_notes:
          input.collectionNotes
            ?.trim() ||
          null,

        collected_by:
          staff.id,

        collected_at:
          now,
      })
      .select("id, sample_id")
      .single();

    if (sampleError || !sample) {
      console.error(
        "Laboratory sample creation failed:",
        sampleError
      );

      return {
        success: false,
        message:
          sampleError?.message ||
          "Failed to create the laboratory sample record.",
      };
    }

    /*
     * Keep the denormalized order fields in sync.
     * lab_orders.sample_id stores the human-readable
     * specimen number, not the UUID.
     */
    const {
      error: orderUpdateError,
    } = await supabaseServer
      .from("lab_orders")
      .update({
        sample_type:
          sampleType,

        sample_id:
          sampleId,

        collected_at:
          now,

        collected_by:
          staff.id,

        collection_notes:
          input.collectionNotes
            ?.trim() ||
          null,

        status:
          "COLLECTED",

        recollection_reason:
          null,
      })
      .eq(
        "id",
        labOrderId
      );

    if (orderUpdateError) {
      console.error(
        "Laboratory order sample update failed:",
        orderUpdateError
      );

      /*
       * Roll back the sample record if the
       * corresponding order update fails.
       */
      await supabaseServer
        .from("lab_samples")
        .delete()
        .eq(
          "id",
          sample.id
        );

      return {
        success: false,
        message:
          orderUpdateError.message ||
          "Sample was created, but the laboratory order could not be updated.",
      };
    }

    await logLabActivity({
      action:
        `Laboratory sample collected: ${order.test_name}`,
      staff,
      patientId:
        order.patient_id,
      details: {
        labOrderId,
        sampleRecordId:
          sample.id,
        sampleId,
        sampleNumber,
        sampleType,
        collectionNotes:
          input.collectionNotes
            ?.trim() ||
          null,
      },
    });

    revalidatePath(
      "/laboratory"
    );

    return {
      success: true,
      message:
        `Sample ${sampleId} has been collected.`,
      id: labOrderId,
    };
  } catch (error) {
    console.error(
      "Collect laboratory sample error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to collect laboratory sample.",
    };
  }
}

/**
 * Receive and inspect a collected specimen.
 */
export async function receiveLabSample(input: {
  labOrderId: string;
  sampleCondition: LabSampleCondition;
  receptionNotes?: string;
}): Promise<WorkflowResponse> {
  try {
    const staff =
      await getLabStaff();

    const labOrderId =
      input.labOrderId?.trim();

    if (!labOrderId) {
      return {
        success: false,
        message:
          "Laboratory order ID is required.",
      };
    }

    const acceptableConditions:
      LabSampleCondition[] = [
        "ACCEPTABLE",
        "INSUFFICIENT",
        "CLOTTED",
        "HAEMOLYSED",
        "WRONG_CONTAINER",
        "WRONG_SAMPLE",
        "OTHER",
      ];

    if (
      !acceptableConditions.includes(
        input.sampleCondition
      )
    ) {
      return {
        success: false,
        message:
          "Invalid sample condition.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("lab_orders")
      .select(
        "id, patient_id, test_name, status, sample_id"
      )
      .eq(
        "id",
        labOrderId
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      return {
        success: false,
        message:
          "Laboratory order could not be found.",
      };
    }

    if (
      order.status !==
      "COLLECTED"
    ) {
      return {
        success: false,
        message:
          "Only collected samples can be received.",
      };
    }

    if (!order.sample_id) {
      return {
        success: false,
        message:
          "This order does not have a sample ID. The sample must be collected again.",
      };
    }

    const {
      data: sample,
      error: sampleLookupError,
    } = await supabaseServer
      .from("lab_samples")
      .select(
        "id, sample_id, status"
      )
      .eq(
        "lab_order_id",
        labOrderId
      )
      .eq(
        "sample_id",
        order.sample_id
      )
      .maybeSingle();

    if (
      sampleLookupError ||
      !sample
    ) {
      console.error(
        "Laboratory sample lookup failed:",
        sampleLookupError
      );

      return {
        success: false,
        message:
          "The laboratory specimen record could not be found. Please collect the sample again.",
      };
    }

    if (
      sample.status !==
      "COLLECTED"
    ) {
      return {
        success: false,
        message:
          `This specimen is currently ${sample.status}.`,
      };
    }

    const isAcceptable =
      input.sampleCondition ===
      "ACCEPTABLE";

    const now =
      new Date().toISOString();

    const sampleUpdateData = {
      received_at:
        now,

      received_by:
        staff.id,

      condition:
        input.sampleCondition,

      status: isAcceptable
        ? "RECEIVED"
        : "REJECTED",

      rejection_reason:
        isAcceptable
          ? null
          : input.receptionNotes
              ?.trim() ||
            `Sample condition: ${input.sampleCondition}`,
    };

    const {
      error: sampleUpdateError,
    } = await supabaseServer
      .from("lab_samples")
      .update(
        sampleUpdateData
      )
      .eq(
        "id",
        sample.id
      );

    if (sampleUpdateError) {
      console.error(
        "Laboratory sample reception update failed:",
        sampleUpdateError
      );

      return {
        success: false,
        message:
          sampleUpdateError.message ||
          "Failed to update the laboratory sample.",
      };
    }

    const orderUpdateData = {
      received_at:
        now,

      received_by:
        staff.id,

      sample_condition:
        input.sampleCondition,

      reception_notes:
        input.receptionNotes
          ?.trim() ||
        null,

      status: isAcceptable
        ? ("PROCESSING" as const)
        : ("RECOLLECTION" as const),

      recollection_reason:
        isAcceptable
          ? null
          : input.receptionNotes
              ?.trim() ||
            `Sample condition: ${input.sampleCondition}`,
    };

    const {
      error: orderUpdateError,
    } = await supabaseServer
      .from("lab_orders")
      .update(
        orderUpdateData
      )
      .eq(
        "id",
        labOrderId
      );

    if (orderUpdateError) {
      console.error(
        "Laboratory order reception update failed:",
        orderUpdateError
      );

      return {
        success: false,
        message:
          orderUpdateError.message ||
          "Sample reception was recorded, but the laboratory order could not be updated.",
      };
    }

    await logLabActivity({
      action: isAcceptable
        ? `Laboratory sample received: ${order.test_name}`
        : `Laboratory sample rejected: ${order.test_name}`,
      staff,
      patientId:
        order.patient_id,
      details: {
        labOrderId,
        sampleRecordId:
          sample.id,
        sampleId:
          order.sample_id,
        sampleCondition:
          input.sampleCondition,
        receptionNotes:
          input.receptionNotes
            ?.trim() ||
          null,
        status:
          orderUpdateData.status,
      },
    });

    revalidatePath(
      "/laboratory"
    );

    return {
      success: true,
      message: isAcceptable
        ? "Sample received and accepted for processing."
        : "Sample rejected and marked for recollection.",
      id: labOrderId,
    };
  } catch (error) {
    console.error(
      "Receive laboratory sample error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to receive laboratory sample.",
    };
  }
}

/**
 * Record that laboratory processing has started.
 */
export async function startLabProcessing(input: {
  labOrderId: string;
  processingNotes?: string;
}): Promise<WorkflowResponse> {
  try {
    const staff =
      await getLabStaff();

    const labOrderId =
      input.labOrderId?.trim();

    if (!labOrderId) {
      return {
        success: false,
        message:
          "Laboratory order ID is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("lab_orders")
      .select(
        "id, patient_id, test_name, status, sample_id"
      )
      .eq(
        "id",
        labOrderId
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      return {
        success: false,
        message:
          "Laboratory order could not be found.",
      };
    }

    if (
      order.status !==
        "COLLECTED" &&
      order.status !==
        "PROCESSING"
    ) {
      return {
        success: false,
        message:
          "This laboratory order is not ready for processing.",
      };
    }

    if (!order.sample_id) {
      return {
        success: false,
        message:
          "This laboratory order does not have a sample ID.",
      };
    }

    const {
      data: sample,
      error: sampleError,
    } = await supabaseServer
      .from("lab_samples")
      .select(
        "id, sample_id, status"
      )
      .eq(
        "lab_order_id",
        labOrderId
      )
      .eq(
        "sample_id",
        order.sample_id
      )
      .maybeSingle();

    if (
      sampleError ||
      !sample
    ) {
      console.error(
        "Laboratory sample lookup failed:",
        sampleError
      );

      return {
        success: false,
        message:
          "The laboratory specimen record could not be found.",
      };
    }

    if (
      sample.status !==
      "RECEIVED"
    ) {
      return {
        success: false,
        message:
          `The specimen is not ready for processing. Current sample status: ${sample.status}.`,
      };
    }

    const now =
      new Date().toISOString();

    const {
      error: sampleUpdateError,
    } = await supabaseServer
      .from("lab_samples")
      .update({
        status:
          "PROCESSING",

        processing_started_at:
          now,

        processing_started_by:
          staff.id,
      })
      .eq(
        "id",
        sample.id
      );

    if (sampleUpdateError) {
      console.error(
        "Laboratory sample processing update failed:",
        sampleUpdateError
      );

      return {
        success: false,
        message:
          sampleUpdateError.message ||
          "Failed to start laboratory sample processing.",
      };
    }

    const {
      error: orderUpdateError,
    } = await supabaseServer
      .from("lab_orders")
      .update({
        status:
          "PROCESSING",

        processing_at:
          now,

        processed_by:
          staff.id,

        processing_notes:
          input.processingNotes
            ?.trim() ||
          null,
      })
      .eq(
        "id",
        labOrderId
      );

    if (orderUpdateError) {
      console.error(
        "Laboratory order processing update failed:",
        orderUpdateError
      );

      return {
        success: false,
        message:
          orderUpdateError.message ||
          "Processing started for the specimen, but the laboratory order could not be updated.",
      };
    }

    await logLabActivity({
      action:
        `Laboratory processing started: ${order.test_name}`,
      staff,
      patientId:
        order.patient_id,
      details: {
        labOrderId,
        sampleRecordId:
          sample.id,
        sampleId:
          order.sample_id,
        processingNotes:
          input.processingNotes
            ?.trim() ||
          null,
      },
    });

    revalidatePath(
      "/laboratory"
    );

    return {
      success: true,
      message:
        "Laboratory processing has been started.",
      id: labOrderId,
    };
  } catch (error) {
    console.error(
      "Start laboratory processing error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to start laboratory processing.",
    };
  }
}

/**
 * Save laboratory results and submit the order
 * for verification.
 */
export async function saveLabResult(input: {
  labOrderId: string;
  resultData: unknown[];
  laboratoryComments?: string;
}): Promise<WorkflowResponse> {
  try {
    const staff =
      await getLabStaff();

    const labOrderId =
      input.labOrderId?.trim();

    if (!labOrderId) {
      return {
        success: false,
        message:
          "Laboratory order ID is required.",
      };
    }

    if (
      !Array.isArray(
        input.resultData
      ) ||
      input.resultData.length ===
        0
    ) {
      return {
        success: false,
        message:
          "At least one laboratory result is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("lab_orders")
      .select(
        "id, patient_id, test_name, status, sample_id"
      )
      .eq(
        "id",
        labOrderId
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      return {
        success: false,
        message:
          "Laboratory order could not be found.",
      };
    }

    if (
      order.status !==
        "PROCESSING" &&
      order.status !==
        "AWAITING_VERIFICATION"
    ) {
      return {
        success: false,
        message:
          "This laboratory order is not ready for result entry.",
      };
    }

    if (!order.sample_id) {
      return {
        success: false,
        message:
          "This laboratory order does not have a sample ID.",
      };
    }

    /*
     * IMPORTANT:
     *
     * order.sample_id is the human-readable value:
     *
     * SP-20261002033125-CA308F
     *
     * lab_results.sample_id is a UUID foreign key,
     * so we must retrieve lab_samples.id.
     */
    const {
      data: sample,
      error: sampleError,
    } = await supabaseServer
      .from("lab_samples")
      .select(
        "id, sample_id, status"
      )
      .eq(
        "lab_order_id",
        labOrderId
      )
      .eq(
        "sample_id",
        order.sample_id
      )
      .maybeSingle();

    if (
      sampleError ||
      !sample
    ) {
      console.error(
        "Laboratory sample lookup for result failed:",
        sampleError
      );

      return {
        success: false,
        message:
          "The laboratory specimen record could not be found. Please verify that the sample was collected correctly.",
      };
    }

    if (
      sample.status !==
      "PROCESSING"
    ) {
      return {
        success: false,
        message:
          `This specimen is not currently being processed. Current sample status: ${sample.status}.`,
      };
    }

    const now =
      new Date().toISOString();

    const {
      data: existingResult,
      error: existingError,
    } = await supabaseServer
      .from("lab_results")
      .select("id")
      .eq(
        "lab_order_id",
        labOrderId
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing laboratory result lookup failed:",
        existingError
      );

      return {
        success: false,
        message:
          "Unable to check the existing laboratory result.",
      };
    }

    let resultId: string;

    if (existingResult) {
      resultId =
        existingResult.id;

      const { error } =
        await supabaseServer
          .from("lab_results")
          .update({
            sample_id:
              sample.id,

            result_data:
              input.resultData,

            laboratory_comments:
              input.laboratoryComments
                ?.trim() ||
              null,

            entered_by:
              staff.id,

            entered_at:
              now,

            verified_by:
              null,

            verified_at:
              null,

            verification_notes:
              null,

            updated_at:
              now,
          })
          .eq(
            "id",
            existingResult.id
          );

      if (error) {
        console.error(
          "Laboratory result update failed:",
          error
        );

        return {
          success: false,
          message:
            error.message ||
            "Failed to save laboratory result.",
        };
      }
    } else {
      resultId =
        crypto.randomUUID();

      const { error } =
        await supabaseServer
          .from("lab_results")
          .insert({
            id: resultId,

            lab_order_id:
              labOrderId,

            sample_id:
              sample.id,

            result_data:
              input.resultData,

            laboratory_comments:
              input.laboratoryComments
                ?.trim() ||
              null,

            entered_by:
              staff.id,

            entered_at:
              now,

            verified_by:
              null,

            verified_at:
              null,

            verification_notes:
              null,
          });

      if (error) {
        console.error(
          "Laboratory result creation failed:",
          error
        );

        return {
          success: false,
          message:
            error.message ||
            "Failed to create laboratory result.",
        };
      }
    }

    /*
     * Mark the specimen as having its result recorded.
     * COMPLETED is reserved for verification.
     */
    const {
      error: sampleUpdateError,
    } = await supabaseServer
      .from("lab_samples")
      .update({
        status:
          "COMPLETED",
      })
      .eq(
        "id",
        sample.id
      );

    if (sampleUpdateError) {
      console.error(
        "Laboratory sample result status update failed:",
        sampleUpdateError
      );

      return {
        success: false,
        message:
          "Result was saved, but the specimen status could not be updated.",
        id: resultId,
      };
    }

    const {
      error: orderUpdateError,
    } = await supabaseServer
      .from("lab_orders")
      .update({
        status:
          "AWAITING_VERIFICATION",
      })
      .eq(
        "id",
        labOrderId
      );

    if (orderUpdateError) {
      console.error(
        "Laboratory order verification status update failed:",
        orderUpdateError
      );

      return {
        success: false,
        message:
          "Result was saved, but the order could not be submitted for verification.",
        id: resultId,
      };
    }

    await logLabActivity({
      action:
        `Laboratory result submitted for verification: ${order.test_name}`,
      staff,
      patientId:
        order.patient_id,
      details: {
        labOrderId,
        resultId,
        sampleRecordId:
          sample.id,
        sampleId:
          order.sample_id,
        resultCount:
          input.resultData.length,
      },
    });

    revalidatePath(
      "/laboratory"
    );

    return {
      success: true,
      message:
        "Laboratory result saved and submitted for verification.",
      id: resultId,
    };
  } catch (error) {
    console.error(
      "Save laboratory result error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to save laboratory result.",
    };
  }
}

/**
 * Verify a laboratory result and release it.
 */
export async function verifyLabResult(input: {
  labOrderId: string;
  verificationNotes?: string;
}): Promise<WorkflowResponse> {
  try {
    const staff =
      await getLabStaff();

    const labOrderId =
      input.labOrderId?.trim();

    if (!labOrderId) {
      return {
        success: false,
        message:
          "Laboratory order ID is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("lab_orders")
      .select(
        "id, patient_id, test_name, status"
      )
      .eq(
        "id",
        labOrderId
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      return {
        success: false,
        message:
          "Laboratory order could not be found.",
      };
    }

    if (
      order.status !==
      "AWAITING_VERIFICATION"
    ) {
      return {
        success: false,
        message:
          "Only results awaiting verification can be verified.",
      };
    }

    const now =
      new Date().toISOString();

    const {
      data: result,
      error: resultError,
    } = await supabaseServer
      .from("lab_results")
      .select(
        "id, sample_id"
      )
      .eq(
        "lab_order_id",
        labOrderId
      )
      .maybeSingle();

    if (
      resultError ||
      !result
    ) {
      return {
        success: false,
        message:
          "No laboratory result was found for this order.",
      };
    }

    const {
      error: resultUpdateError,
    } = await supabaseServer
      .from("lab_results")
      .update({
        verified_by:
          staff.id,

        verified_at:
          now,

        verification_notes:
          input.verificationNotes
            ?.trim() ||
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        result.id
      );

    if (resultUpdateError) {
      console.error(
        "Laboratory result verification failed:",
        resultUpdateError
      );

      return {
        success: false,
        message:
          resultUpdateError.message ||
          "Failed to verify laboratory result.",
      };
    }

    /*
     * The specimen has already completed processing.
     * The order is now the source of truth for the
     * clinical workflow state.
     */
    const {
      error: orderUpdateError,
    } = await supabaseServer
      .from("lab_orders")
      .update({
        status:
          "COMPLETED",
      })
      .eq(
        "id",
        labOrderId
      );

    if (orderUpdateError) {
      console.error(
        "Laboratory completion update failed:",
        orderUpdateError
      );

      return {
        success: false,
        message:
          "The result was verified, but the laboratory order could not be marked completed.",
      };
    }

    await logLabActivity({
      action:
        `Laboratory result verified and released: ${order.test_name}`,
      staff,
      patientId:
        order.patient_id,
      details: {
        labOrderId,
        resultId:
          result.id,
        verificationNotes:
          input.verificationNotes
            ?.trim() ||
          null,
      },
    });

    revalidatePath(
      "/laboratory"
    );

    return {
      success: true,
      message:
        "Laboratory result has been verified and released.",
      id: result.id,
    };
  } catch (error) {
    console.error(
      "Verify laboratory result error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to verify laboratory result.",
    };
  }
}

/**
 * Request a new specimen.
 */
export async function requestLabRecollection(
  input: {
    labOrderId: string;
    reason: string;
  }
): Promise<WorkflowResponse> {
  try {
    const staff =
      await getLabStaff();

    const labOrderId =
      input.labOrderId?.trim();

    const reason =
      input.reason?.trim();

    if (!labOrderId) {
      return {
        success: false,
        message:
          "Laboratory order ID is required.",
      };
    }

    if (!reason) {
      return {
        success: false,
        message:
          "A recollection reason is required.",
      };
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseServer
      .from("lab_orders")
      .select(
        "id, patient_id, test_name, status, sample_id"
      )
      .eq(
        "id",
        labOrderId
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      return {
        success: false,
        message:
          "Laboratory order could not be found.",
      };
    }

    if (
      ![
        "COLLECTED",
        "PROCESSING",
      ].includes(order.status)
    ) {
      return {
        success: false,
        message:
          "A new specimen cannot be requested from the current laboratory order status.",
      };
    }

    /*
     * Mark the existing specimen as rejected.
     * The next collection will create a NEW lab_samples
     * record with a new sample number and sample ID.
     */
    if (order.sample_id) {
      const {
        data: existingSample,
      } = await supabaseServer
        .from("lab_samples")
        .select("id")
        .eq(
          "lab_order_id",
          labOrderId
        )
        .eq(
          "sample_id",
          order.sample_id
        )
        .maybeSingle();

      if (existingSample) {
        const {
          error: sampleUpdateError,
        } = await supabaseServer
          .from("lab_samples")
          .update({
            status:
              "REJECTED",

            rejection_reason:
              reason,
          })
          .eq(
            "id",
            existingSample.id
          );

        if (sampleUpdateError) {
          console.error(
            "Existing laboratory sample rejection update failed:",
            sampleUpdateError
          );

          return {
            success: false,
            message:
              sampleUpdateError.message ||
              "Failed to mark the existing specimen for recollection.",
          };
        }
      }
    }

    const { error } =
      await supabaseServer
        .from("lab_orders")
        .update({
          status:
            "RECOLLECTION",

          recollection_reason:
            reason,
        })
        .eq(
          "id",
          labOrderId
        );

    if (error) {
      console.error(
        "Laboratory recollection request failed:",
        error
      );

      return {
        success: false,
        message:
          error.message ||
          "Failed to request sample recollection.",
      };
    }

    await logLabActivity({
      action:
        `Laboratory recollection requested: ${order.test_name}`,
      staff,
      patientId:
        order.patient_id,
      details: {
        labOrderId,
        reason,
        previousSampleId:
          order.sample_id,
      },
    });

    revalidatePath(
      "/laboratory"
    );

    return {
      success: true,
      message:
        "Sample recollection has been requested.",
      id: labOrderId,
    };
  } catch (error) {
    console.error(
      "Request laboratory recollection error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to request sample recollection.",
    };
  }
}