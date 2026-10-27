import RoleProtectedLayout from "@/components/RoleProtectedLayout";

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <RoleProtectedLayout allowedRoles={["OPTICIAN","OPTOMETRIST","OPHTHALMOLOGIST","DOCTOR","IT_ADMIN"]}>{children}</RoleProtectedLayout>;
}
