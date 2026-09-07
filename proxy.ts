import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. Define allowed roles for each section of the hospital
const ROLE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["IT_ADMIN"],
  "/audit": ["IT_ADMIN"],
  "/emr": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "IT_ADMIN"],
  "/doctor": ["OPHTHALMOLOGIST", "DOCTOR", "IT_ADMIN"],
  "/consultation": ["OPHTHALMOLOGIST", "DOCTOR"],
  "/pharmacy": ["PHARMACIST", "NURSE", "IT_ADMIN"],
  "/billing": ["CASHIER", "IT_ADMIN"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the user's role and login status from cookies
  const userRole = request.cookies.get("user_role")?.value;
  const isLoggedIn = request.cookies.get("is_logged_in")?.value;

 // ✅ CORRECT: Redirects to root app/page.tsx
if (!isLoggedIn) {
  return NextResponse.redirect(new URL("/", request.url));
}

  // B. Find out if the requested page is protected
  const protectedRoute = Object.keys(ROLE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (protectedRoute) {
    const allowedRoles = ROLE_PERMISSIONS[protectedRoute];

    // C. If the user doesn't have the right role, block them
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // D. Allow request through if checks pass
  return NextResponse.next();
}

// 2. Tell Next.js which routes should trigger this middleware
export const config = {
  matcher: [
    "/admin/:path*",
    "/audit/:path*",
    "/emr/:path*",
    "/doctor/:path*",
    "/consultation/:path*",
    "/pharmacy/:path*",
    "/billing/:path*",
  ],
};