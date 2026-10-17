-- Support auditable daily pharmacy sales that are not linked to a patient prescription.
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS sale_amount numeric(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.inventory_record_pharmacy_daily_sale(
  p_item_id uuid,
  p_quantity integer,
  p_sale_date date,
  p_performed_by uuid,
  p_performed_by_name text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
DECLARE
  v_item public.inventory_items%ROWTYPE;
  v_new_stock integer;
  v_sale_amount numeric(12,2);
BEGIN
  IF p_item_id IS NULL OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Select a pharmacy item and enter a quantity greater than zero.';
  END IF;
  IF p_sale_date IS NULL THEN
    RAISE EXCEPTION 'Sale date is required.';
  END IF;
  IF p_performed_by IS NULL OR NULLIF(pg_catalog.btrim(p_performed_by_name), '') IS NULL THEN
    RAISE EXCEPTION 'Staff identity is required to record a sale.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
    AND domain = 'pharmacy'
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected pharmacy item is unavailable.';
  END IF;
  IF v_item.stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for %: % available, % requested.',
      v_item.name, v_item.stock, p_quantity;
  END IF;

  v_new_stock := v_item.stock - p_quantity;
  v_sale_amount := round(v_item.price * p_quantity, 2);

  UPDATE public.inventory_items
  SET stock = v_new_stock, updated_at = pg_catalog.now()
  WHERE id = v_item.id;

  INSERT INTO public.inventory_movements (
    item_id, movement_type, quantity, previous_stock, new_stock,
    unit_cost, department, reference, notes, performed_by,
    performed_by_name, sale_amount
  ) VALUES (
    v_item.id, 'SALE', p_quantity, v_item.stock, v_new_stock,
    v_item.unit_cost, 'Pharmacy',
    'DAILY-SALE-' || pg_catalog.to_char(p_sale_date, 'YYYY-MM-DD'),
    'Daily pharmacy sale recorded for ' || pg_catalog.to_char(p_sale_date, 'YYYY-MM-DD') ||
      CASE WHEN NULLIF(pg_catalog.btrim(p_notes), '') IS NULL THEN '' ELSE ': ' || pg_catalog.btrim(p_notes) END,
    p_performed_by, pg_catalog.btrim(p_performed_by_name), v_sale_amount
  );

  RETURN pg_catalog.jsonb_build_object(
    'item_id', v_item.id,
    'quantity', p_quantity,
    'sale_amount', v_sale_amount,
    'new_stock', v_new_stock
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.inventory_record_pharmacy_daily_sale(uuid, integer, date, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_record_pharmacy_daily_sale(uuid, integer, date, uuid, text, text)
  TO service_role;
