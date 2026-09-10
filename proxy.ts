// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["IT_ADMIN"],
  "/audit": ["IT_ADMIN"],
  "/emr": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "IT_ADMIN"],
  "/doctor": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "IT_ADMIN"],
  "/consultation": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "IT_ADMIN"],
  "/pharmacy": ["PHARMACIST", "NURSE", "IT_ADMIN", "DOCTOR"],
  "/billing": ["CASHIER", "IT_ADMIN", "NURSE", "DOCTOR"],
  "/nurse": ["NURSE", "IT_ADMIN", "DOCTOR"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const userRole = request.cookies.get("user_role")?.value?.toUpperCase();
  const isLoggedIn = request.cookies.get("is_logged_in")?.value === "true";

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const protectedRoute = Object.keys(ROLE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (protectedRoute) {
    const allowedRoles = ROLE_PERMISSIONS[protectedRoute];
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Return to current path with query param instead of kicking out to root '/'
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/audit/:path*",
    "/emr/:path*",
    "/doctor/:path*",
    "/consultation/:path*",
    "/pharmacy/:path*",
    "/billing/:path*",
    "/nurse/:path*",
  ],
};