"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";
import {
  getOrCreateDraftInvoice,
  recalcInvoice,
} from "@/lib/patient-flow";

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
    const code = patientCode?.trim();

    if (!code) {
      return {
        success: false,
        message: "Patient code is required.",
        patient: null,
      };
    }

    const { data: patient, error: patientError } =
      await supabase
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
    } = await supabase
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
              : rx.status ===
                  "ready_for_dispensing"
                ? "ready_for_dispensing"
                : "pending_payment",
        })
      ),
    };

    return {
      success: true,
      message: "Pharmacy patient loaded.",
      patient: mappedPatient,
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
      error: prescriptionError,
    } = await supabase
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
    } = await supabase
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
    const patientCode = input.patientCode?.trim();
    const drugName = input.drugName?.trim();
    const dosage = input.dosage?.trim();

    const quantity = Number(input.quantity);
    const pricePerUnit = Number(input.pricePerUnit);

    // -----------------------------
    // VALIDATION
    // -----------------------------

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
        message: "Dosage and medication instructions are required.",
      };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        success: false,
        message: "Quantity must be a whole number greater than zero.",
      };
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      return {
        success: false,
        message: "Price per unit is invalid.",
      };
    }

    const totalPrice = quantity * pricePerUnit;

    // -----------------------------
    // FIND REAL PATIENT
    // -----------------------------

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, patient_code, full_name")
      .eq("patient_code", patientCode)
      .maybeSingle();

    if (patientError) {
      console.error(
        "Pharmacy patient lookup failed:",
        patientError
      );

      return {
        success: false,
        message: "Unable to find the patient record.",
      };
    }

    if (!patient) {
      return {
        success: false,
        message: `Patient ${patientCode} was not found.`,
      };
    }

    // -----------------------------
    // CREATE PRESCRIPTION
    // -----------------------------

    const { data: prescription, error: prescriptionError } =
      await supabase
        .from("prescriptions")
        .insert({
          patient_id: patient.id,
          drug_name: drugName,
          dosage,
          quantity,
          price_per_unit: pricePerUnit,
          total_price: totalPrice,
          status: "pending_payment",
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
        message: "Failed to create the prescription.",
      };
    }

    // -----------------------------
    // GET / CREATE ACTIVE INVOICE
    // -----------------------------

    const invoice = await getOrCreateDraftInvoice(patient.id);

    // -----------------------------
    // ADD MEDICATION TO BILL
    // -----------------------------

    const { error: invoiceItemError } = await supabase
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

      // Do not pretend the entire operation succeeded.
      // Remove the prescription because the billing record could
      // not be created for it.
      await supabase
        .from("prescriptions")
        .delete()
        .eq("id", prescription.id);

      return {
        success: false,
        message:
          "The medication could not be added to the patient's bill.",
      };
    }

    // -----------------------------
    // RECALCULATE INVOICE
    // -----------------------------

    await recalcInvoice(invoice.id);

    // -----------------------------
    // ACTIVITY LOG
    // -----------------------------

    await logActivity({
      module: "Pharmacy",
      category: "CLINICAL",
      action: `Pharmacy prescription added: ${drugName}`,
      performedBy: "Pharmacy",
      patientId: patient.id,
      details: JSON.stringify({
        prescriptionId: prescription.id,
        patientCode: patient.patient_code,
        drugName,
        dosage,
        quantity,
        pricePerUnit,
        totalPrice,
      }),
      financialAmount: totalPrice,
    });

    // -----------------------------
    // REFRESH RELATED MODULES
    // -----------------------------

    revalidatePath("/pharmacy");
    revalidatePath("/billing");
    revalidatePath("/cashier");

    return {
      success: true,
      message: `${drugName} has been added to the patient's prescription and bill.`,
      id: prescription.id,
      totalPrice,
    };
  } catch (error) {
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

export async function dispensePatientPrescriptions(
  patientCode: string
) {
  try {
    const code = patientCode?.trim();

    if (!code) {
      return {
        success: false,
        message: "Patient code is required.",
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
      .eq("patient_code", code)
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

    /*
     * Only prescriptions that have already been
     * paid by Cashier are allowed into dispensing.
     */
    const {
      data: prescriptions,
      error: prescriptionError,
    } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patient.id)
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
     * Find every matching pharmacy stock item
     * and verify stock BEFORE deducting anything.
     */
    const stockChecks: Array<{
      prescription: any;
      inventory: any;
      requiredQuantity: number;
    }> = [];

    for (const prescription of
      prescriptions) {
      const {
        data: inventory,
        error: inventoryError,
      } = await supabase
        .from("inventory_items")
        .select(
          "sku, name, stock, domain, price"
        )
        .eq("domain", "pharmacy")
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

      const requiredQuantity = Number(
        prescription.quantity ?? 0
      );

      const availableStock = Number(
        inventory.stock ?? 0
      );

      if (requiredQuantity <= 0) {
        return {
          success: false,
          message:
            `Invalid quantity for ${prescription.drug_name}.`,
        };
      }

      if (
        availableStock <
        requiredQuantity
      ) {
        return {
          success: false,
          message:
            `Insufficient stock for ${prescription.drug_name}. Available: ${availableStock}, required: ${requiredQuantity}.`,
        };
      }

      stockChecks.push({
        prescription,
        inventory,
        requiredQuantity,
      });
    }

    /*
     * All stock has been validated.
     * Now deduct stock using SKU.
     */
    for (const item of stockChecks) {
      const newStock =
        Number(
          item.inventory.stock
        ) -
        item.requiredQuantity;

      const {
        error: stockUpdateError,
      } = await supabase
        .from("inventory_items")
        .update({
          stock: newStock,
        })
        .eq(
          "sku",
          item.inventory.sku
        );

      if (stockUpdateError) {
        throw stockUpdateError;
      }
    }

    /*
     * Mark prescriptions as dispensed.
     */
    const prescriptionIds =
      prescriptions.map(
        (prescription) =>
          prescription.id
      );

    const {
      error: dispenseError,
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
        (sum, prescription) =>
          sum +
          Number(
            prescription.total_price ??
              0
          ),
        0
      );

    await logActivity({
      module: "Pharmacy",
      category: "CLINICAL",
      action:
        `Prescription dispensed for ${patient.full_name}`,
      performedBy: "Pharmacy",
      patientId: patient.id,
      details: JSON.stringify({
        patientCode:
          patient.patient_code,

        prescriptionIds,

        itemCount:
          prescriptions.length,

        totalAmount,

        inventoryDeducted:
          stockChecks.map(
            (item) => ({
              sku:
                item.inventory.sku,

              drug:
                item.inventory.name,

              quantity:
                item.requiredQuantity,
            })
          ),
      }),
      financialAmount:
        totalAmount,
    });

    revalidatePath("/pharmacy");
    revalidatePath("/cashier");
    revalidatePath("/billing");

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