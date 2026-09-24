// app/api/admin/stats/route.ts

import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

// --- GET: Real headline numbers for the Admin dashboard ---
export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);

    const [
      { data: paidInvoices, error: revenueError },
      { data: activeInvoices, error: activeError },
      { count: totalStaff, error: staffError },
      { data: inventoryItems, error: invError },
      { count: todaysAppointments, error: apptError },
    ] = await Promise.all([
      supabaseServer
        .from("invoices")
        .select("grand_total")
        .eq("status", "paid"),

      supabaseServer
        .from("invoices")
        .select("patient_id")
        .in("status", ["draft", "pending"]),

      supabaseServer
        .from("staff")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("is_active", true),

      supabaseServer
        .from("inventory_items")
        .select("stock, reorder_level"),

      supabaseServer
        .from("appointments")
        .select("*", {
          count: "exact",
          head: true,
        })
        .gte(
          "start_time",
          new Date(
            new Date().setHours(0, 0, 0, 0)
          ).toISOString()
        )
        .lte(
          "start_time",
          new Date(
            new Date().setHours(23, 59, 59, 999)
          ).toISOString()
        ),
    ]);

    if (revenueError) {
      throw revenueError;
    }

    if (activeError) {
      throw activeError;
    }

    if (staffError) {
      throw staffError;
    }

    if (invError) {
      throw invError;
    }

    if (apptError) {
      throw apptError;
    }

    const totalRevenue = (
      paidInvoices ?? []
    ).reduce(
      (sum, invoice) =>
        sum + Number(invoice.grand_total),
      0
    );

    const activePatientEncounters =
      new Set(
        (activeInvoices ?? []).map(
          (invoice) => invoice.patient_id
        )
      ).size;

    const lowStockCount =
      (inventoryItems ?? []).filter(
        (item) =>
          item.stock <= item.reorder_level
      ).length;

    return NextResponse.json({
      totalRevenue,
      activePatientEncounters,
      totalStaff: totalStaff ?? 0,
      lowStockCount,
      todaysAppointments:
        todaysAppointments ?? 0,
    });
  } catch (error) {
    console.error(
      "Admin stats error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to access admin statistics.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to load dashboard stats",
      },
      { status: 500 }
    );
  }
}