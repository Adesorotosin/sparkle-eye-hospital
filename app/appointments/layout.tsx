import RoleProtectedLayout from "@/components/RoleProtectedLayout";

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <RoleProtectedLayout allowedRoles={["NURSE","DOCTOR","OPHTHALMOLOGIST","OPTOMETRIST","OPTICIAN","CASHIER","IT_ADMIN"]}>{children}</RoleProtectedLayout>;
}
