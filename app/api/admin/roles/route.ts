import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { PERMISSION_CATALOG, PERMISSION_KEYS } from "@/lib/permissions";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
function validPermissions(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, enabled]) => PERMISSION_KEYS.includes(key as typeof PERMISSION_KEYS[number]) && typeof enabled === "boolean");
}
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);
    const { data, error } = await supabaseServer.from("custom_roles").select("id,name,slug,description,base_role,permissions,is_active,created_at,updated_at").order("name");
    if (error) throw error;
    return json({ roles: data ?? [], permissions: PERMISSION_CATALOG.filter((item) => !item.group.startsWith("Legacy")) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : "You cannot manage roles." }, message === "UNAUTHENTICATED" ? 401 : 403);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["IT_ADMIN"]);
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const baseRole = body.baseRole;
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const permissions = body.permissions ?? {};
    const allowed = ["IT_ADMIN","OPHTHALMOLOGIST","DOCTOR","PHARMACIST","NURSE","CASHIER","RECEPTIONIST","LAB_SCIENTIST","OPTICIAN","OPTOMETRIST","INVENTORY_MANAGER"];
    if (!name || name.length > 80 || !allowed.includes(baseRole) || !validPermissions(permissions)) return json({ error: "Provide a role name, valid predefined base role, and supported boolean permissions." }, 400);
    if (baseRole === "IT_ADMIN") return json({ error: "Custom roles cannot inherit IT administrator authority." }, 400);
    const { data, error } = await supabaseServer.from("custom_roles").insert({ name, slug: slugify(name), description, base_role: baseRole, permissions, created_by: actor.id, updated_by: actor.id }).select("id,name,slug,description,base_role,permissions,is_active,created_at,updated_at").single();
    if (error) {
      if (error.code === "23505") return json({ error: "A custom role with that name already exists." }, 409);
      throw error;
    }
    return json({ role: data }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : message === "FORBIDDEN" ? "You cannot manage roles." : "Unable to create custom role." }, message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500);
  }
}
