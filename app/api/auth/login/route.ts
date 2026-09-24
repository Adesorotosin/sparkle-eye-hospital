import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { ROLE_REDIRECT_MAP } from "@/lib/auth";
import {
  createSession,
  normalizeRole,
} from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { logSecurityEvent } from "@/lib/activity-log";

function getRequestMeta(request: Request) {
  const ip =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      .trim() ||
    request.headers.get("x-real-ip") ||
    "Unknown";

  const device =
    request.headers.get("user-agent") || "Unknown device";

  return { ip, device };
}

export async function POST(request: Request) {
  const { ip, device } = getRequestMeta(request);

  try {
    const body = await request.json();

    const identifier = String(
      body.username || body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    const rememberWorkstation =
      Boolean(body.rememberWorkstation);

    if (!identifier || !password) {
      return NextResponse.json(
        {
          error:
            "Please enter your username/staff ID and password.",
        },
        { status: 400 }
      );
    }

    /*
     * Look up the staff member in Supabase.
     *
     * The user can log in using either:
     * - username
     * - staff ID
     */
    const { data: staff, error: staffError } =
      await supabaseServer
        .from("staff")
        .select(`
          id,
          staff_id,
          username,
          password_hash,
          name,
          email,
          role,
          title,
          department,
          is_active,
          deleted_at
        `)
        .or(
          `username.eq.${identifier},staff_id.eq.${identifier}`
        )
        .maybeSingle();

    if (staffError) {
      console.error(
        "Staff lookup error:",
        staffError
      );

      return NextResponse.json(
        {
          error:
            "Authentication service unavailable.",
        },
        { status: 500 }
      );
    }

    /*
     * Do not reveal whether the username/staff ID exists.
     */
    if (
      !staff ||
      !staff.is_active ||
      staff.deleted_at
    ) {
      try {
        await logSecurityEvent({
          usernameAttempted: identifier,
          action: "Failed Login Attempt",
          ipAddress: ip,
          device,
          riskLevel: "MEDIUM",
        });
      } catch (logError) {
        console.warn(
          "Security log failed:",
          logError
        );
      }

      return NextResponse.json(
        {
          error:
            "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    /*
     * Passwords must ALWAYS be checked with bcrypt.
     *
     * There is intentionally:
     * - no plaintext password comparison
     * - no password123 fallback
     * - no mock password
     */
    const passwordMatches =
      await bcrypt.compare(
        password,
        staff.password_hash
      );

    if (!passwordMatches) {
      try {
        await logSecurityEvent({
          usernameAttempted: identifier,
          action: "Failed Login Attempt",
          staffId: staff.id,
          ipAddress: ip,
          device,
          riskLevel: "MEDIUM",
        });
      } catch (logError) {
        console.warn(
          "Security log failed:",
          logError
        );
      }

      return NextResponse.json(
        {
          error:
            "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    /*
     * Normalize the database role.
     */
    const role = normalizeRole(staff.role);

    /*
     * Determine which dashboard this role can access.
     */
    const redirectRoute =
      ROLE_REDIRECT_MAP[role] || null;

    if (!redirectRoute) {
      console.error(
        `No dashboard configured for role: ${role}`
      );

      return NextResponse.json(
        {
          error:
            "Your account role is not configured for application access.",
        },
        { status: 403 }
      );
    }

    /*
     * Create a real server-side session.
     *
     * The raw session token is placed only in an
     * HttpOnly cookie. The database stores only
     * its SHA-256 hash.
     */
    await createSession(
      staff.id,
      rememberWorkstation
    );

    /*
     * Record successful authentication.
     *
     * Logging failure should not prevent a valid
     * user from completing login.
     */
    try {
      await logSecurityEvent({
        usernameAttempted: identifier,
        action: "Successful Login",
        staffId: staff.id,
        ipAddress: ip,
        device,
        riskLevel: "LOW",
      });
    } catch (logError) {
      console.warn(
        "Security log failed:",
        logError
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        staffId: staff.staff_id,
        username: staff.username,
        name: staff.name,
        email: staff.email,
        role,
        title: staff.title,
        department: staff.department,
        redirectRoute,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Server error during authentication.",
      },
      { status: 500 }
    );
  }
}