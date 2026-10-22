"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import {
  getOrCreateDraftInvoice,
  recalcInvoice,
} from "@/lib/patient-flow";
import { requireRole } from "@/lib/server-auth";

const PHARMACY_READ_ROLES = [
  "IT_ADMIN",
  "PHARMACIST",
  "NURSE",
  "DOCTOR",
  "OPHTHALMOLOGIST",
] as const;

const PHARMACY_WRITE_ROLES = [
  "IT_ADMIN",
  "PHARMACIST",
] as const;

export interface PharmacyPrescription {
  id: string;
  drugName: string;
  dosage: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  status:
    | "awaiting_pharmacy_review"
    | "pending_payment"
    | "ready_for_dispensing"
    | "dispensed"
    | "reviewed"
    | "deferred_due_to_cost";
}

export interface PharmacyPatient {
  patientId: string;
  fullName: string;
  coveragePlan: string;
  age?: number;
  gender?: string;
  phone?: string;
  allergies?: string;
  prescriptions: PharmacyPrescription[];
}

export interface PharmacyQueueItem {
  patientId: string;
  fullName: string;
  prescriptionCount: number;
  totalAmount: number;
  createdAt: string;
  status: "awaiting_pharmacy_review" | "pending_payment" | "ready_for_dispensing";
}

export async function getPharmacyPatient(
  patientCode: string
) {
  try {
    await requireRole([...PHARMACY_READ_ROLES]);

    const code = patientCode?.trim();

    if (!code) {
      return {
        success: false,
        message: "Patient code is required.",
        patient: null,
      };
    }

    const { data: patient, error: patientError } =
      await supabaseServer
        .from("patients")
        .select(
          "id, patient_code, full_name, coverage_plan, age, gender, phone, allergies"
        )
        .eq("patient_code", code)
        .maybeSingle();

    if (patientError) {
      console.error(
        "Pharmacy patient lookup failed:",
        patientError
      );

      return {
        success: false,
        message: "Unable to load the patient.",
        patient: null,
      };
    }

    if (!patient) {
      return {
        success: false,
        message: `Patient ${code} was not found.`,
        patient: null,
      };
    }

    const {
      data: prescriptions,
      error: prescriptionError,
    } = await supabaseServer
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", {
        ascending: false,
      });

    if (prescriptionError) {
      console.error(
        "Pharmacy prescription lookup failed:",
        prescriptionError
      );

      return {
        success: false,
        message: "Unable to load prescriptions.",
        patient: null,
      };
    }

    const mappedPatient: PharmacyPatient = {
      patientId: patient.patient_code,
      fullName: patient.full_name,
      coveragePlan:
        patient.coverage_plan ?? "Self-Pay",

      age:
        patient.age !== null &&
        patient.age !== undefined
          ? Number(patient.age)
          : undefined,

      gender: patient.gender ?? undefined,
      phone: patient.phone ?? undefined,
      allergies: patient.allergies ?? undefined,

      prescriptions: (prescriptions ?? []).map(
        (rx) => ({
          id: rx.id,
          drugName: rx.drug_name,
          dosage: rx.dosage,
          quantity: Number(rx.quantity ?? 0),
          pricePerUnit: Number(
            rx.price_per_unit ?? 0
          ),
          totalPrice: Number(
            rx.total_price ?? 0
          ),
          status:
            rx.status === "dispensed"
              ? "dispensed"
              : rx.status === "awaiting_pharmacy_review"
                ? "awaiting_pharmacy_review"
                : rx.status === "reviewed"
                  ? "reviewed"
                  : rx.status === "pending_payment"
                    ? "pending_payment"
                    : rx.status === "deferred_due_to_cost"
                      ? "deferred_due_to_cost"
                      : "ready_for_dispensing",
        })
      ),
    };

    return {
      success: true,
      message: "Pharmacy patient loaded.",
      patient: mappedPatient,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "UNAUTHENTICATED") {
      return {
        success: false,
        message: "Authentication required.",
        patient: null,
      };
    }

    if (message === "FORBIDDEN") {
      return {
        success: false,
        message:
          "You are not authorized to access pharmacy records.",
        patient: null,
      };
    }

    console.error(
      "Get pharmacy patient error:",
      error
    );

    return {
      success: false,
      message:
        "An unexpected error occurred while loading pharmacy.",
      patient: null,
    };
  }
}

