import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";

function generateTemporaryPassword() {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%";

  const allChars =
    uppercase + lowercase + numbers + special;

  const getRandomIndex = (max: number) => {
    if (
      typeof crypto !== "undefined" &&
      "getRandomValues" in crypto
    ) {
      const values = new Uint32Array(1);
      crypto.getRandomValues(values);
      return values[0] % max;
    }

    return Math.floor(Math.random() * max);
  };

  const pick = (chars: string) =>
    chars[getRandomIndex(chars.length)];

  const passwordCharacters = [
    pick(uppercase),
    pick(lowercase),
    pick(numbers),
    pick(special),
  ];

  while (passwordCharacters.length < 16) {
    passwordCharacters.push(pick(allChars));
  }

  // Fisher-Yates shuffle
  for (
    let i = passwordCharacters.length - 1;
    i > 0;
    i -= 1
  ) {
    const j = getRandomIndex(i + 1);

    [passwordCharacters[i], passwordCharacters[j]] = [
      passwordCharacters[j],
      passwordCharacters[i],
    ];
  }

  return passwordCharacters.join("");
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const currentUser = await requireRole([
      "IT_ADMIN",
    ]);

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Staff ID is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: staff,
      error: staffError,
    } = await supabaseServer
      .from("staff")
      .select(`
        id,
        staff_id,
        username,
        name,
        email,
        role,
        is_active,
        deleted_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (staffError) {
      throw staffError;
    }

    if (!staff) {
      return NextResponse.json(
        {
          error: "Staff member not found.",
        },
        { status: 404 }
      );
    }

    if (!staff.is_active || staff.deleted_at) {
      return NextResponse.json(
        {
          error:
            "Cannot reset the password for an inactive staff account. Reactivate the account first.",
        },
        { status: 400 }
      );
    }

    /*
     * Generate a new temporary password.
     *
     * The plaintext password exists only in memory
     * and is returned once to the IT administrator.
     */
    const temporaryPassword =
      generateTemporaryPassword();

    const passwordHash =
      await bcrypt.hash(
        temporaryPassword,
        12
      );

    const {
      error: updateError,
    } = await supabaseServer
      .from("staff")
      .update({
        password_hash: passwordHash,
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    /*
     * Revoke all existing sessions for this staff member.
     *
     * This prevents an old authenticated session from
     * remaining active after a password reset.
     */
    const {
      error: sessionError,
    } = await supabaseServer
      .from("auth_sessions")
      .update({
        revoked_at: new Date().toISOString(),
      })
      .eq("staff_id", id)
      .is("revoked_at", null);

    if (sessionError) {
      /*
       * Do not pretend the reset completely succeeded
       * if existing sessions could not be revoked.
       */
      console.error(
        "Failed to revoke staff sessions:",
        sessionError
      );

      return NextResponse.json(
        {
          error:
            "Password was changed, but existing sessions could not be revoked. Please review the account sessions.",
        },
        { status: 500 }
      );
    }

    try {
      await logActivity({
        module: "Admin",
        category: "ADMIN",
        action: `Staff password reset: ${staff.name}`,
        details: `Password reset for ${staff.username} (${staff.staff_id}). Existing sessions revoked.`,
        performedBy: currentUser.name,
        staffId: currentUser.id,
      });
    } catch (logError) {
      console.warn(
        "Password reset activity log failed:",
        logError
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Staff password reset successfully.",
        staff: {
          id: staff.id,
          staffId: staff.staff_id,
          username: staff.username,
          name: staff.name,
          email: staff.email,
        },
        temporaryPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Staff password reset error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to reset staff passwords.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to reset staff password.",
      },
      { status: 500 }
    );
  }
}