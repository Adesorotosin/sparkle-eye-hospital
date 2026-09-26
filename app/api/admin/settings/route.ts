// app/api/admin/settings/route.ts

import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

const DEFAULT_MODULES = {
  ehr: true,
  pharmacy: true,
  optical: true,
  billing: true,
  patientPortal: false,
  telemedicine: false,
};

const DEFAULT_BILLING = {
  vatRate: "7.5%",
  invoiceDueDays: "30 Days",
};

const DEFAULT_OPERATIONAL_HOURS = {
  mode: "24/7",
  monday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  tuesday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  wednesday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  thursday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  friday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  saturday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  sunday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
};

const DEFAULT_INTEGRATIONS = {
  paymentGateway: {
    configured: false,
  },
  sms: {
    configured: false,
  },
  laboratory: {
    configured: false,
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeModules(value: unknown) {
  if (!isPlainObject(value)) {
    return null;
  }

  const keys = [
    "ehr",
    "pharmacy",
    "optical",
    "billing",
    "patientPortal",
    "telemedicine",
  ] as const;

  const result: Record<string, boolean> = {};

  for (const key of keys) {
    if (typeof value[key] !== "boolean") {
      return null;
    }

    result[key] = value[key];
  }

  return result;
}

function sanitizeBilling(value: unknown) {
  if (!isPlainObject(value)) {
    return null;
  }

  const vatRate = value.vatRate;
  const invoiceDueDays = value.invoiceDueDays;

  if (
    typeof vatRate !== "string" ||
    typeof invoiceDueDays !== "string"
  ) {
    return null;
  }

  if (vatRate.trim().length > 20) {
    return null;
  }

  if (invoiceDueDays.trim().length > 50) {
    return null;
  }

  return {
    vatRate: vatRate.trim(),
    invoiceDueDays: invoiceDueDays.trim(),
  };
}

function sanitizeOperationalHours(value: unknown) {
  if (!isPlainObject(value)) {
    return null;
  }

  const mode = value.mode;

  if (typeof mode !== "string") {
    return null;
  }

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;

  const result: Record<string, unknown> = {
    mode: mode.trim(),
  };

  for (const day of days) {
    const entry = value[day];

    if (!isPlainObject(entry)) {
      return null;
    }

    if (typeof entry.enabled !== "boolean") {
      return null;
    }

    if (
      typeof entry.open !== "string" ||
      typeof entry.close !== "string"
    ) {
      return null;
    }

    if (
      !/^\d{2}:\d{2}$/.test(entry.open) ||
      !/^\d{2}:\d{2}$/.test(entry.close)
    ) {
      return null;
    }

    result[day] = {
      enabled: entry.enabled,
      open: entry.open,
      close: entry.close,
    };
  }

  return result;
}

// GET — load persisted admin settings.
export async function GET() {
  try {
    const staff = await requireRole(["IT_ADMIN"]);

    const [
      { data: settings, error: settingsError },
      { data: departments, error: departmentsError },
      { count: totalStaff },
    ] = await Promise.all([
      supabaseServer
        .from("system_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle(),

      supabaseServer
        .from("hospital_departments")
        .select("id, name, status, created_at, updated_at")
        .order("name", { ascending: true }),

      supabaseServer
        .from("staff")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("is_active", true),
    ]);

    if (settingsError) {
      console.error(
        "System settings query error:",
        settingsError
      );

      throw settingsError;
    }

    if (departmentsError) {
      console.error(
        "Departments query error:",
        departmentsError
      );

      throw departmentsError;
    }

    const safeSettings = settings ?? {
      id: "default",
      hospital_name: "Sparkle Eye Specialist Hospital",
      modules: DEFAULT_MODULES,
      billing: DEFAULT_BILLING,
      operational_hours: DEFAULT_OPERATIONAL_HOURS,
      integrations: DEFAULT_INTEGRATIONS,
    };

    return NextResponse.json({
      success: true,
      settings: {
        hospitalName:
          safeSettings.hospital_name ||
          "Sparkle Eye Specialist Hospital",

        modules:
          safeSettings.modules ??
          DEFAULT_MODULES,

        billing:
          safeSettings.billing ??
          DEFAULT_BILLING,

        operationalHours:
          safeSettings.operational_hours ??
          DEFAULT_OPERATIONAL_HOURS,

        integrations:
          safeSettings.integrations ??
          DEFAULT_INTEGRATIONS,

        updatedAt: safeSettings.updated_at ?? null,
        updatedBy: staff.name,
      },

      departments: (departments ?? []).map((department) => ({
        id: department.id,
        name: department.name,
        status: department.status,
        staffCount: 0,
      })),

      totalStaff: totalStaff ?? 0,
    });
  } catch (error) {
    console.error("Admin settings GET error:", error);

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
            "You do not have permission to access system settings.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to load system settings.",
      },
      { status: 500 }
    );
  }
}

// PATCH — save persisted system settings.
export async function PATCH(request: Request) {
  try {
    const staff = await requireRole(["IT_ADMIN"]);

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (!isPlainObject(body)) {
      return NextResponse.json(
        {
          error: "Request body must be an object.",
        },
        { status: 400 }
      );
    }

    const hospitalName = body.hospitalName;

    if (
      typeof hospitalName !== "string" ||
      !hospitalName.trim()
    ) {
      return NextResponse.json(
        {
          error: "Hospital name is required.",
        },
        { status: 400 }
      );
    }

    if (hospitalName.trim().length > 150) {
      return NextResponse.json(
        {
          error:
            "Hospital name must not exceed 150 characters.",
        },
        { status: 400 }
      );
    }

    const modules = sanitizeModules(body.modules);

    if (!modules) {
      return NextResponse.json(
        {
          error: "Invalid module configuration.",
        },
        { status: 400 }
      );
    }

    const billing = sanitizeBilling(body.billing);

    if (!billing) {
      return NextResponse.json(
        {
          error: "Invalid billing configuration.",
        },
        { status: 400 }
      );
    }

    const operationalHours =
      sanitizeOperationalHours(
        body.operationalHours
      );

    if (!operationalHours) {
      return NextResponse.json(
        {
          error:
            "Invalid operational hours configuration.",
        },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabaseServer
        .from("system_settings")
        .upsert(
          {
            id: "default",
            hospital_name:
              hospitalName.trim(),
            modules,
            billing,
            operational_hours:
              operationalHours,
            updated_by: staff.id,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        )
        .select("*")
        .single();

    if (error) {
      console.error(
        "System settings save error:",
        error
      );

      throw error;
    }

    // Record the administrative change.
    const { error: logError } =
      await supabaseServer
        .from("activity_logs")
        .insert({
          staff_id: staff.id,
          module: "Admin",
          category: "ADMIN",
          action:
            "Updated system settings",
          details:
            `System configuration updated for ${hospitalName.trim()}.`,
          performed_by: staff.name,
        });

    if (logError) {
      console.warn(
        "Failed to record settings activity log:",
        logError
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "System settings saved successfully.",
      settings: {
        hospitalName:
          data.hospital_name,
        modules: data.modules,
        billing: data.billing,
        operationalHours:
          data.operational_hours,
        integrations:
          data.integrations ??
          DEFAULT_INTEGRATIONS,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Admin settings PATCH error:",
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
            "Only IT administrators can change system settings.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to save system settings.",
      },
      { status: 500 }
    );
  }
}