import RoleProtectedLayout from "@/components/RoleProtectedLayout";
import DoctorLayoutClient from "@/components/DoctorLayoutClient";
export default function DoctorLayout({ children }: { children: React.ReactNode }) { return <RoleProtectedLayout allowedRoles={["OPHTHALMOLOGIST","DOCTOR","NURSE","IT_ADMIN"]} requiredPermission="clinical.view"><DoctorLayoutClient>{children}</DoctorLayoutClient></RoleProtectedLayout>; }
