// app/api/admin/settings/departments/route.ts

import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

function normalizeDepartmentName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim();

  if (!name || name.length > 100) {
    return null;
  }

  return name;
}

// GET — load departments with actual active staff counts.
export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);

    const [
      { data: departments, error: departmentsError },
      { data: staff, error: staffError },
    ] = await Promise.all([
      supabaseServer
        .from("hospital_departments")
        .select(
          "id, name, status, created_at, updated_at"
        )
        .order("name", {
          ascending: true,
        }),

      supabaseServer
        .from("staff")
        .select("department")
        .eq("is_active", true),
    ]);

    if (departmentsError) {
      throw departmentsError;
    }

    if (staffError) {
      throw staffError;
    }

    const staffCounts = new Map<string, number>();

    for (const member of staff ?? []) {
      if (!member.department) {
        continue;
      }

      const key = member.department
        .trim()
        .toLowerCase();

      staffCounts.set(
        key,
        (staffCounts.get(key) ?? 0) + 1
      );
    }

    return NextResponse.json({
      success: true,
      departments: (departments ?? []).map(
        (department) => ({
          id: department.id,
          name: department.name,
          status: department.status,
          staffCount:
            staffCounts.get(
              department.name
                .trim()
                .toLowerCase()
            ) ?? 0,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Admin departments GET error:",
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
            "You do not have permission to access departments.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to load departments.",
      },
      { status: 500 }
    );
  }
}

// POST — create a department.
export async function POST(request: Request) {
  try {
    const staff = await requireRole(["IT_ADMIN"]);

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          error:
            "Request body must be an object.",
        },
        { status: 400 }
      );
    }

    const name = normalizeDepartmentName(
      (body as { name?: unknown }).name
    );

    if (!name) {
      return NextResponse.json(
        {
          error:
            "A valid department name is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabaseServer
        .from("hospital_departments")
        .insert({
          name,
          status: "Active",
        })
        .select(
          "id, name, status, created_at, updated_at"
        )
        .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "A department with this name already exists.",
          },
          { status: 409 }
        );
      }

      throw error;
    }

    const { error: logError } =
      await supabaseServer
        .from("activity_logs")
        .insert({
          staff_id: staff.id,
          module: "Admin",
          category: "ADMIN",
          action:
            "Created hospital department",
          details:
            `Created department: ${name}`,
          performed_by: staff.name,
        });

    if (logError) {
      console.warn(
        "Failed to record department activity:",
        logError
      );
    }

    return NextResponse.json(
      {
        success: true,
        department: {
          id: data.id,
          name: data.name,
          status: data.status,
          staffCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Admin departments POST error:",
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
            "Only IT administrators can create departments.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to create department.",
      },
      { status: 500 }
    );
  }
}

// DELETE — remove a department only when no active staff are assigned.
export async function DELETE(request: Request) {
  try {
    const staff = await requireRole(["IT_ADMIN"]);

    const url = new URL(request.url);
    const departmentId =
      url.searchParams.get("id")?.trim();

    if (!departmentId) {
      return NextResponse.json(
        {
          error: "Department ID is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: department,
      error: departmentError,
    } = await supabaseServer
      .from("hospital_departments")
      .select("id, name, status")
      .eq("id", departmentId)
      .maybeSingle();

    if (departmentError) {
      throw departmentError;
    }

    if (!department) {
      return NextResponse.json(
        {
          error: "Department not found.",
        },
        { status: 404 }
      );
    }

    const { data: activeStaff, error: staffError } =
      await supabaseServer
        .from("staff")
        .select("id, name, department")
        .eq("is_active", true)
        .ilike("department", department.name);

    if (staffError) {
      throw staffError;
    }

    if ((activeStaff ?? []).length > 0) {
      return NextResponse.json(
        {
          error:
            "This department cannot be deleted because active staff members are assigned to it.",
          staffCount: activeStaff?.length ?? 0,
        },
        { status: 409 }
      );
    }

    const { error: deleteError } =
      await supabaseServer
        .from("hospital_departments")
        .delete()
        .eq("id", departmentId);

    if (deleteError) {
      throw deleteError;
    }

    const { error: logError } =
      await supabaseServer
        .from("activity_logs")
        .insert({
          staff_id: staff.id,
          module: "Admin",
          category: "ADMIN",
          action:
            "Deleted hospital department",
          details:
            `Deleted department: ${department.name}`,
          performed_by: staff.name,
        });

    if (logError) {
      console.warn(
        "Failed to record department deletion:",
        logError
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Department deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Admin departments DELETE error:",
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
            "Only IT administrators can delete departments.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to delete department.",
      },
      { status: 500 }
    );
  }
}