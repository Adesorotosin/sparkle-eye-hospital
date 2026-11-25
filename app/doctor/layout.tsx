import RoleProtectedLayout from "@/components/RoleProtectedLayout";
import DoctorLayoutClient from "@/components/DoctorLayoutClient";
export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <RoleProtectedLayout requiredPermission="clinical.view"><DoctorLayoutClient>{children}</DoctorLayoutClient></RoleProtectedLayout>;
}
