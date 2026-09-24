import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getPatientRecord } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const PATIENT_READ_ROLES = [
  "IT_ADMIN",
  "OPHTHALMOLOGIST",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "PHARMACIST",
] as const;

const PATIENT_UPDATE_ROLES = [
  "IT_ADMIN",
  "OPHTHALMOLOGIST",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "PHARMACIST",
] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await requireRole([...PATIENT_READ_ROLES]);

    const resolvedParams = await params;
    const patientCode = resolvedParams?.code?.trim();

    if (!patientCode) {
      return NextResponse.json(
        { error: "Patient code is required." },
        { status: 400 }
      );
    }

    const patient = await getPatientRecord(patientCode);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "You are not authorized to view this patient." },
        { status: 403 }
      );
    }

    console.error("Fetch patient error:", error);

    return NextResponse.json(
      { error: "Failed to load patient record." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const staff = await requireRole([...PATIENT_UPDATE_ROLES]);

    const resolvedParams = await params;
    const patientCode = resolvedParams?.code?.trim();

    if (!patientCode) {
      return NextResponse.json(
        { error: "Patient code is required." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      fullName,
      age,
      gender,
      phone,
      coveragePlan,
      isWalkIn,
      status,
    } = body ?? {};

    const patch: Record<string, unknown> = {};

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return NextResponse.json(
          { error: "Full name must be a non-empty string." },
          { status: 400 }
        );
      }

      patch.full_name = fullName.trim();
    }

    if (age !== undefined) {
      const numericAge = Number(age);

      if (
        !Number.isInteger(numericAge) ||
        numericAge < 0 ||
        numericAge > 150
      ) {
        return NextResponse.json(
          { error: "Age must be a valid number between 0 and 150." },
          { status: 400 }
        );
      }

      patch.age = numericAge;
    }

    if (gender !== undefined) {
      if (typeof gender !== "string") {
        return NextResponse.json(
          { error: "Gender must be a string." },
          { status: 400 }
        );
      }

      patch.gender = gender.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return NextResponse.json(
          { error: "Phone must be a string." },
          { status: 400 }
        );
      }

      patch.phone = phone.trim();
    }

    if (coveragePlan !== undefined) {
      if (typeof coveragePlan !== "string") {
        return NextResponse.json(
          { error: "Coverage plan must be a string." },
          { status: 400 }
        );
      }

      patch.coverage_plan = coveragePlan.trim();
    }

    if (isWalkIn !== undefined) {
      if (typeof isWalkIn !== "boolean") {
        return NextResponse.json(
          { error: "isWalkIn must be a boolean." },
          { status: 400 }
        );
      }

      patch.is_walk_in = isWalkIn;
    }

    if (status !== undefined) {
      if (typeof status !== "string" || !status.trim()) {
        return NextResponse.json(
          { error: "Status must be a non-empty string." },
          { status: 400 }
        );
      }

      patch.status = status.trim();
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No fields to update." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("patients")
      .update(patch)
      .eq("patient_code", patientCode)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Patient update failed:", error);

      return NextResponse.json(
        { error: "Failed to update patient." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Patient not found." },
        { status: 404 }
      );
    }

    await logActivity({
      module: "Patients",
      category: "ADMIN",
      action: `Patient record updated: ${data.full_name} (${data.patient_code})`,
      performedBy: staff.name,
      patientId: data.id,
    });

    return NextResponse.json({
      patient: {
        patientId: data.patient_code,
        fullName: data.full_name,
        coveragePlan: data.coverage_plan,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        allergies: data.allergies,
        status: data.status,
        isWalkIn: data.is_walk_in,
        lastVisitAt: data.last_visit_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "You are not authorized to update this patient." },
        { status: 403 }
      );
    }

    console.error("Update patient error:", error);

    return NextResponse.json(
      { error: "Failed to update patient." },
      { status: 500 }
    );
  }
}