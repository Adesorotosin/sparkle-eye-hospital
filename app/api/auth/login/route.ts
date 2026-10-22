import { createHmac } from "node:crypto";
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
  // Proxies append the connecting client address to X-Forwarded-For. Use the
  // final value rather than the first, which a client may be able to spoof.
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",").at(-1)?.trim() ||
    request.headers.get("x-real-ip") ||
    "Unknown";

  const device =
    request.headers.get("user-agent") || "Unknown device";

  return { ip, device };
}

function getRateLimitKeys(identifier: string, ip: string) {
  // Pepper keys with the server-only Supabase secret so database leaks do not expose guessable identifiers or IPs.
  const pepper = process.env.SUPABASE_SECRET_KEY;
  if (!pepper) throw new Error("Login rate-limit secret is unavailable.");

  const hash = (value: string) =>
    createHmac("sha256", pepper).update(value).digest("hex");

  return {
    identityIp: hash(`identity-ip:${identifier}:${ip}`),
    ip: hash(`ip:${ip}`),
  };
}

async function recordFailedLogin(keys: ReturnType<typeof getRateLimitKeys>) {
  const { error } = await supabaseServer.rpc("record_login_failure", {
    p_identity_ip_hash: keys.identityIp,
    p_ip_hash: keys.ip,
  });
  if (error) {
    console.error("Login rate-limit recording failed:", error);
    return false;
  }
  return true;
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

    const rateLimitKeys = getRateLimitKeys(identifier, ip);
    const { data: isRateLimited, error: rateLimitError } =
      await supabaseServer.rpc("is_login_rate_limited", {
        p_identity_ip_hash: rateLimitKeys.identityIp,
        p_ip_hash: rateLimitKeys.ip,
      });

    if (rateLimitError) {
      console.error("Login rate-limit check failed:", rateLimitError);
      return NextResponse.json(
        { error: "Authentication service unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    if (isRateLimited === true) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please wait 15 minutes and try again." },
        {
          status: 429,
          headers: { "Retry-After": "900" },
        }
      );
    }

    /*
     * Resolve username or staff ID using exact equality filters.
     * Do not interpolate user input into a PostgREST .or() expression.
     */
    const staffColumns = `
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
    `;

    const usernameLookup = await supabaseServer
      .from("staff")
      .select(staffColumns)
      .eq("username", identifier)
      .maybeSingle();

    let staff = usernameLookup.data;
    let staffError = usernameLookup.error;

    if (!staff && !staffError) {
      const staffIdLookup = await supabaseServer
        .from("staff")
        .select(staffColumns)
        .eq("staff_id", identifier)
        .maybeSingle();

      staff = staffIdLookup.data;
      staffError = staffIdLookup.error;
    }

    if (staffError) {
      console.error("Staff lookup error:", staffError);
      return NextResponse.json(
        { error: "Authentication service unavailable." },
        { status: 500 }
      );
    }

    /*
     * Do not reveal whether the username/staff ID exists.
     */
    if (!staff || !staff.is_active || staff.deleted_at) {
      if (!(await recordFailedLogin(rateLimitKeys))) {
        return NextResponse.json(
          { error: "Authentication service unavailable. Please try again shortly." },
          { status: 503 }
        );
      }

      try {
        await logSecurityEvent({
          usernameAttempted: identifier,
          action: "Failed Login Attempt",
          ipAddress: ip,
          device,
          riskLevel: "MEDIUM",
        });
      } catch (logError) {
        console.warn("Security log failed:", logError);
      }

      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    /*
     * Passwords must ALWAYS be checked with bcrypt.
     * There is no plaintext comparison or mock-password fallback.
     */
    const passwordMatches = await bcrypt.compare(
      password,
      staff.password_hash
    );

    if (!passwordMatches) {
      if (!(await recordFailedLogin(rateLimitKeys))) {
        return NextResponse.json(
          { error: "Authentication service unavailable. Please try again shortly." },
          { status: 503 }
        );
      }

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
        console.warn("Security log failed:", logError);
      }

      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // A successful password check clears the account/IP pair. The IP-wide
    // counter is retained so a successful login to one account cannot reset
    // password-spraying protection for other staff accounts.
    const { error: clearRateLimitError } = await supabaseServer.rpc(
      "clear_login_rate_limit",
      {
        p_identity_ip_hash: rateLimitKeys.identityIp,
        p_ip_hash: rateLimitKeys.ip,
      }
    );
    if (clearRateLimitError) {
      console.error("Login rate-limit reset failed:", clearRateLimitError);
      return NextResponse.json(
        { error: "Authentication service unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    const role = normalizeRole(staff.role);
    const redirectRoute = ROLE_REDIRECT_MAP[role] || null;

    if (!redirectRoute) {
      console.error(`No dashboard configured for role: ${role}`);
      return NextResponse.json(
        { error: "Your account role is not configured for application access." },
        { status: 403 }
      );
    }

    await createSession(staff.id, rememberWorkstation);

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
      console.warn("Security log failed:", logError);
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Server error during authentication." },
      { status: 500 }
    );
  }
}
