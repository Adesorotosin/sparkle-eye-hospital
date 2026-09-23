// app/api/patients/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { registerPatient } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";

// --- GET: List all registered patients (for the Doctor's Patient Directory, etc.) ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const patientIds = (data ?? []).map((p) => p.id);
    const latestComplaintByPatientId = new Map<string, string>();
    const invoiceByPatientId = new Map<string, { status: string; grandTotal: number }>();

    if (patientIds.length > 0) {
      const { data: vitalsRows, error: vitalsError } = await supabase
        .from("vitals")
        .select("patient_id, primary_complaint, recorded_at")
        .in("patient_id", patientIds)
        .order("recorded_at", { ascending: false });
      if (vitalsError) throw vitalsError;

      // Rows are ordered latest-first, so the first time we see a
      // patient_id is their most recent recorded complaint.
      for (const row of vitalsRows ?? []) {
        if (!latestComplaintByPatientId.has(row.patient_id) && row.primary_complaint) {
          latestComplaintByPatientId.set(row.patient_id, row.primary_complaint);
        }
      }

      const { data: invoiceRows, error: invoiceError } = await supabase
        .from("invoices")
        .select("patient_id, status, grand_total, created_at")
        .in("patient_id", patientIds)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (invoiceError) throw invoiceError;

      for (const row of invoiceRows ?? []) {
        if (!invoiceByPatientId.has(row.patient_id)) {
          invoiceByPatientId.set(row.patient_id, {
            status: row.status,
            grandTotal: Number(row.grand_total),
          });
        }
      }
    }

    const patients = (data ?? []).map((p) => ({
      patientId: p.patient_code,
      fullName: p.full_name,
      coveragePlan: p.coverage_plan,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      allergies: p.allergies,
      status: p.status,
      isWalkIn: p.is_walk_in,
      lastVisitAt: p.last_visit_at,
      primaryComplaint: latestComplaintByPatientId.get(p.id) || null,
      invoiceStatus: invoiceByPatientId.get(p.id)?.status || null,
      invoiceTotal: invoiceByPatientId.get(p.id)?.grandTotal ?? null,
    }));

    return NextResponse.json({ patients });
  } catch (error) {
    console.error("Patients list error:", error);
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 });
  }
}

// --- POST: Register a new patient (Pharmacy walk-in, Doctor registration, Patient Directory) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, coveragePlan, age, gender, phone, allergies, status, isWalkIn } = body;

    if (!fullName) {
      return NextResponse.json({ error: "'fullName' is required." }, { status: 400 });
    }

    const created = await registerPatient({
      fullName,
      coveragePlan,
      age,
      gender,
      phone,
      allergies,
      status,
      isWalkIn,
    });

    await logActivity({
      module: "Admin",
      category: "ADMIN",
      action: `New patient registered: ${created.full_name} (${created.patient_code})`,
      performedBy: "Pharmacy",
      patientId: created.id,
    });

    return NextResponse.json(
      {
        patient: {
          patientId: created.patient_code,
          fullName: created.full_name,
          coveragePlan: created.coverage_plan,
          age: created.age,
          gender: created.gender,
          phone: created.phone,
          allergies: created.allergies,
          status: created.status,
          isWalkIn: created.is_walk_in,
          lastVisitAt: created.last_visit_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Patient registration error:", error);
    return NextResponse.json({ error: "Failed to register patient" }, { status: 500 });
  }
}
