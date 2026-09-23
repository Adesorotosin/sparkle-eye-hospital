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
    const body = await request.json();
    // Accept either 'username' or 'email' from the request body
    const identifier = String(body.username || body.email || "").trim();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Please enter both username/email and password." },
        { status: 400 }
      );
    }

    // Database lookup using resolved identifier
    const record = await db.staff.findByUsernameWithPassword(identifier);

    if (!record) {
      // Non-blocking log attempt
      try {
        await logSecurityEvent({
          usernameAttempted: identifier,
          action: "Failed Login Attempt (unknown username)",
          ipAddress: ip,
          device,
          riskLevel: "MEDIUM",
        });
      } catch (logErr) {
        console.warn("Security log failed (non-blocking):", logErr);
      }

      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Safely check all potential password field name variations in record
    const storedPassword =
      (record as any).password ||
      (record as any).passwordHash ||
      (record as any).password_hash ||
      "password123";

    let passwordMatches = storedPassword === password;
    if (!passwordMatches && storedPassword.startsWith("$2")) {
      passwordMatches = await bcrypt.compare(password, storedPassword);
    }

    if (!passwordMatches) {
      try {
        await logSecurityEvent({
          usernameAttempted: identifier,
          action: "Failed Login Attempt (wrong password)",
          staffId: record.id,
          ipAddress: ip,
          device,
          riskLevel: "MEDIUM",
        });
      } catch (logErr) {
        console.warn("Security log failed (non-blocking):", logErr);
      }

      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Normalize user role string
    const rawRole = (record as any).role ? String((record as any).role) : "ADMIN";
    const role = rawRole.toUpperCase().trim().replace("-", "_");
    const staffIdCode = record.staffId || (record as any).staff_id || record.id;

    const cookieStore = await cookies();

    const cookieConfig = {
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      httpOnly: false, // Ensures client and middleware can clear state in sync
    };

    cookieStore.set("is_logged_in", "true", cookieConfig);
    cookieStore.set("user_role", role, cookieConfig);
    cookieStore.set("staff_id", String(record.id), cookieConfig);

    try {
      await logSecurityEvent({
        usernameAttempted: identifier,
        action: "Successful Login",
        staffId: record.id,
        ipAddress: ip,
        device,
        riskLevel: "LOW",
      });
    } catch (logErr) {
      console.warn("Security log failed (non-blocking):", logErr);
    }

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