export async function getPharmacyQueue() {
  try {
    await requireRole([...PHARMACY_READ_ROLES]);

    const {
      data: prescriptions,
      error: prescriptionError,
    } =
      await supabaseServer
        .from("prescriptions")
        .select(
          "id, patient_id, quantity, total_price, created_at, status"
        )
        .in("status", [
          "awaiting_pharmacy_review",
          "pending_payment",
          "ready_for_dispensing",
        ])
        .order("created_at", {
          ascending: true,
        });

    if (prescriptionError) {
      throw prescriptionError;
    }

    const patientIds = [
      ...new Set(
        (prescriptions ?? [])
          .map(
            (prescription) =>
              prescription.patient_id
          )
          .filter(Boolean)
      ),
    ];

    if (patientIds.length === 0) {
      return {
        success: true,
        message: "Pharmacy queue loaded.",
        queue: [],
      };
    }

    const {
      data: patients,
      error: patientError,
    } =
      await supabaseServer
        .from("patients")
        .select(
          "id, patient_code, full_name"
        )
        .in("id", patientIds);

    if (patientError) {
      throw patientError;
    }

    const patientMap = Object.fromEntries(
      (patients ?? []).map(
        (patient) => [
          patient.id,
          patient,
        ]
      )
    );

    const grouped =
      new Map<string, PharmacyQueueItem>();

    for (const prescription of
      prescriptions ?? []) {
      const patient =
        patientMap[
          prescription.patient_id
        ];

      if (!patient) {
        continue;
      }

      const queueStatus: PharmacyQueueItem["status"] = prescription.status === "awaiting_pharmacy_review"
        ? "awaiting_pharmacy_review"
        : prescription.status === "pending_payment"
          ? "pending_payment"
          : "ready_for_dispensing";
      const groupKey = `${prescription.patient_id}:${queueStatus}`;
      const existing = grouped.get(groupKey);

      if (existing) {
        existing.prescriptionCount += 1;
        existing.totalAmount += Number(prescription.total_price ?? 0);
      } else {
        grouped.set(groupKey, {
          patientId: patient.patient_code,
          fullName: patient.full_name,
          prescriptionCount: 1,
          totalAmount: Number(prescription.total_price ?? 0),
          createdAt: prescription.created_at,
          status: queueStatus,
        });
      }
    }

    return {
      success: true,
      message: "Pharmacy queue loaded.",
      queue: Array.from(
        grouped.values()
      ),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "UNAUTHENTICATED") {
      return {
        success: false,
        message: "Authentication required.",
        queue: [],
      };
    }

    if (message === "FORBIDDEN") {
      return {
        success: false,
        message:
          "You are not authorized to access the pharmacy queue.",
        queue: [],
      };
    }

    console.error(
      "Get pharmacy queue error:",
      error
    );

    return {
      success: false,
      message:
        "Unable to load the pharmacy queue.",
      queue: [],
    };
  }
}

export type CreatePharmacyPrescriptionInput = {
  patientCode: string;
  drugName: string;
  dosage: string;
  quantity: number;
  pricePerUnit: number;
};

export type CreatePharmacyPrescriptionResponse = {
  success: boolean;
  message: string;
  id?: string;
  totalPrice?: number;
};

