import RoleProtectedLayout from "@/components/RoleProtectedLayout";
export default function ModuleLayout({ children }: { children: React.ReactNode }) { return <RoleProtectedLayout requiredPermission="clinical.prescriptions.view">{children}</RoleProtectedLayout>; }
