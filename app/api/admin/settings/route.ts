import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";

// --- TYPES FOR SYSTEM SETTINGS ---

export interface HospitalProfile {
  name: string;
  licenseId: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
}

export interface SystemModules {
  ehr: boolean;
  pharmacy: boolean;
  optical: boolean;
  billing: boolean;
  patientPortal: boolean;
  telemedicine: boolean;
}

export interface BillingDefaults {
  vatRate: string;
  invoiceDueDays: string;
}

export interface Department {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  staffCount: number;
}

export interface SystemSettingsPayload {
  profile: HospitalProfile;
  modules: SystemModules;
  billing: BillingDefaults;
  departments: Department[];
}

// --- MOCK IN-MEMORY DATABASE STORE ---
// This is still temporary.
// Persistence should be moved to Supabase in a later step.

let systemSettingsStore: SystemSettingsPayload = {
  profile: {
    name: "Sparkle Eye Specialist Hospital",
    licenseId: "MED-2024-LIC-00982",
    phone: "+234 801 234 5678",
    email: "support@sparkleeye.ng",
    address: "42 Vision Avenue, Lekki Phase 1",
    city: "Lagos",
    state: "Lagos State",
  },

  modules: {
    ehr: true,
    pharmacy: true,
    optical: true,
    billing: true,
    patientPortal: false,
    telemedicine: false,
  },

  billing: {
    vatRate: "7.5%",
    invoiceDueDays: "14 Days",
  },

  departments: [
    {
      id: 1,
      name: "Ophthalmology & OCT Diagnostic",
      status: "Active",
      staffCount: 12,
    },
    {
      id: 2,
      name: "Pharmacy & Dispensing",
      status: "Active",
      staffCount: 6,
    },
    {
      id: 3,
      name: "Surgical Suite & Recovery",
      status: "Active",
      staffCount: 8,
    },
  ],
};

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Authentication required.",
    },
    { status: 401 }
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "You are not authorized to manage system settings.",
    },
    { status: 403 }
  );
}

function serverErrorResponse(message: string) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 500 }
  );
}

// --- GET HANDLER ---

export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);

    return NextResponse.json(
      {
        success: true,
        data: systemSettingsStore,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return unauthorizedResponse();
      }

      if (error.message === "FORBIDDEN") {
        return forbiddenResponse();
      }
    }

    console.error(
      "GET /api/admin/settings error:",
      error
    );

    return serverErrorResponse(
      "Failed to retrieve system settings."
    );
  }
}

// --- PUT HANDLER ---

export async function PUT(request: Request) {
  try {
    await requireRole(["IT_ADMIN"]);

    const body =
      (await request.json()) as Partial<SystemSettingsPayload>;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload.",
        },
        { status: 400 }
      );
    }

    systemSettingsStore = {
      ...systemSettingsStore,

      ...(body.profile && {
        profile: {
          ...systemSettingsStore.profile,
          ...body.profile,
        },
      }),

      ...(body.modules && {
        modules: {
          ...systemSettingsStore.modules,
          ...body.modules,
        },
      }),

      ...(body.billing && {
        billing: {
          ...systemSettingsStore.billing,
          ...body.billing,
        },
      }),

      ...(body.departments && {
        departments: body.departments,
      }),
    };

    return NextResponse.json(
      {
        success: true,
        message:
          "System settings updated successfully.",
        data: systemSettingsStore,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHENTICATED") {
        return unauthorizedResponse();
      }

      if (error.message === "FORBIDDEN") {
        return forbiddenResponse();
      }
    }

    console.error(
      "PUT /api/admin/settings error:",
      error
    );

    return serverErrorResponse(
      "Failed to update system settings."
    );
  }
}

// --- POST HANDLER ---
// Keep POST as a compatibility alias for PUT.

export async function POST(request: Request) {
  return PUT(request);
}