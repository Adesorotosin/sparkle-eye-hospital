import RoleProtectedLayout from "@/components/RoleProtectedLayout";

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <RoleProtectedLayout allowedRoles={["LAB_SCIENTIST","DOCTOR","OPHTHALMOLOGIST","NURSE","IT_ADMIN"]}>{children}</RoleProtectedLayout>;
}
