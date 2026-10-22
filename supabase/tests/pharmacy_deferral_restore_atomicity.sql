-- Rollback-only test for atomic pharmacy deferral and restoration.
BEGIN;

DO $test$
DECLARE
  v_staff_id uuid;
  v_patient_id uuid;
  v_prescription_result jsonb;
  v_defer_result jsonb;
  v_restore_result jsonb;
  v_prescription_id uuid;
  v_invoice_id uuid;
  v_original_item_id uuid;
  v_restored_item_id uuid;
  v_count integer;
  v_status text;
  v_total numeric;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-PHARMACY-DEFER', 'ci_pharmacy_defer', 'test-only-not-a-real-password-hash',
          'CI Pharmacist', 'ci-pharmacy-defer@example.invalid', 'PHARMACIST')
  RETURNING id INTO v_staff_id;

  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PHARMACY-DEFER', 'CI Pharmacy Deferral Patient')
  RETURNING id INTO v_patient_id;

  INSERT INTO public.inventory_items (sku, name, category, domain, stock, price)
  VALUES ('CI-PHARMACY-DEFER-ITEM', 'CI Deferred Medication', 'Medication', 'pharmacy', 10, 125);

  v_prescription_result := public.create_pharmacy_prescription_atomic(
    v_patient_id, 'CI Deferred Medication', '1 tablet daily', 2, v_staff_id
  );
  v_prescription_id := (v_prescription_result->>'prescription_id')::uuid;
  v_invoice_id := (v_prescription_result->>'invoice_id')::uuid;
  v_original_item_id := (v_prescription_result->>'invoice_item_id')::uuid;

  v_defer_result := public.defer_pharmacy_prescriptions_atomic(
    v_patient_id, ARRAY[v_prescription_id], v_staff_id
  );
  IF (v_defer_result->>'deferredCount')::integer <> 1 THEN
    RAISE EXCEPTION 'Deferral did not report exactly one prescription';
  END IF;

  SELECT status, invoice_item_id INTO v_status, v_restored_item_id
  FROM public.prescriptions WHERE id = v_prescription_id;
  IF v_status <> 'deferred_due_to_cost' OR v_restored_item_id IS NOT NULL THEN
    RAISE EXCEPTION 'Deferral did not preserve prescription with no active invoice link';
  END IF;
  SELECT count(*) INTO v_count FROM public.invoice_items WHERE id = v_original_item_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Deferred invoice line was not removed'; END IF;
  SELECT subtotal, grand_total INTO v_total, v_total FROM public.invoices WHERE id = v_invoice_id;
  IF v_total <> 0 THEN RAISE EXCEPTION 'Invoice total was not recalculated after deferral'; END IF;

  v_restore_result := public.restore_deferred_pharmacy_prescription_atomic(v_prescription_id, v_staff_id);
  v_restored_item_id := (v_restore_result->>'invoiceItemId')::uuid;
  IF v_restored_item_id IS NULL OR (v_restore_result->>'invoiceId')::uuid IS NULL THEN
    RAISE EXCEPTION 'Restoration returned no invoice identifiers';
  END IF;

  SELECT status, invoice_item_id INTO v_status, v_original_item_id
  FROM public.prescriptions WHERE id = v_prescription_id;
  IF v_status <> 'pending_payment' OR v_original_item_id <> v_restored_item_id THEN
    RAISE EXCEPTION 'Restored prescription was not linked to its unpaid invoice line';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.invoice_items
    WHERE id = v_restored_item_id
      AND invoice_id = v_invoice_id
      AND category = 'pharmacy'
      AND quantity = 2
      AND unit_price = 125
      AND total_price = 250
  ) THEN
    RAISE EXCEPTION 'Restored invoice line has incorrect details';
  END IF;
  SELECT grand_total INTO v_total FROM public.invoices WHERE id = v_invoice_id;
  IF v_total <> 250 THEN RAISE EXCEPTION 'Invoice total was not recalculated after restoration'; END IF;

  -- A second restoration must be rejected without creating a duplicate line.
  BEGIN
    PERFORM public.restore_deferred_pharmacy_prescription_atomic(v_prescription_id, v_staff_id);
    RAISE EXCEPTION 'Duplicate restoration unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Duplicate restoration unexpectedly succeeded' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO v_count FROM public.invoice_items
  WHERE invoice_id = v_invoice_id AND category = 'pharmacy';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Duplicate restoration created an extra invoice line'; END IF;
END;
$test$;

ROLLBACK;
