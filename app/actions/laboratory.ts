"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

/* ============================================================
   TYPES
   ============================================================ */

export type LabPriority = "NORMAL" | "URGENT" | "STAT";

export type LabOrderStatus =
  | "PENDING"
  | "COLLECTED"
  | "PROCESSING"
  | "AWAITING_VERIFICATION"
  | "COMPLETED"
  | "RECOLLECTION";

export type LabSampleStatus =
  | "COLLECTED"
  | "RECEIVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED";

export type LabSampleCondition =
  | "ACCEPTABLE"
  | "INSUFFICIENT"
  | "CLOTTED"
  | "HAEMOLYSED"
  | "WRONG_CONTAINER"
  | "WRONG_SAMPLE"
  | "OTHER";

export type LabResultFlag =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "CRITICAL";

export type LabResultParameter = {
  parameter: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: LabResultFlag;
};

export type LabQueueItem = {
  id: string;
  patientId: string;
  patientName: string;
  testCode: string;
  testName: string;
  specimenType: string;
  priority: LabPriority;
  status: LabOrderStatus;
  clinicalNotes: string;
  orderedBy: string;
  orderedAt: string;
  sample?: {
    id: string;
    sampleNumber: number;
    sampleType: string;
    sampleId: string;
    status: LabSampleStatus;
    condition: LabSampleCondition | null;
    collectionNotes: string;
    rejectionReason: string;
    collectedAt: string | null;
    receivedAt: string | null;
    processingStartedAt: string | null;
  } | null;
};

export type LabResultRecord = {
  id: string;
  labOrderId: string;
  sampleId: string | null;
  resultData: LabResultParameter[];
  laboratoryComments: string;
  enteredBy: string | null;
  enteredAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNotes: string;
};

export type LabEvent = {
  id: string;
  eventType: string;
  description: string;
  performedBy: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};


/* ============================================================
   HELPERS
   ============================================================ */

const LAB_STAFF_ROLES = [
  "LAB_SCIENTIST",
  "IT_ADMIN",
] as const;

const LAB_CLINICAL_VIEW_ROLES = [
  "IT_ADMIN",
  "OPHTHALMOLOGIST",
  "DOCTOR",
  "NURSE",
  "LAB_SCIENTIST",
  "OPTOMETRIST",
] as const;

const LAB_ORDER_ROLES = [
  "IT_ADMIN",
  "OPHTHALMOLOGIST",
  "DOCTOR",
  "OPTOMETRIST",
] as const;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPriority(value: string): value is LabPriority {
  return ["NORMAL", "URGENT", "STAT"].includes(value);
}

function isValidCondition(
  value: string
): value is LabSampleCondition {
  return [
    "ACCEPTABLE",
    "INSUFFICIENT",
    "CLOTTED",
    "HAEMOLYSED",
    "WRONG_CONTAINER",
    "WRONG_SAMPLE",
    "OTHER",
  ].includes(value);
}

function isValidResultFlag(
  value: string
): value is LabResultFlag {
  return ["LOW", "NORMAL", "HIGH", "CRITICAL"].includes(value);
}

