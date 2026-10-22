-- Disposable-database test for atomic pharmacy prescription and invoice-line creation.
BEGIN;

DO $test$
DECLARE
  v_staff_id uuid;
  v_patient_id uuid;
  v_inventory_item_id uuid;
  v_result jsonb;
  v_prescription_id uuid;
  v_invoice_id uuid;
  v_invoice_item_id uuid;
  v_count integer;
  v_failed boolean := false;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-PHARMACY', 'ci_pharmacy', 'test-only-not-a-real-password-hash',
          'CI Pharmacist', 'ci-pharmacy@example.invalid', 'PHARMACIST')
  RETURNING id INTO v_staff_id;

  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PHARMACY-ATOMIC', 'CI Pharmacy Test Patient')
  RETURNING id INTO v_patient_id;

  INSERT INTO public.inventory_items (sku, name, category, domain, stock, price)
  VALUES ('CI-PHARMACY-ITEM', 'CI Test Medication', 'Medication', 'pharmacy', 10, 150)
  RETURNING id INTO v_inventory_item_id;

  v_result := public.create_pharmacy_prescription_atomic(
    v_patient_id, 'CI Test Medication', '1 tablet twice daily', 2, v_staff_id
  );

  v_prescription_id := (v_result ->> 'prescription_id')::uuid;
  v_invoice_id := (v_result ->> 'invoice_id')::uuid;
  v_invoice_item_id := (v_result ->> 'invoice_item_id')::uuid;

  IF v_prescription_id IS NULL OR v_invoice_id IS NULL OR v_invoice_item_id IS NULL
     OR (v_result ->> 'total_price')::numeric <> 300 THEN
    RAISE EXCEPTION 'Atomic pharmacy creation returned invalid identifiers or total';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE id = v_prescription_id
      AND invoice_item_id = v_invoice_item_id
      AND status = 'pending_payment'
      AND total_price = 300
  ) THEN
    RAISE EXCEPTION 'Prescription was not linked to its exact unpaid invoice item';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invoice_items
    WHERE id = v_invoice_item_id
      AND invoice_id = v_invoice_id
      AND category = 'pharmacy'
      AND quantity = 2
      AND unit_price = 150
      AND total_price = 300
  ) THEN
    RAISE EXCEPTION 'Pharmacy invoice line was not saved correctly';
  END IF;

  BEGIN
    PERFORM public.create_pharmacy_prescription_atomic(
      v_patient_id, 'CI Test Medication', '1 tablet twice daily', 11, v_staff_id
    );
  EXCEPTION WHEN raise_exception THEN
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'Prescription exceeding available stock unexpectedly succeeded';
  END IF;

  SELECT count(*) INTO v_count FROM public.prescriptions
  WHERE patient_id = v_patient_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Failed low-stock prescription left an extra prescription';
  END IF;

  SELECT count(*) INTO v_count FROM public.invoice_items
  WHERE invoice_id = v_invoice_id AND category = 'pharmacy';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Failed low-stock prescription left an extra invoice item';
  END IF;
END;
$test$;

ROLLBACK;
