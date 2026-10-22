-- Atomic pharmacy deferral/restoration. These routines preserve prescription history
-- while ensuring the invoice line and prescription status cannot diverge.
CREATE OR REPLACE FUNCTION public.recalculate_unpaid_invoice_totals_atomic(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_taxable numeric(12,2);
  v_vat_rate numeric(7,4) := 0;
  v_vat_amount numeric(12,2);
  v_grand_total numeric(12,2);
  v_billing jsonb;
  v_rate_text text;
BEGIN
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_invoice.status NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION 'Finalised invoice cannot be recalculated';
  END IF;

  SELECT COALESCE(sum(total_price), 0)::numeric(12,2)
  INTO v_subtotal
  FROM public.invoice_items
  WHERE invoice_id = p_invoice_id;

  v_discount := LEAST(GREATEST(COALESCE(v_invoice.discount_amount, 0), 0), v_subtotal)::numeric(12,2);
  v_taxable := GREATEST(v_subtotal - v_discount, 0)::numeric(12,2);

  -- Some legacy schema snapshots do not contain system_settings. If present,
  -- honor its current VAT policy; otherwise preserve the invoice's saved rate.
  v_vat_rate := COALESCE(v_invoice.vat_rate, 0);
  IF to_regclass('public.system_settings') IS NOT NULL THEN
    EXECUTE 'SELECT billing FROM public.system_settings WHERE id = $1'
      INTO v_billing USING 'default';
  END IF;
  IF v_billing IS NOT NULL THEN
    v_rate_text := regexp_replace(COALESCE(v_billing->>'vatRate', '0'), '%', '', 'g');
    IF v_rate_text ~ '^[0-9]+([.][0-9]+)?

  v_vat_amount := round(v_taxable * (v_vat_rate / 100), 2);
  v_grand_total := round(v_taxable + v_vat_amount, 2);

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      discount_amount = v_discount,
      vat_rate = v_vat_rate,
      vat_amount = v_vat_amount,
      grand_total = v_grand_total
  WHERE id = p_invoice_id
    AND status IN ('draft', 'pending');
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_unpaid_invoice_totals_atomic(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_unpaid_invoice_totals_atomic(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.defer_pharmacy_prescriptions_atomic(
  p_patient_id uuid,
  p_prescription_ids uuid[],
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_ids uuid[];
  v_item_ids uuid[];
  v_invoice_ids uuid[];
  v_count integer;
  v_updated integer;
  v_invoice_id uuid;
BEGIN
  IF p_patient_id IS NULL OR COALESCE(cardinality(p_prescription_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one unpaid prescription to defer';
  END IF;

  SELECT array_agg(DISTINCT id ORDER BY id) INTO v_ids
  FROM unnest(p_prescription_ids) AS selected(id)
  WHERE id IS NOT NULL;
  IF COALESCE(cardinality(v_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one unpaid prescription to defer';
  END IF;
  IF cardinality(v_ids) <> cardinality(p_prescription_ids) THEN
    RAISE EXCEPTION 'Duplicate or empty prescription selection is not allowed';
  END IF;

  -- Read links first, then lock invoices before prescriptions, matching the
  -- cashier payment lock order and preventing paid/deferred races.
  SELECT array_agg(invoice_item_id ORDER BY invoice_item_id)
  INTO v_item_ids
  FROM public.prescriptions
  WHERE patient_id = p_patient_id
    AND id = ANY(v_ids)
    AND status = 'pending_payment'
    AND invoice_item_id IS NOT NULL;

  IF COALESCE(cardinality(v_item_ids), 0) <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Only unpaid prescriptions can be deferred; refresh and try again';
  END IF;

  SELECT array_agg(DISTINCT invoice_id ORDER BY invoice_id)
  INTO v_invoice_ids
  FROM public.invoice_items
  WHERE id = ANY(v_item_ids);

  IF COALESCE(cardinality(v_invoice_ids), 0) = 0 THEN
    RAISE EXCEPTION 'A selected prescription no longer matches its invoice item';
  END IF;

  PERFORM id FROM public.invoices
  WHERE id = ANY(v_invoice_ids)
  ORDER BY id
  FOR UPDATE;

  SELECT count(*) INTO v_count
  FROM public.invoices
  WHERE id = ANY(v_invoice_ids)
    AND patient_id = p_patient_id
    AND status IN ('draft', 'pending');
  IF v_count <> cardinality(v_invoice_ids) THEN
    RAISE EXCEPTION 'A selected medication belongs to a finalised bill and cannot be deferred';
  END IF;

  PERFORM id FROM public.prescriptions
  WHERE id = ANY(v_ids)
  ORDER BY id
  FOR UPDATE;

  SELECT count(*) INTO v_count
  FROM public.prescriptions p
  JOIN public.invoice_items ii ON ii.id = p.invoice_item_id
  WHERE p.id = ANY(v_ids)
    AND p.patient_id = p_patient_id
    AND p.status = 'pending_payment'
    AND ii.id = ANY(v_item_ids)
    AND ii.invoice_id = ANY(v_invoice_ids)
    AND ii.category = 'pharmacy'
    AND lower(trim(ii.name)) = lower(trim(p.drug_name))
    AND ii.quantity = p.quantity
    AND ii.unit_price = p.price_per_unit
    AND ii.total_price = p.total_price;
  IF v_count <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'A selected prescription no longer matches its invoice item';
  END IF;

  DELETE FROM public.invoice_items WHERE id = ANY(v_item_ids);
  UPDATE public.prescriptions
  SET status = 'deferred_due_to_cost',
      invoice_item_id = NULL
  WHERE id = ANY(v_ids)
    AND patient_id = p_patient_id
    AND status = 'pending_payment';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'A prescription changed while deferral was being processed';
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    PERFORM public.recalculate_unpaid_invoice_totals_atomic(v_invoice_id);
  END LOOP;

  RETURN jsonb_build_object(
    'patientId', p_patient_id,
    'deferredCount', v_updated,
    'prescriptionIds', to_jsonb(v_ids),
    'invoiceIds', to_jsonb(v_invoice_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.defer_pharmacy_prescriptions_atomic(uuid, uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.defer_pharmacy_prescriptions_atomic(uuid, uuid[], uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.restore_deferred_pharmacy_prescription_atomic(
  p_prescription_id uuid,
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_prescription public.prescriptions%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_invoice_item_id uuid;
BEGIN
  IF p_prescription_id IS NULL THEN RAISE EXCEPTION 'Prescription ID is required'; END IF;

  SELECT * INTO v_prescription
  FROM public.prescriptions
  WHERE id = p_prescription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prescription not found'; END IF;

  -- The draft-invoice RPC serializes all invoice creation for this patient.
  SELECT * INTO v_invoice
  FROM public.get_or_create_draft_invoice(v_prescription.patient_id);

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = v_invoice.id
    AND patient_id = v_prescription.patient_id
    AND status IN ('draft', 'pending')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A draft or pending invoice is required'; END IF;

  SELECT * INTO v_prescription
  FROM public.prescriptions
  WHERE id = p_prescription_id
    AND status = 'deferred_due_to_cost'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This prescription is no longer deferred'; END IF;

  INSERT INTO public.invoice_items (
    invoice_id, category, name, quantity, unit_price, total_price
  )
  VALUES (
    v_invoice.id,
    'pharmacy',
    v_prescription.drug_name,
    v_prescription.quantity,
    v_prescription.price_per_unit,
    v_prescription.total_price
  )
  RETURNING id INTO v_invoice_item_id;

  UPDATE public.prescriptions
  SET status = 'pending_payment',
      invoice_item_id = v_invoice_item_id
  WHERE id = p_prescription_id
    AND status = 'deferred_due_to_cost';
  IF NOT FOUND THEN RAISE EXCEPTION 'This prescription changed while restoration was being processed'; END IF;

  PERFORM public.recalculate_unpaid_invoice_totals_atomic(v_invoice.id);

  RETURN jsonb_build_object(
    'patientId', v_prescription.patient_id,
    'prescriptionId', p_prescription_id,
    'invoiceId', v_invoice.id,
    'invoiceItemId', v_invoice_item_id,
    'totalPrice', v_prescription.total_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_deferred_pharmacy_prescription_atomic(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_deferred_pharmacy_prescription_atomic(uuid, uuid)
  TO service_role;
 THEN
      v_vat_rate := LEAST(GREATEST(v_rate_text::numeric, 0), 100);
    ELSE
      v_vat_rate := 0;
    END IF;
    IF jsonb_typeof(v_billing->'vatEnabled') = 'boolean' THEN
      IF (v_billing->>'vatEnabled')::boolean = false THEN v_vat_rate := 0; END IF;
    ELSIF v_vat_rate <= 0 THEN
      v_vat_rate := 0;
    END IF;
  END IF;

  v_vat_amount := round(v_taxable * (v_vat_rate / 100), 2);
  v_grand_total := round(v_taxable + v_vat_amount, 2);

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      discount_amount = v_discount,
      vat_rate = v_vat_rate,
      vat_amount = v_vat_amount,
      grand_total = v_grand_total
  WHERE id = p_invoice_id
    AND status IN ('draft', 'pending');
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_unpaid_invoice_totals_atomic(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_unpaid_invoice_totals_atomic(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.defer_pharmacy_prescriptions_atomic(
  p_patient_id uuid,
  p_prescription_ids uuid[],
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_ids uuid[];
  v_item_ids uuid[];
  v_invoice_ids uuid[];
  v_count integer;
  v_updated integer;
  v_invoice_id uuid;
BEGIN
  IF p_patient_id IS NULL OR COALESCE(cardinality(p_prescription_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one unpaid prescription to defer';
  END IF;

  SELECT array_agg(DISTINCT id ORDER BY id) INTO v_ids
  FROM unnest(p_prescription_ids) AS selected(id)
  WHERE id IS NOT NULL;
  IF COALESCE(cardinality(v_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one unpaid prescription to defer';
  END IF;
  IF cardinality(v_ids) <> cardinality(p_prescription_ids) THEN
    RAISE EXCEPTION 'Duplicate or empty prescription selection is not allowed';
  END IF;

  -- Read links first, then lock invoices before prescriptions, matching the
  -- cashier payment lock order and preventing paid/deferred races.
  SELECT array_agg(invoice_item_id ORDER BY invoice_item_id)
  INTO v_item_ids
  FROM public.prescriptions
  WHERE patient_id = p_patient_id
    AND id = ANY(v_ids)
    AND status = 'pending_payment'
    AND invoice_item_id IS NOT NULL;

  IF COALESCE(cardinality(v_item_ids), 0) <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Only unpaid prescriptions can be deferred; refresh and try again';
  END IF;

  SELECT array_agg(DISTINCT invoice_id ORDER BY invoice_id)
  INTO v_invoice_ids
  FROM public.invoice_items
  WHERE id = ANY(v_item_ids);

  IF COALESCE(cardinality(v_invoice_ids), 0) = 0 THEN
    RAISE EXCEPTION 'A selected prescription no longer matches its invoice item';
  END IF;

  PERFORM id FROM public.invoices
  WHERE id = ANY(v_invoice_ids)
  ORDER BY id
  FOR UPDATE;

  SELECT count(*) INTO v_count
  FROM public.invoices
  WHERE id = ANY(v_invoice_ids)
    AND patient_id = p_patient_id
    AND status IN ('draft', 'pending');
  IF v_count <> cardinality(v_invoice_ids) THEN
    RAISE EXCEPTION 'A selected medication belongs to a finalised bill and cannot be deferred';
  END IF;

  PERFORM id FROM public.prescriptions
  WHERE id = ANY(v_ids)
  ORDER BY id
  FOR UPDATE;

  SELECT count(*) INTO v_count
  FROM public.prescriptions p
  JOIN public.invoice_items ii ON ii.id = p.invoice_item_id
  WHERE p.id = ANY(v_ids)
    AND p.patient_id = p_patient_id
    AND p.status = 'pending_payment'
    AND ii.id = ANY(v_item_ids)
    AND ii.invoice_id = ANY(v_invoice_ids)
    AND ii.category = 'pharmacy'
    AND lower(trim(ii.name)) = lower(trim(p.drug_name))
    AND ii.quantity = p.quantity
    AND ii.unit_price = p.price_per_unit
    AND ii.total_price = p.total_price;
  IF v_count <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'A selected prescription no longer matches its invoice item';
  END IF;

  DELETE FROM public.invoice_items WHERE id = ANY(v_item_ids);
  UPDATE public.prescriptions
  SET status = 'deferred_due_to_cost',
      invoice_item_id = NULL
  WHERE id = ANY(v_ids)
    AND patient_id = p_patient_id
    AND status = 'pending_payment';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'A prescription changed while deferral was being processed';
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    PERFORM public.recalculate_unpaid_invoice_totals_atomic(v_invoice_id);
  END LOOP;

  RETURN jsonb_build_object(
    'patientId', p_patient_id,
    'deferredCount', v_updated,
    'prescriptionIds', to_jsonb(v_ids),
    'invoiceIds', to_jsonb(v_invoice_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.defer_pharmacy_prescriptions_atomic(uuid, uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.defer_pharmacy_prescriptions_atomic(uuid, uuid[], uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.restore_deferred_pharmacy_prescription_atomic(
  p_prescription_id uuid,
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_prescription public.prescriptions%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_invoice_item_id uuid;
BEGIN
  IF p_prescription_id IS NULL THEN RAISE EXCEPTION 'Prescription ID is required'; END IF;

  SELECT * INTO v_prescription
  FROM public.prescriptions
  WHERE id = p_prescription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prescription not found'; END IF;

  -- The draft-invoice RPC serializes all invoice creation for this patient.
  SELECT * INTO v_invoice
  FROM public.get_or_create_draft_invoice(v_prescription.patient_id);

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = v_invoice.id
    AND patient_id = v_prescription.patient_id
    AND status IN ('draft', 'pending')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A draft or pending invoice is required'; END IF;

  SELECT * INTO v_prescription
  FROM public.prescriptions
  WHERE id = p_prescription_id
    AND status = 'deferred_due_to_cost'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This prescription is no longer deferred'; END IF;

  INSERT INTO public.invoice_items (
    invoice_id, category, name, quantity, unit_price, total_price
  )
  VALUES (
    v_invoice.id,
    'pharmacy',
    v_prescription.drug_name,
    v_prescription.quantity,
    v_prescription.price_per_unit,
    v_prescription.total_price
  )
  RETURNING id INTO v_invoice_item_id;

  UPDATE public.prescriptions
  SET status = 'pending_payment',
      invoice_item_id = v_invoice_item_id
  WHERE id = p_prescription_id
    AND status = 'deferred_due_to_cost';
  IF NOT FOUND THEN RAISE EXCEPTION 'This prescription changed while restoration was being processed'; END IF;

  PERFORM public.recalculate_unpaid_invoice_totals_atomic(v_invoice.id);

  RETURN jsonb_build_object(
    'patientId', v_prescription.patient_id,
    'prescriptionId', p_prescription_id,
    'invoiceId', v_invoice.id,
    'invoiceItemId', v_invoice_item_id,
    'totalPrice', v_prescription.total_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_deferred_pharmacy_prescription_atomic(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_deferred_pharmacy_prescription_atomic(uuid, uuid)
  TO service_role;
