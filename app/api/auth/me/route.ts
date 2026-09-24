import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";

export async function GET() {
  try {
    const staff = await requireAuth();

    return NextResponse.json({
      success: true,
      user: staff,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    console.error("Auth profile error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load authenticated user.",
      },
      { status: 500 }
    );
  }
}