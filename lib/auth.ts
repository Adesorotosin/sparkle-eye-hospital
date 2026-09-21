// lib/auth.ts

export const ROLE_REDIRECT_MAP: Record<string, string> = {
  ADMIN: "/admin",
  SUPER_ADMIN: "/admin",
  DOCTOR: "/doctor",
  NURSE: "/nurse",
  // Pharmacy roles
  PHARMACY: "/pharmacy",
  PHARMACIST: "/pharmacy",
  // Cashier & Billing roles
  CASHIER: "/cashier",
  BILLING: "/billing",
  // Additional hospital departments
  RECEPTIONIST: "/receptionist",
  LAB: "/laboratory",
  LABORATORY: "/laboratory",
};

export async function authenticateStaff(username: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Authentication failed");
  }

  return data.user;
}