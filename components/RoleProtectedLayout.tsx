import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedStaff, type UserRole } from "@/lib/server-auth";

export default async function RoleProtectedLayout({
  allowedRoles,
  requiredPermission,
  requiredAnyPermission,
  children,
}: {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  requiredAnyPermission?: string[];
  children: ReactNode;
}) {
  const staff = await getAuthenticatedStaff();
  if (!staff) redirect("/");
  const roleAllowed = allowedRoles ? allowedRoles.includes(staff.role) : false;
  const permissionAllowed = requiredPermission
    ? staff.permissions[requiredPermission] === true
    : false;
  const anyPermissionAllowed = requiredAnyPermission
    ? requiredAnyPermission.some((permission) => staff.permissions[permission] === true)
    : false;
  if (!roleAllowed && !permissionAllowed && !anyPermissionAllowed) {
    redirect(staff.role === "RECEPTIONIST" ? "/receptionist" : "/");
  }
  return children;
}
