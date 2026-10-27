import RoleProtectedLayout from "@/components/RoleProtectedLayout";

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <RoleProtectedLayout allowedRoles={["PHARMACIST","NURSE","IT_ADMIN","DOCTOR"]}>{children}</RoleProtectedLayout>;
}