export async function createPharmacyPrescription(
  input: CreatePharmacyPrescriptionInput
): Promise<CreatePharmacyPrescriptionResponse> {
  try {
    const staff =
      await requireRole([
        ...PHARMACY_WRITE_ROLES,
      ]);

    const patientCode =
      input.patientCode?.trim();

    const drugName =
      input.drugName?.trim();

    const dosage =
      input.dosage?.trim();

    const quantity =
      Number(input.quantity);

    if (!patientCode) {
      return {
        success: false,
        message: "Patient code is required.",
      };
    }

    if (!drugName) {
      return {
        success: false,
        message: "Medication name is required.",
      };
    }

    if (!dosage) {
      return {
        success: false,
        message:
          "Dosage and medication instructions are required.",
      };
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return {
        success: false,
        message:
          "Quantity must be a whole number greater than zero.",
      };
    }



    const {
      data: patient,
      error: patientError,
    } =
      await supabaseServer
        .from("patients")
        .select(
          "id, patient_code, full_name"
        )
        .eq("patient_code", patientCode)
        .maybeSingle();

    if (patientError) {
      console.error(
        "Pharmacy patient lookup failed:",
        patientError
      );

      return {
        success: false,
        message:
          "Unable to find the patient record.",
      };
    }

    if (!patient) {
      return {
        success: false,
        message:
          `Patient ${patientCode} was not found.`,
      };
    }

    const { data: prescriptionResult, error: prescriptionError } = await supabaseServer.rpc(
      "create_pharmacy_prescription_atomic",
      {
        p_patient_id: patient.id,
        p_drug_name: drugName,
        p_dosage: dosage,
        p_quantity: quantity,
        p_performed_by: staff.id,
      }
    );

    if (prescriptionError || !prescriptionResult) {
      const reason = prescriptionError?.message ?? "";
      console.error("Atomic pharmacy prescription creation failed:", prescriptionError);
      if (/Only [0-9]+ unit\(s\) of this medication are in stock/i.test(reason)) {
        return { success: false, message: reason };
      }
      if (reason.includes("active pharmacy inventory")) {
        return { success: false, message: "Select a medication from the active pharmacy inventory before adding it to billing." };
      }
      if (reason.includes("duplicated in pharmacy inventory")) {
        return { success: false, message: "This medication appears more than once in inventory. Ask an administrator to resolve the duplicate item." };
      }
      return { success: false, message: "The prescription and bill could not be created together. Please retry." };
    }

    const result = Array.isArray(prescriptionResult)
      ? prescriptionResult[0]
      : prescriptionResult;
    if (!result?.prescription_id || !result?.invoice_id) {
      throw new Error("Atomic pharmacy prescription creation returned incomplete identifiers.");
    }

    const prescriptionId = String(result.prescription_id);
    const invoiceId = String(result.invoice_id);
    const pricePerUnit = Number(result.price_per_unit);
    const totalPrice = Number(result.total_price);

    await recalcInvoice(invoiceId);

    await logActivity({
      module: "Pharmacy",
      category: "CLINICAL",
      action:
        `Pharmacy prescription added: ${drugName}`,
      performedBy: staff.name,
      patientId: patient.id,
      staffId: staff.id,
      details: JSON.stringify({
        prescriptionId,
        patientCode:
          patient.patient_code,
        drugName,
        dosage,
        quantity,
        pricePerUnit,
        totalPrice,
      }),
      financialAmount:
        totalPrice,
    });

    revalidatePath("/pharmacy");
    revalidatePath("/billing");
    revalidatePath("/cashier");

    return {
      success: true,
      message:
        `${drugName} has been added to the patient's prescription and bill.`,
      id: prescriptionId,
      totalPrice,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "UNAUTHENTICATED") {
      return {
        success: false,
        message: "Authentication required.",
      };
    }

    if (message === "FORBIDDEN") {
      return {
        success: false,
        message:
          "You are not authorized to create pharmacy prescriptions.",
      };
    }

    console.error(
      "Create pharmacy prescription error:",
      error
    );

    return {
      success: false,
      message:
        "An unexpected error occurred while adding the medication.",
    };
  }
}

