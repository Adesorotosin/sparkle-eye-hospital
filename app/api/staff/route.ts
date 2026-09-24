// app/api/staff/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";

// --- GET: List active staff for Admin > Access Control ---
export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);

    const { data: staff, error } =
      await supabaseServer
        .from("staff")
        .select(`
          id,
          staff_id,
          username,
          name,
          email,
          role,
          title,
          department,
          assigned_facilities,
          permissions,
          is_active,
          deleted_at,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      staff: staff ?? [],
    });
  } catch (error) {
    console.error(
      "Staff list error:",
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
            "You do not have permission to manage staff.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to load staff directory.",
      },
      { status: 500 }
    );
  }
}

// --- POST: Onboard a new staff member ---
export async function POST(
  request: Request
) {
  try {
    const currentUser =
      await requireRole(["IT_ADMIN"]);

    const body = await request.json();

    const {
      staffId,
      username,
      password,
      name,
      email,
      role,
      title,
      department,
      assignedFacilities,
      permissions,
    } = body;

    if (
      !staffId ||
      !username ||
      !password ||
      !name ||
      !email ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            "staffId, username, password, name, email, and role are required.",
        },
        { status: 400 }
      );
    }

    const allowedRoles = [
      "IT_ADMIN",
      "OPHTHALMOLOGIST",
      "DOCTOR",
      "PHARMACIST",
      "NURSE",
      "CASHIER",
      "RECEPTIONIST",
    ];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error:
            "Invalid staff role.",
        },
        { status: 400 }
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const { data: created, error } =
      await supabaseServer
        .from("staff")
        .insert({
          staff_id: staffId.trim(),
          username: username.trim().toLowerCase(),
          password_hash: passwordHash,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          title:
            title?.trim() || null,
          department:
            department?.trim() || null,
          assigned_facilities:
            assignedFacilities || null,
          permissions:
            permissions || {},
          is_active: true,
        })
        .select(`
          id,
          staff_id,
          username,
          name,
          email,
          role,
          title,
          department,
          assigned_facilities,
          permissions,
          is_active,
          deleted_at,
          created_at
        `)
        .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "A staff member with that staff ID, username, or email already exists.",
          },
          { status: 409 }
        );
      }

      throw error;
    }

    try {
      await logActivity({
        module: "Admin",
        category: "ADMIN",
        action: `Staff onboarded: ${created.name} (${created.role})`,
        performedBy:
          currentUser.name,
        staffId:
          currentUser.id,
      });
    } catch (logError) {
      console.warn(
        "Staff onboarding activity log failed:",
        logError
      );
    }

    return NextResponse.json(
      {
        staff: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Staff creation error:",
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
            "You do not have permission to create staff accounts.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to create staff member.",
      },
      { status: 500 }
    );
  }
}