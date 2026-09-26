// app/api/activity-logs/route.ts

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

// --- GET: Operational activity across every module ---
export async function GET(
  request: Request
) {
  try {
   await requireRole([
  "IT_ADMIN",
  "DOCTOR",
  "OPHTHALMOLOGIST",
]);

    const { searchParams } =
      new URL(request.url);

    const category =
      searchParams.get("category");

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
      .from("activity_logs")
      .select(`
        *,
        staff:staff_id(
          staff_id,
          name,
          role
        ),
        patients:patient_id(
          full_name
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (
      category &&
      category !== "ALL"
    ) {
      query = query.eq(
        "category",
        category
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
        row.performed_by,

      staffId:
        row.staff?.staff_id ||
        "—",

      role:
        row.staff?.role ||
        "System",

      roleColor:
        roleColorFor(
          row.staff?.role ?? null
        ),

      category:
        row.category,

      action:
        row.action,

      details:
        row.details ||
        (
          row.patients?.full_name
            ? `Patient: ${row.patients.full_name}`
            : ""
        ),

      financialAmount:
        row.financial_amount
          ? `₦${Number(
              row.financial_amount
            ).toLocaleString()}`
          : undefined,

      metadata: {
        module:
          row.module,

        ...(row.patients
          ?.full_name
          ? {
              patient:
                row.patients.full_name,
            }
          : {}),
      },
    }));

    if (search) {
      logs = logs.filter(
        (log) =>
          log.action
            .toLowerCase()
            .includes(search) ||
          log.user
            .toLowerCase()
            .includes(search) ||
          log.details
            .toLowerCase()
            .includes(search)
      );
    }

    return NextResponse.json({
      logs,
    });
  } catch (error) {
    console.error(
      "Activity logs error:",
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
            "You do not have permission to view activity logs.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to load activity logs.",
      },
      { status: 500 }
    );
  }
}