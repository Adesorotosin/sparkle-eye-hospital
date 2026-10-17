-- Disposable-database integration tests for the pharmacy dispensing safeguard.
-- Run ONLY against a fresh, isolated test database. Every fixture is rolled back.
BEGIN;

DO $test$
DECLARE
  v_staff_id uuid;
  v_patient_id uuid;
  v_invoice_id uuid;
  v_invoice_item_id uuid;
  v_inventory_id uuid;
  v_prescription_id uuid;
  v_patient_unpaid uuid;
  v_invoice_unpaid uuid;
  v_item_unpaid uuid;
  v_prescription_unpaid uuid;
  v_patient_short uuid;
  v_invoice_short uuid;
  v_item_short uuid;
  v_prescription_short uuid;
  v_patient_unlinked uuid;
  v_invoice_unlinked uuid;
  v_item_unlinked uuid;
  v_prescription_unlinked uuid;
  v_result jsonb;
  v_stock integer;
  v_status text;
  v_movement_count integer;
  v_failed boolean;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-PHARM-ADMIN', 'ci_pharm_admin', 'test-only-not-a-real-password-hash',
          'CI Pharmacy Admin', 'ci-pharmacy-admin@example.invalid', 'IT_ADMIN')
  RETURNING id INTO v_staff_id;

  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PHARM-PAID', 'CI Test Patient Paid')
  RETURNING id INTO v_patient_id;

  INSERT INTO public.inventory_items
    (sku, name, category, domain, stock, reorder_level, price, unit_cost, is_active)
  VALUES
    ('CI-PHARM-MED-001', 'CI Test Medicine', 'medicine', 'pharmacy', 5, 1, 10, 4, true)
  RETURNING id INTO v_inventory_id;

  INSERT INTO public.invoices (invoice_no, patient_id, status, grand_total)
  VALUES ('CI-INV-PAID-001', v_patient_id, 'paid', 20)
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items
    (invoice_id, category, name, quantity, unit_price, total_price)
  VALUES
    (v_invoice_id, 'pharmacy', 'CI Test Medicine', 2, 10, 20)
  RETURNING id INTO v_invoice_item_id;

  INSERT INTO public.prescriptions
    (patient_id, drug_name, dosage, quantity, price_per_unit, total_price,
     status, prescribed_by, invoice_item_id)
  VALUES
    (v_patient_id, 'CI Test Medicine', 'Test dose', 2, 10, 20,
     'ready_for_dispensing', v_staff_id, v_invoice_item_id)
  RETURNING id INTO v_prescription_id;

  -- Paid prescription succeeds and atomically changes stock, prescription and ledger.
  v_result := public.dispense_patient_prescriptions(v_patient_id, v_staff_id, 'CI Pharmacy Admin');
  IF COALESCE((v_result ->> 'dispensed_count')::integer, 0) <> 1 THEN
    RAISE EXCEPTION 'Paid dispense did not report one prescription: %', v_result;
  END IF;
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = v_inventory_id;
  SELECT status INTO v_status FROM public.prescriptions WHERE id = v_prescription_id;
  SELECT count(*) INTO v_movement_count
    FROM public.inventory_movements
    WHERE item_id = v_inventory_id AND movement_type = 'SALE'
      AND reference = v_prescription_id::text AND performed_by = v_staff_id
      AND performed_by_name = 'CI Pharmacy Admin';
  IF v_stock <> 3 OR v_status <> 'dispensed' OR v_movement_count <> 1 THEN
    RAISE EXCEPTION 'Paid dispense state/ledger mismatch: stock %, status %, ledger rows %',
      v_stock, v_status, v_movement_count;
  END IF;

  -- Unpaid invoice must fail and must not alter stock or prescription status.
  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PHARM-UNPAID', 'CI Test Patient Unpaid')
  RETURNING id INTO v_patient_unpaid;
  INSERT INTO public.invoices (invoice_no, patient_id, status, grand_total)
  VALUES ('CI-INV-UNPAID-001', v_patient_unpaid, 'pending', 10)
  RETURNING id INTO v_invoice_unpaid;
  INSERT INTO public.invoice_items (invoice_id, category, name, quantity, unit_price, total_price)
  VALUES (v_invoice_unpaid, 'pharmacy', 'CI Test Medicine', 1, 10, 10)
  RETURNING id INTO v_item_unpaid;
  INSERT INTO public.prescriptions
    (patient_id, drug_name, dosage, quantity, price_per_unit, total_price, status, prescribed_by, invoice_item_id)
  VALUES
    (v_patient_unpaid, 'CI Test Medicine', 'Test dose', 1, 10, 10, 'ready_for_dispensing', v_staff_id, v_item_unpaid)
  RETURNING id INTO v_prescription_unpaid;
  v_failed := false;
  BEGIN
    PERFORM public.dispense_patient_prescriptions(v_patient_unpaid, v_staff_id, 'CI Pharmacy Admin');
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Unpaid prescription was incorrectly dispensed.'; END IF;
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = v_inventory_id;
  SELECT status INTO v_status FROM public.prescriptions WHERE id = v_prescription_unpaid;
  IF v_stock <> 3 OR v_status <> 'ready_for_dispensing' THEN
    RAISE EXCEPTION 'Unpaid rejection changed stock/status: stock %, status %', v_stock, v_status;
  END IF;

  -- A missing invoice-item link must fail closed.
  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PHARM-UNLINKED', 'CI Test Patient Unlinked')
  RETURNING id INTO v_patient_unlinked;
  INSERT INTO public.invoices (invoice_no, patient_id, status, grand_total)
  VALUES ('CI-INV-UNLINKED-001', v_patient_unlinked, 'paid', 10)
  RETURNING id INTO v_invoice_unlinked;
  INSERT INTO public.invoice_items (invoice_id, category, name, quantity, unit_price, total_price)
  VALUES (v_invoice_unlinked, 'pharmacy', 'CI Test Medicine', 1, 10, 10)
  RETURNING id INTO v_item_unlinked;
  INSERT INTO public.prescriptions
    (patient_id, drug_name, dosage, quantity, price_per_unit, total_price, status, prescribed_by)
  VALUES
    (v_patient_unlinked, 'CI Test Medicine', 'Test dose', 1, 10, 10, 'ready_for_dispensing', v_staff_id)
  RETURNING id INTO v_prescription_unlinked;
  v_failed := false;
  BEGIN
    PERFORM public.dispense_patient_prescriptions(v_patient_unlinked, v_staff_id, 'CI Pharmacy Admin');
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Unlinked prescription was incorrectly dispensed.'; END IF;
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = v_inventory_id;
  SELECT status INTO v_status FROM public.prescriptions WHERE id = v_prescription_unlinked;
  IF v_stock <> 3 OR v_status <> 'ready_for_dispensing' THEN
    RAISE EXCEPTION 'Unlinked rejection changed stock/status: stock %, status %', v_stock, v_status;
  END IF;

  -- Insufficient stock must fail without partial state changes.
  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PHARM-SHORT', 'CI Test Patient Insufficient Stock')
  RETURNING id INTO v_patient_short;
  INSERT INTO public.invoices (invoice_no, patient_id, status, grand_total)
  VALUES ('CI-INV-SHORT-001', v_patient_short, 'paid', 40)
  RETURNING id INTO v_invoice_short;
  INSERT INTO public.invoice_items (invoice_id, category, name, quantity, unit_price, total_price)
  VALUES (v_invoice_short, 'pharmacy', 'CI Test Medicine', 4, 10, 40)
  RETURNING id INTO v_item_short;
  INSERT INTO public.prescriptions
    (patient_id, drug_name, dosage, quantity, price_per_unit, total_price, status, prescribed_by, invoice_item_id)
  VALUES
    (v_patient_short, 'CI Test Medicine', 'Test dose', 4, 10, 40, 'ready_for_dispensing', v_staff_id, v_item_short)
  RETURNING id INTO v_prescription_short;
  v_failed := false;
  BEGIN
    PERFORM public.dispense_patient_prescriptions(v_patient_short, v_staff_id, 'CI Pharmacy Admin');
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Insufficient-stock prescription was incorrectly dispensed.'; END IF;
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = v_inventory_id;
  SELECT status INTO v_status FROM public.prescriptions WHERE id = v_prescription_short;
  IF v_stock <> 3 OR v_status <> 'ready_for_dispensing' THEN
    RAISE EXCEPTION 'Insufficient-stock rejection changed stock/status: stock %, status %', v_stock, v_status;
  END IF;

  -- Duplicate dispense attempt must fail and cannot create another SALE ledger row.
  v_failed := false;
  BEGIN
    PERFORM public.dispense_patient_prescriptions(v_patient_id, v_staff_id, 'CI Pharmacy Admin');
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Duplicate dispense was incorrectly accepted.'; END IF;
  SELECT stock INTO v_stock FROM public.inventory_items WHERE id = v_inventory_id;
  SELECT count(*) INTO v_movement_count
    FROM public.inventory_movements
    WHERE item_id = v_inventory_id AND movement_type = 'SALE';
  IF v_stock <> 3 OR v_movement_count <> 1 THEN
    RAISE EXCEPTION 'Duplicate attempt changed stock/ledger: stock %, ledger rows %', v_stock, v_movement_count;
  END IF;
END;
$test$;

ROLLBACK;
