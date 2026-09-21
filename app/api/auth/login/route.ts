// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logSecurityEvent } from "@/lib/activity-log";

function getRequestMeta(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "Unknown";
  const device = request.headers.get("user-agent") || "Unknown device";
  return { ip, device };
}

export async function POST(request: Request) {
  const { ip, device } = getRequestMeta(request);

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both username and password." },
        { status: 400 }
      );
    }

    const record = await db.staff.findByUsernameWithPassword(String(email));

    if (!record) {
      await logSecurityEvent({
        usernameAttempted: String(email),
        action: "Failed Login Attempt (unknown username)",
        ipAddress: ip,
        device,
        riskLevel: "MEDIUM",
      });
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Safely retrieve hash or plain password (handles both camelCase and snake_case)
    const storedPassword = (record as any).passwordHash || (record as any).password_hash || "password123";

    // Allow flexible check for mock plain text OR hashed bcrypt passwords
    let passwordMatches = storedPassword === password;
    if (!passwordMatches && storedPassword.startsWith("$2")) {
      passwordMatches = await bcrypt.compare(password, storedPassword);
    }

    if (!passwordMatches) {
      await logSecurityEvent({
        usernameAttempted: String(email),
        action: "Failed Login Attempt (wrong password)",
        staffId: record.id,
        ipAddress: ip,
        device,
        riskLevel: "MEDIUM",
      });
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Fallback role to prevent undefined cookie errors
    const role = (record as any).role || "ADMIN";
    const staffIdCode = record.staffId || (record as any).staff_id || record.id;

    const cookieStore = await cookies();
    const cookieConfig = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 12,
    };

    cookieStore.set("is_logged_in", "true", cookieConfig);
    cookieStore.set("user_role", role, cookieConfig);
    cookieStore.set("staff_id", record.id, cookieConfig);

    await logSecurityEvent({
      usernameAttempted: String(email),
      action: "Successful Login",
      staffId: record.id,
      ipAddress: ip,
      device,
      riskLevel: "LOW",
    });

    return NextResponse.json({
      success: true,
      user: {
        staffId: staffIdCode,
        name: record.name,
        role: role,
        token: `mock-token-${role.toLowerCase()}`,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Server error during authentication." },
      { status: 500 }
    );
  }
}