-- Rollback-only integration coverage for atomic cashier payment.
BEGIN;

DO $test$
DECLARE
  v_patient_id uuid;
  v_invoice_id uuid;
  v_item_id uuid;
  v_prescription_id uuid;
  v_result jsonb;
  v_failed boolean := false;
  v_status text;
BEGIN
  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PAYMENT-ATOMIC', 'CI Payment Test Patient')
  RETURNING id INTO v_patient_id;

  INSERT INTO public.invoices (invoice_no, patient_id, status, subtotal, grand_total)
  VALUES ('CI-PAY-2026-1', v_patient_id, 'pending', 1500, 1500)
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (invoice_id, category, name, quantity, unit_price, total_price)
  VALUES (v_invoice_id, 'pharmacy', 'CI Test Medication', 1, 1500, 1500)
  RETURNING id INTO v_item_id;

  INSERT INTO public.prescriptions (patient_id, drug_name, dosage, quantity, price_per_unit, total_price, status)
  VALUES (v_patient_id, 'CI Test Medication', 'one daily', 1, 1500, 1500, 'pending_payment')
  RETURNING id INTO v_prescription_id;

  -- A stale amount must fail without changing invoice or prescription state.
  BEGIN
    PERFORM public.process_invoice_payment_atomic(
      v_invoice_id,
      v_patient_id,
      'cash',
      1700,
      now(),
      jsonb_build_array(jsonb_build_object('prescriptionId', v_prescription_id, 'invoiceItemId', v_item_id)),
      ARRAY[]::uuid[],
      '[]'::jsonb,
      ARRAY[]::uuid[]
    );
    RAISE EXCEPTION 'Stale invoice amount was not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Stale invoice amount was not rejected' THEN RAISE; END IF;
  END;
  SELECT status INTO v_status FROM public.invoices WHERE id = v_invoice_id;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'Stale amount attempt changed invoice state'; END IF;

  v_result := public.process_invoice_payment_atomic(
    v_invoice_id,
    v_patient_id,
    'cash',
    1500,
    now(),
    jsonb_build_array(jsonb_build_object('prescriptionId', v_prescription_id, 'invoiceItemId', v_item_id)),
    ARRAY[]::uuid[],
    '[]'::jsonb,
    ARRAY[]::uuid[]
  );

  SELECT status INTO v_status FROM public.invoices WHERE id = v_invoice_id;
  IF v_status <> 'paid' OR v_result->>'status' <> 'paid' THEN
    RAISE EXCEPTION 'Expected invoice to be paid atomically';
  END IF;

  SELECT status INTO v_status FROM public.prescriptions WHERE id = v_prescription_id;
  IF v_status <> 'ready_for_dispensing' THEN
    RAISE EXCEPTION 'Prescription was not released in the same transaction';
  END IF;

  -- A retry after success must be rejected and must not create another payment.
  BEGIN
    PERFORM public.process_invoice_payment_atomic(
      v_invoice_id,
      v_patient_id,
      'cash',
      1500,
      now(),
      jsonb_build_array(jsonb_build_object('prescriptionId', v_prescription_id, 'invoiceItemId', v_item_id)),
      ARRAY[]::uuid[],
      '[]'::jsonb,
      ARRAY[]::uuid[]
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'Duplicate payment attempt was not rejected';
  END IF;

END;
$test$;

ROLLBACK;
