// lib/auth.ts

export const ROLE_REDIRECT_MAP: Record<string, string> = {
  IT_ADMIN: "/admin",
  OPHTHALMOLOGIST: "/doctor", // Updated to your new doctor dashboard
  DOCTOR: "/doctor",          // Updated to your new doctor dashboard
  PHARMACIST: "/pharmacy",
  NURSE: "/pharmacy",
  CASHIER: "/billing",
  RECEPTIONIST: "/reception",
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

  return data.user; // Returns { staffId, name, role, token }
}