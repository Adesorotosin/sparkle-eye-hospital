// lib/db.ts
//
// In-memory mock database. Previously this was just `export const db = {}`,
// so any code calling `db.staff.update(...)` (e.g. the staff suspend/delete
// API route) threw immediately — the request always 500'd.
//
// This is still not a real database: data resets whenever the server
// restarts, and it won't be shared across multiple server instances.
// Swap this out for Prisma/Drizzle/etc. backed by a real database before
// this holds any real patient or staff data.

interface StaffRecord {
  id: string;
  staffId: string;
  name: string;
  isActive: boolean;
  deletedAt: Date | null;
}

// Seeded to match the ids used by the Admin > Access Control mock UI
// (app/admin/access-control/page.tsx) so PATCH/DELETE against id "1"-"7"
// actually finds a matching record instead of 404ing.
const staffTable = new Map<string, StaffRecord>(
  [
    { id: "1", staffId: "VF-2024-0142", name: "Dr. James Okoro" },
    { id: "2", staffId: "VF-2024-0098", name: "Dr. Amina Bello" },
    { id: "3", staffId: "VF-2023-0312", name: "Maria Lopez, RN" },
    { id: "4", staffId: "VF-2024-0201", name: "Dr. Kevin Huang" },
    { id: "5", staffId: "VF-2023-0445", name: "Adebayo Funmi" },
    { id: "6", staffId: "VF-2024-0389", name: "Sarah Ogundimu" },
    { id: "7", staffId: "VF-2023-0567", name: "James Carter" },
  ].map((s) => [s.id, { ...s, isActive: true, deletedAt: null }])
);

export const db = {
  staff: {
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
      const updated = { ...existing, ...data };
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
