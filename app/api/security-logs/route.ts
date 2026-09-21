// app/api/security-logs/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function roleColorFor(role: string | null) {
  switch (role) {
    case "IT_ADMIN":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "DOCTOR":
    case "OPHTHALMOLOGIST":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "NURSE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "PHARMACIST":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "CASHIER":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "RECEPTIONIST":
      return "bg-sky-100 text-sky-700 border-sky-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

// --- GET: Login/security events (Admin Audit — Security tab), plus a
// derived list of alerts (MEDIUM/CRITICAL events from the last 24h) ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get("riskLevel"); // LOW | MEDIUM | CRITICAL
    const search = searchParams.get("search")?.toLowerCase();
    const limit = Number(searchParams.get("limit") ?? 200);

    let query = supabase
      .from("security_logs")
      .select("*, staff:staff_id(staff_id, name, role)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (riskLevel && riskLevel !== "ALL") {
      query = query.eq("risk_level", riskLevel);
    }

    const { data, error } = await query;
    if (error) throw error;

    let logs = (data ?? []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      user: row.staff?.name || row.username_attempted,
      staffId: row.staff?.staff_id || "—",
      role: row.staff?.role || "Unknown",
      roleColor: roleColorFor(row.staff?.role ?? null),
      action: row.action,
      ipAddress: row.ip_address || "Unknown",
      device: row.device || "Unknown",
      riskLevel: row.risk_level,
    }));

    if (search) {
      logs = logs.filter(
        (l) => l.action.toLowerCase().includes(search) || l.user.toLowerCase().includes(search)
      );
    }

    // Derived alerts: any MEDIUM/CRITICAL security event in the last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: alertRows, error: alertError } = await supabase
      .from("security_logs")
      .select("*")
      .in("risk_level", ["MEDIUM", "CRITICAL"])
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: false })
      .limit(20);
    if (alertError) throw alertError;

    const alerts = (alertRows ?? []).map((row: any) => ({
      id: row.id,
      title: `${row.action} — ${row.username_attempted}`,
      timestamp: row.created_at,
      actionText: "Review",
      type: row.risk_level === "CRITICAL" ? "critical" : "warning",
    }));

    return NextResponse.json({ logs, alerts });
  } catch (error) {
    console.error("Security logs error:", error);
    return NextResponse.json({ error: "Failed to load security logs" }, { status: 500 });
  }
}
