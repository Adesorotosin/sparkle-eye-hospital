import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedStaff, type UserRole } from "@/lib/server-auth";

export default async function RoleProtectedLayout({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
}) {
  const staff = await getAuthenticatedStaff();
  if (!staff) redirect("/");
  if (!allowedRoles.includes(staff.role)) {
    redirect(staff.role === "RECEPTIONIST" ? "/receptionist" : "/");
  }
  return children;
}
