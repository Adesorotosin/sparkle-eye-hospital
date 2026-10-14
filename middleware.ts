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
  INVENTORY_MANAGER: "/inventory",
};

function normalizeRole(role: unknown): string {
  return String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function getProtectedRoute(pathname: string): string | undefined {
  return Object.keys(ROUTE_PERMISSIONS).find(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes enforce authentication and authorization themselves.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static assets.
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Login page is public.
  if (pathname === "/") {
    return NextResponse.next();
  }

  const protectedRoute = getProtectedRoute(pathname);
  if (!protectedRoute) {
    return NextResponse.next();
  }

  // Do not treat the mere presence of a cookie as proof of a valid session.
  if (!request.cookies.get("sparkle_session")?.value) {
    return redirectToLogin(request);
  }

  /*
   * Ask the existing server-auth endpoint to validate the session against
   * auth_sessions and return the authenticated staff role. Forward only the
   * incoming cookie; do not trust a role supplied by the browser.
   */
  let role: string;
  try {
    const authResponse = await fetch(
      new URL("/api/auth/me", request.url),
      {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
        cache: "no-store",
      }
    );

    if (authResponse.status === 401) {
      return redirectToLogin(request);
    }

    // Fail closed if session validation is unavailable or malformed.
    if (!authResponse.ok) {
      return new NextResponse("Unable to verify your session.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const authData = await authResponse.json();
    role = normalizeRole(authData?.user?.role);
    if (!role) {
      return new NextResponse("Unable to verify your session.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
  } catch (error) {
    console.error("Page authorization session check failed:", error);
    return new NextResponse("Unable to verify your session.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const allowedRoles = ROUTE_PERMISSIONS[protectedRoute] ?? [];
  if (!allowedRoles.includes(role as UserRole)) {
    const dashboard = ROLE_DASHBOARD_MAP[role as UserRole];

    // Never redirect in a loop if the current dashboard itself is misconfigured.
    if (!dashboard || pathname === dashboard) {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.redirect(new URL(dashboard, request.url));
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
