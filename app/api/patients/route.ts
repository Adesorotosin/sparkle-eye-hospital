// app/api/patients/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { registerPatient } from "@/lib/patient-flow";

// --- GET: List all registered patients (id + name, for search/selection) ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("patient_code, full_name, coverage_plan, age, gender, phone")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const patients = (data ?? []).map((p) => ({
      patientId: p.patient_code,
      fullName: p.full_name,
      coveragePlan: p.coverage_plan,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
    }));

    return NextResponse.json({ patients });
  } catch (error) {
    console.error("Patients list error:", error);
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 });
  }
}

// --- POST: Register a new patient (e.g. Pharmacy walk-in registration) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, coveragePlan, age, gender, phone, allergies } = body;

    if (!fullName) {
      return NextResponse.json({ error: "'fullName' is required." }, { status: 400 });
    }

    const created = await registerPatient({ fullName, coveragePlan, age, gender, phone, allergies });

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
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Patient registration error:", error);
    return NextResponse.json({ error: "Failed to register patient" }, { status: 500 });
  }
}
