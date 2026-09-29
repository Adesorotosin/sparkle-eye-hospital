import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

const APPOINTMENT_STATUSES = [
  "scheduled",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
] as const;

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function buildAppointmentDate(date: string, time: string) {
  if (!isValidDate(date) || !isValidTime(time)) return null;

  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toAppointment(row: any) {
  return {
    id: row.id,
    patientName: row.patient_name,
    patientId: row.patient_id,
    physician: row.physician,
    doctorStaffId: row.doctor_staff_id,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    notes: row.notes,
  };
}

export async function GET(request: Request) {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "RECEPTIONIST",
      "OPHTHALMOLOGIST",
      "DOCTOR",
      "NURSE",
    ]);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    let query = supabaseServer
      .from("appointments")
      .select(
        "id, patient_id, patient_name, physician, doctor_staff_id, start_time, end_time, status, notes"
      )
      .order("start_time", { ascending: true });

    if (date) {
      if (!isValidDate(date)) {
        return jsonNoStore(
          { error: "Invalid date format. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }

      const dayStart = new Date(`${date}T00:00:00`);
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);

      query = query
        .gte("start_time", dayStart.toISOString())
        .lt("start_time", nextDay.toISOString());
    }

    if (staff.role === "DOCTOR" || staff.role === "OPHTHALMOLOGIST") {
      query = query.eq("doctor_staff_id", staff.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Appointments list database error:", error);
      return jsonNoStore(
        { error: "Failed to load appointments." },
        { status: 500 }
      );
    }

    return jsonNoStore({
      appointments: (data ?? []).map(toAppointment),
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
        { error: "You do not have permission to view appointments." },
        { status: 403 }
      );
    }

    console.error("Appointments list error:", error);
    return jsonNoStore(
      { error: "Failed to load appointments." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const staff = await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    const body = await request.json();

    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const status =
      typeof body?.status === "string" ? body.status.trim() : "";

    if (
      !id ||
      !APPOINTMENT_STATUSES.includes(
        status as (typeof APPOINTMENT_STATUSES)[number]
      )
    ) {
      return jsonNoStore(
        { error: "A valid appointment id and status are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .select(
        "id, patient_id, patient_name, physician, doctor_staff_id, start_time, end_time, status, notes"
      )
      .single();

    if (error) {
      console.error("Appointment update database error:", error);
      return jsonNoStore(
        { error: "Failed to update appointment." },
        { status: 500 }
      );
    }

    if (status === "checked_in" && data.patient_id) {
      const { error: patientUpdateError } = await supabaseServer
        .from("patients")
        .update({ status: "waiting_triage" })
        .eq("id", data.patient_id);

      if (patientUpdateError) {
        console.error(
          "Failed to move checked-in patient to triage queue:",
          patientUpdateError
        );
        return jsonNoStore(
          {
            error:
              "Appointment was checked in, but the patient could not be moved to the triage queue.",
          },
          { status: 500 }
        );
      }
    }

    await logActivity({
      module: "Scheduling",
      category: "ADMIN",
      action: `Appointment status updated: ${data.patient_name} → ${status}`,
      performedBy: staff.name,
      staffId: staff.id,
      details: `Appointment ${data.id} was changed to ${status}.`,
    });

    return jsonNoStore({
      success: true,
      appointment: toAppointment(data),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return jsonNoStore({ error: "Authentication required." }, { status: 401 });
    }

    if (message === "FORBIDDEN") {
      return jsonNoStore(
        { error: "You do not have permission to update appointments." },
        { status: 403 }
      );
    }

    if (error instanceof SyntaxError) {
      return jsonNoStore({ error: "Invalid JSON request body." }, { status: 400 });
    }

    console.error("Appointment update error:", error);
    return jsonNoStore(
      { error: "Failed to update appointment." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireRole(["IT_ADMIN", "RECEPTIONIST"]);
    const body = await request.json();

    const patientName =
      typeof body?.patientName === "string" ? body.patientName.trim() : "";
    const doctorStaffId =
      typeof body?.doctorStaffId === "string"
        ? body.doctorStaffId.trim()
        : "";
    const date = typeof body?.date === "string" ? body.date.trim() : "";
    const startTime =
      typeof body?.startTime === "string" ? body.startTime.trim() : "";
    const endTime =
      typeof body?.endTime === "string" ? body.endTime.trim() : "";
    const notes =
      typeof body?.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;
    const patientId =
      typeof body?.patientId === "string" && body.patientId.trim()
        ? body.patientId.trim()
        : null;

    if (!patientName || !doctorStaffId || !date || !startTime || !endTime) {
      return jsonNoStore(
        {
          error:
            "patientName, doctorStaffId, date, startTime, and endTime are required.",
        },
        { status: 400 }
      );
    }

    const start = buildAppointmentDate(date, startTime);
    const end = buildAppointmentDate(date, endTime);

    if (!start || !end) {
      return jsonNoStore(
        {
          error:
            "Invalid appointment date or time. Use YYYY-MM-DD and HH:mm.",
        },
        { status: 400 }
      );
    }

    if (end <= start) {
      return jsonNoStore(
        { error: "Appointment end time must be later than start time." },
        { status: 400 }
      );
    }

    const { data: doctor, error: doctorError } = await supabaseServer
      .from("staff")
      .select("id, name, role, is_active, deleted_at")
      .eq("id", doctorStaffId)
      .in("role", ["DOCTOR", "OPHTHALMOLOGIST"])
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (doctorError) {
      console.error("Doctor lookup database error:", doctorError);
      return jsonNoStore(
        { error: "Failed to validate the selected doctor." },
        { status: 500 }
      );
    }

    if (!doctor) {
      return jsonNoStore(
        { error: "The selected doctor is not active or no longer available." },
        { status: 400 }
      );
    }

    const { data: conflictingAppointment, error: conflictError } =
      await supabaseServer
        .from("appointments")
        .select(
          "id, patient_name, physician, start_time, end_time, status"
        )
        .eq("doctor_staff_id", doctor.id)
        .in("status", ["scheduled", "checked_in"])
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString())
        .limit(1)
        .maybeSingle();

    if (conflictError) {
      console.error("Appointment conflict check error:", conflictError);
      return jsonNoStore(
        { error: "Could not verify doctor availability." },
        { status: 500 }
      );
    }

    if (conflictingAppointment) {
      return jsonNoStore(
        {
          error: `Dr. ${doctor.name.replace(/^Dr\.\s*/i, "")} is already booked during this time.`,
          conflict: toAppointment(conflictingAppointment),
        },
        { status: 409 }
      );
    }

    const insertPayload: Record<string, unknown> = {
      patient_name: patientName,
      patient_id: patientId,
      physician: doctor.name,
      doctor_staff_id: doctor.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "scheduled",
      notes,
    };

    const { data, error } = await supabaseServer
      .from("appointments")
      .insert(insertPayload)
      .select(
        "id, patient_id, patient_name, physician, doctor_staff_id, start_time, end_time, status, notes"
      )
      .single();

    if (error) {
      console.error("Appointment creation database error:", error);
      return jsonNoStore(
        { error: "Failed to book appointment." },
        { status: 500 }
      );
    }

    await logActivity({
      module: "Scheduling",
      category: "ADMIN",
      action: `Appointment booked: ${patientName} with ${doctor.name}`,
      performedBy: staff.name,
      staffId: staff.id,
      details: `Appointment scheduled for ${date} from ${startTime} to ${endTime}.`,
    });

    return jsonNoStore(
      {
        appointment: toAppointment(data),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return jsonNoStore({ error: "Authentication required." }, { status: 401 });
    }

    if (message === "FORBIDDEN") {
      return jsonNoStore(
        { error: "You do not have permission to create appointments." },
        { status: 403 }
      );
    }

    if (error instanceof SyntaxError) {
      return jsonNoStore({ error: "Invalid JSON request body." }, { status: 400 });
    }

    console.error("Appointment creation error:", error);
    return jsonNoStore(
      { error: "Failed to book appointment." },
      { status: 500 }
    );
  }
}
