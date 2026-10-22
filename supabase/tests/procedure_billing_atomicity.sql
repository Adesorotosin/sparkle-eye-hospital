-- Disposable-database test for atomic procedure order + invoice line creation.
BEGIN;

DO $test$
DECLARE
  v_patient_id uuid;
  v_staff_id uuid;
  v_invoice public.invoices%ROWTYPE;
  v_procedure_id uuid;
  v_procedure_count integer;
  v_item_count integer;
  v_rejected boolean := false;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-PROCEDURE', 'ci_procedure', 'test-only-not-a-real-password-hash',
          'CI Receptionist', 'ci-procedure@example.invalid', 'RECEPTIONIST')
  RETURNING id INTO v_staff_id;

  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-PROCEDURE-ATOMIC', 'CI Procedure Test Patient')
  RETURNING id INTO v_patient_id;

  v_invoice := public.get_or_create_draft_invoice(v_patient_id);
  v_procedure_id := public.register_procedure_with_invoice_item(
    v_patient_id,
    v_invoice.id,
    'CI Test Procedure',
    NULL,
    'CI-only fixture',
    1234,
    v_staff_id
  );

  SELECT count(*) INTO v_procedure_count
  FROM public.procedure_orders
  WHERE id = v_procedure_id AND invoice_id = v_invoice.id;

  SELECT count(*) INTO v_item_count
  FROM public.invoice_items
  WHERE invoice_id = v_invoice.id
    AND category = 'procedure'
    AND name = 'CI Test Procedure'
    AND total_price = 1234;

  IF v_procedure_id IS NULL OR v_procedure_count <> 1 OR v_item_count <> 1 THEN
    RAISE EXCEPTION 'Procedure order and invoice line were not created together';
  END IF;

  UPDATE public.invoices SET status = 'paid' WHERE id = v_invoice.id;

  BEGIN
    PERFORM public.register_procedure_with_invoice_item(
      v_patient_id,
      v_invoice.id,
      'CI Must Not Register',
      NULL,
      NULL,
      500,
      v_staff_id
    );
  EXCEPTION
    WHEN raise_exception THEN
      v_rejected := true;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'Procedure registration unexpectedly accepted a paid invoice';
  END IF;

  SELECT count(*) INTO v_procedure_count
  FROM public.procedure_orders
  WHERE patient_id = v_patient_id;

  IF v_procedure_count <> 1 THEN
    RAISE EXCEPTION 'Rejected procedure registration created an extra order';
  END IF;
END;
$test$;

ROLLBACK;
