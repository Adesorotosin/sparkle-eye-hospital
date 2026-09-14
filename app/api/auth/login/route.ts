// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { UserRole } from "@/lib/rbac-config";

// Demo staff directory. Replace with a real DB/user table lookup
// (with hashed passwords) before this ever goes near real patient data.
const STAFF_DIRECTORY: Record<
  string,
  { password: string; role: UserRole; name: string }
> = {
  admin: { password: "password123", role: "IT_ADMIN", name: "Admin User" },
  doc_adams: { password: "password123", role: "DOCTOR", name: "Dr. Adams" },
  pharmacy: { password: "password123", role: "PHARMACIST", name: "Pharmacy Staff" },
  cashier: { password: "password123", role: "CASHIER", name: "Cashier Staff" },
  nurse: { password: "password123", role: "NURSE", name: "Nurse Staff" },
  reception: { password: "password123", role: "RECEPTIONIST", name: "Reception Staff" },
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both username and password." },
        { status: 400 }
      );
    }

    const key = String(email).toLowerCase().trim();
    const record = STAFF_DIRECTORY[key];

    // Previously: role was guessed from a substring match on the username,
    // and the password was never checked at all. Now: both must match a
    // real directory entry.
    if (!record || record.password !== password) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const role = record.role;

    const cookieStore = await cookies();
    const cookieConfig = {
      httpOnly: true, // no longer readable/writable from client JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 12,
    };

    cookieStore.set("is_logged_in", "true", cookieConfig);
    cookieStore.set("user_role", role, cookieConfig);
    cookieStore.set("staff_id", `STF-${role}`, cookieConfig);

    return NextResponse.json({
      success: true,
      user: {
        staffId: `STF-${role}`,
        name: record.name,
        role: role,
        token: `mock-token-${role.toLowerCase()}`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Server error during authentication." },
      { status: 500 }
    );
  }
}
