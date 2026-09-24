// app/api/staff/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";

const ALLOWED_ROLES = [
  "IT_ADMIN",
  "OPHTHALMOLOGIST",
  "DOCTOR",
  "PHARMACIST",
  "NURSE",
  "CASHIER",
  "RECEPTIONIST",
] as const;

type StaffRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(value: unknown): value is StaffRole {
  return (
    typeof value === "string" &&
    ALLOWED_ROLES.includes(
      value as StaffRole
    )
  );
}

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidPermissions(
  value: unknown
): value is Record<string, boolean> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  return Object.values(
    value as Record<string, unknown>
  ).every(
    (permission) =>
      typeof permission === "boolean"
  );
}

function normalizeFacilities(
  value: unknown
): string[] | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const facilities = value
    .filter(
      (facility): facility is string =>
        typeof facility === "string"
    )
    .map((facility) => facility.trim())
    .filter(Boolean);

  return facilities.length > 0
    ? facilities
    : null;
}

function jsonNoStore(
  body: unknown,
  init?: ResponseInit
) {
  const response = NextResponse.json(
    body,
    init
  );

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}

// --- GET: List staff for Admin > Access Control ---
export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);

    const {
      data: staff,
      error,
    } = await supabaseServer
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

    return jsonNoStore({
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
      return jsonNoStore(
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
      return jsonNoStore(
        {
          error:
            "You do not have permission to manage staff.",
        },
        { status: 403 }
      );
    }

    return jsonNoStore(
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonNoStore(
        {
          error:
            "Request body must contain valid JSON.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return jsonNoStore(
        {
          error:
            "Request body must be a JSON object.",
        },
        { status: 400 }
      );
    }

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
    } =
      body as Record<string, unknown>;

    // -----------------------------------------
    // Required fields
    // -----------------------------------------

    if (
      !isNonEmptyString(staffId) ||
      !isNonEmptyString(username) ||
      !isNonEmptyString(password) ||
      !isNonEmptyString(name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(role)
    ) {
      return jsonNoStore(
        {
          error:
            "staffId, username, password, name, email, and role are required.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Normalize core values
    // -----------------------------------------

    const cleanStaffId =
      staffId.trim();

    const cleanUsername =
      username.trim().toLowerCase();

    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanPassword =
      password.trim();

    const cleanRole =
      role.trim();

    // -----------------------------------------
    // Length validation
    // -----------------------------------------

    if (
      cleanStaffId.length > 100
    ) {
      return jsonNoStore(
        {
          error:
            "Staff ID is too long.",
        },
        { status: 400 }
      );
    }

    if (
      cleanUsername.length < 3 ||
      cleanUsername.length > 100
    ) {
      return jsonNoStore(
        {
          error:
            "Username must be between 3 and 100 characters.",
        },
        { status: 400 }
      );
    }

    if (
      cleanName.length > 200
    ) {
      return jsonNoStore(
        {
          error:
            "Name is too long.",
        },
        { status: 400 }
      );
    }

    if (
      cleanEmail.length > 254
    ) {
      return jsonNoStore(
        {
          error:
            "Email address is too long.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Password validation
    // -----------------------------------------

    if (
      cleanPassword.length < 8
    ) {
      return jsonNoStore(
        {
          error:
            "Password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    if (
      cleanPassword.length > 128
    ) {
      return jsonNoStore(
        {
          error:
            "Password must not exceed 128 characters.",
        },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(cleanPassword)) {
      return jsonNoStore(
        {
          error:
            "Password must contain at least one uppercase letter.",
        },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(cleanPassword)) {
      return jsonNoStore(
        {
          error:
            "Password must contain at least one number.",
        },
        { status: 400 }
      );
    }

    if (
      !/[^A-Za-z0-9]/.test(cleanPassword)
    ) {
      return jsonNoStore(
        {
          error:
            "Password must contain at least one special character.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Role validation
    // -----------------------------------------

    if (!isAllowedRole(cleanRole)) {
      return jsonNoStore(
        {
          error:
            "Invalid staff role.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Optional field validation
    // -----------------------------------------

    if (
      title !== undefined &&
      title !== null &&
      typeof title !== "string"
    ) {
      return jsonNoStore(
        {
          error:
            "Title must be a string.",
        },
        { status: 400 }
      );
    }

    if (
      department !== undefined &&
      department !== null &&
      typeof department !== "string"
    ) {
      return jsonNoStore(
        {
          error:
            "Department must be a string.",
        },
        { status: 400 }
      );
    }

    if (
      permissions !== undefined &&
      !isValidPermissions(permissions)
    ) {
      return jsonNoStore(
        {
          error:
            "Permissions must be an object containing boolean values.",
        },
        { status: 400 }
      );
    }

    if (
      assignedFacilities !== undefined &&
      assignedFacilities !== null &&
      !Array.isArray(assignedFacilities)
    ) {
      return jsonNoStore(
        {
          error:
            "assignedFacilities must be an array.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Normalize optional fields
    // -----------------------------------------

    const cleanTitle =
      typeof title === "string"
        ? title.trim() || null
        : null;

    const cleanDepartment =
      typeof department === "string"
        ? department.trim() || null
        : null;

    const cleanFacilities =
      normalizeFacilities(
        assignedFacilities
      );

    const cleanPermissions =
      permissions === undefined
        ? {}
        : permissions;

    // -----------------------------------------
    // Hash password before database insertion
    // -----------------------------------------

    const passwordHash =
      await bcrypt.hash(
        cleanPassword,
        12
      );

    // -----------------------------------------
    // Create staff record
    // -----------------------------------------

    const {
      data: created,
      error,
    } = await supabaseServer
      .from("staff")
      .insert({
        staff_id: cleanStaffId,
        username: cleanUsername,
        password_hash: passwordHash,
        name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        title: cleanTitle,
        department: cleanDepartment,
        assigned_facilities:
          cleanFacilities,
        permissions:
          cleanPermissions,
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
        return jsonNoStore(
          {
            error:
              "A staff member with that staff ID, username, or email already exists.",
          },
          { status: 409 }
        );
      }

      throw error;
    }

    // -----------------------------------------
    // Audit successful onboarding
    // -----------------------------------------

    try {
      await logActivity({
        module: "Admin",
        category: "ADMIN",
        action:
          `Staff onboarded: ${created.name} (${created.role})`,
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

    // IMPORTANT:
    // The password hash is never selected or returned.
    return jsonNoStore(
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
      return jsonNoStore(
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
      return jsonNoStore(
        {
          error:
            "You do not have permission to create staff accounts.",
        },
        { status: 403 }
      );
    }

    return jsonNoStore(
      {
        error:
          "Failed to create staff member.",
      },
      { status: 500 }
    );
  }
}