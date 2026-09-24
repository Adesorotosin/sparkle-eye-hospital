// lib/server-auth.ts

import { cookies } from "next/headers";

import { supabaseServer } from "@/lib/supabase-server";

import {
  generateSessionToken,
  hashSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session-token";

export type UserRole =
  | "IT_ADMIN"
  | "OPHTHALMOLOGIST"
  | "DOCTOR"
  | "PHARMACIST"
  | "NURSE"
  | "CASHIER"
  | "RECEPTIONIST";

export interface AuthenticatedStaff {
  id: string;
  staffId: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  title: string | null;
  department: string | null;
}

export function normalizeRole(value: string): string {
  return value
    .toUpperCase()
    .trim()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

export async function createSession(
  staffId: string,
  rememberWorkstation = false
) {
  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);

  // Normal login: 12 hours.
  // Remember workstation: 30 days.
  const sessionHours = rememberWorkstation
    ? 30 * 24
    : 12;

  const expiresAt = new Date(
    Date.now() + sessionHours * 60 * 60 * 1000
  );

  const { error } = await supabaseServer
    .from("auth_sessions")
    .insert({
      staff_id: staffId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error(
      "Session creation failed:",
      error
    );

    throw new Error(
      "Unable to create secure login session."
    );
  }

  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge:
        sessionHours * 60 * 60,
    }
  );

  return {
    expiresAt,
  };
}

export async function getAuthenticatedStaff(): Promise<
  AuthenticatedStaff | null
> {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (!token) {
    return null;
  }

  const tokenHash =
    await hashSessionToken(token);

  const { data: session, error: sessionError } =
    await supabaseServer
      .from("auth_sessions")
      .select(`
        id,
        staff_id,
        expires_at,
        revoked_at,
        staff:staff_id (
          id,
          staff_id,
          username,
          name,
          email,
          role,
          title,
          department,
          is_active,
          deleted_at
        )
      `)
      .eq("token_hash", tokenHash)
      .maybeSingle();

  if (sessionError) {
    console.error(
      "Session lookup failed:",
      sessionError
    );

    return null;
  }

  if (!session) {
    return null;
  }

  if (session.revoked_at) {
    return null;
  }

  if (
    new Date(session.expires_at).getTime() <=
    Date.now()
  ) {
    return null;
  }

  const staff = Array.isArray(session.staff)
    ? session.staff[0]
    : session.staff;

  if (!staff) {
    return null;
  }

  if (!staff.is_active) {
    return null;
  }

  if (staff.deleted_at) {
    return null;
  }

  return {
    id: staff.id,
    staffId: staff.staff_id,
    username: staff.username,
    name: staff.name,
    email: staff.email,
    role: normalizeRole(
      staff.role
    ) as UserRole,
    title: staff.title,
    department: staff.department,
  };
}

export async function requireAuth(): Promise<AuthenticatedStaff> {
  const staff =
    await getAuthenticatedStaff();

  if (!staff) {
    throw new Error("UNAUTHENTICATED");
  }

  return staff;
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthenticatedStaff> {
  const staff =
    await requireAuth();

  if (!allowedRoles.includes(staff.role)) {
    throw new Error("FORBIDDEN");
  }

  return staff;
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (token) {
    const tokenHash =
      await hashSessionToken(token);

    const { error } =
      await supabaseServer
        .from("auth_sessions")
        .update({
          revoked_at:
            new Date().toISOString(),
        })
        .eq(
          "token_hash",
          tokenHash
        );

    if (error) {
      console.error(
        "Session revocation failed:",
        error
      );
    }
  }

  cookieStore.set(
    SESSION_COOKIE_NAME,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );
}