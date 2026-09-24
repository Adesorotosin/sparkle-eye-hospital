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

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireAuth();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const requestBody = body as Record<string, unknown>;

    const currentPassword =
      typeof requestBody.currentPassword === "string"
        ? requestBody.currentPassword
        : "";

    const newPassword =
      typeof requestBody.newPassword === "string"
        ? requestBody.newPassword
        : "";

    const confirmPassword =
      typeof requestBody.confirmPassword === "string"
        ? requestBody.confirmPassword
        : "";

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return jsonResponse(
        {
          success: false,
          error: "All password fields are required.",
        },
        400
      );
    }

  if (currentPassword.length > 128) {
  return jsonResponse(
    {
      success: false,
      error:
        "Current password must not exceed 128 characters.",
    },
    400
  );
}

    if (newPassword.length > 128) {
      return jsonResponse(
        {
          success: false,
          error:
            "New password must not exceed 128 characters.",
        },
        400
      );
    }

    if (newPassword !== confirmPassword) {
      return jsonResponse(
        {
          success: false,
          error: "New passwords do not match.",
        },
        400
      );
    }

    if (newPassword.length < 8) {
      return jsonResponse(
        {
          success: false,
          error:
            "New password must be at least 8 characters long.",
        },
        400
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return jsonResponse(
        {
          success: false,
          error:
            "New password must contain at least one uppercase letter.",
        },
        400
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return jsonResponse(
        {
          success: false,
          error:
            "New password must contain at least one number.",
        },
        400
      );
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return jsonResponse(
        {
          success: false,
          error:
            "New password must contain at least one special character.",
        },
        400
      );
    }

    if (currentPassword === newPassword) {
      return jsonResponse(
        {
          success: false,
          error:
            "New password must be different from your current password.",
        },
        400
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

      return jsonResponse(
        {
          success: false,
          error: "Unable to verify your account.",
        },
        500
      );
    }

    if (!staffRecord) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authenticated staff account was not found.",
        },
        401
      );
    }

    if (
      !staffRecord.is_active ||
      staffRecord.deleted_at
    ) {
      return jsonResponse(
        {
          success: false,
          error: "This staff account is inactive.",
        },
        403
      );
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      staffRecord.password_hash
    );

    if (!passwordMatches) {
      const { ipAddress, userAgent } =
        getRequestMeta(request);

      const { error: securityLogError } =
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

      if (securityLogError) {
        console.error(
          "Password change failure security log failed:",
          securityLogError
        );
      }

      return jsonResponse(
        {
          success: false,
          error: "Current password is incorrect.",
        },
        401
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

      return jsonResponse(
        {
          success: false,
          error: "Unable to update your password.",
        },
        500
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

    /*
     * Revoke every active session belonging to this staff member.
     *
     * If this bulk operation fails, we still revoke the current
     * session below. This guarantees that the session used to
     * perform the password change cannot remain active.
     */
    const { error: sessionRevokeError } =
      await supabaseServer
        .from("auth_sessions")
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq("staff_id", staff.id)
        .is("revoked_at", null);

    if (sessionRevokeError) {
      console.error(
        "Password change session revocation failed:",
        sessionRevokeError
      );

      /*
       * The password has already been changed, so we cannot
       * safely report that the entire operation failed.
       *
       * We still revoke the current session below and tell the
       * user to sign in again.
       */
    }

    await revokeCurrentSession();

    return jsonResponse({
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
      return jsonResponse(
        {
          success: false,
          error: "Authentication required.",
        },
        401
      );
    }

    console.error(
      "Password change error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Unable to change password.",
      },
      500
    );
  }
}