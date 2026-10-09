import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

type Row = Record<string, unknown>;

function firstText(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstDate(row: Row, keys: string[]): Date | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);

    const [invoiceResult, patientResult] = await Promise.all([
      supabaseServer.from("invoices").select("*"),
      supabaseServer.from("patients").select("*"),
    ]);

    if (invoiceResult.error) throw invoiceResult.error;
    if (patientResult.error) throw patientResult.error;

    const invoices = (invoiceResult.data ?? []) as Row[];
    const patients = (patientResult.data ?? []) as Row[];
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);

    const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];
    const revenueTrend = weekLabels.map((label) => ({
      label,
      revenue: 0,
    }));

    for (const invoice of invoices) {
      if (String(invoice.status ?? "").toLowerCase() !== "paid") continue;
      const date = firstDate(invoice, ["paid_at", "created_at"]);
      if (!date || date < start || date > now) continue;
      const dayOffset = Math.floor((date.getTime() - start.getTime()) / 86400000);
      const weekIndex = Math.min(3, Math.max(0, Math.floor(dayOffset / 7)));
      revenueTrend[weekIndex].revenue += Number(invoice.grand_total ?? invoice.total_amount ?? 0) || 0;
    }

    const specialtyKeys = ["eye_specialty", "specialty", "ophthalmic_specialty", "clinical_specialty"];
    const specialtyCounts = new Map<string, number>();
    let specialtyTracked = false;

    for (const patient of patients) {
      const specialty = firstText(patient, specialtyKeys);
      if (!specialty) continue;
      specialtyTracked = true;
      specialtyCounts.set(specialty, (specialtyCounts.get(specialty) ?? 0) + 1);
    }

    const referralKeys = [
      "referring_physician",
      "referring_doctor",
      "referrer_name",
      "referring_physician_name",
    ];
    const referralCounts = new Map<string, number>();
    let referralTracked = false;

    for (const patient of patients) {
      const physician = firstText(patient, referralKeys);
      if (!physician) continue;
      referralTracked = true;
      referralCounts.set(physician, (referralCounts.get(physician) ?? 0) + 1);
    }

    const claimsModuleAvailable = false;

    return NextResponse.json({
      revenueTrend,
      patientVolumeBySpecialty: [...specialtyCounts.entries()]
        .map(([specialty, patients]) => ({ specialty, patients }))
        .sort((a, b) => b.patients - a.patients),
      specialtyTracked,
      topReferringPhysicians: [...referralCounts.entries()]
        .map(([physician, referrals]) => ({ physician, referrals }))
        .sort((a, b) => b.referrals - a.referrals)
        .slice(0, 5),
      referralTracked,
      claimsModuleAvailable,
      claimsSummary: claimsModuleAvailable
        ? { approved: 0, pending: 0, rejected: 0, total: 0 }
        : null,
      period: "Last 30 Days",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "You do not have permission to view admin analytics." }, { status: 403 });
    }

    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Failed to load dashboard analytics." }, { status: 500 });
  }
}
