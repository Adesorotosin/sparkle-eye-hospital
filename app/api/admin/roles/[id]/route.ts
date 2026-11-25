import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { PERMISSION_KEYS } from "@/lib/permissions";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
function validPermissions(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, enabled]) => PERMISSION_KEYS.includes(key as typeof PERMISSION_KEYS[number]) && typeof enabled === "boolean");
}
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["IT_ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const hasChanges = body.name !== undefined || body.description !== undefined || body.permissions !== undefined || body.isActive !== undefined;
    if (!hasChanges) return json({ error: "No changes supplied." }, 400);
    const updates: Record<string, unknown> = { updated_by: actor.id, updated_at: new Date().toISOString() };
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) return json({ error: "Role name must be 1–80 characters." }, 400);
      const slug = slugify(body.name);
      if (!slug) return json({ error: "Role name must contain letters or numbers." }, 400);
      updates.name = body.name.trim(); updates.slug = slug;
    }
    if (body.description !== undefined) {
      if (body.description !== null && (typeof body.description !== "string" || body.description.trim().length > 500)) return json({ error: "Description must be 500 characters or fewer." }, 400);
      updates.description = typeof body.description === "string" ? body.description.trim() || null : null;
    }
    if (body.permissions !== undefined) {
      if (!validPermissions(body.permissions)) return json({ error: "Permissions contain unsupported keys or invalid values." }, 400);
      updates.permissions = body.permissions;
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") return json({ error: "isActive must be boolean." }, 400);
      if (body.isActive === false) {
        const { count, error: countError } = await supabaseServer
          .from("staff").select("id", { count: "exact", head: true }).eq("custom_role_id", id);
        if (countError) throw countError;
        if ((count ?? 0) > 0) return json({ error: "Reassign staff members before deactivating this role. Assigned staff access fails closed if a role becomes inactive." }, 409);
      }
      updates.is_active = body.isActive;
    }
    if (Object.keys(updates).length === 3 && body.name === undefined && body.description === undefined && body.permissions === undefined && body.isActive === undefined) return json({ error: "No changes supplied." }, 400);
    const { data, error } = await supabaseServer.from("custom_roles").update(updates).eq("id", id).select("id,name,slug,description,base_role,permissions,is_active,created_at,updated_at").maybeSingle();
    if (error) { if (error.code === "23505") return json({ error: "A custom role with that name already exists." }, 409); throw error; }
    if (!data) return json({ error: "Custom role not found." }, 404);
    try {
      await logActivity({ module: "Admin", category: "ADMIN", action: `Custom role updated: ${data.name}`, performedBy: actor.name, staffId: actor.id });
    } catch (logError) {
      console.warn("Custom role update audit log failed:", logError);
    }
    return json({ role: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : message === "FORBIDDEN" ? "You cannot manage roles." : "Unable to update custom role." }, message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["IT_ADMIN"]);
    const { id } = await params;
    const { count, error: countError } = await supabaseServer.from("staff").select("id", { count: "exact", head: true }).eq("custom_role_id", id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) return json({ error: "This role is assigned to staff. Reassign them before deleting it." }, 409);
    const { error } = await supabaseServer.from("custom_roles").delete().eq("id", id);
    if (error) throw error;
    try {
      await logActivity({ module: "Admin", category: "ADMIN", action: `Custom role deleted: ${id}`, performedBy: actor.name, staffId: actor.id });
    } catch (logError) {
      console.warn("Custom role deletion audit log failed:", logError);
    }
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : "Unable to delete custom role." }, message === "UNAUTHENTICATED" ? 401 : 403);
  }
}
