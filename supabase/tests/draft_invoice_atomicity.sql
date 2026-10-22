-- Disposable-database test for concurrency-safe draft invoice creation.
BEGIN;

DO $test$
DECLARE
  v_patient_id uuid;
  v_first public.invoices%ROWTYPE;
  v_second public.invoices%ROWTYPE;
  v_active_count integer;
BEGIN
  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-INVOICE-ATOMIC', 'CI Invoice Test Patient')
  RETURNING id INTO v_patient_id;

  v_first := public.get_or_create_draft_invoice(v_patient_id);
  v_second := public.get_or_create_draft_invoice(v_patient_id);

  SELECT count(*) INTO v_active_count
  FROM public.invoices
  WHERE patient_id = v_patient_id
    AND status IN ('draft', 'pending');

  IF v_first.id IS NULL OR v_second.id IS NULL OR v_first.id <> v_second.id THEN
    RAISE EXCEPTION 'Repeated draft invoice requests did not return the same invoice';
  END IF;

  IF v_active_count <> 1 THEN
    RAISE EXCEPTION 'Expected one active draft invoice, found %', v_active_count;
  END IF;

  IF v_first.invoice_no !~ '^INV-[0-9]{4}-[0-9]+$' THEN
    RAISE EXCEPTION 'Unexpected invoice number format: %', v_first.invoice_no;
  END IF;
END;
$test$;

ROLLBACK;
