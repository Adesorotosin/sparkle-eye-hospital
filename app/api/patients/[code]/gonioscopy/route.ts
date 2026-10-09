import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { getPatientByCode } from "@/lib/patient-flow";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ code: string }>;
  }
) {
  try {
    await requireRole(["IT_ADMIN", "OPHTHALMOLOGIST", "DOCTOR"]);

    const { code } = await params;
    const patientCode = code?.trim();

    if (!patientCode) {
      return NextResponse.json(
        { error: "Patient code is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const gonioscopyOD =
      typeof body?.gonioscopyOD === "string"
        ? body.gonioscopyOD.trim() || null
        : null;
    const gonioscopyOS =
      typeof body?.gonioscopyOS === "string"
        ? body.gonioscopyOS.trim() || null
        : null;

    const patient = await getPatientByCode(patientCode);

    if (!patient) {
      return NextResponse.json(
        { error: `Patient ${patientCode} was not found.` },
        { status: 404 }
      );
    }

    const { data: vitals, error: vitalsError } = await supabaseServer
      .from("vitals")
      .select("id")
      .eq("patient_id", patient.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vitalsError) {
      console.error("Unable to find patient vitals for gonioscopy:", vitalsError);
      return NextResponse.json(
        { error: "Unable to load the patient's triage record." },
        { status: 500 }
      );
    }

    if (!vitals) {
      return NextResponse.json(
        {
          error:
            "No triage measurements exist for this patient yet. Record triage first, then save gonioscopy findings.",
        },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseServer
      .from("vitals")
      .update({
        gonioscopy_od: gonioscopyOD,
        gonioscopy_os: gonioscopyOS,
      })
      .eq("id", vitals.id);

    if (updateError) {
      console.error("Unable to save gonioscopy findings:", updateError);
      return NextResponse.json(
        { error: "Failed to save gonioscopy findings." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Gonioscopy findings saved successfully.",
    });
  } catch (error) {
    console.error("Save gonioscopy error:", error);

    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "You do not have permission to save gonioscopy findings." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save gonioscopy findings." },
      { status: 500 }
    );
  }
}
