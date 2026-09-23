"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

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
    const code =
      patientCode?.trim();

    if (!code) {
      return {
        success: false,
        message:
          "Patient code is required.",
        patient: null,
      };
    }

    const {
      data: patient,
      error: patientError,
    } = await supabase
      .from("patients")
      .select(
        "id, patient_code, full_name, coverage_plan, age, gender, phone, allergies"
      )
      .eq(
        "patient_code",
        code
      )
      .maybeSingle();

    if (patientError) {
      console.error(
        "Pharmacy patient lookup failed:",
        patientError
      );

      return {
        success: false,
        message:
          "Unable to load the patient.",
        patient: null,
      };
    }

    if (!patient) {
      return {
        success: false,
        message:
          `Patient ${code} was not found.`,
        patient: null,
      };
    }

    const {
      data: prescriptions,
      error:
        prescriptionError,
    } = await supabase
      .from("prescriptions")
      .select("*")
      .eq(
        "patient_id",
        patient.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (prescriptionError) {
      console.error(
        "Pharmacy prescription lookup failed:",
        prescriptionError
      );

      return {
        success: false,
        message:
          "Unable to load prescriptions.",
        patient: null,
      };
    }

    const mapped: PharmacyPatient =
      {
        patientId:
          patient.patient_code,

        fullName:
          patient.full_name,

        coveragePlan:
          patient.coverage_plan ??
          "Self-Pay",

        age:
          patient.age ??
          undefined,

        gender:
          patient.gender ??
          undefined,

        phone:
          patient.phone ??
          undefined,

        allergies:
          patient.allergies ??
          undefined,

        prescriptions:
          (
            prescriptions ??
            []
          ).map(
            (rx) => ({
              id: rx.id,
              drugName:
                rx.drug_name,
              dosage:
                rx.dosage,
              quantity:
                Number(
                  rx.quantity ??
                    0
                ),
              pricePerUnit:
                Number(
                  rx.price_per_unit ??
                    0
                ),
              totalPrice:
                Number(
                  rx.total_price ??
                    0
                ),
              status:
                rx.status,
            })
          ),
      };

    return {
      success: true,
      message:
        "Pharmacy patient loaded.",
      patient: mapped,
    };
  } catch (error) {
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
    const {
      data: prescriptions,
      error:
        prescriptionError,
    } = await supabase
      .from("prescriptions")
      .select(
        "id, patient_id, quantity, total_price, created_at"
      )
      .eq(
        "status",
        "ready_for_dispensing"
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (prescriptionError) {
      throw prescriptionError;
    }

    const patientIds = [
      ...new Set(
        (
          prescriptions ??
          []
        )
          .map(
            (rx) =>
              rx.patient_id
          )
          .filter(Boolean)
      ),
    ];

    if (
      patientIds.length === 0
    ) {
      return {
        success: true,
        message:
          "Pharmacy queue loaded.",
        queue: [],
      };
    }

    const {
      data: patients,
      error: patientError,
    } = await supabase
      .from("patients")
      .select(
        "id, patient_code, full_name"
      )
      .in(
        "id",
        patientIds
      );

    if (patientError) {
      throw patientError;
    }

    const patientMap =
      Object.fromEntries(
        (
          patients ??
          []
        ).map(
          (patient) => [
            patient.id,
            patient,
          ]
        )
      );

    const grouped =
      new Map<
        string,
        PharmacyQueueItem
      >();

    for (const rx of
      prescriptions ??
      []) {
      const patient =
        patientMap[
          rx.patient_id
        ];

      if (!patient) {
        continue;
      }

      const existing =
        grouped.get(
          rx.patient_id
        );

      if (existing) {
        existing.prescriptionCount +=
          1;

        existing.totalAmount +=
          Number(
            rx.total_price ??
              0
          );
      } else {
        grouped.set(
          rx.patient_id,
          {
            patientId:
              patient.patient_code,

            fullName:
              patient.full_name,

            prescriptionCount:
              1,

            totalAmount:
              Number(
                rx.total_price ??
                  0
              ),

            createdAt:
              rx.created_at,
          }
        );
      }
    }

    return {
      success: true,
      message:
        "Pharmacy queue loaded.",
      queue:
        Array.from(
          grouped.values()
        ),
    };
  } catch (error) {
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

export async function dispensePatientPrescriptions(
  patientCode: string
) {
  try {
    const code =
      patientCode?.trim();

    if (!code) {
      return {
        success: false,
        message:
          "Patient code is required.",
      };
    }

    const {
      data: patient,
      error: patientError,
    } = await supabase
      .from("patients")
      .select(
        "id, patient_code, full_name"
      )
      .eq(
        "patient_code",
        code
      )
      .maybeSingle();

    if (patientError) {
      throw patientError;
    }

    if (!patient) {
      return {
        success: false,
        message:
          `Patient ${code} was not found.`,
      };
    }

    const {
      data: prescriptions,
      error:
        prescriptionError,
    } = await supabase
      .from("prescriptions")
      .select("*")
      .eq(
        "patient_id",
        patient.id
      )
      .eq(
        "status",
        "ready_for_dispensing"
      );

    if (prescriptionError) {
      throw prescriptionError;
    }

    if (
      !prescriptions ||
      prescriptions.length === 0
    ) {
      return {
        success: false,
        message:
          "There are no paid prescriptions ready for dispensing.",
      };
    }

    /*
     * Validate inventory BEFORE changing anything.
     */
    const inventoryChecks: Array<{
      prescription: any;
      inventory: any;
    }> = [];

    for (const prescription of
      prescriptions) {
      const {
        data: inventory,
        error:
          inventoryError,
      } = await supabase
        .from("inventory_items")
        .select(
          "id, name, stock, domain"
        )
        .eq(
          "domain",
          "pharmacy"
        )
        .ilike(
          "name",
          prescription.drug_name
        )
        .limit(1)
        .maybeSingle();

      if (inventoryError) {
        throw inventoryError;
      }

      if (!inventory) {
        return {
          success: false,
          message:
            `No pharmacy stock record was found for ${prescription.drug_name}.`,
        };
      }

      const required =
        Number(
          prescription.quantity ??
            0
        );

      const available =
        Number(
          inventory.stock ??
            0
        );

      if (
        available <
        required
      ) {
        return {
          success: false,
          message:
            `Insufficient stock for ${prescription.drug_name}. Available: ${available}, required: ${required}.`,
        };
      }

      inventoryChecks.push({
        prescription,
        inventory,
      });
    }

    /*
     * Deduct inventory.
     */
    for (const item of
      inventoryChecks) {
      const required =
        Number(
          item.prescription
            .quantity ?? 0
        );

      const newStock =
        Number(
          item.inventory
            .stock ?? 0
        ) - required;

      const {
        error:
          stockError,
      } = await supabase
        .from("inventory_items")
        .update({
          stock:
            newStock,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          item.inventory.id
        );

      if (stockError) {
        throw stockError;
      }
    }

    /*
     * Mark prescriptions as dispensed.
     */
    const prescriptionIds =
      prescriptions.map(
        (rx) => rx.id
      );

    const {
      error:
        dispenseError,
    } = await supabase
      .from("prescriptions")
      .update({
        status: "dispensed",
      })
      .in(
        "id",
        prescriptionIds
      )
      .eq(
        "status",
        "ready_for_dispensing"
      );

    if (dispenseError) {
      throw dispenseError;
    }

    const totalAmount =
      prescriptions.reduce(
        (sum, rx) =>
          sum +
          Number(
            rx.total_price ??
              0
          ),
        0
      );

    await logActivity({
      module: "Pharmacy",
      category: "CLINICAL",
      action:
        `Prescription dispensed for ${patient.full_name}`,
      performedBy:
        "Pharmacy",
      patientId:
        patient.id,
      details:
        JSON.stringify({
          patientCode:
            patient.patient_code,
          prescriptionIds,
          itemCount:
            prescriptions.length,
          totalAmount,
        }),
      financialAmount:
        totalAmount,
    });

    revalidatePath(
      "/pharmacy"
    );

    revalidatePath(
      "/cashier"
    );

    revalidatePath(
      "/billing"
    );

    return {
      success: true,
      message:
        "Prescription dispensed successfully.",
      totalAmount,
      prescriptionCount:
        prescriptions.length,
    };
  } catch (error) {
    console.error(
      "Dispense prescriptions error:",
      error
    );

    return {
      success: false,
      message:
        "An unexpected error occurred while dispensing the prescription.",
    };
  }
}
