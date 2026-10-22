-- Create diagnostic orders, their pricing-review handoffs, and invoice lines atomically.
CREATE OR REPLACE FUNCTION public.create_diagnostic_order_atomic(
  p_patient_id uuid,
  p_name text,
  p_price numeric,
  p_ordered_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order_id uuid;
  v_invoice public.invoices%ROWTYPE;
  v_invoice_item_id uuid;
BEGIN
  IF NULLIF(BTRIM(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Diagnostic test name is required';
  END IF;
  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'Diagnostic price is invalid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient_id) THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  INSERT INTO public.diagnostic_orders (
    patient_id, name, price, status, ordered_by
  )
  VALUES (p_patient_id, BTRIM(p_name), p_price, 'ordered', p_ordered_by)
  RETURNING id INTO v_order_id;

  IF p_price = 0 THEN
    INSERT INTO public.clinical_handoffs (
      patient_id, destination, handoff_type, title, details, requested_by
    )
    VALUES (
      p_patient_id,
      'CASHIER',
      'PRICING_REVIEW',
      'Pricing review required: ' || BTRIM(p_name),
      'An investigation order was created for ' || BTRIM(p_name) ||
        ', but no approved price is configured. Add the approved investigation charge before billing; do not treat this as a free test. Order ID: ' || v_order_id::text,
      p_ordered_by
    );

    RETURN jsonb_build_object(
      'diagnostic_id', v_order_id,
      'invoice_id', NULL,
      'invoice_item_id', NULL,
      'price_pending', true
    );
  END IF;

  v_invoice := public.get_or_create_draft_invoice(p_patient_id);

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = v_invoice.id
    AND patient_id = p_patient_id
    AND status IN ('draft', 'pending')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A draft or pending invoice is required'; END IF;

  INSERT INTO public.invoice_items (
    invoice_id, category, name, quantity, unit_price, total_price
  )
  VALUES (v_invoice.id, 'diagnostic', BTRIM(p_name), 1, p_price, p_price)
  RETURNING id INTO v_invoice_item_id;

  RETURN jsonb_build_object(
    'diagnostic_id', v_order_id,
    'invoice_id', v_invoice.id,
    'invoice_item_id', v_invoice_item_id,
    'price_pending', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_external_diagnostic_order_atomic(
  p_patient_code text,
  p_full_name text,
  p_age integer,
  p_gender text,
  p_phone text,
  p_referring_center text,
  p_test_name text,
  p_price numeric,
  p_ordered_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_patient public.patients%ROWTYPE;
  v_order_id uuid;
  v_invoice public.invoices%ROWTYPE;
  v_invoice_item_id uuid;
BEGIN
  IF NULLIF(BTRIM(p_patient_code), '') IS NULL
     OR NULLIF(BTRIM(p_full_name), '') IS NULL
     OR NULLIF(BTRIM(p_referring_center), '') IS NULL
     OR NULLIF(BTRIM(p_test_name), '') IS NULL THEN
    RAISE EXCEPTION 'Patient name, referring centre, and investigation are required';
  END IF;
  IF p_age IS NOT NULL AND (p_age < 0 OR p_age > 150) THEN
    RAISE EXCEPTION 'Age must be between 0 and 150';
  END IF;
  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'Enter a valid investigation price';
  END IF;

  INSERT INTO public.patients (
    patient_code, full_name, age, gender, phone, status, is_walk_in
  )
  VALUES (
    BTRIM(p_patient_code), BTRIM(p_full_name), p_age,
    NULLIF(BTRIM(p_gender), ''), NULLIF(BTRIM(p_phone), ''),
    'completed_today', true
  )
  RETURNING * INTO v_patient;

  INSERT INTO public.diagnostic_orders (
    patient_id, name, price, status, ordered_by, referral_source, external_referral
  )
  VALUES (
    v_patient.id, BTRIM(p_test_name), p_price, 'ordered', p_ordered_by,
    BTRIM(p_referring_center), true
  )
  RETURNING id INTO v_order_id;

  IF p_price = 0 THEN
    INSERT INTO public.clinical_handoffs (
      patient_id, destination, handoff_type, title, details, requested_by
    )
    VALUES (
      v_patient.id,
      'CASHIER',
      'PRICING_REVIEW',
      'Pricing review required: ' || BTRIM(p_test_name),
      'An external investigation order was created for ' || BTRIM(p_test_name) ||
        ', but no approved price is configured. Add the approved investigation charge before billing; do not treat this as a free test. Order ID: ' || v_order_id::text,
      p_ordered_by
    );

    RETURN jsonb_build_object(
      'patient_id', v_patient.id,
      'patient_code', v_patient.patient_code,
      'patient_name', v_patient.full_name,
      'diagnostic_id', v_order_id,
      'invoice_id', NULL,
      'price_pending', true
    );
  END IF;

  v_invoice := public.get_or_create_draft_invoice(v_patient.id);

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = v_invoice.id
    AND patient_id = v_patient.id
    AND status IN ('draft', 'pending')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A draft or pending invoice is required'; END IF;

  INSERT INTO public.invoice_items (
    invoice_id, category, name, quantity, unit_price, total_price
  )
  VALUES (v_invoice.id, 'diagnostic', BTRIM(p_test_name), 1, p_price, p_price)
  RETURNING id INTO v_invoice_item_id;

  RETURN jsonb_build_object(
    'patient_id', v_patient.id,
    'patient_code', v_patient.patient_code,
    'patient_name', v_patient.full_name,
    'diagnostic_id', v_order_id,
    'invoice_id', v_invoice.id,
    'invoice_item_id', v_invoice_item_id,
    'price_pending', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_diagnostic_order_atomic(uuid, text, numeric, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_external_diagnostic_order_atomic(text, text, integer, text, text, text, text, numeric, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_diagnostic_order_atomic(uuid, text, numeric, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.create_external_diagnostic_order_atomic(text, text, integer, text, text, text, text, numeric, uuid)
  TO service_role;
