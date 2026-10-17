-- Restrict inventory tables to trusted server-side operations.
-- Inventory reads and writes are routed through server actions/API handlers
-- that enforce staff-role authorization. Do not expose these tables directly
-- to browser clients using anon/authenticated keys.
--
-- This migration changes permissions/policies only; it does not modify stock,
-- inventory records, movement history, suppliers, or staff roles.

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Remove the existing policies that allow public reads and unrestricted
-- writes to inventory_items.
DROP POLICY IF EXISTS "Allow public read access"
  ON public.inventory_items;
DROP POLICY IF EXISTS "Enable full access for all roles"
  ON public.inventory_items;

-- No anon/authenticated table access is needed: server-side handlers use
-- SUPABASE_SECRET_KEY after requireRole() has authorized the staff member.
REVOKE ALL PRIVILEGES ON TABLE
  public.inventory_items,
  public.inventory_suppliers,
  public.inventory_movements
FROM PUBLIC, anon, authenticated;

-- Keep server-side inventory operations working. Supabase service_role
-- bypasses RLS, so application authorization must remain in server code.
GRANT ALL PRIVILEGES ON TABLE
  public.inventory_items,
  public.inventory_suppliers,
  public.inventory_movements
TO service_role;