async function getLabOrder(id: string) {
  const { data, error } = await supabaseServer
    .from("lab_orders")
    .select(`
      id,
      patient_id,
      test_code,
      test_name,
      specimen_type,
      priority,
      status,
      clinical_notes,
      ordered_by,
      ordered_at,
      patients!inner(
        patient_code,
        full_name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return null;
  }

  const patient = Array.isArray(data.patients)
    ? data.patients[0]
    : data.patients;

  if (!patient) {
    return null;
  }

  return {
    ...data,
    patients: patient,
  };
}


/* ============================================================
   CREATE LAB ORDER
   Doctor / Ophthalmologist / Optometrist
   ============================================================ */

export async function createLabOrder(input: {
  patientId: string;
  testCode: string;
  testName: string;
  specimenType: string;
  priority?: LabPriority;
  clinicalNotes?: string;
}) {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "OPHTHALMOLOGIST",
      "DOCTOR",
      "OPTOMETRIST",
    ]);

    const patientId = clean(input.patientId);
    const testCode = clean(input.testCode);
    const testName = clean(input.testName);
    const specimenType = clean(input.specimenType);

    if (!patientId) {
      return {
        success: false,
        message: "Patient is required.",
      };
    }

    if (!testCode) {
      return {
        success: false,
        message: "Laboratory test code is required.",
      };
    }

    if (!testName) {
      return {
        success: false,
        message: "Laboratory test name is required.",
      };
    }

    if (!specimenType) {
      return {
        success: false,
        message: "Specimen type is required.",
      };
    }

    const priority = input.priority ?? "NORMAL";

    if (!isValidPriority(priority)) {
      return {
        success: false,
        message: "Invalid laboratory priority.",
      };
    }

    const { data: patient, error: patientError } =
      await supabaseServer
        .from("patients")
        .select("id, patient_code, full_name")
        .eq("id", patientId)
        .maybeSingle();

    if (patientError) throw patientError;

    if (!patient) {
      return {
        success: false,
        message: "Patient not found.",
      };
    }

    const { data: orderId, error: orderError } = await supabaseServer.rpc(
      "create_lab_order_atomic",
      {
        p_patient_id: patient.id,
        p_test_code: testCode,
        p_test_name: testName,
        p_specimen_type: specimenType,
        p_priority: priority,
        p_clinical_notes: clean(input.clinicalNotes) || null,
        p_ordered_by: staff.id,
      }
    );

    if (orderError || !orderId) throw orderError ?? new Error("Laboratory order creation returned no ID");

    await logActivity({
      module: "Laboratory",
      category: "CLINICAL",
      action: `Laboratory investigation ordered: ${testName}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: patient.id,
      details: JSON.stringify({
        labOrderId: orderId,
        patientCode: patient.patient_code,
        testCode,
        testName,
        specimenType,
        priority,
      }),
    });

    revalidatePath("/laboratory");
    revalidatePath(
      `/doctor/patients/${patient.patient_code}/encounter`
    );

    return {
      success: true,
      message: "Laboratory investigation ordered successfully.",
      orderId: orderId,
    };
  } catch (error) {
    console.error("Create lab order error:", error);

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to order laboratory investigations."
          : "Unable to create laboratory investigation.",
    };
  }
}


/* ============================================================
   GET LABORATORY QUEUE
   ============================================================ */

export async function getLabQueue() {
  try {
    await requireRole([...LAB_CLINICAL_VIEW_ROLES]);

    const { data, error } = await supabaseServer
      .from("lab_orders")
      .select(`
        id,
        patient_id,
        test_code,
        test_name,
        specimen_type,
        priority,
        status,
        clinical_notes,
        ordered_by,
        ordered_at,
        patients!inner(
          patient_code,
          full_name
        ),
        lab_samples(
          id,
          sample_number,
          sample_type,
          sample_id,
          status,
          condition,
          collection_notes,
          rejection_reason,
          collected_at,
          received_at,
          processing_started_at
        )
      `)
      .order("ordered_at", {
        ascending: true,
      });

    if (error) throw error;

    return {
      success: true,

      orders: (data ?? []).map((rawRow: unknown) => {
  const row = rawRow as Record<string, unknown>;
  const patient = Array.isArray(row.patients)
    ? (row.patients[0] as Record<string, unknown> | undefined)
    : (row.patients as Record<string, unknown> | null);

  const samples = Array.isArray(row.lab_samples)
    ? (row.lab_samples as Record<string, unknown>[])
    : [];

  const latestSample =
    samples.length > 0
      ? [...samples].sort(
          (a, b) =>
            Number(b.sample_number ?? 0) -
            Number(a.sample_number ?? 0)
        )[0]
      : null;

  return {
    id: row.id,
    patientId: patient?.patient_code ?? "",
    patientName: patient?.full_name ?? "",
    testCode: row.test_code,
    testName: row.test_name,
    specimenType: row.specimen_type,
    priority: row.priority,
    status: row.status,
    clinicalNotes: row.clinical_notes ?? "",
    orderedBy: row.ordered_by ?? "",
    orderedAt: row.ordered_at,

    sample: latestSample
      ? {
          id: latestSample.id,
          sampleNumber: latestSample.sample_number,
          sampleType: latestSample.sample_type,
          sampleId: latestSample.sample_id ?? "",
          status: latestSample.status,
          condition: latestSample.condition ?? null,
          collectionNotes:
            latestSample.collection_notes ?? "",
          rejectionReason:
            latestSample.rejection_reason ?? "",
          collectedAt:
            latestSample.collected_at ?? null,
          receivedAt:
            latestSample.received_at ?? null,
          processingStartedAt:
            latestSample.processing_started_at ?? null,
        }
      : null,
  } as LabQueueItem;
}),
    };
  } catch (error) {
    console.error("Laboratory queue error:", error);

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to access the laboratory."
          : "Unable to load laboratory requests.",
      orders: [] as LabQueueItem[],
    };
  }
}


