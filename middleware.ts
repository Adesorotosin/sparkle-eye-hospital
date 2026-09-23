import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. Defined permissions for each protected route prefix
const ROLE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["ADMIN", "IT_ADMIN"],
  "/audit": ["ADMIN", "IT_ADMIN"],
  "/emr": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "ADMIN", "IT_ADMIN"],
  "/doctor": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "ADMIN", "IT_ADMIN"],
  "/consultation": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "ADMIN", "IT_ADMIN"],
  "/pharmacy": ["PHARMACY", "PHARMACIST", "PHARMACY_STAFF", "NURSE", "ADMIN", "IT_ADMIN", "DOCTOR"],
  "/cashier": ["CASHIER", "ADMIN", "IT_ADMIN"],
  "/billing": ["CASHIER", "ADMIN", "IT_ADMIN", "NURSE", "DOCTOR"],
  "/nurse": ["NURSE", "ADMIN", "IT_ADMIN", "DOCTOR"],
};

// 2. Default route landing pages based on user roles (expanded aliases)
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  ADMIN: "/admin",
  IT_ADMIN: "/admin",
  DOCTOR: "/doctor",
  OPHTHALMOLOGIST: "/doctor",
  NURSE: "/nurse",
  PHARMACY: "/pharmacy",
  PHARMACIST: "/pharmacy",
  PHARMACY_STAFF: "/pharmacy",
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

  // Allow unrestricted access to the root landing page (app/page.tsx)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Normalize role string (strip spaces, dashes, convert to UPPERCASE)
  const rawRole = request.cookies.get("user_role")?.value || "";
  const userRole = rawRole.toUpperCase().trim().replace("-", "_");
  const isLoggedIn = request.cookies.get("is_logged_in")?.value === "true";

  // If user is NOT logged in and trying to access a protected page, send to login (`/`)
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Determine user's correct home route from map
  const userHomeRoute = ROLE_DASHBOARD_MAP[userRole];

  // Role-based access control check
  const protectedRoute = Object.keys(ROLE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (protectedRoute) {
    const allowedRoles = ROLE_PERMISSIONS[protectedRoute];

    // Check if current user's role is permitted for this route
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirect to their assigned dashboard if authorized elsewhere, or login root if unmapped
      const fallbackTarget =
        userHomeRoute && userHomeRoute !== pathname ? userHomeRoute : "/";
      return NextResponse.redirect(new URL(fallbackTarget, request.url));
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