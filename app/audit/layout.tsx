import RoleProtectedLayout from "@/components/RoleProtectedLayout";
export default function ModuleLayout({ children }: { children: React.ReactNode }) { return <RoleProtectedLayout allowedRoles={["IT_ADMIN","HOSPITAL_ADMIN"]} requiredPermission="audit.view">{children}</RoleProtectedLayout>; }
