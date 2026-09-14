// lib/rbac-config.ts

export type UserRole = 
  | "IT_ADMIN" 
  | "OPHTHALMOLOGIST" 
  | "DOCTOR" 
  | "PHARMACIST" 
  | "NURSE" 
  | "CASHIER" 
  | "RECEPTIONIST";

export interface UserSession {
  id: string;
  name: string;
  staffId: string;
  role: UserRole;
  token: string;
}

// Define route access policies
// NOTE: this is the ONLY place route permissions are defined. proxy.ts
// imports this directly instead of keeping its own copy, to avoid the two
// configs drifting out of sync (which is what caused most routes to end up
// unprotected before).
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/admin": ["IT_ADMIN"],
  "/audit": ["IT_ADMIN"],
  "/doctor": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "IT_ADMIN"],
  "/emr": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "IT_ADMIN"],
  "/consultation": ["OPHTHALMOLOGIST", "DOCTOR"],
  "/pharmacy": ["PHARMACIST", "NURSE", "IT_ADMIN", "DOCTOR"],
  "/billing": ["CASHIER", "IT_ADMIN"],
  "/cashier": ["CASHIER", "IT_ADMIN"],
  "/nurse": ["NURSE", "IT_ADMIN", "DOCTOR"],
  "/reception": ["RECEPTIONIST", "CASHIER", "IT_ADMIN"],
  "/triage": ["NURSE", "DOCTOR", "OPHTHALMOLOGIST", "IT_ADMIN"],
  "/diagnostics": ["DOCTOR", "OPHTHALMOLOGIST", "NURSE", "IT_ADMIN"],
  "/appointments": ["RECEPTIONIST", "NURSE", "DOCTOR", "OPHTHALMOLOGIST", "CASHIER", "IT_ADMIN"],
  "/inventory": ["PHARMACIST", "IT_ADMIN", "NURSE"],
};

// Helper: Check if a path requires protection and if the user role matches
export function hasPermission(pathname: string, userRole: UserRole): boolean {
  // Match exact paths or root prefixes (e.g., /admin/users matches /admin)
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!matchedRoute) return true; // Unrestricted public or shared routes

  return ROUTE_PERMISSIONS[matchedRoute].includes(userRole);
}