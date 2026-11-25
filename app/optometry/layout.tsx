import RoleProtectedLayout from "@/components/RoleProtectedLayout";
export default function ModuleLayout({ children }: { children: React.ReactNode }) { return <RoleProtectedLayout allowedRoles={["OPTOMETRIST","OPHTHALMOLOGIST","DOCTOR","NURSE","IT_ADMIN"]} requiredPermission="clinical.view">{children}</RoleProtectedLayout>; }
