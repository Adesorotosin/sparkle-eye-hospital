-- Disposable-database test for atomic pharmacy defer/restore transitions.
BEGIN;

DO $test$
DECLARE
  v_staff_id uuid;
  v_patient_id uuid;
  v_first jsonb;
  v_second jsonb;
  v_first_rx uuid;
  v_second_rx uuid;
  v_invoice_id uuid;
  v_item_id uuid;
  v_count integer;
  v_failed boolean := false;
  v_subtotal numeric;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-PHARMACY-DEFER', 'ci_pharmacy_defer', 'test-only-not-a-real-password-hash',
          'CI Pharmacy Defer', 'ci-pharmacy-defer@example.invalid', 'PHARMACIST')
  RETURNING id INTO v_staff_id;

  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PHARMACY-DEFER', 'CI Pharmacy Defer Test Patient')
  RETURNING id INTO v_patient_id;

  INSERT INTO public.inventory_items (sku, name, category, domain, stock, price)
  VALUES ('CI-PHARMACY-DEFER-1', 'CI Defer Medication A', 'Medication', 'pharmacy', 10, 150),
         ('CI-PHARMACY-DEFER-2', 'CI Defer Medication B', 'Medication', 'pharmacy', 10, 150);

  v_first := public.create_pharmacy_prescription_atomic(
    v_patient_id, 'CI Defer Medication A', '1 tablet daily', 2, v_staff_id
  );
  v_second := public.create_pharmacy_prescription_atomic(
    v_patient_id, 'CI Defer Medication B', '1 tablet daily', 1, v_staff_id
  );
  v_first_rx := (v_first ->> 'prescription_id')::uuid;
  v_second_rx := (v_second ->> 'prescription_id')::uuid;
  v_invoice_id := (v_first ->> 'invoice_id')::uuid;

  IF v_invoice_id IS NULL OR (v_second ->> 'invoice_id')::uuid <> v_invoice_id THEN
    RAISE EXCEPTION 'Test prescriptions did not share the active invoice';
  END IF;

  PERFORM public.defer_prescriptions_due_to_cost_atomic(v_patient_id, ARRAY[v_first_rx]::uuid[]);

  IF NOT EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE id = v_first_rx AND status = 'deferred_due_to_cost' AND invoice_item_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Deferred prescription state/link was not updated';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.invoice_items WHERE id = (v_first ->> 'invoice_item_id')::uuid
  ) THEN
    RAISE EXCEPTION 'Deferred medication invoice line was not removed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.prescriptions p
    JOIN public.invoice_items ii ON ii.id = p.invoice_item_id
    WHERE p.id = v_second_rx AND p.status = 'pending_payment'
      AND ii.invoice_id = v_invoice_id AND ii.category = 'pharmacy'
  ) THEN
    RAISE EXCEPTION 'Deferring one medication changed the other medication';
  END IF;

  SELECT subtotal INTO v_subtotal FROM public.invoices WHERE id = v_invoice_id;
  IF v_subtotal <> 150 THEN
    RAISE EXCEPTION 'Invoice subtotal after defer should be 150, got %', v_subtotal;
  END IF;

  v_first := public.restore_deferred_prescription_atomic(v_first_rx);
  v_item_id := (v_first ->> 'invoice_item_id')::uuid;
  IF v_item_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.prescriptions p
    JOIN public.invoice_items ii ON ii.id = p.invoice_item_id
    WHERE p.id = v_first_rx AND p.status = 'pending_payment'
      AND p.invoice_item_id = v_item_id AND ii.invoice_id = v_invoice_id
      AND ii.category = 'pharmacy' AND ii.total_price = 300
  ) THEN
    RAISE EXCEPTION 'Restore did not atomically recreate and link the bill line';
  END IF;

  SELECT subtotal INTO v_subtotal FROM public.invoices WHERE id = v_invoice_id;
  IF v_subtotal <> 450 THEN
    RAISE EXCEPTION 'Invoice subtotal after restore should be 450, got %', v_subtotal;
  END IF;

  BEGIN
    PERFORM public.restore_deferred_prescription_atomic(v_first_rx);
  EXCEPTION WHEN raise_exception THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Duplicate restore unexpectedly succeeded'; END IF;

  SELECT count(*) INTO v_count FROM public.invoice_items
  WHERE invoice_id = v_invoice_id AND category = 'pharmacy';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Duplicate restore created an extra invoice line';
  END IF;

  UPDATE public.invoices SET status = 'paid' WHERE id = v_invoice_id;
  v_failed := false;
  BEGIN
    PERFORM public.defer_prescriptions_due_to_cost_atomic(v_patient_id, ARRAY[v_second_rx]::uuid[]);
  EXCEPTION WHEN raise_exception THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Deferring a medication on a paid invoice unexpectedly succeeded'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE id = v_second_rx AND status = 'pending_payment' AND invoice_item_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Rejected defer modified the prescription';
  END IF;
END;
$test$;

ROLLBACK;
