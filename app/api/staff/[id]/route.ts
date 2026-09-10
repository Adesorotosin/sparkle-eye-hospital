import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Replace with your actual DB instance (Prisma, Drizzle, etc.)

// --- PATCH: Temporarily Suspend or Reactivate Staff ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ Await params as a Promise
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload: 'isActive' boolean is required." },
        { status: 400 }
      );
    }

    // Update active status without setting deletedAt
    const updatedStaff = await (db as any).staff.update({
      where: { id },
      data: {
        isActive,
      },
    });

    return NextResponse.json(
      {
        message: `Staff member ${isActive ? "reactivated" : "suspended"} successfully`,
        staff: updatedStaff,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Failed to update staff status in database" },
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

    // Perform Soft Delete (Deactivate user without removing historical audit logs)
    const updatedStaff = await (db as any).staff.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
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