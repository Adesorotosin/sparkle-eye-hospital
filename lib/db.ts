// lib/db.ts

export type UserRole = "ADMIN" | "DOCTOR" | "NURSE" | "PHARMACIST" | "CASHIER";

export interface StaffRecord {
  id: string;
  staffId: string;
  name: string;
  username: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  deletedAt: Date | null;
}

// Seeded mock staff records including explicit role, username, and credentials
const staffList: StaffRecord[] = [
  { id: "1", staffId: "VF-2024-0142", name: "Dr. James Okoro", username: "admin", role: "ADMIN", passwordHash: "password123", isActive: true, deletedAt: null },
  { id: "2", staffId: "VF-2024-0098", name: "Dr. Amina Bello", username: "doctor", role: "DOCTOR", passwordHash: "password123", isActive: true, deletedAt: null },
  { id: "3", staffId: "VF-2023-0312", name: "Maria Lopez, RN", username: "nurse", role: "NURSE", passwordHash: "password123", isActive: true, deletedAt: null },
  { id: "4", staffId: "VF-2024-0201", name: "Dr. Kevin Huang", username: "pharmacist", role: "PHARMACIST", passwordHash: "password123", isActive: true, deletedAt: null },
  { id: "5", staffId: "VF-2023-0445", name: "Adebayo Funmi", username: "cashier", role: "CASHIER", passwordHash: "password123", isActive: true, deletedAt: null },
  { id: "6", staffId: "VF-2024-0389", name: "Sarah Ogundimu", username: "sarah", role: "NURSE", passwordHash: "password123", isActive: true, deletedAt: null },
  { id: "7", staffId: "VF-2023-0567", name: "James Carter", username: "jcarter", role: "CASHIER", passwordHash: "password123", isActive: true, deletedAt: null },
];

const staffTable = new Map<string, StaffRecord>(
  staffList.map((staff) => [staff.id, staff])
);

export const db = {
  staff: {
    // Find staff member by username or staffId
    async findByUsernameWithPassword(usernameOrStaffId: string): Promise<StaffRecord | null> {
      const query = usernameOrStaffId.toLowerCase().trim();
      for (const record of staffTable.values()) {
        if (
          (record.username.toLowerCase() === query || record.staffId.toLowerCase() === query) &&
          record.isActive &&
          !record.deletedAt
        ) {
          return record;
        }
      }
      return null;
    },

    async update({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Pick<StaffRecord, "isActive" | "deletedAt">>;
    }): Promise<StaffRecord> {
      const existing = staffTable.get(where.id);
      if (!existing) {
        throw new Error(`Staff member with id "${where.id}" not found`);
      }
      const updated: StaffRecord = { ...existing, ...data };
      staffTable.set(where.id, updated);
      return updated;
    },

    async findUnique({
      where,
    }: {
      where: { id: string };
    }): Promise<StaffRecord | null> {
      return staffTable.get(where.id) ?? null;
    },
  },
};