import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { requireAuth } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",").at(-1)?.trim() ||
    request.headers.get("x-real-ip") ||
    "Unknown"
  );
}

export async function POST(request: Request) {
  const staff = await requireAuth().catch(() => null);
  if (!staff) {
    return json({ success: false, error: "Your session has expired. Please sign in again." }, 401);
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || password.length > 1024) {
    return json({ success: false, error: "Enter your account password to unlock." }, 400);
  }

  const pepper = process.env.SUPABASE_SECRET_KEY;
  if (!pepper) {
    console.error("Session unlock rate-limit secret is unavailable.");
    return json({ success: false, error: "Secure verification is temporarily unavailable." }, 503);
  }

  const ip = getRequestIp(request);
  const hash = (value: string) =>
    createHmac("sha256", pepper).update(value).digest("hex");
  const rateLimitKeys = {
    identityIp: hash(`identity-ip:${staff.username.toLowerCase()}:${ip}`),
    ip: hash(`ip:${ip}`),
  };

  const { data: isRateLimited, error: rateLimitError } =
    await supabaseServer.rpc("is_login_rate_limited", {
      p_identity_ip_hash: rateLimitKeys.identityIp,
      p_ip_hash: rateLimitKeys.ip,
    });

  if (rateLimitError) {
    console.error("Session unlock rate-limit check failed:", rateLimitError);
    return json({ success: false, error: "Secure verification is temporarily unavailable." }, 503);
  }
  if (isRateLimited === true) {
    return json({ success: false, error: "Too many attempts. Please wait 15 minutes before trying again." }, 429);
  }

  const { data: credential, error: credentialError } = await supabaseServer
    .from("staff")
    .select("password_hash")
    .eq("id", staff.id)
    .maybeSingle();

  if (credentialError || !credential?.password_hash) {
    console.error("Session unlock credential lookup failed:", credentialError);
    return json({ success: false, error: "Unable to verify your account right now." }, 503);
  }

  const passwordMatches = await bcrypt.compare(password, credential.password_hash);
  if (!passwordMatches) {
    const { error: recordError } = await supabaseServer.rpc("record_login_failure", {
      p_identity_ip_hash: rateLimitKeys.identityIp,
      p_ip_hash: rateLimitKeys.ip,
    });
    if (recordError) {
      console.error("Session unlock failed-attempt recording failed:", recordError);
      return json({ success: false, error: "Secure verification is temporarily unavailable." }, 503);
    }
    return json({ success: false, error: "Incorrect password. Please try again." }, 401);
  }

  const { error: clearError } = await supabaseServer.rpc("clear_login_rate_limit", {
    p_identity_ip_hash: rateLimitKeys.identityIp,
    p_ip_hash: rateLimitKeys.ip,
  });
  if (clearError) {
    console.error("Session unlock rate-limit reset failed:", clearError);
    return json({ success: false, error: "Unable to complete verification. Please try again." }, 503);
  }

  return json({ success: true });
}
