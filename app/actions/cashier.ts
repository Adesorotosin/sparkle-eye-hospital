"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export interface CashierQueueItem {
  id: string;
  patientId: string;
  fullName: string;
  coveragePlan: string;
  status: "draft" | "pending" | "paid";
  grandTotal: number;
  createdAt: string;
  paidAt?: string | null;
  invoiceNo: string;
  paymentMethod?: string | null;
}

export interface CashierDashboardData {
  queue: CashierQueueItem[];
  pendingCount: number;
  completedCount: number;
  revenue: number;
}

function getLagosDayRange() {
  const now = new Date();

  const lagosDate = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(now);

  const start =
    new Date(
      `${lagosDate}T00:00:00+01:00`
    );

  const end =
    new Date(
      `${lagosDate}T23:59:59.999+01:00`
    );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export async function getCashierDashboard(): Promise<{
  success: boolean;
  message: string;
  data: CashierDashboardData;
}> {
  try {
    const { start, end } =
      getLagosDayRange();

    const {
      data: invoices,
      error: invoiceError,
    } = await supabase
      .from("invoices")
      .select("*")
      .neq("status", "cancelled")
      .order("created_at", {
        ascending: false,
      });

    if (invoiceError) {
      console.error(
        "Cashier invoice query failed:",
        invoiceError
      );

      return {
        success: false,
        message:
          "Unable to load the cashier queue.",
        data: {
          queue: [],
          pendingCount: 0,
          completedCount: 0,
          revenue: 0,
        },
      };
    }

    const invoiceRows =
      invoices ?? [];

    const relevantInvoices =
      invoiceRows.filter(
        (invoice) => {
          const isPending =
            invoice.status ===
              "draft" ||
            invoice.status ===
              "pending";

          const isPaidToday =
            invoice.status ===
              "paid" &&
            invoice.paid_at &&
            invoice.paid_at >=
              start &&
            invoice.paid_at <=
              end;

          return (
            isPending ||
            isPaidToday
          );
        }
      );

    const patientIds = [
      ...new Set(
        relevantInvoices
          .map(
            (invoice) =>
              invoice.patient_id
          )
          .filter(Boolean)
      ),
    ];

    let patients: Record<
      string,
      {
        patient_code: string;
        full_name: string;
        coverage_plan:
          | string
          | null;
      }
    > = {};

    if (
      patientIds.length > 0
    ) {
      const {
        data: patientRows,
        error: patientError,
      } = await supabase
        .from("patients")
        .select(
          "id, patient_code, full_name, coverage_plan"
        )
        .in(
          "id",
          patientIds
        );

      if (patientError) {
        console.error(
          "Cashier patient query failed:",
          patientError
        );

        return {
          success: false,
          message:
            "Unable to load patients for the cashier queue.",
          data: {
            queue: [],
            pendingCount: 0,
            completedCount: 0,
            revenue: 0,
          },
        };
      }

      patients =
        Object.fromEntries(
          (
            patientRows ??
            []
          ).map(
            (patient) => [
              patient.id,
              {
                patient_code:
                  patient.patient_code,
                full_name:
                  patient.full_name,
                coverage_plan:
                  patient.coverage_plan,
              },
            ]
          )
        );
    }

    const queue: CashierQueueItem[] =
      relevantInvoices
        .filter(
          (invoice) =>
            patients[
              invoice.patient_id
            ]
        )
        .map(
          (invoice) => {
            const patient =
              patients[
                invoice.patient_id
              ];

            return {
              id: invoice.id,

              patientId:
                patient.patient_code,

              fullName:
                patient.full_name,

              coveragePlan:
                patient.coverage_plan ??
                "Self-Pay",

              status:
                invoice.status as
                  | "draft"
                  | "pending"
                  | "paid",

              grandTotal:
                Number(
                  invoice.grand_total ??
                    0
                ),

              createdAt:
                invoice.created_at,

              paidAt:
                invoice.paid_at ??
                null,

              invoiceNo:
                invoice.invoice_no,

              paymentMethod:
                invoice.payment_method ??
                null,
            };
          }
        );

    const pendingCount =
      queue.filter(
        (item) =>
          item.status ===
            "draft" ||
          item.status ===
            "pending"
      ).length;

    const completedCount =
      queue.filter(
        (item) =>
          item.status ===
          "paid"
      ).length;

    const {
      data: paidToday,
      error: revenueError,
    } = await supabase
      .from("invoices")
      .select(
        "grand_total"
      )
      .eq("status", "paid")
      .gte(
        "paid_at",
        start
      )
      .lte(
        "paid_at",
        end
      );

    if (revenueError) {
      console.warn(
        "Cashier revenue query failed:",
        revenueError.message
      );
    }

    const revenue =
      (
        paidToday ??
        []
      ).reduce(
        (
          sum,
          invoice
        ) =>
          sum +
          Number(
            invoice.grand_total ??
              0
          ),
        0
      );

    return {
      success: true,
      message:
        "Cashier dashboard loaded.",
      data: {
        queue,
        pendingCount,
        completedCount,
        revenue,
      },
    };
  } catch (error) {
    console.error(
      "Get cashier dashboard error:",
      error
    );

    return {
      success: false,
      message:
        "An unexpected error occurred while loading the cashier dashboard.",
      data: {
        queue: [],
        pendingCount: 0,
        completedCount: 0,
        revenue: 0,
      },
    };
  }
}

export async function refreshCashierDashboard() {
  revalidatePath(
    "/cashier"
  );

  revalidatePath(
    "/billing"
  );

  revalidatePath(
    "/pharmacy"
  );

  return getCashierDashboard();
}