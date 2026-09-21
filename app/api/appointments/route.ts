// app/api/appointments/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

// --- GET: List appointments (optionally filter by date, ?date=YYYY-MM-DD) ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    let query = supabase.from("appointments").select("*").order("start_time", { ascending: true });

    if (date) {
      const dayStart = new Date(`${date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${date}T23:59:59`).toISOString();
      query = query.gte("start_time", dayStart).lte("start_time", dayEnd);
    }

    const { data, error } = await query;
    if (error) throw error;

    const appointments = (data ?? []).map((row) => ({
      id: row.id,
      patientName: row.patient_name,
      physician: row.physician,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      notes: row.notes,
    }));

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Appointments list error:", error);
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}

// --- POST: Book a new appointment / OR slot ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientName, physician, date, startTime, endTime, notes, status } = body;

    if (!patientName || !physician || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "patientName, physician, date, startTime, and endTime are required." },
        { status: 400 }
      );
    }

    const start = new Date(`${date}T${startTime}:00`).toISOString();
    const end = new Date(`${date}T${endTime}:00`).toISOString();

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        patient_name: patientName,
        physician,
        start_time: start,
        end_time: end,
        status: status ?? "scheduled",
        notes: notes || null,
      })
      .select("*")
      .single();
    if (error) throw error;

    await logActivity({
      module: "Scheduling",
      category: "ADMIN",
      action: `Appointment booked: ${patientName} with ${physician}`,
      performedBy: "Reception",
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
    console.error("Appointment creation error:", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}
