// lib/auth.ts

export const ROLE_REDIRECT_MAP: Record<string, string> = {
  IT_ADMIN: "/admin",
  OPHTHALMOLOGIST: "/doctor",
  DOCTOR: "/doctor",
  NURSE: "/nurse",
  PHARMACIST: "/pharmacy",
  CASHIER: "/cashier",
  RECEPTIONIST: "/receptionist",
};

export type UserRole =
  | "IT_ADMIN"
  | "OPHTHALMOLOGIST"
  | "DOCTOR"
  | "PHARMACIST"
  | "NURSE"
  | "CASHIER"
  | "RECEPTIONIST";

export async function authenticateStaff(
  username: string,
  password: string,
  rememberWorkstation = false
) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
      rememberWorkstation,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Authentication failed"
    );
  }

  return data.user;
}