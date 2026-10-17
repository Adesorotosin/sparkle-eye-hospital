-- Transactional tests for manually entered pharmacy daily sales.
BEGIN;

DO $$
DECLARE
  v_staff_id uuid;
  v_item_id uuid;
  v_result jsonb;
  v_stock integer;
  v_movement_count integer;
  v_sale_amount numeric(12,2);
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-SALE-STAFF', 'ci-sale-staff', 'not-a-real-hash', 'CI Pharmacy Staff', 'ci-pharmacy-sales@example.invalid', 'PHARMACIST')
  RETURNING id INTO v_staff_id;

  INSERT INTO public.inventory_items (
    sku, name, category, domain, stock, reorder_level, price,
    unit_of_measure, unit_cost, is_active
  ) VALUES (
    'CI-SALE-ITEM', 'CI Pharmacy Sale Item', 'Eye Drops', 'pharmacy',
    10, 2, 250.00, 'bottle', 100.00, true
  )
  RETURNING id INTO v_item_id;

  v_result := public.inventory_record_pharmacy_daily_sale(
    v_item_id, 3, CURRENT_DATE, v_staff_id, 'CI Pharmacy Staff', 'CI daily sales test'
  );

  IF (v_result ->> 'sale_amount')::numeric <> 750.00 THEN
    RAISE EXCEPTION 'Expected sale amount 750.00, received %', v_result ->> 'sale_amount';
  END IF;
  IF (v_result ->> 'new_stock')::integer <> 7 THEN
    RAISE EXCEPTION 'Expected remaining stock 7, received %', v_result ->> 'new_stock';
  END IF;

  SELECT stock INTO v_stock
  FROM public.inventory_items
  WHERE id = v_item_id;
  IF v_stock <> 7 THEN
    RAISE EXCEPTION 'Stock was not reduced atomically; expected 7, received %', v_stock;
  END IF;

  SELECT count(*), max(sale_amount)
  INTO v_movement_count, v_sale_amount
  FROM public.inventory_movements
  WHERE item_id = v_item_id AND movement_type = 'SALE';
  IF v_movement_count <> 1 OR v_sale_amount <> 750.00 THEN
    RAISE EXCEPTION 'Daily sale ledger entry is missing or incorrect.';
  END IF;

  BEGIN
    PERFORM public.inventory_record_pharmacy_daily_sale(
      v_item_id, 99, CURRENT_DATE, v_staff_id, 'CI Pharmacy Staff', 'oversell test'
    );
    RAISE EXCEPTION 'Expected insufficient-stock guard to reject overselling.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'Insufficient stock%' THEN
        RAISE;
      END IF;
  END;

  SELECT stock INTO v_stock
  FROM public.inventory_items
  WHERE id = v_item_id;
  IF v_stock <> 7 THEN
    RAISE EXCEPTION 'Rejected oversell changed stock unexpectedly.';
  END IF;
END $$;

ROLLBACK;
