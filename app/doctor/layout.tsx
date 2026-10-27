import RoleProtectedLayout from "@/components/RoleProtectedLayout";
import DoctorLayoutClient from "@/components/DoctorLayoutClient";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProtectedLayout allowedRoles={["OPHTHALMOLOGIST", "DOCTOR", "NURSE", "IT_ADMIN"]}>
      <DoctorLayoutClient>{children}</DoctorLayoutClient>
    </RoleProtectedLayout>
  );
}
