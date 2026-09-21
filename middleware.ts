import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. Defined permissions for each protected route prefix
const ROLE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["ADMIN", "IT_ADMIN"],
  "/audit": ["ADMIN", "IT_ADMIN"],
  "/emr": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "ADMIN", "IT_ADMIN"],
  "/doctor": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "ADMIN", "IT_ADMIN"],
  "/consultation": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "ADMIN", "IT_ADMIN"],
  "/pharmacy": ["PHARMACY", "PHARMACIST", "NURSE", "ADMIN", "IT_ADMIN", "DOCTOR"],
  "/cashier": ["CASHIER", "ADMIN", "IT_ADMIN"],
  "/billing": ["CASHIER", "ADMIN", "IT_ADMIN", "NURSE", "DOCTOR"],
  "/nurse": ["NURSE", "ADMIN", "IT_ADMIN", "DOCTOR"],
};

// 2. Default route landing pages based on user roles
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  ADMIN: "/admin",
  IT_ADMIN: "/admin",
  DOCTOR: "/doctor",
  OPHTHALMOLOGIST: "/doctor",
  NURSE: "/nurse",
  PHARMACY: "/pharmacy",
  PHARMACIST: "/pharmacy",
  CASHIER: "/cashier",
  BILLING: "/billing",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass authentication check for API routes, Next.js internals, and static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const userRole = request.cookies.get("user_role")?.value?.toUpperCase() || "";
  const isLoggedIn = request.cookies.get("is_logged_in")?.value === "true";

  // If user is NOT logged in and trying to access a protected page, send to login (`/`)
  if (!isLoggedIn) {
    if (pathname !== "/") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If user IS logged in and tries to access login (`/`), route to THEIR specific dashboard
  if (isLoggedIn && pathname === "/") {
    const defaultDashboard = ROLE_DASHBOARD_MAP[userRole] || "/admin";
    return NextResponse.redirect(new URL(defaultDashboard, request.url));
  }

  // Role-based access control check
  const protectedRoute = Object.keys(ROLE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (protectedRoute) {
    const allowedRoles = ROLE_PERMISSIONS[protectedRoute];
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirect unauthorized users to their proper home dashboard
      const fallbackDashboard = ROLE_DASHBOARD_MAP[userRole] || "/";
      return NextResponse.redirect(new URL(fallbackDashboard, request.url));
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
  ],
};