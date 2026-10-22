-- Keep deferred-pharmacy transitions, invoice lines, and invoice totals atomic.
-- These functions are service-role-only server actions; they never mutate stock.

CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals_after_pharmacy_change(
  p_invoice_id uuid
)
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
  v_vat numeric(12,2);
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_invoice.status NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION 'Only draft or pending invoices can be recalculated';
  END IF;

  SELECT COALESCE(ROUND(SUM(total_price), 2), 0)
  INTO v_subtotal
  FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  v_discount := LEAST(GREATEST(COALESCE(v_invoice.discount_amount, 0), 0), v_subtotal);
  v_taxable := GREATEST(v_subtotal - v_discount, 0);
  v_vat := ROUND(v_taxable * (GREATEST(COALESCE(v_invoice.vat_rate, 0), 0) / 100), 2);

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      discount_amount = v_discount,
      vat_amount = v_vat,
      grand_total = ROUND(v_taxable + v_vat, 2)
  WHERE id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.defer_prescriptions_due_to_cost_atomic(
  p_patient_id uuid,
  p_prescription_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_expected integer;
  v_count integer;
  v_invoice_count integer;
  v_invoice_id uuid;
  v_ids uuid[];
  v_invoice_ids uuid[];
BEGIN
  IF p_prescription_ids IS NULL OR cardinality(p_prescription_ids) = 0
     OR array_position(p_prescription_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Select at least one unpaid medication to defer';
  END IF;

  SELECT array_agg(DISTINCT u.id ORDER BY u.id)
  INTO v_ids
  FROM unnest(p_prescription_ids) AS u(id);
  v_expected := cardinality(v_ids);
  IF v_expected <> cardinality(p_prescription_ids) THEN
    RAISE EXCEPTION 'Duplicate prescription IDs are not allowed';
  END IF;

  PERFORM 1 FROM public.patients WHERE id = p_patient_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found'; END IF;

  IF EXISTS (
    SELECT 1
    FROM public.prescriptions p
    LEFT JOIN public.invoice_items ii ON ii.id = p.invoice_item_id
    WHERE p.patient_id = p_patient_id AND p.id = ANY(v_ids)
      AND (p.invoice_item_id IS NULL OR ii.id IS NULL OR ii.category <> 'pharmacy')
  ) THEN
    RAISE EXCEPTION 'A selected medication is not linked to a pharmacy bill item';
  END IF;

  SELECT array_agg(DISTINCT ii.invoice_id ORDER BY ii.invoice_id),
         COUNT(DISTINCT ii.invoice_id)
  INTO v_invoice_ids, v_invoice_count
  FROM public.prescriptions p
  JOIN public.invoice_items ii ON ii.id = p.invoice_item_id
  WHERE p.patient_id = p_patient_id AND p.id = ANY(v_ids);

  IF cardinality(v_invoice_ids) IS NULL OR cardinality(v_invoice_ids) = 0 THEN
    RAISE EXCEPTION 'No active pharmacy bill items were found';
  END IF;

  -- Match the cashier's invoice -> prescription lock order.
  PERFORM 1 FROM public.invoices i
  WHERE i.id = ANY(v_invoice_ids)
  ORDER BY i.id
  FOR UPDATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> v_invoice_count THEN
    RAISE EXCEPTION 'One or more medication invoices could not be locked';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.prescriptions p
    JOIN public.invoice_items ii ON ii.id = p.invoice_item_id
    JOIN public.invoices i ON i.id = ii.invoice_id
    WHERE p.patient_id = p_patient_id AND p.id = ANY(v_ids)
      AND (p.status <> 'pending_payment' OR i.status NOT IN ('draft', 'pending'))
  ) THEN
    RAISE EXCEPTION 'Only unpaid medications on draft or pending bills can be deferred';
  END IF;

  PERFORM 1 FROM public.prescriptions p
  WHERE p.patient_id = p_patient_id AND p.id = ANY(v_ids)
  ORDER BY p.id
  FOR UPDATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> v_expected THEN
    RAISE EXCEPTION 'Only prescriptions belonging to this patient can be deferred';
  END IF;

  PERFORM 1
  FROM public.invoice_items ii
  JOIN public.prescriptions p ON p.invoice_item_id = ii.id
  WHERE p.patient_id = p_patient_id AND p.id = ANY(v_ids)
  ORDER BY ii.id
  FOR UPDATE;

  DELETE FROM public.invoice_items ii
  USING public.prescriptions p
  WHERE p.patient_id = p_patient_id AND p.id = ANY(v_ids)
    AND ii.id = p.invoice_item_id AND ii.category = 'pharmacy';

  UPDATE public.prescriptions
  SET status = 'deferred_due_to_cost', invoice_item_id = NULL
  WHERE patient_id = p_patient_id AND id = ANY(v_ids) AND status = 'pending_payment';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> v_expected THEN
    RAISE EXCEPTION 'Prescription state changed while deferring; no changes were committed';
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    PERFORM public.recalculate_invoice_totals_after_pharmacy_change(v_invoice_id);
  END LOOP;

  RETURN jsonb_build_object(
    'prescription_ids', to_jsonb(v_ids),
    'invoice_ids', to_jsonb(v_invoice_ids),
    'deferred_count', v_expected
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_deferred_prescription_atomic(
  p_prescription_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_patient_id uuid;
  v_prescription public.prescriptions%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_invoice_item_id uuid;
BEGIN
  SELECT patient_id INTO v_patient_id
  FROM public.prescriptions WHERE id = p_prescription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prescription not found'; END IF;

  PERFORM 1 FROM public.patients WHERE id = v_patient_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found'; END IF;

  -- Reuse/create and lock the invoice before locking the prescription.
  v_invoice := public.get_or_create_draft_invoice(v_patient_id);

  SELECT * INTO v_prescription
  FROM public.prescriptions
  WHERE id = p_prescription_id AND patient_id = v_patient_id
  FOR UPDATE;
  IF NOT FOUND OR v_prescription.status <> 'deferred_due_to_cost' THEN
    RAISE EXCEPTION 'This prescription is no longer deferred';
  END IF;
  IF v_prescription.quantity IS NULL OR v_prescription.quantity <= 0
     OR v_prescription.price_per_unit IS NULL OR v_prescription.price_per_unit < 0
     OR v_prescription.total_price IS NULL OR v_prescription.total_price < 0 THEN
    RAISE EXCEPTION 'The deferred prescription has invalid billing values; ask an administrator to review it';
  END IF;

  INSERT INTO public.invoice_items (
    invoice_id, category, name, quantity, unit_price, total_price
  )
  VALUES (
    v_invoice.id, 'pharmacy', v_prescription.drug_name,
    v_prescription.quantity, v_prescription.price_per_unit, v_prescription.total_price
  )
  RETURNING id INTO v_invoice_item_id;

  UPDATE public.prescriptions
  SET status = 'pending_payment', invoice_item_id = v_invoice_item_id
  WHERE id = p_prescription_id AND patient_id = v_patient_id
    AND status = 'deferred_due_to_cost';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription state changed while restoring; no changes were committed';
  END IF;

  PERFORM public.recalculate_invoice_totals_after_pharmacy_change(v_invoice.id);

  RETURN jsonb_build_object(
    'prescription_id', p_prescription_id,
    'invoice_id', v_invoice.id,
    'invoice_item_id', v_invoice_item_id,
    'total_price', v_prescription.total_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_invoice_totals_after_pharmacy_change(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.defer_prescriptions_due_to_cost_atomic(uuid, uuid[])
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_deferred_prescription_atomic(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_invoice_totals_after_pharmacy_change(uuid),
  public.defer_prescriptions_due_to_cost_atomic(uuid, uuid[]),
  public.restore_deferred_prescription_atomic(uuid)
  TO service_role;
