import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ROUTE_PERMISSIONS,
  type UserRole,
} from "@/lib/rbac-config";

const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  IT_ADMIN: "/admin",

  OPHTHALMOLOGIST: "/doctor",
  DOCTOR: "/doctor",

  NURSE: "/nurse",
  PHARMACIST: "/pharmacy",
  CASHIER: "/cashier",
  RECEPTIONIST: "/receptionist",

  LAB_SCIENTIST: "/laboratory",
  OPTICIAN: "/optician",
  OPTOMETRIST: "/optometry",
};

function normalizeRole(role: unknown): string {
  return String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function getProtectedRoute(pathname: string) {
  return Object.keys(ROUTE_PERMISSIONS).find(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
}

/**
 * Middleware only checks whether a session cookie exists.
 *
 * Full session validation is still performed by:
 * - requireAuth()
 * - requireRole()
 * - protected server actions
 * - protected API routes
 *
 * This avoids making an internal /api/auth/me request
 * during every page navigation.
 */
function hasSessionCookie(
  request: NextRequest
): boolean {
  const cookieNames = [
    "sparkle_session",
    "session",
    "sparkle_session_token",
  ];

  return cookieNames.some(
    (name) =>
      Boolean(
        request.cookies.get(name)?.value
      )
  );
}

export async function middleware(
  request: NextRequest
) {
  const { pathname } = request.nextUrl;

  // API routes perform their own authentication
  // and authorization.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static assets.
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Login page is public.
  if (pathname === "/") {
    return NextResponse.next();
  }

  const protectedRoute =
    getProtectedRoute(pathname);

  // Public/unprotected route.
  if (!protectedRoute) {
    return NextResponse.next();
  }

  /*
   * Middleware only verifies that a session cookie
   * exists.
   *
   * The actual session token is validated against
   * auth_sessions by getAuthenticatedStaff().
   */
  if (!hasSessionCookie(request)) {
    const loginUrl = new URL(
      "/",
      request.url
    );

    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  /*
   * IMPORTANT:
   *
   * We deliberately do not perform role authorization
   * here.
   *
   * Server-side pages/actions use requireRole()
   * as the authoritative authorization layer.
   *
   * This prevents middleware from incorrectly sending
   * a valid Optometrist session back to the login page
   * because an internal authentication request failed.
   */
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/audit/:path*",

    "/doctor/:path*",
    "/emr/:path*",
    "/consultation/:path*",

    "/pharmacy/:path*",
    "/cashier/:path*",
    "/billing/:path*",

    "/nurse/:path*",
    "/receptionist/:path*",
    "/reception/:path*",
    "/triage/:path*",

    "/diagnostics/:path*",
    "/laboratory/:path*",

    "/optician/:path*",
    "/optometry/:path*",

    "/appointments/:path*",
    "/inventory/:path*",
  ],
};