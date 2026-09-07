import { NextResponse } from "next/server";

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
// Replace this with your actual database call (e.g., Supabase, Prisma, or MongoDB)
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
    { id: 1, name: "Ophthalmology & OCT Diagnostic", status: "Active", staffCount: 12 },
    { id: 2, name: "Pharmacy & Dispensing", status: "Active", staffCount: 6 },
    { id: 3, name: "Surgical Suite & Recovery", status: "Active", staffCount: 8 },
  ],
};

// --- GET HANDLER: FETCH SYSTEM SETTINGS ---
export async function GET() {
  try {
    // TODO: Fetch settings from your database
    // const settings = await db.systemSettings.findFirst();

    return NextResponse.json(
      {
        success: true,
        data: systemSettingsStore,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve system settings." },
      { status: 500 }
    );
  }
}

// --- PUT/POST HANDLER: UPDATE SYSTEM SETTINGS ---
export async function PUT(request: Request) {
  try {
    const body: Partial<SystemSettingsPayload> = await request.json();

    // basic validation check
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    // Merge incoming changes into store
    systemSettingsStore = {
      ...systemSettingsStore,
      ...(body.profile && { profile: { ...systemSettingsStore.profile, ...body.profile } }),
      ...(body.modules && { modules: { ...systemSettingsStore.modules, ...body.modules } }),
      ...(body.billing && { billing: { ...systemSettingsStore.billing, ...body.billing } }),
      ...(body.departments && { departments: body.departments }),
    };

    // TODO: Save to your database table
    // await db.systemSettings.update({ where: { id: 1 }, data: systemSettingsStore });

    return NextResponse.json(
      {
        success: true,
        message: "System settings updated successfully.",
        data: systemSettingsStore,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update system settings." },
      { status: 500 }
    );
  }
}

// Support POST as an alias for PUT
export async function POST(request: Request) {
  return PUT(request);
}