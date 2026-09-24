// app/api/security-logs/route.ts

import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

function roleColorFor(
  role: string | null
) {
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

// --- GET: Login/security events ---
export async function GET(
  request: Request
) {
  try {
    await requireRole(["IT_ADMIN"]);

    const { searchParams } =
      new URL(request.url);

    const riskLevel =
      searchParams.get(
        "riskLevel"
      );

    const search =
      searchParams
        .get("search")
        ?.toLowerCase();

    const requestedLimit = Number(
      searchParams.get("limit") ?? 200
    );

    const limit =
      Number.isFinite(requestedLimit)
        ? Math.min(
            Math.max(requestedLimit, 1),
            500
          )
        : 200;

    let query = supabaseServer
      .from("security_logs")
      .select(`
        *,
        staff:staff_id(
          staff_id,
          name,
          role
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (
      riskLevel &&
      riskLevel !== "ALL"
    ) {
      query = query.eq(
        "risk_level",
        riskLevel
      );
    }

    const { data, error } =
      await query;

    if (error) {
      throw error;
    }

    let logs = (
      data ?? []
    ).map((row: any) => ({
      id: row.id,

      timestamp:
        row.created_at,

      user:
        row.staff?.name ||
        row.username_attempted,

      staffId:
        row.staff?.staff_id ||
        "—",

      role:
        row.staff?.role ||
        "Unknown",

      roleColor:
        roleColorFor(
          row.staff?.role ?? null
        ),

      action:
        row.action,

      ipAddress:
        row.ip_address ||
        "Unknown",

      device:
        row.device ||
        "Unknown",

      riskLevel:
        row.risk_level,
    }));

    if (search) {
      logs = logs.filter(
        (log) =>
          log.action
            .toLowerCase()
            .includes(search) ||
          log.user
            .toLowerCase()
            .includes(search)
      );
    }

    // Security alerts from the last 24 hours.
    const oneDayAgo =
      new Date(
        Date.now() -
          24 * 60 * 60 * 1000
      ).toISOString();

    const {
      data: alertRows,
      error: alertError,
    } = await supabaseServer
      .from("security_logs")
      .select("*")
      .in("risk_level", [
        "MEDIUM",
        "CRITICAL",
      ])
      .gte(
        "created_at",
        oneDayAgo
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (alertError) {
      throw alertError;
    }

    const alerts = (
      alertRows ?? []
    ).map((row: any) => ({
      id: row.id,

      title: `${row.action} — ${row.username_attempted}`,

      timestamp:
        row.created_at,

      actionText:
        "Review",

      type:
        row.risk_level ===
        "CRITICAL"
          ? "critical"
          : "warning",
    }));

    return NextResponse.json({
      logs,
      alerts,
    });
  } catch (error) {
    console.error(
      "Security logs error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
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
            "You do not have permission to view security logs.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to load security logs.",
      },
      { status: 500 }
    );
  }
}