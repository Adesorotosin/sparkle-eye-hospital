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
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/admin": ["IT_ADMIN"],
  "/audit": ["IT_ADMIN"],
  "/emr": ["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "IT_ADMIN"],
  "/consultation": ["OPHTHALMOLOGIST", "DOCTOR"],
  "/pharmacy": ["PHARMACIST", "NURSE", "IT_ADMIN"],
  "/billing": ["CASHIER", "IT_ADMIN"],
  "/reception": ["RECEPTIONIST", "CASHIER", "IT_ADMIN"],
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