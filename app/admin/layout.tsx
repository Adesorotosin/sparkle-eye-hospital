import RoleProtectedLayout from "@/components/RoleProtectedLayout";
import AdminLayoutClient from "@/components/AdminLayoutClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProtectedLayout allowedRoles={["IT_ADMIN"]}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </RoleProtectedLayout>
  );
}
