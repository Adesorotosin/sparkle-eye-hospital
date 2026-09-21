// lib/activity-log.ts
//
// Shared logging for the Admin Audit page: operational activity
// (clinical/billing/admin actions) and security events (logins), used
// across every part of the app so Admin can see what's happening
// everywhere from one place.

import { supabase } from "@/lib/supabase";

type Category = "CLINICAL" | "BILLING" | "ADMIN";

const MODULE_DEFAULT_CATEGORY: Record<string, Category> = {
  Triage: "CLINICAL",
  Diagnostics: "CLINICAL",
  Consultation: "CLINICAL",
  Pharmacy: "CLINICAL",
  Billing: "BILLING",
  Admin: "ADMIN",
  Scheduling: "ADMIN",
};

export async function logActivity(params: {
  module: string;
  action: string;
  performedBy: string;
  patientId?: string | null; // internal patients.id (uuid), not the human-facing code
  staffId?: string | null;
  category?: Category;
  details?: string;
  financialAmount?: number;
}) {
  try {
    const category = params.category ?? MODULE_DEFAULT_CATEGORY[params.module] ?? "ADMIN";
    const { error } = await supabase.from("activity_logs").insert({
      patient_id: params.patientId ?? null,
      staff_id: params.staffId ?? null,
      module: params.module,
      category,
      action: params.action,
      details: params.details ?? null,
      financial_amount: params.financialAmount ?? null,
      performed_by: params.performedBy,
    });
    
    if (error) {
      console.warn("Activity logging failed (non-blocking):", error.message);
    }
  } catch (err) {
    console.warn("Activity log execution error caught:", err);
  }
}

export async function logSecurityEvent(params: {
  usernameAttempted: string;
  action: string;
  staffId?: string | null;
  ipAddress?: string | null;
  device?: string | null;
  riskLevel?: "LOW" | "MEDIUM" | "CRITICAL";
}) {
  try {
    // Route logs to activity_logs table to match Supabase database schema
    const { error } = await supabase.from("activity_logs").insert({
      staff_id: params.staffId ?? null,
      module: "Security",
      category: "ADMIN",
      action: params.action,
      details: `Username: ${params.usernameAttempted} | IP: ${params.ipAddress ?? "Unknown"} | Device: ${params.device ?? "Unknown"} | Risk: ${params.riskLevel ?? "LOW"}`,
      performed_by: params.usernameAttempted,
    });

    if (error) {
      console.warn("Security logging failed (non-blocking):", error.message);
    }
  } catch (err) {
    console.warn("Security log execution error caught:", err);
  }
}