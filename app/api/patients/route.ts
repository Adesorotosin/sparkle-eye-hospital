// app/api/patients/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { registerPatient } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";

// --- GET: List all registered patients ---
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const patientIds = (data ?? []).map((p) => p.id);
    const latestComplaintByPatientId = new Map<string, string>();

    if (patientIds.length > 0) {
      const { data: vitalsRows, error: vitalsError } = await supabase
        .from("vitals")
        .select("patient_id, primary_complaint, recorded_at")
        .in("patient_id", patientIds)
        .order("recorded_at", { ascending: false });

      if (vitalsError) throw vitalsError;

      for (const row of vitalsRows ?? []) {
        if (!latestComplaintByPatientId.has(row.patient_id) && row.primary_complaint) {
          latestComplaintByPatientId.set(row.patient_id, row.primary_complaint);
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
    }));

    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error("Patients list error:", error);
    return NextResponse.json(
      { error: "Failed to load patients", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// --- POST: Register a new patient ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, coveragePlan, age, gender, phone, allergies, status, isWalkIn } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "'fullName' is required." }, { status: 400 });
    }

    // Convert age to number or undefined (instead of null)
    const parsedAge = age !== undefined && age !== null && age !== "" 
      ? parseInt(String(age), 10) 
      : undefined;

    // Execute Patient Registration
    const created = await registerPatient({
      fullName: fullName.trim(),
      coveragePlan: coveragePlan || "Self-Pay",
      age: isNaN(parsedAge as number) ? undefined : parsedAge,
      gender: gender || "Unspecified",
      phone: phone || "",
      allergies: allergies || "",
      status: status || "Waiting",
      isWalkIn: isWalkIn ?? true,
    });

    if (!created) {
      throw new Error("Patient record could not be created in Supabase.");
    }

    // Wrap logActivity in try-catch
    try {
      await logActivity({
        module: "Admin",
        category: "ADMIN",
        action: `New patient registered: ${created.full_name || fullName} (${created.patient_code || "N/A"})`,
        performedBy: "Pharmacy",
        patientId: created.id,
      });
    } catch (logErr) {
      console.warn("Non-fatal error: Activity logging failed.", logErr);
    }

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
  } catch (error: any) {
    console.error("Patient registration error details:", error);

    return NextResponse.json(
      {
        error: "Failed to register patient",
        details: error?.message || error?.cause?.message || String(error),
      },
      { status: 500 }
    );
  }
}