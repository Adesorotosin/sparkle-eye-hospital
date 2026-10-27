import RoleProtectedLayout from "@/components/RoleProtectedLayout";

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <RoleProtectedLayout allowedRoles={["DOCTOR","OPHTHALMOLOGIST","NURSE","LAB_SCIENTIST","IT_ADMIN"]}>{children}</RoleProtectedLayout>;
}
