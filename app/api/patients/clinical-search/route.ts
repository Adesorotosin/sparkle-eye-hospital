import { NextRequest, NextResponse } from "next/server";
import { requireRole, requirePermission } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const staff = await requireRole(["RECEPTIONIST"]);
    await requirePermission("patients.view");
    const term = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
    if (term.length < 2) {
      return NextResponse.json({ patients: [], message: "Enter at least 2 characters." });
    }

    const pattern = `%${term}%`;
    const scope = request.nextUrl.searchParams.get("scope") ?? "all";
    if (!["all", "diagnosis", "symptoms"].includes(scope)) {
      return NextResponse.json({ error: "Invalid clinical search scope." }, { status: 400 });
    }
    const canSearchClinical = staff.permissions["clinical.view"] === true;
    if (scope !== "all" && !canSearchClinical) {
      return NextResponse.json({ error: "Clinical-history search requires clinical-view permission." }, { status: 403 });
    }
    const searchClinical = canSearchClinical;
    const [nameRes, codeRes, phoneRes, regRes, diagnosisRes, complaintRes, historyRes, triageRes] = await Promise.all([
      scope === "all" ? supabaseServer.from("patients").select("id").ilike("full_name", pattern).limit(100) : Promise.resolve({ data: [], error: null }),
      scope === "all" ? supabaseServer.from("patients").select("id").ilike("patient_code", pattern).limit(100) : Promise.resolve({ data: [], error: null }),
      scope === "all" ? supabaseServer.from("patients").select("id").ilike("phone", pattern).limit(100) : Promise.resolve({ data: [], error: null }),
      scope === "all" ? supabaseServer.from("patients").select("id").ilike("registration_number", pattern).limit(100) : Promise.resolve({ data: [], error: null }),
      searchClinical && scope !== "symptoms" ? supabaseServer.from("encounters").select("patient_id, diagnosis").ilike("diagnosis", pattern).limit(200) : Promise.resolve({ data: [], error: null }),
      searchClinical && scope !== "diagnosis" ? supabaseServer.from("encounters").select("patient_id, presenting_complaint, history_of_presenting_complaint").ilike("presenting_complaint", pattern).limit(200) : Promise.resolve({ data: [], error: null }),
      scope !== "diagnosis" ? supabaseServer.from("encounters").select("patient_id, presenting_complaint, history_of_presenting_complaint").ilike("history_of_presenting_complaint", pattern).limit(200) : Promise.resolve({ data: [], error: null }),
      searchClinical && scope !== "diagnosis" ? supabaseServer.from("vitals").select("patient_id, primary_complaint").ilike("primary_complaint", pattern).limit(200) : Promise.resolve({ data: [], error: null }),
    ]);
    const failures = [nameRes, codeRes, phoneRes, regRes, diagnosisRes, complaintRes, historyRes, triageRes].filter(result => result.error);
    if (failures.length) throw failures[0].error;

    const matches = new Map<string, Set<string>>();
    const add = (id: string | null, label: string) => {
      if (!id) return;
      const labels = matches.get(id) ?? new Set<string>();
      labels.add(label);
      matches.set(id, labels);
    };
    for (const row of nameRes.data ?? []) add(row.id, "Patient name");
    for (const row of codeRes.data ?? []) add(row.id, "Patient code");
    for (const row of phoneRes.data ?? []) add(row.id, "Phone");
    for (const row of regRes.data ?? []) add(row.id, "Registration number");
    for (const row of diagnosisRes.data ?? []) add(row.patient_id, "Diagnosis");
    for (const row of complaintRes.data ?? []) add(row.patient_id, "Presenting complaint");
    for (const row of historyRes.data ?? []) add(row.patient_id, "Clinical history");
    for (const row of triageRes.data ?? []) add(row.patient_id, "Triage complaint");

    const ids = [...matches.keys()].slice(0, 100);
    if (!ids.length) return NextResponse.json({ patients: [] });

    const { data, error } = await supabaseServer
      .from("patients")
      .select("id, patient_code, registration_number, full_name, coverage_plan, age, date_of_birth, gender, phone, status, is_walk_in, last_visit_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const patients = (data ?? []).map(patient => ({
      id: patient.id,
      patientId: patient.patient_code,
      registrationNumber: patient.registration_number ?? null,
      fullName: patient.full_name,
      coveragePlan: patient.coverage_plan,
      age: patient.age,
      dateOfBirth: patient.date_of_birth ?? null,
      gender: patient.gender,
      phone: patient.phone,
      status: patient.status,
      isWalkIn: patient.is_walk_in,
      lastVisitAt: patient.last_visit_at,
      matchReasons: [...(matches.get(patient.id) ?? [])],
    }));
    return NextResponse.json({ patients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Only authorized Reception staff can search patient clinical history." }, { status: 403 });
    console.error("Reception clinical patient search failed:", error);
    return NextResponse.json({ error: "Clinical patient search is temporarily unavailable." }, { status: 500 });
  }
}