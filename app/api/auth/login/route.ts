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

    // Assign a default role for testing if the username isn't recognized
    let role = "OPHTHALMOLOGIST"; // Default role when typing custom names
    
    if (email.toLowerCase().includes("cashier")) role = "CASHIER";
    if (email.toLowerCase().includes("admin")) role = "IT_ADMIN";
    if (email.toLowerCase().includes("pharm")) role = "PHARMACIST";

    // Set HTTP-only cookies for Next.js Middleware
    const cookieStore = await cookies();
    const cookieConfig = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 12,
    };

    cookieStore.set("is_logged_in", "true", cookieConfig);
    cookieStore.set("user_role", role, cookieConfig);
    cookieStore.set("staff_id", "STF-TEST", cookieConfig);

    return NextResponse.json({
      success: true,
      user: {
        staffId: "STF-TEST",
        name: email,
        role: role,
        token: "mock-test-token",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Server error during authentication." },
      { status: 500 }
    );
  }
}