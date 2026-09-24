// app/api/appointments/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

// --- GET: List appointments (optionally filter by date, ?date=YYYY-MM-DD) ---
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
      .select("*")
      .order("start_time", { ascending: true });

    if (date) {
      const dayStart = new Date(`${date}T00:00:00`);

      if (Number.isNaN(dayStart.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }

      const dayEnd = new Date(`${date}T23:59:59`);

      query = query
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Appointments list database error:", error);

      return NextResponse.json(
        { error: "Failed to load appointments" },
        { status: 500 }
      );
    }

    const appointments = (data ?? []).map((row) => ({
      id: row.id,
      patientName: row.patient_name,
      physician: row.physician,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      notes: row.notes,
    }));

    return NextResponse.json({
      appointments,
      currentStaff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "You do not have permission to view appointments." },
        { status: 403 }
      );
    }

    console.error("Appointments list error:", error);

    return NextResponse.json(
      { error: "Failed to load appointments" },
      { status: 500 }
    );
  }
}

// --- POST: Book a new appointment ---
export async function POST(request: Request) {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
      "RECEPTIONIST",
    ]);

    const body = await request.json();

    const {
      patientName,
      physician,
      date,
      startTime,
      endTime,
      notes,
      status,
    } = body;

    if (
      typeof patientName !== "string" ||
      !patientName.trim() ||
      typeof physician !== "string" ||
      !physician.trim() ||
      typeof date !== "string" ||
      !date.trim() ||
      typeof startTime !== "string" ||
      !startTime.trim() ||
      typeof endTime !== "string" ||
      !endTime.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "patientName, physician, date, startTime, and endTime are required.",
        },
        { status: 400 }
      );
    }

    const start = new Date(
      `${date.trim()}T${startTime.trim()}:00`
    );

    const end = new Date(
      `${date.trim()}T${endTime.trim()}:00`
    );

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid appointment date or time. Use YYYY-MM-DD and HH:mm.",
        },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        {
          error: "Appointment end time must be later than start time.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("appointments")
      .insert({
        patient_name: patientName.trim(),
        physician: physician.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status:
          typeof status === "string" && status.trim()
            ? status.trim()
            : "scheduled",
        notes:
          typeof notes === "string" && notes.trim()
            ? notes.trim()
            : null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Appointment creation database error:", error);

      return NextResponse.json(
        { error: "Failed to book appointment" },
        { status: 500 }
      );
    }

    await logActivity({
      module: "Scheduling",
      category: "ADMIN",
      action: `Appointment booked: ${patientName.trim()} with ${physician.trim()}`,
      performedBy: staff.name,
      staffId: staff.id,
      details: `Appointment scheduled for ${date.trim()} from ${startTime.trim()} to ${endTime.trim()}.`,
    });

    return NextResponse.json(
      {
        appointment: {
          id: data.id,
          patientName: data.patient_name,
          physician: data.physician,
          startTime: data.start_time,
          endTime: data.end_time,
          status: data.status,
          notes: data.notes,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "You do not have permission to create appointments." },
        { status: 403 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    console.error("Appointment creation error:", error);

    return NextResponse.json(
      { error: "Failed to book appointment" },
      { status: 500 }
    );
  }
}