"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export interface CashierQueueItem {
  id: string;
  patientId: string;
  fullName: string;
  coveragePlan: string;
  status: "draft" | "pending" | "paid";
  grandTotal: number;
  createdAt: string;
  invoiceNo: string;
}

export interface CashierDashboardData {
  queue: CashierQueueItem[];
  pendingCount: number;
  completedCount: number;
  revenue: number;
}

function getLagosDayRange() {
  const now = new Date();

  const lagosDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const start = new Date(`${lagosDate}T00:00:00+01:00`);
  const end = new Date(`${lagosDate}T23:59:59.999+01:00`);

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
    const { start, end } = getLagosDayRange();

    /*
     * Load invoices first.
     *
     * We intentionally don't rely on Supabase relationship
     * expansion here. That makes this work even if the generated
     * relationship metadata is different between environments.
     */
    const { data: invoices, error: invoiceError } =
      await supabase
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
        message: "Unable to load the cashier queue.",
        data: {
          queue: [],
          pendingCount: 0,
          completedCount: 0,
          revenue: 0,
        },
      };
    }

    const invoiceRows = invoices ?? [];

    /*
     * Only show invoices which actually require cashier attention
     * or have recently been paid.
     *
     * Draft + pending = checkout queue.
     * Paid = completed history for today.
     */
    const relevantInvoices = invoiceRows.filter(
      (invoice) =>
        invoice.status === "draft" ||
        invoice.status === "pending" ||
        (
          invoice.status === "paid" &&
          invoice.created_at >= start &&
          invoice.created_at <= end
        )
    );

    const patientIds = [
      ...new Set(
        relevantInvoices
          .map((invoice) => invoice.patient_id)
          .filter(Boolean)
      ),
    ];

    let patients: Record<
      string,
      {
        patient_code: string;
        full_name: string;
        coverage_plan: string | null;
      }
    > = {};

    if (patientIds.length > 0) {
      const {
        data: patientRows,
        error: patientError,
      } = await supabase
        .from("patients")
        .select(
          "id, patient_code, full_name, coverage_plan"
        )
        .in("id", patientIds);

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

      patients = Object.fromEntries(
        (patientRows ?? []).map((patient) => [
          patient.id,
          {
            patient_code:
              patient.patient_code,
            full_name:
              patient.full_name,
            coverage_plan:
              patient.coverage_plan,
          },
        ])
      );
    }

    const queue: CashierQueueItem[] =
      relevantInvoices
        .filter((invoice) => patients[invoice.patient_id])
        .map((invoice) => {
          const patient =
            patients[invoice.patient_id];

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
                invoice.grand_total ?? 0
              ),
            createdAt:
              invoice.created_at,
            invoiceNo:
              invoice.invoice_no,
          };
        });

    const pendingCount = queue.filter(
      (item) =>
        item.status === "draft" ||
        item.status === "pending"
    ).length;

    const completedCount = queue.filter(
      (item) => item.status === "paid"
    ).length;

    /*
     * Revenue is calculated from invoices actually marked paid
     * today, not from hard-coded dashboard values.
     */
    const { data: paidToday, error: revenueError } =
      await supabase
        .from("invoices")
        .select("grand_total")
        .eq("status", "paid")
        .gte("created_at", start)
        .lte("created_at", end);

    if (revenueError) {
      console.warn(
        "Cashier revenue query failed:",
        revenueError.message
      );
    }

    const revenue = (paidToday ?? []).reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.grand_total ?? 0
        ),
      0
    );

    return {
      success: true,
      message: "Cashier dashboard loaded.",
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
  revalidatePath("/cashier");
  revalidatePath("/billing");
  revalidatePath("/cashier/checkout");

  return getCashierDashboard();
}