/* ============================================================
   GET SINGLE LAB ORDER
   ============================================================ */

export async function getLabOrderDetails(
  id: string
) {
  try {
    await requireRole([...LAB_CLINICAL_VIEW_ROLES]);

    if (!clean(id)) {
      return {
        success: false,
        message: "Laboratory order is required.",
        order: null,
        samples: [],
        results: [],
        events: [],
      };
    }

    const order = await getLabOrder(id);

    if (!order) {
      return {
        success: false,
        message: "Laboratory order not found.",
        order: null,
        samples: [],
        results: [],
        events: [],
      };
    }

    const [
      samplesResponse,
      resultsResponse,
      eventsResponse,
    ] = await Promise.all([
      supabaseServer
        .from("lab_samples")
        .select(`
          id,
          sample_number,
          sample_type,
          sample_id,
          status,
          condition,
          collection_notes,
          rejection_reason,
          collected_by,
          collected_at,
          received_by,
          received_at,
          rejected_by,
          rejected_at,
          processing_started_by,
          processing_started_at,
          created_at
        `)
        .eq("lab_order_id", id)
        .order("sample_number", {
          ascending: true,
        }),

      supabaseServer
        .from("lab_results")
        .select(`
          id,
          lab_order_id,
          sample_id,
          result_data,
          laboratory_comments,
          entered_by,
          entered_at,
          verified_by,
          verified_at,
          verification_notes,
          created_at,
          updated_at
        `)
        .eq("lab_order_id", id)
        .order("created_at", {
          ascending: false,
        }),

      supabaseServer
        .from("lab_events")
        .select(`
          id,
          event_type,
          description,
          performed_by,
          metadata,
          created_at
        `)
        .eq("lab_order_id", id)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    if (samplesResponse.error) {
      throw samplesResponse.error;
    }

    if (resultsResponse.error) {
      throw resultsResponse.error;
    }

    if (eventsResponse.error) {
      throw eventsResponse.error;
    }

    return {
      success: true,

      order: {
        id: order.id,
        patientId: order.patients.patient_code,
        patientName: order.patients.full_name,
        testCode: order.test_code,
        testName: order.test_name,
        specimenType: order.specimen_type,
        priority: order.priority,
        status: order.status,
        clinicalNotes: order.clinical_notes ?? "",
        orderedBy: order.ordered_by ?? "",
        orderedAt: order.ordered_at,
      },

      samples: samplesResponse.data ?? [],

      results: (resultsResponse.data ?? []).map(
        (result: Record<string, unknown>) => ({
          id: result.id,
          labOrderId:
            result.lab_order_id,
          sampleId:
            result.sample_id,
          resultData:
            Array.isArray(result.result_data)
              ? result.result_data
              : [],
          laboratoryComments:
            result.laboratory_comments ?? "",
          enteredBy:
            result.entered_by,
          enteredAt:
            result.entered_at,
          verifiedBy:
            result.verified_by,
          verifiedAt:
            result.verified_at,
          verificationNotes:
            result.verification_notes ?? "",
        })
      ) as LabResultRecord[],

      events: (eventsResponse.data ?? []).map(
        (event: Record<string, unknown>) => ({
          id: event.id,
          eventType:
            event.event_type,
          description:
            event.description,
          performedBy:
            event.performed_by,
          createdAt:
            event.created_at,
          metadata:
            event.metadata ?? {},
        })
      ) as LabEvent[],
    };
  } catch (error) {
    console.error(
      "Laboratory order details error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to view laboratory records."
          : "Unable to load laboratory order.",
      order: null,
      samples: [],
      results: [],
      events: [],
    };
  }
}


/* ============================================================
   COLLECT SAMPLE
   ============================================================ */

export async function collectLabSample(input: {
  labOrderId: string;
  sampleType?: string;
  sampleId?: string;
  collectionNotes?: string;
}) {
  try {
    const staff = await requireRole([
      ...LAB_STAFF_ROLES,
    ]);

    const labOrderId = clean(input.labOrderId);

    if (!labOrderId) {
      return {
        success: false,
        message: "Laboratory order is required.",
      };
    }

    const order = await getLabOrder(labOrderId);

    if (!order) {
      return {
        success: false,
        message: "Laboratory order not found.",
      };
    }

    if (
      !["PENDING", "RECOLLECTION"].includes(
        order.status
      )
    ) {
      return {
        success: false,
        message:
          order.status === "COLLECTED"
            ? "A sample has already been collected."
            : "This laboratory order is not ready for sample collection.",
      };
    }

    const sampleType =
      clean(input.sampleType) ||
      order.specimen_type;

    const { data: sampleId, error: sampleError } = await supabaseServer.rpc(
      "collect_lab_sample_atomic",
      {
        p_lab_order_id: labOrderId,
        p_sample_type: sampleType,
        p_sample_id: clean(input.sampleId) || null,
        p_collection_notes: clean(input.collectionNotes) || null,
        p_performed_by: staff.id,
      }
    );

    if (sampleError || !sampleId) throw sampleError ?? new Error("Sample collection returned no ID");

    await logActivity({
      module: "Laboratory",
      category: "CLINICAL",
      action: `Laboratory sample collected: ${order.test_name}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: order.patient_id,
      details: JSON.stringify({
        labOrderId,
        sampleId,
        testName: order.test_name,
      }),
    });

    revalidatePath("/laboratory");

    return {
      success: true,
      message: "Sample collected successfully.",
      sampleId,
    };
  } catch (error) {
    console.error(
      "Collect lab sample error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to collect laboratory samples."
          : "Unable to collect laboratory sample.",
    };
  }
}


/* ============================================================
   RECEIVE SAMPLE
   ============================================================ */

export async function receiveLabSample(input: {
  labOrderId: string;
  sampleId: string;
  condition: LabSampleCondition;
  receptionNotes?: string;
}) {
  try {
    const staff = await requireRole([
      ...LAB_STAFF_ROLES,
    ]);

    const labOrderId = clean(input.labOrderId);
    const sampleId = clean(input.sampleId);

    if (!labOrderId || !sampleId) {
      return {
        success: false,
        message:
          "Laboratory order and sample are required.",
      };
    }

    if (!isValidCondition(input.condition)) {
      return {
        success: false,
        message: "Invalid sample condition.",
      };
    }

    const order = await getLabOrder(labOrderId);

    if (!order) {
      return {
        success: false,
        message: "Laboratory order not found.",
      };
    }

    const { data: sample, error: sampleLookupError } =
      await supabaseServer
        .from("lab_samples")
        .select(`
          id,
          sample_number,
          sample_type,
          status
        `)
        .eq("id", sampleId)
        .eq("lab_order_id", labOrderId)
        .maybeSingle();

    if (sampleLookupError) {
      throw sampleLookupError;
    }

    if (!sample) {
      return {
        success: false,
        message: "Laboratory sample not found.",
      };
    }

    if (sample.status !== "COLLECTED") {
      return {
        success: false,
        message:
          "This sample is not awaiting laboratory reception.",
      };
    }

    const { data: transition, error: transitionError } = await supabaseServer.rpc(
      "receive_lab_sample_atomic",
      {
        p_lab_order_id: labOrderId,
        p_sample_id: sampleId,
        p_condition: input.condition,
        p_reception_notes: clean(input.receptionNotes) || null,
        p_performed_by: staff.id,
      }
    );

    if (transitionError) throw transitionError;

    const isAcceptable = transition === "ACCEPTED";
    await logActivity({
      module: "Laboratory",
      category: "CLINICAL",
      action: isAcceptable
        ? `Laboratory sample received: ${order.test_name}`
        : `Laboratory sample rejected: ${order.test_name}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: order.patient_id,
      details: JSON.stringify({
        labOrderId,
        sampleId,
        sampleNumber: sample.sample_number,
        condition: input.condition,
        receptionNotes: clean(input.receptionNotes) || null,
      }),
    });

    revalidatePath("/laboratory");

    return isAcceptable
      ? {
          success: true,
          message: "Sample received and accepted for processing.",
        }
      : {
          success: true,
          message: "Sample rejected. Recollection is required.",
          recollectionRequired: true,
        };

  } catch (error) {
    console.error(
      "Receive lab sample error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to receive laboratory samples."
          : "Unable to receive laboratory sample.",
    };
  }
}


/* ============================================================
   START PROCESSING
   ============================================================ */

export async function startLabProcessing(input: {
  labOrderId: string;
  sampleId: string;
  processingNotes?: string;
}) {
  try {
    const staff = await requireRole([
      ...LAB_STAFF_ROLES,
    ]);

    const labOrderId = clean(input.labOrderId);
    const sampleId = clean(input.sampleId);

    if (!labOrderId || !sampleId) {
      return {
        success: false,
        message:
          "Laboratory order and sample are required.",
      };
    }

    const order = await getLabOrder(labOrderId);

    if (!order) {
      return {
        success: false,
        message: "Laboratory order not found.",
      };
    }

    const { data: sample, error: sampleError } =
      await supabaseServer
        .from("lab_samples")
        .select(`
          id,
          sample_number,
          status,
          condition
        `)
        .eq("id", sampleId)
        .eq("lab_order_id", labOrderId)
        .maybeSingle();

    if (sampleError) throw sampleError;

    if (!sample) {
      return {
        success: false,
        message: "Laboratory sample not found.",
      };
    }

    if (
      sample.status !== "RECEIVED" ||
      sample.condition !== "ACCEPTABLE"
    ) {
      return {
        success: false,
        message:
          "Only an accepted received sample can enter processing.",
      };
    }

    const { error: processingError } = await supabaseServer.rpc(
      "start_lab_processing_atomic",
      {
        p_lab_order_id: labOrderId,
        p_sample_id: sampleId,
        p_processing_notes: clean(input.processingNotes) || null,
        p_performed_by: staff.id,
      }
    );

    if (processingError) throw processingError;

    revalidatePath("/laboratory");

    return {
      success: true,
      message: "Laboratory processing started.",
    };
  } catch (error) {
    console.error(
      "Start laboratory processing error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to process laboratory samples."
          : "Unable to start laboratory processing.",
    };
  }
}


/* ============================================================
   SAVE LAB RESULT
   ============================================================ */

export async function saveLabResult(input: {
  labOrderId: string;
  sampleId: string;
  resultData: LabResultParameter[];
  laboratoryComments?: string;
}) {
  try {
    const staff = await requireRole([
      ...LAB_STAFF_ROLES,
    ]);

    const labOrderId = clean(input.labOrderId);
    const sampleId = clean(input.sampleId);

    if (!labOrderId || !sampleId) {
      return {
        success: false,
        message:
          "Laboratory order and sample are required.",
      };
    }

    if (
      !Array.isArray(input.resultData) ||
      input.resultData.length === 0
    ) {
      return {
        success: false,
        message:
          "At least one laboratory result is required.",
      };
    }

    for (const parameter of input.resultData) {
      if (!clean(parameter.parameter)) {
        return {
          success: false,
          message:
            "Every result must have a parameter name.",
        };
      }

      if (!clean(parameter.result)) {
        return {
          success: false,
          message:
            "Every result must contain a result value.",
        };
      }

      if (!isValidResultFlag(parameter.flag)) {
        return {
          success: false,
          message:
            "Every result must have a valid result flag.",
        };
      }
    }

    const order = await getLabOrder(labOrderId);

    if (!order) {
      return {
        success: false,
        message: "Laboratory order not found.",
      };
    }

    if (
      !["PROCESSING", "AWAITING_VERIFICATION"].includes(
        order.status
      )
    ) {
      return {
        success: false,
        message:
          "This laboratory order is not ready for result entry.",
      };
    }

    const { data: sample, error: sampleError } =
      await supabaseServer
        .from("lab_samples")
        .select(`
          id,
          sample_number,
          status
        `)
        .eq("id", sampleId)
        .eq("lab_order_id", labOrderId)
        .maybeSingle();

    if (sampleError) throw sampleError;

    if (!sample) {
      return {
        success: false,
        message: "Laboratory sample not found.",
      };
    }

    if (
      sample.status !== "PROCESSING"
    ) {
      return {
        success: false,
        message:
          "This sample is not currently being processed.",
      };
    }

    const normalisedResults =
      input.resultData.map(
        (parameter) => ({
          parameter:
            clean(parameter.parameter),
          result:
            clean(parameter.result),
          unit:
            clean(parameter.unit),
          referenceRange:
            clean(parameter.referenceRange),
          flag:
            parameter.flag,
        })
      );

    const { data: resultId, error: resultSaveError } = await supabaseServer.rpc(
      "save_lab_result_atomic",
      {
        p_lab_order_id: labOrderId,
        p_sample_id: sampleId,
        p_result_data: normalisedResults,
        p_laboratory_comments: clean(input.laboratoryComments) || null,
        p_performed_by: staff.id,
      }
    );

    if (resultSaveError || !resultId) {
      throw resultSaveError ?? new Error("Laboratory result save returned no ID");
    }

    await logActivity({
      module: "Laboratory",
      category: "CLINICAL",
      action: `Laboratory result entered: ${order.test_name}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: order.patient_id,
      details: JSON.stringify({
        labOrderId,
        sampleId,
        resultId,
        testName: order.test_name,
        resultCount:
          normalisedResults.length,
      }),
    });

    revalidatePath("/laboratory");

    return {
      success: true,
      message:
        "Laboratory result saved and sent for verification.",
      resultId,
    };
  } catch (error) {
    console.error(
      "Save laboratory result error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to enter laboratory results."
          : "Unable to save laboratory result.",
    };
  }
}


/* ============================================================
   VERIFY LAB RESULT
   ============================================================ */

export async function verifyLabResult(input: {
  labOrderId: string;
  resultId: string;
  verificationNotes?: string;
}) {
  try {
    const staff = await requireRole([
      ...LAB_STAFF_ROLES,
    ]);

    const labOrderId = clean(input.labOrderId);
    const resultId = clean(input.resultId);

    if (!labOrderId || !resultId) {
      return {
        success: false,
        message:
          "Laboratory order and result are required.",
      };
    }

    const order = await getLabOrder(labOrderId);

    if (!order) {
      return {
        success: false,
        message: "Laboratory order not found.",
      };
    }

    if (
      order.status !==
      "AWAITING_VERIFICATION"
    ) {
      return {
        success: false,
        message:
          order.status === "COMPLETED"
            ? "This laboratory result has already been verified."
            : "This laboratory result is not ready for verification.",
      };
    }

    const { data: result, error: resultError } =
      await supabaseServer
        .from("lab_results")
        .select(`
          id,
          lab_order_id,
          sample_id,
          result_data,
          entered_by,
          verified_at
        `)
        .eq("id", resultId)
        .eq("lab_order_id", labOrderId)
        .maybeSingle();

    if (resultError) throw resultError;

    if (!result) {
      return {
        success: false,
        message: "Laboratory result not found.",
      };
    }

    if (result.verified_at) {
      return {
        success: false,
        message:
          "This laboratory result has already been verified.",
      };
    }

    if (
      !Array.isArray(result.result_data) ||
      result.result_data.length === 0
    ) {
      return {
        success: false,
        message:
          "Cannot verify an empty laboratory result.",
      };
    }

    const { error: verificationError } = await supabaseServer.rpc(
      "verify_lab_result_atomic",
      {
        p_lab_order_id: labOrderId,
        p_result_id: resultId,
        p_verification_notes: clean(input.verificationNotes) || null,
        p_performed_by: staff.id,
      }
    );

    if (verificationError) throw verificationError;

    await logActivity({
      module: "Laboratory",
      category: "CLINICAL",
      action: `Laboratory result verified: ${order.test_name}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: order.patient_id,
      details: JSON.stringify({
        labOrderId,
        resultId,
        testName: order.test_name,
        verificationNotes:
          clean(input.verificationNotes) ||
          null,
      }),
    });

    revalidatePath("/laboratory");
    revalidatePath(
      `/doctor/patients/${order.patients.patient_code}/encounter`
    );

    return {
      success: true,
      message:
        "Laboratory result verified and released to the clinical team.",
    };
  } catch (error) {
    console.error(
      "Verify laboratory result error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to verify laboratory results."
          : "Unable to verify laboratory result.",
    };
  }
}


/* ============================================================
   GET VERIFIED LAB RESULTS FOR A PATIENT
   Doctor-facing query
   ============================================================ */

export async function getPatientLabResults(
  patientId: string
) {
  try {
    await requireRole([
      ...LAB_CLINICAL_VIEW_ROLES,
    ]);

    const cleanPatientId =
      clean(patientId);

    if (!cleanPatientId) {
      return {
        success: false,
        message: "Patient is required.",
        results: [],
      };
    }

    const { data, error } =
      await supabaseServer
        .from("lab_results")
        .select(`
          id,
          lab_order_id,
          sample_id,
          result_data,
          laboratory_comments,
          entered_by,
          entered_at,
          verified_by,
          verified_at,
          verification_notes,
          lab_orders!inner(
            id,
            patient_id,
            test_code,
            test_name,
            specimen_type,
            priority,
            status,
            clinical_notes,
            ordered_at
          )
        `)
        .eq(
          "lab_orders.patient_id",
          cleanPatientId
        )
        .not("verified_at", "is", null)
        .order("verified_at", {
          ascending: false,
        });

    if (error) throw error;

    return {
      success: true,
      results: data ?? [],
    };
  } catch (error) {
    console.error(
      "Patient laboratory results error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to view laboratory results."
          : "Unable to load patient laboratory results.",
      results: [],
    };
  }
}


/* ============================================================
   GET LAB HISTORY
   ============================================================ */

export async function getLabHistory(input?: {
  patientId?: string;
  limit?: number;
}) {
  try {
    await requireRole([
      ...LAB_CLINICAL_VIEW_ROLES,
    ]);

    const limit = Math.min(
      Math.max(
        Number(input?.limit ?? 100),
        1
      ),
      500
    );

    let query = supabaseServer
      .from("lab_events")
      .select(`
        id,
        lab_order_id,
        sample_id,
        event_type,
        description,
        performed_by,
        metadata,
        created_at,
        lab_orders!inner(
          patient_id,
          test_name,
          patients!inner(
            patient_code,
            full_name
          )
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (clean(input?.patientId)) {
      query = query.eq(
        "lab_orders.patient_id",
        clean(input?.patientId)
      );
    }

    const { data, error } =
      await query;

    if (error) throw error;

    return {
      success: true,
      events: data ?? [],
    };
  } catch (error) {
    console.error(
      "Laboratory history error:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error &&
        error.message === "FORBIDDEN"
          ? "You are not authorized to view laboratory history."
          : "Unable to load laboratory history.",
      events: [],
    };
  }
}