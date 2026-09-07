// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // Delete session cookies
  cookieStore.delete("is_logged_in");
  cookieStore.delete("user_role");
  cookieStore.delete("staff_id");

  return NextResponse.json({ success: true, message: "Logged out successfully" });
}