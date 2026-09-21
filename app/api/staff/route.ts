// app/api/staff/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

// --- GET: List all active staff (for Admin > Access Control) ---
export async function GET() {
  try {
    const staff = await db.staff.list();
    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Staff list error:", error);
    return NextResponse.json(
      { error: "Failed to load staff directory" },
      { status: 500 }
    );
  }
}

// --- POST: Onboard a new staff member ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { staffId, username, password, name, email, role, title, department, assignedFacilities, permissions } = body;

    if (!staffId || !username || !password || !name || !email || !role) {
      return NextResponse.json(
        { error: "staffId, username, password, name, email, and role are required." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await db.staff.create({
      staffId,
      username,
      passwordHash,
      name,
      email,
      role,
      title,
      department,
      assignedFacilities,
      permissions,
    });

    await logActivity({
      module: "Admin",
      category: "ADMIN",
      action: `Staff onboarded: ${created.name} (${role})`,
      performedBy: "Admin",
      staffId: created.id,
    });

    return NextResponse.json({ staff: created }, { status: 201 });
  } catch (error: any) {
    console.error("Staff creation error:", error);
    if (error?.code === "23505") {
      // Postgres unique violation (duplicate staff_id, username, or email)
      return NextResponse.json(
        { error: "A staff member with that staff ID, username, or email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}