export async function dispensePatientPrescriptions(patientCode: string) {
  try {
    const staff = await requireRole([...PHARMACY_WRITE_ROLES]);

    const code = patientCode?.trim();

    if (!code) {
      return {
        success: false,
        message: "Patient code is required.",
      };
    }

    // Query the patient directly from Supabase
    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code, full_name")
      .eq("patient_code", code)
      .maybeSingle();

    if (patientError) {
      console.error("Patient lookup failed:", patientError);

      return {
        success: false,
        message: "Failed to load patient.",
      };
    }

    if (!patient) {
      return {
        success: false,
        message: `Patient ${code} was not found.`,
      };
    }

    const { data, error } = await supabaseServer.rpc(
      "dispense_patient_prescriptions",
      {
        p_patient_id: patient.id,
        p_performed_by: staff.id,
        p_performed_by_name: staff.name,
      }
    );

    if (error) {
      console.error("Atomic prescription dispensing failed:", error);

      return {
        success: false,
        message:
          error.message || "Failed to dispense patient prescriptions.",
      };
    }

    await logActivity({
      patientId: patient.id,
      module: "Pharmacy",
      category: "CLINICAL",
      action: "Patient prescriptions dispensed.",
      performedBy: staff.name,
    });

    revalidatePath("/pharmacy");
    revalidatePath("/inventory");

    return {
      success: true,
      message: "Prescriptions dispensed successfully and inventory was updated.",
      result: data,
    };
  } catch (error) {
    console.error("Dispense prescriptions error:", error);

    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return {
        success: false,
        message: "Authentication required.",
      };
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return {
        success: false,
        message: "You do not have permission to dispense prescriptions.",
      };
    }

    return {
      success: false,
      message: "Failed to dispense patient prescriptions.",
    };
  }
}

/**
 * Defer selected unpaid medication lines in one database transaction.
 * The prescription history remains, but the bill line is removed and the
 * medication cannot be dispensed until it is restored and paid.
 */
