import RoleProtectedLayout from "@/components/RoleProtectedLayout";
export default function ModuleLayout({ children }: { children: React.ReactNode }) { return <RoleProtectedLayout requiredPermission="optical.orders.view">{children}</RoleProtectedLayout>; }
