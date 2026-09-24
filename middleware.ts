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

async function getAuthenticatedUser(request: NextRequest) {
  const cookie = request.headers.get("cookie");

  if (!cookie) {
    return null;
  }

  const url = new URL("/api/auth/me", request.url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data?.success || !data?.user) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes perform their own authentication/authorization.
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

  // Route permissions are defined centrally in lib/rbac-config.ts.
  const protectedRoute = getProtectedRoute(pathname);

  if (!protectedRoute) {
    return NextResponse.next();
  }

  const user = await getAuthenticatedUser(request);

  if (!user) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  const userRole = normalizeRole(user.role) as UserRole;
  const allowedRoles = ROUTE_PERMISSIONS[protectedRoute];

  if (!allowedRoles.includes(userRole)) {
    const fallbackTarget = ROLE_DASHBOARD_MAP[userRole] || "/";
    return NextResponse.redirect(
      new URL(fallbackTarget, request.url)
    );
  }

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
    "/reception/:path*",
    "/receptionist/:path*",
    "/triage/:path*",
    "/diagnostics/:path*",
    "/appointments/:path*",
    "/inventory/:path*",
  ],
};