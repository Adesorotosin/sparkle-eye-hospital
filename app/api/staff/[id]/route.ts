// app/api/staff/[id]/route.ts

import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/server-auth";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";

// --- PATCH: Suspend/reactivate staff and/or update permissions ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requirePermission("staff.manage");

    const { id } = await params;

    const body = await request.json();

    const {
      isActive,
      permissions,
      name,
      customRoleId,
    } = body;

    if (
      isActive === undefined &&
      permissions === undefined &&
      name === undefined &&
      customRoleId === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Provide 'isActive' (boolean) and/or 'permissions' (object) to update.",
        },
        { status: 400 }
      );
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return NextResponse.json(
        {
          error: "'isActive' must be a boolean.",
        },
        { status: 400 }
      );
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 200)) {
      return NextResponse.json(
        { error: "'name' must be a non-empty string of at most 200 characters." },
        { status: 400 }
      );
    }

    if (
      permissions !== undefined &&
      (
        typeof permissions !== "object" ||
        permissions === null ||
        Array.isArray(permissions) ||
        !Object.entries(permissions as Record<string, unknown>).every(([key, value]) =>
          PERMISSION_KEYS.includes(key as (typeof PERMISSION_KEYS)[number]) && typeof value === "boolean"
        )
      )
    ) {
      return NextResponse.json(
        {
          error: "'permissions' must be an object.",
        },
        { status: 400 }
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabaseServer
      .from("staff")
      .select(`
        id,
        staff_id,
        name,
        role,
        is_active,
        deleted_at,
        permissions
      `)
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: `Staff member with id "${id}" not found`,
        },
        { status: 404 }
      );
    }

    if (existing.id === currentUser.id && (permissions !== undefined || customRoleId !== undefined)) {
      return NextResponse.json(
        { error: "You cannot change your own access permissions or assigned role." },
        { status: 403 }
      );
    }

    // Prevent an IT admin from suspending or reactivating their own account.
    // Permission changes to their own account are still allowed.
    if (
      isActive !== undefined &&
      existing.id === currentUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot suspend or reactivate your own account.",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (isActive !== undefined) {
      updates.is_active = isActive;

      if (isActive) {
        updates.deleted_at = null;
      }
    }

    if (permissions !== undefined) {
      updates.permissions = permissions;
    }

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (customRoleId !== undefined) {
      if (customRoleId !== null && typeof customRoleId !== "string") {
        return NextResponse.json({ error: "customRoleId must be a role ID or null." }, { status: 400 });
      }
      if (customRoleId) {
        const { data: customRole, error: roleError } = await supabaseServer
          .from("custom_roles").select("id,base_role,is_active").eq("id", customRoleId).maybeSingle();
        if (roleError) throw roleError;
        if (!customRole || !customRole.is_active || customRole.base_role !== existing.role || existing.role === "IT_ADMIN") {
          return NextResponse.json({ error: "The selected custom role must be active and based on this staff member's predefined role." }, { status: 400 });
        }
      }
      updates.custom_role_id = customRoleId || null;
    }

    const {
      data: updatedStaff,
      error: updateError,
    } = await supabaseServer
      .from("staff")
      .update(updates)
      .eq("id", id)
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
        custom_role_id,
        is_active,
        deleted_at,
        created_at
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    const messageParts: string[] = [];

    if (isActive !== undefined) {
      messageParts.push(
        isActive
          ? "reactivated"
          : "suspended"
      );
    }

    if (permissions !== undefined) {
      messageParts.push(
        "permissions updated"
      );
    }

    if (name !== undefined) {
      messageParts.push("name updated");
    }
    if (customRoleId !== undefined) {
      messageParts.push("custom role updated");
    }

    try {
      await logActivity({
        module: "Admin",
        category: "ADMIN",
        action: `Staff ${messageParts.join(", ")}: ${existing.name}`,
        performedBy: currentUser.name,
        staffId: currentUser.id,
      });
    } catch (logError) {
      console.warn(
        "Staff update activity log failed:",
        logError
      );
    }

    return NextResponse.json(
      {
        message: `Staff member ${messageParts.join(", ")} successfully`,
        staff: updatedStaff,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Staff status update error:",
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
            "You do not have permission to modify staff accounts.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update staff record.",
      },
      { status: 500 }
    );
  }
}

// --- DELETE: Soft-delete/deactivate staff ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole(["IT_ADMIN"]);

    const { id } = await params;

    const {
      data: existing,
      error: existingError,
    } = await supabaseServer
      .from("staff")
      .select(`
        id,
        staff_id,
        name,
        role,
        is_active,
        deleted_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            `Staff member with id "${id}" not found`,
        },
        { status: 404 }
      );
    }

    // Prevent an IT admin from deleting/deactivating their own account.
    if (existing.id === currentUser.id) {
      return NextResponse.json(
        {
          error:
            "You cannot delete or deactivate your own account.",
        },
        { status: 400 }
      );
    }

    const {
      data: updatedStaff,
      error: updateError,
    } = await supabaseServer
      .from("staff")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id)
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

    if (updateError) {
      throw updateError;
    }

    try {
      await logActivity({
        module: "Admin",
        category: "ADMIN",
        action: `Staff soft-deleted: ${existing.name}`,
        performedBy: currentUser.name,
        staffId: currentUser.id,
      });
    } catch (logError) {
      console.warn(
        "Staff deletion activity log failed:",
        logError
      );
    }

    return NextResponse.json(
      {
        message:
          "Staff member soft-deleted successfully",
        staff: updatedStaff,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Staff deletion error:",
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
            "You do not have permission to deactivate staff accounts.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to deactivate staff member.",
      },
      { status: 500 }
    );
  }
}