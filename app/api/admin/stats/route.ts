// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// --- GET: Real headline numbers for the Admin dashboard ---
export async function GET() {
  try {
    const [
      { data: paidInvoices, error: revenueError },
      { data: activeInvoices, error: activeError },
      { count: totalStaff, error: staffError },
      { data: inventoryItems, error: invError },
      { count: todaysAppointments, error: apptError },
    ] = await Promise.all([
      supabase.from("invoices").select("grand_total").eq("status", "paid"),
      supabase.from("invoices").select("patient_id").in("status", ["draft", "pending"]),
      supabase.from("staff").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("inventory_items").select("stock, reorder_level"),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("start_time", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lte("start_time", new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
    ]);

    if (revenueError) throw revenueError;
    if (activeError) throw activeError;
    if (staffError) throw staffError;
    if (invError) throw invError;
    if (apptError) throw apptError;

    const totalRevenue = (paidInvoices ?? []).reduce((sum, i) => sum + Number(i.grand_total), 0);
    const activePatientEncounters = new Set((activeInvoices ?? []).map((i) => i.patient_id)).size;
    const lowStockCount = (inventoryItems ?? []).filter((i) => i.stock <= i.reorder_level).length;

    return NextResponse.json({
      totalRevenue,
      activePatientEncounters,
      totalStaff: totalStaff ?? 0,
      lowStockCount,
      todaysAppointments: todaysAppointments ?? 0,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
