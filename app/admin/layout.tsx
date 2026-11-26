import RoleProtectedLayout from "@/components/RoleProtectedLayout";
import AdminLayoutClient from "@/components/AdminLayoutClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProtectedLayout
      requiredAnyPermission={[
        "staff.view",
        "staff.manage",
        "roles.manage",
        "audit.view",
        "reports.view",
        "notifications.manage",
        "settings.manage",
      ]}
    >
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </RoleProtectedLayout>
  );
}
