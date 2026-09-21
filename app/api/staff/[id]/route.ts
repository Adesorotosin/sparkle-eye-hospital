import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

// --- PATCH: Suspend/Reactivate Staff, and/or update their permissions ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ Await params as a Promise
    const body = await request.json();
    const { isActive, permissions } = body;

    if (isActive === undefined && permissions === undefined) {
      return NextResponse.json(
        { error: "Provide 'isActive' (boolean) and/or 'permissions' (object) to update." },
        { status: 400 }
      );
    }
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "'isActive' must be a boolean." },
        { status: 400 }
      );
    }
    if (permissions !== undefined && (typeof permissions !== "object" || permissions === null)) {
      return NextResponse.json(
        { error: "'permissions' must be an object." },
        { status: 400 }
      );
    }

    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: `Staff member with id "${id}" not found` },
        { status: 404 }
      );
    }

    const updatedStaff = await db.staff.update({
      where: { id },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(permissions !== undefined ? { permissions } : {}),
      },
    });

    const messageParts: string[] = [];
    if (isActive !== undefined) messageParts.push(isActive ? "reactivated" : "suspended");
    if (permissions !== undefined) messageParts.push("permissions updated");

    await logActivity({
      module: "Admin",
      category: "ADMIN",
      action: `Staff ${messageParts.join(", ")}: ${existing.name}`,
      performedBy: "Admin",
      staffId: id,
    });

    return NextResponse.json(
      {
        message: `Staff member ${messageParts.join(", ")} successfully`,
        staff: updatedStaff,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Failed to update staff record in database" },
      { status: 500 }
    );
  }
}

// --- DELETE: Soft-Delete / Permanent Deactivation ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ Await params as a Promise

    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: `Staff member with id "${id}" not found` },
        { status: 404 }
      );
    }

    // Perform Soft Delete (Deactivate user without removing historical audit logs)
    const updatedStaff = await db.staff.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date().toISOString(),
      },
    });

    await logActivity({
      module: "Admin",
      category: "ADMIN",
      action: `Staff soft-deleted: ${existing.name}`,
      performedBy: "Admin",
      staffId: id,
    });

    return NextResponse.json(
      {
        message: "Staff member soft-deleted successfully",
        staff: updatedStaff,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Soft delete error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate staff member in database" },
      { status: 500 }
    );
  }
}