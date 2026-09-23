import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    const authCookies = ["is_logged_in", "user_role", "staff_id"];

    authCookies.forEach((cookieName) => {
      // Clear with httpOnly false
      cookieStore.set(cookieName, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false,
      });

      // Clear with httpOnly true just in case
      cookieStore.set(cookieName, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
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