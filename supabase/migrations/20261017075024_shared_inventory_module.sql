-- Shared inventory foundation for optical products and hospital consumables.
-- Existing inventory_items rows are preserved; pharmacy dispensing keeps using domain='pharmacy'.

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_domain_check;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_domain_check
  CHECK (domain IN ('optical', 'pharmacy', 'hospital'));

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS unit_of_measure text NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (
    movement_type IN ('RECEIVE', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'SALE', 'DAMAGE', 'EXPIRED')
  ),
  quantity integer NOT NULL CHECK (quantity > 0),
  previous_stock integer NOT NULL CHECK (previous_stock >= 0),
  new_stock integer NOT NULL CHECK (new_stock >= 0),
  unit_cost numeric(12,2),
  supplier_id uuid REFERENCES public.inventory_suppliers(id) ON DELETE SET NULL,
  department text,
  reference text,
  notes text,
  performed_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  performed_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created
  ON public.inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created
  ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_domain_category
  ON public.inventory_items(domain, category);
CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_active
  ON public.inventory_suppliers(is_active, name);

ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Receive stock and write its audit ledger row in one database transaction.
CREATE OR REPLACE FUNCTION public.inventory_receive_stock(
  p_item_id uuid,
  p_quantity integer,
  p_performed_by uuid,
  p_performed_by_name text,
  p_unit_cost numeric DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.inventory_items%ROWTYPE;
  v_new_stock integer;
BEGIN
  IF p_item_id IS NULL OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Select an item and enter a quantity greater than zero.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The inventory item was not found or is inactive.';
  END IF;

  IF p_unit_cost IS NOT NULL AND p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Unit cost cannot be negative.';
  END IF;

  v_new_stock := v_item.stock + p_quantity;

  UPDATE public.inventory_items
  SET stock = v_new_stock,
      unit_cost = COALESCE(p_unit_cost, unit_cost),
      updated_at = now()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_movements (
    item_id, movement_type, quantity, previous_stock, new_stock,
    unit_cost, supplier_id, reference, notes, performed_by, performed_by_name
  ) VALUES (
    p_item_id, 'RECEIVE', p_quantity, v_item.stock, v_new_stock,
    COALESCE(p_unit_cost, v_item.unit_cost), p_supplier_id,
    NULLIF(trim(p_reference), ''), NULLIF(trim(p_notes), ''),
    p_performed_by, p_performed_by_name
  );

  RETURN jsonb_build_object('item_id', p_item_id, 'previous_stock', v_item.stock, 'new_stock', v_new_stock);
END;
$$;

-- Department issues are atomic and cannot drive stock below zero.
CREATE OR REPLACE FUNCTION public.inventory_issue_stock(
  p_item_id uuid,
  p_quantity integer,
  p_department text,
  p_performed_by uuid,
  p_performed_by_name text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.inventory_items%ROWTYPE;
  v_new_stock integer;
BEGIN
  IF p_item_id IS NULL OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Select an item and enter a quantity greater than zero.';
  END IF;

  IF NULLIF(trim(p_department), '') IS NULL THEN
    RAISE EXCEPTION 'Select the department receiving the stock.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The inventory item was not found or is inactive.';
  END IF;

  IF v_item.stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Only % % available.',
      v_item.stock, v_item.unit_of_measure;
  END IF;

  v_new_stock := v_item.stock - p_quantity;

  UPDATE public.inventory_items
  SET stock = v_new_stock, updated_at = now()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_movements (
    item_id, movement_type, quantity, previous_stock, new_stock,
    department, reference, notes, performed_by, performed_by_name
  ) VALUES (
    p_item_id, 'ISSUE', p_quantity, v_item.stock, v_new_stock,
    trim(p_department), NULLIF(trim(p_reference), ''),
    NULLIF(trim(p_notes), ''), p_performed_by, p_performed_by_name
  );

  RETURN jsonb_build_object('item_id', p_item_id, 'previous_stock', v_item.stock, 'new_stock', v_new_stock);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.inventory_receive_stock(uuid, integer, uuid, text, numeric, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_receive_stock(uuid, integer, uuid, text, numeric, uuid, text, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.inventory_issue_stock(uuid, integer, text, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_issue_stock(uuid, integer, text, uuid, text, text, text)
  TO service_role;
