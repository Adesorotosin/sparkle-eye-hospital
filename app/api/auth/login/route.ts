// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both username and password." },
        { status: 400 }
      );
    }

    const inputLower = email.toLowerCase().trim();

    // Determine Role
    let role = "OPHTHALMOLOGIST"; // Default fallback

    if (inputLower.includes("nurse")) {
      role = "NURSE";
    } else if (inputLower.includes("pharm")) {
      role = "PHARMACIST";
    } else if (inputLower.includes("cashier") || inputLower.includes("billing")) {
      role = "CASHIER";
    } else if (inputLower.includes("admin")) {
      role = "IT_ADMIN";
    } else if (inputLower.includes("reception")) {
      role = "RECEPTIONIST";
    } else if (inputLower.includes("doc") || inputLower.includes("eye")) {
      role = "DOCTOR";
    }

    // Set fresh cookies
    const cookieStore = await cookies();
    const cookieConfig = {
      httpOnly: false, // Set to false so document.cookie and middleware both read seamlessly during local testing
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 12,
    };

    cookieStore.set("is_logged_in", "true", cookieConfig);
    cookieStore.set("user_role", role, cookieConfig);
    cookieStore.set("staff_id", `STF-${role}`, cookieConfig);

    return NextResponse.json({
      success: true,
      user: {
        staffId: `STF-${role}`,
        name: email,
        role: role,
        token: `mock-token-${role.toLowerCase()}`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Server error during authentication." },
      { status: 500 }
    );
  }
}