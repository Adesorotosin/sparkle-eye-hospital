import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { getPatientRecord } from "@/lib/patient-flow";
import { logActivity } from "@/lib/activity-log";

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
] as const;

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ code: string }>;
  }
) {
  try {
    await requireRole([...PATIENT_READ_ROLES]);

    const { code } = await params;

    if (!code?.trim()) {
      return NextResponse.json(
        {
          error: "Patient code is required.",
        },
        { status: 400 }
      );
    }

    const patient = await getPatientRecord(
      code.trim()
    );

    if (!patient) {
      return NextResponse.json(
        {
          error: "Patient not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error(
      "Fetch patient error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to view this patient record.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to load patient record.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ code: string }>;
  }
) {
  try {
    const staff = await requireRole([
      ...PATIENT_UPDATE_ROLES,
    ]);

    const { code } = await params;

    if (!code?.trim()) {
      return NextResponse.json(
        {
          error: "Patient code is required.",
        },
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
    } = body;

    const patch: Record<string, unknown> = {};

    if (fullName !== undefined) {
      if (
        typeof fullName !== "string" ||
        !fullName.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Full name must be a non-empty string.",
          },
          { status: 400 }
        );
      }

      patch.full_name = fullName.trim();
    }

    if (age !== undefined) {
      patch.age = age;
    }

    if (gender !== undefined) {
      patch.gender = gender;
    }

    if (phone !== undefined) {
      patch.phone = phone;
    }

    if (coveragePlan !== undefined) {
      patch.coverage_plan = coveragePlan;
    }

    if (isWalkIn !== undefined) {
      patch.is_walk_in = isWalkIn;
    }

    if (status !== undefined) {
      patch.status = status;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        {
          error: "No fields to update.",
        },
        { status: 400 }
      );
    }

    const {
      data,
      error,
    } = await supabaseServer
      .from("patients")
      .update(patch)
      .eq("patient_code", code.trim())
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Patient not found.",
        },
        { status: 404 }
      );
    }

    await logActivity({
      module: "Admin",
      category: "ADMIN",
      action: `Patient record updated: ${data.full_name} (${data.patient_code})`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: data.id,
      details: `Patient record updated by ${staff.name} (${staff.staffId}).`,
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
    console.error(
      "Update patient error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to update patient records.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update patient.",
      },
      { status: 500 }
    );
  }
}