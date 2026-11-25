import RoleProtectedLayout from "@/components/RoleProtectedLayout";
export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <RoleProtectedLayout requiredAnyPermission={["clinical.diagnostics.order","clinical.results.view"]}>{children}</RoleProtectedLayout>;
}
