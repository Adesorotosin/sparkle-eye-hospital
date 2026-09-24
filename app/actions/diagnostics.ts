"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

export type DiagnosticQueueItem = {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  price: number;
  status: "ready_for_test" | "completed";
  createdAt: string;
  findings?: string;
  interpretation?: string;
};

export async function getDiagnosticQueue() {
  try {
    await requireRole(["IT_ADMIN", "NURSE", "DOCTOR", "OPHTHALMOLOGIST"]);

    const { data, error } = await supabaseServer
      .from("diagnostic_orders")
      .select("id, patient_id, name, price, status, findings, interpretation, created_at, patients!inner(patient_code, full_name)")
      .in("status", ["ready_for_test", "completed"])
      .order("created_at", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      orders: (data ?? []).map((row: any) => ({
        id: row.id,
        patientId: row.patients.patient_code,
        patientName: row.patients.full_name,
        testName: row.name,
        price: Number(row.price ?? 0),
        status: row.status,
        findings: row.findings ?? "",
        interpretation: row.interpretation ?? "",
        createdAt: row.created_at,
      })) as DiagnosticQueueItem[],
    };
  } catch (error) {
    console.error("Diagnostic queue error:", error);
    return {
      success: false,
      message: error instanceof Error && error.message === "FORBIDDEN"
        ? "You are not authorized to access diagnostics."
        : "Unable to load diagnostic requests.",
      orders: [] as DiagnosticQueueItem[],
    };
  }
}

export async function completeDiagnosticOrder(input: {
  id: string;
  findings: string;
  interpretation: string;
}) {
  try {
    const staff = await requireRole(["IT_ADMIN", "NURSE", "DOCTOR", "OPHTHALMOLOGIST"]);

    if (!input.id?.trim()) return { success: false, message: "Diagnostic order is required." };
    if (!input.findings?.trim()) return { success: false, message: "Please enter the investigation findings." };

    const { data: order, error: lookupError } = await supabaseServer
      .from("diagnostic_orders")
      .select("id, patient_id, name, status, patients!inner(patient_code, full_name)")
      .eq("id", input.id)
      .maybeSingle();

    if (lookupError || !order) return { success: false, message: "Diagnostic order not found." };

    if (order.status !== "ready_for_test") {
      return {
        success: false,
        message: order.status === "completed"
          ? "This investigation has already been completed."
          : "This investigation is not ready for testing. Cashier payment must be completed first.",
      };
    }

    const { error: updateError } = await supabaseServer
      .from("diagnostic_orders")
      .update({
        status: "completed",
        findings: input.findings.trim(),
        interpretation: input.interpretation?.trim() || null,
        completed_by: staff.id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("status", "ready_for_test");

    if (updateError) throw updateError;

    await logActivity({
      module: "Diagnostics",
      category: "CLINICAL",
      action: `Diagnostic completed: ${order.name}`,
      performedBy: staff.name,
      staffId: staff.id,
      patientId: order.patient_id,
      details: JSON.stringify({
        diagnosticOrderId: order.id,
        patientCode: order.patients.patient_code,
        testName: order.name,
        findings: input.findings.trim(),
        interpretation: input.interpretation?.trim() || null,
      }),
    });

    revalidatePath("/diagnostics");
    revalidatePath(`/doctor/patients/${order.patients.patient_code}/encounter`);

    return { success: true, message: "Investigation result recorded and sent to the doctor." };
  } catch (error) {
    console.error("Complete diagnostic order error:", error);
    return {
      success: false,
      message: error instanceof Error && error.message === "FORBIDDEN"
        ? "You are not authorized to complete diagnostic investigations."
        : "Unable to record the investigation result.",
    };
  }
}