export async function deferPrescriptionsDueToCost(
  patientCode: string,
  prescriptionIds: string[],
) {
  try {
    const staff = await requireRole([...PHARMACY_WRITE_ROLES]);
    const code = patientCode?.trim();
    const ids = [...new Set((prescriptionIds ?? []).map((id) => id.trim()).filter(Boolean))];
    if (!code || ids.length === 0) {
      return { success: false, message: "Select at least one unpaid medication to defer." };
    }

    const { data: patient, error: patientError } = await supabaseServer
      .from("patients")
      .select("id, patient_code")
      .eq("patient_code", code)
      .maybeSingle();
    if (patientError || !patient) {
      return { success: false, message: "Unable to find the patient record." };
    }

    const { data, error } = await supabaseServer.rpc("defer_pharmacy_prescriptions_atomic", {
      p_patient_id: patient.id,
      p_prescription_ids: ids,
      p_performed_by: staff.id,
    });
    if (error || !data) {
      console.error("Atomic pharmacy deferral failed:", error);
      const reason = error?.message ?? "";
      if (/Only unpaid prescriptions can be deferred|finalised bill|prescription no longer matches/i.test(reason)) {
        return { success: false, message: reason };
      }
      return { success: false, message: "The selected medication could not be deferred. No partial bill changes were saved." };
    }

    await logActivity({
      patientId: patient.id,
      module: "Pharmacy",
      category: "CLINICAL",
      action: "Medication deferred because patient could not afford full prescription",
      performedBy: staff.name,
      staffId: staff.id,
      details: JSON.stringify({ prescriptionIds: ids, deferredCount: data.deferredCount }),
    });
    revalidatePath("/pharmacy");
    revalidatePath("/billing");
    revalidatePath("/cashier");
    return {
      success: true,
      message: "Selected medication(s) deferred. Only the remaining bill items can be paid and dispensed.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return { success: false, message: "Authentication required." };
    if (message === "FORBIDDEN") return { success: false, message: "You are not authorized to defer prescriptions." };
    console.error("Failed to defer pharmacy prescription(s):", error);
    return { success: false, message: "Unable to defer the selected medication." };
  }
}

/** Restore a deferred prescription to an unpaid invoice atomically. */
export async function restoreDeferredPrescriptionToBill(prescriptionId: string) {
  try {
    const staff = await requireRole([...PHARMACY_WRITE_ROLES]);
    const id = prescriptionId?.trim();
    if (!id) return { success: false, message: "Prescription ID is required." };

    const { data, error } = await supabaseServer.rpc("restore_deferred_pharmacy_prescription_atomic", {
      p_prescription_id: id,
      p_performed_by: staff.id,
    });
    if (error || !data) {
      console.error("Atomic pharmacy restoration failed:", error);
      const reason = error?.message ?? "";
      if (/no longer deferred|prescription not found|could not be restored/i.test(reason)) {
        return { success: false, message: reason };
      }
      return { success: false, message: "The medication could not be restored to billing. No partial bill changes were saved." };
    }

    await logActivity({
      patientId: String(data.patientId),
      module: "Pharmacy",
      category: "CLINICAL",
      action: "Deferred medication restored to billing",
      performedBy: staff.name,
      staffId: staff.id,
      details: JSON.stringify({ prescriptionId: id, invoiceId: data.invoiceId, invoiceItemId: data.invoiceItemId }),
      financialAmount: Number(data.totalPrice ?? 0),
    });
    revalidatePath("/pharmacy");
    revalidatePath("/billing");
    revalidatePath("/cashier");
    return { success: true, message: "Medication restored to the bill. Complete payment before dispensing." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return { success: false, message: "Authentication required." };
    if (message === "FORBIDDEN") return { success: false, message: "You are not authorized to restore prescriptions." };
    console.error("Restore deferred pharmacy prescription error:", error);
    return { success: false, message: "Unable to restore deferred medication." };
  }
}

export async function markPrescriptionRequestReviewed(prescriptionId: string) {
  try {
    await requireRole([...PHARMACY_WRITE_ROLES]);
    const id = prescriptionId?.trim();
    if (!id) return { success: false, message: "Prescription request ID is required." };

    const { data: request, error: requestError } = await supabaseServer
      .from("prescriptions")
      .select("id, patient_id, created_at")
      .eq("id", id)
      .eq("status", "awaiting_pharmacy_review")
      .maybeSingle();

    if (requestError) {
      console.error("Prescription request lookup failed:", requestError);
      return { success: false, message: "Could not load the prescription request." };
    }
    if (!request) {
      return { success: false, message: "This request is no longer awaiting review. Refresh the pharmacy record." };
    }

    const { data: billableMedication, error: medicationError } = await supabaseServer
      .from("prescriptions")
      .select("id")
      .eq("patient_id", request.patient_id)
      .gt("created_at", request.created_at)
      .neq("id", request.id)
      .neq("drug_name", "Doctor's prescription request — review required")
      .in("status", ["pending_payment", "ready_for_dispensing", "dispensed"])
      .limit(1)
      .maybeSingle();

    if (medicationError) {
      console.error("Billable medication verification failed:", medicationError);
      return { success: false, message: "Could not verify that the approved medication was added." };
    }
    if (!billableMedication) {
      return { success: false, message: "Add the approved medication from available pharmacy stock first, then mark this request reviewed." };
    }

    const { data, error } = await supabaseServer
      .from("prescriptions")
      .update({ status: "reviewed" })
      .eq("id", id)
      .eq("status", "awaiting_pharmacy_review")
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Prescription request review update failed:", error);
      return { success: false, message: "Could not update the prescription request." };
    }
    if (!data) {
      return { success: false, message: "This request is no longer awaiting review. Refresh the pharmacy record." };
    }

    revalidatePath("/pharmacy");
    return { success: true, message: "Prescription request marked as reviewed." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return { success: false, message: "Authentication required." };
    if (message === "FORBIDDEN") return { success: false, message: "Only authorized pharmacy staff can review prescription requests." };
    console.error("Mark prescription request reviewed error:", error);
    return { success: false, message: "Could not mark the prescription request as reviewed." };
  }
}
