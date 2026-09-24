import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { registerPatient } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";

const PATIENT_READ_ROLES = [
  "IT_ADMIN",
  "OPHTHALMOLOGIST",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "PHARMACIST",
] as const;

const PATIENT_CREATE_ROLES = [
  "IT_ADMIN",
  "RECEPTIONIST",
  "NURSE",
  "OPHTHALMOLOGIST",
  "DOCTOR",
  "PHARMACIST",
] as const;

export async function GET(request: NextRequest) {
  try {
    await requireRole([...PATIENT_READ_ROLES]);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";

    let query = supabaseServer
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (search) {
      query = query.or(
        `patient_code.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Patient list failed:", error);

      return NextResponse.json(
        { error: "Failed to load patients." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      patients: data ?? [],
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
        { error: "You are not authorized to view patients." },
        { status: 403 }
      );
    }

    console.error("Fetch patients error:", error);

    return NextResponse.json(
      { error: "Failed to load patients." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireRole([...PATIENT_CREATE_ROLES]);

    const body = await request.json();

    const {
      fullName,
      coveragePlan,
      age,
      gender,
      phone,
      allergies,
      status,
      isWalkIn,
    } = body ?? {};

    if (typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    let normalizedAge: number | undefined;

    if (age !== undefined && age !== null && age !== "") {
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

      normalizedAge = numericAge;
    }

    if (
      gender !== undefined &&
      gender !== null &&
      typeof gender !== "string"
    ) {
      return NextResponse.json(
        { error: "Gender must be a string." },
        { status: 400 }
      );
    }

    if (
      phone !== undefined &&
      phone !== null &&
      typeof phone !== "string"
    ) {
      return NextResponse.json(
        { error: "Phone must be a string." },
        { status: 400 }
      );
    }

    if (
      coveragePlan !== undefined &&
      coveragePlan !== null &&
      typeof coveragePlan !== "string"
    ) {
      return NextResponse.json(
        { error: "Coverage plan must be a string." },
        { status: 400 }
      );
    }

    if (
      allergies !== undefined &&
      allergies !== null &&
      typeof allergies !== "string"
    ) {
      return NextResponse.json(
        { error: "Allergies must be a string." },
        { status: 400 }
      );
    }

    if (
      isWalkIn !== undefined &&
      typeof isWalkIn !== "boolean"
    ) {
      return NextResponse.json(
        { error: "isWalkIn must be a boolean." },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "waiting_triage",
      "in_consultation",
      "completed_today",
    ] as const;

    if (
      status !== undefined &&
      (
        typeof status !== "string" ||
        !allowedStatuses.includes(
          status as (typeof allowedStatuses)[number]
        )
      )
    ) {
      return NextResponse.json(
        { error: "Invalid patient status." },
        { status: 400 }
      );
    }

    const patient = await registerPatient({
      fullName: fullName.trim(),
      coveragePlan:
        typeof coveragePlan === "string"
          ? coveragePlan.trim()
          : undefined,
      age: normalizedAge,
      gender:
        typeof gender === "string"
          ? gender.trim()
          : undefined,
      phone:
        typeof phone === "string"
          ? phone.trim()
          : undefined,
      allergies:
        typeof allergies === "string"
          ? allergies.trim()
          : undefined,
      status:
        typeof status === "string"
          ? (status as
              | "waiting_triage"
              | "in_consultation"
              | "completed_today")
          : undefined,
      isWalkIn,
    });

    await logActivity({
      patientId: patient.id,
      module: "Patients",
      category: "CLINICAL",
      action: `Patient registered: ${patient.full_name} (${patient.patient_code})`,
      performedBy: staff.name,
    });

    return NextResponse.json(
      {
        success: true,
        patient: {
          id: patient.id,
          patientId: patient.patient_code,
          fullName: patient.full_name,
          coveragePlan: patient.coverage_plan,
          age: patient.age,
          gender: patient.gender,
          phone: patient.phone,
          allergies: patient.allergies,
          status: patient.status,
          isWalkIn: patient.is_walk_in,
          lastVisitAt: patient.last_visit_at,
        },
      },
      { status: 201 }
    );
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
        { error: "You are not authorized to register patients." },
        { status: 403 }
      );
    }

    console.error("Register patient error:", error);

    return NextResponse.json(
      { error: "Failed to register patient." },
      { status: 500 }
    );
  }
}