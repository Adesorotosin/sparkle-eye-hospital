import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["IT_ADMIN"],
  "/audit": ["IT_ADMIN"],

  "/emr": [
    "IT_ADMIN",
    "OPHTHALMOLOGIST",
    "DOCTOR",
    "NURSE",
  ],

  "/doctor": [
    "IT_ADMIN",
    "OPHTHALMOLOGIST",
    "DOCTOR",
    "NURSE",
  ],

  "/consultation": [
    "IT_ADMIN",
    "OPHTHALMOLOGIST",
    "DOCTOR",
    "NURSE",
  ],

  "/pharmacy": [
    "IT_ADMIN",
    "PHARMACIST",
    "NURSE",
    "DOCTOR",
  ],

  "/cashier": [
    "IT_ADMIN",
    "CASHIER",
  ],

  "/billing": [
    "IT_ADMIN",
    "CASHIER",
    "NURSE",
    "DOCTOR",
  ],

  "/nurse": [
    "IT_ADMIN",
    "NURSE",
    "DOCTOR",
  ],

  "/receptionist": [
    "IT_ADMIN",
    "RECEPTIONIST",
  ],

  "/laboratory": [
    "IT_ADMIN",
    "DOCTOR",
    "OPHTHALMOLOGIST",
    "NURSE",
  ],
};

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  IT_ADMIN: "/admin",
  OPHTHALMOLOGIST: "/doctor",
  DOCTOR: "/doctor",
  NURSE: "/nurse",
  PHARMACIST: "/pharmacy",
  CASHIER: "/cashier",
  RECEPTIONIST: "/receptionist",
};

function normalizeRole(role: unknown) {
  return String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function isProtectedPage(pathname: string) {
  return Object.keys(ROLE_PERMISSIONS).some(
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
      headers: {
        cookie,
      },
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

  // Only protected application pages need authentication.
  if (!isProtectedPage(pathname)) {
    return NextResponse.next();
  }

  // The database-backed session is now the source of truth.
  const user = await getAuthenticatedUser(request);

  if (!user) {
    const loginUrl = new URL("/", request.url);

    // Preserve the page the user originally requested.
    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(loginUrl);
  }

  const userRole = normalizeRole(user.role);

  const protectedRoute = Object.keys(
    ROLE_PERMISSIONS
  ).find(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  if (protectedRoute) {
    const allowedRoles =
      ROLE_PERMISSIONS[protectedRoute];

    if (!allowedRoles.includes(userRole)) {
      const fallbackTarget =
        ROLE_DASHBOARD_MAP[userRole] || "/";

      return NextResponse.redirect(
        new URL(fallbackTarget, request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/audit/:path*",
    "/emr/:path*",
    "/doctor/:path*",
    "/consultation/:path*",
    "/pharmacy/:path*",
    "/cashier/:path*",
    "/billing/:path*",
    "/nurse/:path*",
    "/receptionist/:path*",
    "/laboratory/:path*",
  ],
};