import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  try {
    const staff = await requireRole(["IT_ADMIN", "RECEPTIONIST"]);

    const { data, error } = await supabaseServer
      .from("staff")
      .select(
        "id, staff_id, name, username, role, title, department, is_active, deleted_at"
      )
      .in("role", ["DOCTOR", "OPHTHALMOLOGIST"])
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("Doctor directory database error:", error);
      return jsonNoStore(
        { error: "Failed to load doctor directory." },
        { status: 500 }
      );
    }

    return jsonNoStore({
      doctors: (data ?? []).map((doctor) => ({
        id: doctor.id,
        staffId: doctor.staff_id,
        name: doctor.name,
        username: doctor.username,
        role: doctor.role,
        title: doctor.title,
        department: doctor.department,
      })),
      currentStaff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return jsonNoStore({ error: "Authentication required." }, { status: 401 });
    }

    if (message === "FORBIDDEN") {
      return jsonNoStore(
        { error: "You do not have permission to view the doctor directory." },
        { status: 403 }
      );
    }

    console.error("Doctor directory error:", error);
    return jsonNoStore(
      { error: "Failed to load doctor directory." },
      { status: 500 }
    );
  }
}
