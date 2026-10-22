-- Disposable PostgreSQL integration test for atomic optical order billing.
BEGIN;

DO $test$
DECLARE
  v_staff_id uuid;
  v_patient_id uuid;
  v_order_id uuid;
  v_invoice_id uuid;
  v_item_id uuid;
  v_result jsonb;
  v_item_count integer;
  v_subtotal numeric;
  v_failed boolean := false;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-OPTICAL-BILLING', 'ci_optical_billing', 'test-only-not-a-real-password-hash',
          'CI Optical Doctor', 'ci-optical-billing@example.invalid', 'DOCTOR')
  RETURNING id INTO v_staff_id;

  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-OPTICAL-BILLING', 'CI Optical Billing Patient')
  RETURNING id INTO v_patient_id;

  INSERT INTO public.optical_orders (
    patient_id, status, pd_binocular, frame_selection, lens_type,
    optical_charge, charge_approval_status
  )
  VALUES (
    v_patient_id, 'measurements', '64', 'CI frame', 'Single vision',
    27500, 'approved'
  )
  RETURNING id INTO v_order_id;

  v_result := public.finalize_optical_order_billing_atomic(v_order_id, v_staff_id);
  v_invoice_id := (v_result ->> 'invoice_id')::uuid;
  v_item_id := (v_result ->> 'invoice_item_id')::uuid;

  IF v_invoice_id IS NULL OR v_item_id IS NULL OR (v_result ->> 'optical_charge')::numeric <> 27500 THEN
    RAISE EXCEPTION 'Atomic optical billing did not return invoice/item linkage';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.optical_orders
    WHERE id = v_order_id AND status = 'ready_for_dispense'
      AND invoice_id = v_invoice_id AND invoice_item_id = v_item_id
  ) THEN
    RAISE EXCEPTION 'Optical order was not linked and moved to ready atomically';
  END IF;

  SELECT count(*) INTO v_item_count
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id AND id = v_item_id
    AND category = 'optical' AND total_price = 27500;
  IF v_item_count <> 1 THEN
    RAISE EXCEPTION 'Optical invoice line missing or incorrect';
  END IF;

  SELECT subtotal INTO v_subtotal FROM public.invoices WHERE id = v_invoice_id;
  IF v_subtotal <> 27500 THEN
    RAISE EXCEPTION 'Invoice subtotal should be 27500, got %', v_subtotal;
  END IF;

  -- Retrying the action must not duplicate the invoice item.
  v_result := public.finalize_optical_order_billing_atomic(v_order_id, v_staff_id);
  SELECT count(*) INTO v_item_count
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id AND category = 'optical';
  IF v_item_count <> 1 THEN
    RAISE EXCEPTION 'Retry created a duplicate optical invoice item';
  END IF;

  -- An unapproved order must not create an invoice or billing line.
  INSERT INTO public.optical_orders (
    patient_id, status, pd_binocular, frame_selection, lens_type,
    optical_charge, charge_approval_status
  )
  VALUES (
    v_patient_id, 'measurements', '64', 'CI frame', 'Single vision',
    10000, 'pending'
  )
  RETURNING id INTO v_order_id;

  BEGIN
    PERFORM public.finalize_optical_order_billing_atomic(v_order_id, v_staff_id);
  EXCEPTION WHEN raise_exception THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Unapproved optical charge unexpectedly billed'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.optical_orders
    WHERE id = v_order_id AND (status = 'ready_for_dispense' OR invoice_id IS NOT NULL OR invoice_item_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Rejected unapproved billing changed the optical order';
  END IF;

  -- A paid invoice cannot be used for a new optical order.
  UPDATE public.invoices SET status = 'paid' WHERE id = v_invoice_id;
  INSERT INTO public.optical_orders (
    patient_id, status, pd_binocular, frame_selection, lens_type,
    optical_charge, charge_approval_status, invoice_id
  )
  VALUES (
    v_patient_id, 'measurements', '64', 'CI frame', 'Single vision',
    10000, 'approved', v_invoice_id
  )
  RETURNING id INTO v_order_id;
  v_failed := false;
  BEGIN
    PERFORM public.finalize_optical_order_billing_atomic(v_order_id, v_staff_id);
  EXCEPTION WHEN raise_exception THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'New optical order unexpectedly billed to a paid invoice'; END IF;
END;
$test$;

ROLLBACK;
