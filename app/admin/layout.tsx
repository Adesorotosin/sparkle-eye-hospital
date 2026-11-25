import RoleProtectedLayout from "@/components/RoleProtectedLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProtectedLayout requiredAnyPermission={[
      "staff.view",
      "staff.manage",
      "roles.manage",
      "audit.view",
      "reports.view",
      "notifications.manage",
      "settings.manage",
    ]}>
      {children}
    </RoleProtectedLayout>
  );
}
