// lib/rbac-config.ts

export type UserRole =
  | "IT_ADMIN"
  | "OPHTHALMOLOGIST"
  | "DOCTOR"
  | "PHARMACIST"
  | "NURSE"
  | "CASHIER"
  | "RECEPTIONIST"
  | "LAB_SCIENTIST"
  | "OPTICIAN"
  | "OPTOMETRIST";

export interface UserSession {
  id: string;
  name: string;
  staffId: string;
  role: UserRole;
  token: string;
}

// Central route access policy used by middleware and server-side checks.
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/admin": ["IT_ADMIN"],
  "/audit": ["IT_ADMIN"],

  "/doctor": [
    "OPHTHALMOLOGIST",
    "DOCTOR",
    "NURSE",
    "IT_ADMIN",
  ],

  "/emr": [
    "OPHTHALMOLOGIST",
    "DOCTOR",
    "NURSE",
    "IT_ADMIN",
  ],

  "/consultation": [
    "OPHTHALMOLOGIST",
    "DOCTOR",
  ],

  "/pharmacy": [
    "PHARMACIST",
    "NURSE",
    "IT_ADMIN",
    "DOCTOR",
  ],

  "/billing": [
    "CASHIER",
    "IT_ADMIN",
  ],

  "/cashier": [
    "CASHIER",
    "IT_ADMIN",
  ],

  "/nurse": [
    "NURSE",
    "IT_ADMIN",
    "DOCTOR",
  ],

  "/receptionist": [
    "RECEPTIONIST",
    "IT_ADMIN",
  ],

  "/triage": [
    "NURSE",
    "DOCTOR",
    "OPHTHALMOLOGIST",
    "IT_ADMIN",
  ],

  "/diagnostics": [
    "DOCTOR",
    "OPHTHALMOLOGIST",
    "NURSE",
    "LAB_SCIENTIST",
    "IT_ADMIN",
  ],

  "/laboratory": [
    "LAB_SCIENTIST",
    "DOCTOR",
    "OPHTHALMOLOGIST",
    "NURSE",
    "IT_ADMIN",
  ],

  "/optician": [
    "OPTICIAN",
    "OPTOMETRIST",
    "OPHTHALMOLOGIST",
    "DOCTOR",
    "IT_ADMIN",
  ],

  "/optometry": [
    "OPTOMETRIST",
    "OPHTHALMOLOGIST",
    "DOCTOR",
    "NURSE",
    "IT_ADMIN",
  ],

  "/appointments": [
    "RECEPTIONIST",
    "NURSE",
    "DOCTOR",
    "OPHTHALMOLOGIST",
    "OPTOMETRIST",
    "OPTICIAN",
    "CASHIER",
    "IT_ADMIN",
  ],

  "/inventory": [
    "PHARMACIST",
    "OPTICIAN",
    "LAB_SCIENTIST",
    "IT_ADMIN",
    "NURSE",
  ],
};

// Helper: Check if a path requires protection and if the user role matches.
export function hasPermission(
  pathname: string,
  userRole: UserRole
): boolean {
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  if (!matchedRoute) return true;

  return ROUTE_PERMISSIONS[matchedRoute].includes(userRole);
}