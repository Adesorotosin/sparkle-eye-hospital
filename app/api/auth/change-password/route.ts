// app/api/auth/change-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { supabaseServer } from "@/lib/supabase-server";
import {
  requireAuth,
  revokeCurrentSession,
} from "@/lib/server-auth";

function getRequestMeta(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  const userAgent =
    request.headers.get("user-agent") || null;

  return {
    ipAddress,
    userAgent,
  };
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireAuth();

    const body = await request.json();

    const currentPassword =
      typeof body?.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body?.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmPassword =
      typeof body?.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "All password fields are required.",
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "New passwords do not match.",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New password must not exceed 128 characters.",
        },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New password must contain at least one uppercase letter.",
        },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New password must contain at least one number.",
        },
        { status: 400 }
      );
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New password must contain at least one special character.",
        },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New password must be different from your current password.",
        },
        { status: 400 }
      );
    }

    const { data: staffRecord, error: staffError } =
      await supabaseServer
        .from("staff")
        .select(
          "id, username, password_hash, is_active, deleted_at"
        )
        .eq("id", staff.id)
        .maybeSingle();

    if (staffError) {
      console.error(
        "Password change staff lookup failed:",
        staffError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify your account.",
        },
        { status: 500 }
      );
    }

    if (!staffRecord) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authenticated staff account was not found.",
        },
        { status: 401 }
      );
    }

    if (
      !staffRecord.is_active ||
      staffRecord.deleted_at
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This staff account is inactive.",
        },
        { status: 403 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      staffRecord.password_hash
    );

    if (!passwordMatches) {
      const { ipAddress, userAgent } =
        getRequestMeta(request);

      await supabaseServer
        .from("security_logs")
        .insert({
          staff_id: staff.id,
          username_attempted: staffRecord.username,
          action: "Password Change Failed",
          ip_address: ipAddress,
          device: userAgent,
          risk_level: "MEDIUM",
        });

      return NextResponse.json(
        {
          success: false,
          error: "Current password is incorrect.",
        },
        { status: 401 }
      );
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      12
    );

    const { error: updateError } =
      await supabaseServer
        .from("staff")
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", staff.id);

    if (updateError) {
      console.error(
        "Password update failed:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to update your password.",
        },
        { status: 500 }
      );
    }

    const { ipAddress, userAgent } =
      getRequestMeta(request);

    const { error: securityLogError } =
      await supabaseServer
        .from("security_logs")
        .insert({
          staff_id: staff.id,
          username_attempted: staffRecord.username,
          action: "Password Changed",
          ip_address: ipAddress,
          device: userAgent,
          risk_level: "LOW",
        });

    if (securityLogError) {
      console.error(
        "Password change security log failed:",
        securityLogError
      );
    }

    // Revoke all active sessions for this staff member.
    // The user must sign in again using the new password.
    const { error: sessionRevokeError } =
      await supabaseServer
        .from("auth_sessions")
        .update({
          revoked_at:
            new Date().toISOString(),
        })
        .eq("staff_id", staff.id)
        .is("revoked_at", null);

    if (sessionRevokeError) {
      console.error(
        "Password change session revocation failed:",
        sessionRevokeError
      );
    }

    await revokeCurrentSession();

    return NextResponse.json({
      success: true,
      message:
        "Password changed successfully. Please sign in again.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    console.error(
      "Password change error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to change password.",
      },
      { status: 500 }
    );
  }
}