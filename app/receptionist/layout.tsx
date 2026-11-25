import RoleProtectedLayout from "@/components/RoleProtectedLayout";
export default function ModuleLayout({ children }: { children: React.ReactNode }) { return <RoleProtectedLayout requiredPermission="patients.register">{children}</RoleProtectedLayout>; }
