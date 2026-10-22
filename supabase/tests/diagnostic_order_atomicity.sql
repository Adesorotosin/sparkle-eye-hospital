-- Disposable-database integration test for diagnostic orders and their billing/handoff.
BEGIN;

DO $test$
DECLARE
  v_doctor_id uuid;
  v_reception_id uuid;
  v_patient_id uuid;
  v_result jsonb;
  v_diagnostic_id uuid;
  v_invoice_id uuid;
  v_patient_code text;
  v_count integer;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-DIAG-DOCTOR', 'ci_diag_doctor', 'test-only-not-a-real-password-hash',
          'CI Doctor', 'ci-diag-doctor@example.invalid', 'DOCTOR')
  RETURNING id INTO v_doctor_id;

  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-DIAG-RECEPTION', 'ci_diag_reception', 'test-only-not-a-real-password-hash',
          'CI Reception', 'ci-diag-reception@example.invalid', 'RECEPTIONIST')
  RETURNING id INTO v_reception_id;

  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-DIAG-PATIENT', 'CI Diagnostic Test Patient')
  RETURNING id INTO v_patient_id;

  v_result := public.create_diagnostic_order_atomic(
    v_patient_id, 'CI Paid Diagnostic', 2500, v_doctor_id
  );
  v_diagnostic_id := (v_result ->> 'diagnostic_id')::uuid;
  v_invoice_id := (v_result ->> 'invoice_id')::uuid;

  IF v_diagnostic_id IS NULL OR v_invoice_id IS NULL
     OR COALESCE((v_result ->> 'price_pending')::boolean, true) THEN
    RAISE EXCEPTION 'Priced diagnostic order did not return its invoice linkage';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invoice_items
    WHERE invoice_id = v_invoice_id AND category = 'diagnostic'
      AND name = 'CI Paid Diagnostic' AND total_price = 2500
  ) THEN
    RAISE EXCEPTION 'Priced diagnostic invoice line was not created';
  END IF;

  v_result := public.create_diagnostic_order_atomic(
    v_patient_id, 'CI Unpriced Diagnostic', 0, v_doctor_id
  );
  v_diagnostic_id := (v_result ->> 'diagnostic_id')::uuid;

  IF v_diagnostic_id IS NULL OR COALESCE((v_result ->> 'price_pending')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Unpriced diagnostic did not enter pricing review';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clinical_handoffs
    WHERE patient_id = v_patient_id
      AND handoff_type = 'PRICING_REVIEW'
      AND details LIKE '%' || v_diagnostic_id::text || '%'
  ) THEN
    RAISE EXCEPTION 'Pricing review handoff was not linked to the diagnostic order';
  END IF;

  v_result := public.create_external_diagnostic_order_atomic(
    'CI-EXTERNAL-DIAGNOSTIC',
    'CI External Diagnostic Patient',
    42,
    'F',
    '0000000000',
    'CI Referring Centre',
    'CI External Test',
    3500,
    v_reception_id
  );

  v_patient_code := v_result ->> 'patient_code';
  v_diagnostic_id := (v_result ->> 'diagnostic_id')::uuid;
  v_invoice_id := (v_result ->> 'invoice_id')::uuid;

  IF v_patient_code <> 'CI-EXTERNAL-DIAGNOSTIC'
     OR v_diagnostic_id IS NULL OR v_invoice_id IS NULL THEN
    RAISE EXCEPTION 'External diagnostic registration returned incomplete data';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.diagnostic_orders
    WHERE id = v_diagnostic_id AND external_referral = true
      AND referral_source = 'CI Referring Centre'
  ) THEN
    RAISE EXCEPTION 'External diagnostic referral metadata was not saved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invoice_items
    WHERE invoice_id = v_invoice_id AND category = 'diagnostic'
      AND name = 'CI External Test' AND total_price = 3500
  ) THEN
    RAISE EXCEPTION 'External diagnostic invoice line was not created';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.patients WHERE patient_code = 'CI-EXTERNAL-DIAGNOSTIC';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'External diagnostic patient was not registered exactly once';
  END IF;
END;
$test$;

ROLLBACK;
