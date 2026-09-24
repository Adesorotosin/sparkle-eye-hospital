// lib/activity-log.ts

import { supabaseServer } from "@/lib/supabase-server";

type Category =
  | "CLINICAL"
  | "BILLING"
  | "ADMIN";

const MODULE_DEFAULT_CATEGORY: Record<
  string,
  Category
> = {
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
  patientId?: string | null;
  staffId?: string | null;
  category?: Category;
  details?: string;
  financialAmount?: number;
}) {
  try {
    const category =
      params.category ??
      MODULE_DEFAULT_CATEGORY[
        params.module
      ] ??
      "ADMIN";

    const { error } =
      await supabaseServer
        .from("activity_logs")
        .insert({
          patient_id:
            params.patientId ?? null,
          staff_id:
            params.staffId ?? null,
          module: params.module,
          category,
          action: params.action,
          details:
            params.details ?? null,
          financial_amount:
            params.financialAmount ?? null,
          performed_by:
            params.performedBy,
        });

    if (error) {
      console.warn(
        "Activity logging failed (non-blocking):",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "Activity log execution error caught:",
      error
    );
  }
}

export async function logSecurityEvent(
  params: {
    usernameAttempted: string;
    action: string;
    staffId?: string | null;
    ipAddress?: string | null;
    device?: string | null;
    riskLevel?:
      | "LOW"
      | "MEDIUM"
      | "CRITICAL";
  }
) {
  try {
    const { error } =
      await supabaseServer
        .from("security_logs")
        .insert({
          staff_id:
            params.staffId ?? null,
          username_attempted:
            params.usernameAttempted,
          action: params.action,
          ip_address:
            params.ipAddress ?? null,
          device:
            params.device ?? null,
          risk_level:
            params.riskLevel ?? "LOW",
        });

    if (error) {
      console.warn(
        "Security logging failed (non-blocking):",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "Security log execution error caught:",
      error
    );
  }
}