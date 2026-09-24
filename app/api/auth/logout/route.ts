import { NextResponse } from "next/server";

import { revokeCurrentSession } from "@/lib/server-auth";

export async function POST() {
  try {
    await revokeCurrentSession();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout route error:", error);

    return NextResponse.json(
      {
        error: "Failed to log out.",
      },
      { status: 500 }
    );
  }
}