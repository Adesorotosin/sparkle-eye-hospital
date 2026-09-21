// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // List every auth cookie name used across your login flow / middleware
    const authCookies = [
      "is_logged_in",
      "user_role",
      "staff_id",
      "auth_token",
      "token",
      "session",
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
    ];

    authCookies.forEach((cookieName) => {
      cookieStore.set(cookieName, "", {
        path: "/",
        expires: new Date(0),
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    });

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json(
      { error: "Failed to log out." },
      { status: 500 }
    );
  }
}