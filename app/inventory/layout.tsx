import RoleProtectedLayout from "@/components/RoleProtectedLayout";

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <RoleProtectedLayout allowedRoles={["PHARMACIST","OPTICIAN","LAB_SCIENTIST","IT_ADMIN","NURSE","INVENTORY_MANAGER"]}>{children}</RoleProtectedLayout>;
}
