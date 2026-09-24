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
    | "pending_payment"
    | "ready_for_dispensing"
    | "dispensed";
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
              : rx.status === "pending_payment"
                ? "pending_payment"
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
          "id, patient_id, quantity, total_price, created_at"
        )
        .eq("status", "ready_for_dispensing")
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

      const existing =
        grouped.get(
          prescription.patient_id
        );

      if (existing) {
        existing.prescriptionCount += 1;

        existing.totalAmount += Number(
          prescription.total_price ?? 0
        );
      } else {
        grouped.set(
          prescription.patient_id,
          {
            patientId:
              patient.patient_code,

            fullName:
              patient.full_name,

            prescriptionCount: 1,

            totalAmount: Number(
              prescription.total_price ?? 0
            ),

            createdAt:
              prescription.created_at,
          }
        );
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

    const pricePerUnit =
      Number(input.pricePerUnit);

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

    if (
      !Number.isFinite(pricePerUnit) ||
      pricePerUnit < 0
    ) {
      return {
        success: false,
        message:
          "Price per unit is invalid.",
      };
    }

    const totalPrice =
      quantity * pricePerUnit;

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

    const {
      data: prescription,
      error: prescriptionError,
    } =
      await supabaseServer
        .from("prescriptions")
        .insert({
          patient_id: patient.id,
          drug_name: drugName,
          dosage,
          quantity,
          price_per_unit: pricePerUnit,
          total_price: totalPrice,
          status: "ready_for_dispensing", // Updated default status to make items ready for dispensing
        })
        .select("id")
        .single();

    if (prescriptionError) {
      console.error(
        "Pharmacy prescription creation failed:",
        prescriptionError
      );

      return {
        success: false,
        message:
          "Failed to create the prescription.",
      };
    }

    const invoice =
      await getOrCreateDraftInvoice(
        patient.id
      );

    const {
      error: invoiceItemError,
    } =
      await supabaseServer
        .from("invoice_items")
        .insert({
          invoice_id: invoice.id,
          category: "pharmacy",
          name: drugName,
          quantity,
          unit_price: pricePerUnit,
          total_price: totalPrice,
        });

    if (invoiceItemError) {
      console.error(
        "Pharmacy invoice item creation failed:",
        invoiceItemError
      );

      await supabaseServer
        .from("prescriptions")
        .delete()
        .eq("id", prescription.id);

      return {
        success: false,
        message:
          "The medication could not be added to the patient's bill.",
      };
    }

    await recalcInvoice(invoice.id);

    await logActivity({
      module: "Pharmacy",
      category: "CLINICAL",
      action:
        `Pharmacy prescription added: ${drugName}`,
      performedBy: staff.name,
      patientId: patient.id,
      staffId: staff.id,
      details: JSON.stringify({
        prescriptionId:
          prescription.id,
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
      id: prescription.id,
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
      action: "Patient prescriptions dispensed and sent to cashier.",
      performedBy: staff.name,
    });

    revalidatePath("/pharmacy");

    return {
      success: true,
      message: "Prescriptions dispensed successfully.",
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