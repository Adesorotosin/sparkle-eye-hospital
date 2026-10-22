-- Finalize cashier payment and all linked clinical handoffs in one transaction.
-- The caller must validate the invoice contents first; this function re-checks
-- invoice status, amount, and linked orders while holding row locks.
CREATE OR REPLACE FUNCTION public.process_invoice_payment_atomic(
  p_invoice_id uuid,
  p_patient_id uuid,
  p_payment_method text,
  p_grand_total numeric,
  p_paid_at timestamptz,
  p_prescription_links jsonb,
  p_diagnostic_ids uuid[],
  p_diagnostic_updates jsonb,
  p_lab_order_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_item_count integer;
  v_updated_count integer;
  v_link jsonb;
  v_diag_id uuid;
  v_diag public.diagnostic_orders%ROWTYPE;
  v_item public.invoice_items%ROWTYPE;
  v_update jsonb;
BEGIN
  IF p_invoice_id IS NULL OR p_patient_id IS NULL THEN
    RAISE EXCEPTION 'Invoice and patient are required';
  END IF;
  IF p_payment_method NOT IN ('cash', 'pos', 'transfer', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;
  IF p_grand_total IS NULL OR p_grand_total <= 0 THEN
    RAISE EXCEPTION 'Invoice amount must be greater than zero';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id AND patient_id = p_patient_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found for this patient'; END IF;
  IF v_invoice.status NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION 'Invoice is not payable; current status: %', v_invoice.status;
  END IF;
  IF round(COALESCE(v_invoice.grand_total, 0)::numeric, 2) <> round(p_grand_total::numeric, 2) THEN
    RAISE EXCEPTION 'Invoice total changed; refresh the bill and try again';
  END IF;

  -- Verify all pharmacy items have an exact, still-pending prescription link.
  SELECT count(*) INTO v_item_count
  FROM public.invoice_items WHERE invoice_id = p_invoice_id AND category = 'pharmacy';
  IF v_item_count <> jsonb_array_length(COALESCE(p_prescription_links, '[]'::jsonb)) THEN
    RAISE EXCEPTION 'Pharmacy invoice items changed; reload the bill';
  END IF;

  FOR v_link IN SELECT value FROM jsonb_array_elements(COALESCE(p_prescription_links, '[]'::jsonb))
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.prescriptions p
      JOIN public.invoice_items ii ON ii.id = (v_link->>'invoiceItemId')::uuid
      WHERE p.id = (v_link->>'prescriptionId')::uuid
        AND p.patient_id = p_patient_id
        AND p.status = 'pending_payment'
        AND ii.invoice_id = p_invoice_id
        AND ii.category = 'pharmacy'
        AND lower(trim(ii.name)) = lower(trim(p.drug_name))
        AND ii.quantity = p.quantity
        AND ii.unit_price = p.price_per_unit
    ) THEN
      RAISE EXCEPTION 'A pharmacy prescription no longer matches this invoice';
    END IF;
  END LOOP;

  -- Verify every diagnostic invoice line still has its corresponding order.
  SELECT count(*) INTO v_item_count
  FROM public.invoice_items WHERE invoice_id = p_invoice_id AND category = 'diagnostic';
  IF v_item_count <> COALESCE(cardinality(p_diagnostic_ids), 0) THEN
    RAISE EXCEPTION 'Diagnostic invoice items changed; reload the bill';
  END IF;

  FOREACH v_diag_id IN ARRAY COALESCE(p_diagnostic_ids, ARRAY[]::uuid[])
  LOOP
    SELECT * INTO v_diag FROM public.diagnostic_orders
    WHERE id = v_diag_id AND patient_id = p_patient_id AND status = 'ordered'
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A diagnostic order is no longer awaiting payment'; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.invoice_items ii
      WHERE ii.invoice_id = p_invoice_id
        AND ii.category = 'diagnostic'
        AND lower(trim(ii.name)) = lower(trim(v_diag.name))
        AND (
          ii.unit_price = v_diag.price
          OR (v_diag.price = 0 AND ii.unit_price > 0 AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(p_diagnostic_updates, '[]'::jsonb)) u
            WHERE (u->>'id')::uuid = v_diag_id
              AND (u->>'approvedPrice')::numeric = ii.unit_price
          ))
        )
    ) THEN
      RAISE EXCEPTION 'A diagnostic order no longer matches this invoice';
    END IF;
  END LOOP;

  -- Verify laboratory orders are still pending and match the invoiced tests.
  SELECT count(*) INTO v_item_count
  FROM public.invoice_items WHERE invoice_id = p_invoice_id AND category = 'laboratory';
  IF v_item_count <> COALESCE(cardinality(p_lab_order_ids), 0) THEN
    RAISE EXCEPTION 'Laboratory invoice items changed; reload the bill';
  END IF;

  FOREACH v_diag_id IN ARRAY COALESCE(p_lab_order_ids, ARRAY[]::uuid[])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.lab_orders lo
      JOIN public.invoice_items ii
        ON ii.invoice_id = p_invoice_id
       AND ii.category = 'laboratory'
       AND lower(trim(ii.name)) = lower(trim(lo.test_name))
      WHERE lo.id = v_diag_id AND lo.patient_id = p_patient_id AND lo.status = 'PENDING'
    ) THEN
      RAISE EXCEPTION 'A laboratory order is no longer pending or no longer matches this invoice';
    END IF;
  END LOOP;

  -- All validation is complete. Apply every state change and payment together.
  FOR v_link IN SELECT value FROM jsonb_array_elements(COALESCE(p_prescription_links, '[]'::jsonb))
  LOOP
    UPDATE public.prescriptions
    SET status = 'ready_for_dispensing',
        invoice_item_id = (v_link->>'invoiceItemId')::uuid
    WHERE id = (v_link->>'prescriptionId')::uuid
      AND patient_id = p_patient_id
      AND status = 'pending_payment';
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN RAISE EXCEPTION 'Prescription changed while payment was being finalized'; END IF;
  END LOOP;

  FOREACH v_diag_id IN ARRAY COALESCE(p_diagnostic_ids, ARRAY[]::uuid[])
  LOOP
    UPDATE public.diagnostic_orders
    SET status = 'ready_for_test',
        price = CASE
          WHEN price = 0 THEN COALESCE((
            SELECT (u->>'approvedPrice')::numeric
            FROM jsonb_array_elements(COALESCE(p_diagnostic_updates, '[]'::jsonb)) u
            WHERE (u->>'id')::uuid = v_diag_id
          ), price)
          ELSE price
        END
    WHERE id = v_diag_id AND patient_id = p_patient_id AND status = 'ordered';
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN RAISE EXCEPTION 'Diagnostic order changed while payment was being finalized'; END IF;
  END LOOP;

  UPDATE public.invoices
  SET status = 'paid',
      grand_total = p_grand_total,
      payment_method = p_payment_method,
      paid_at = COALESCE(p_paid_at, now())
  WHERE id = p_invoice_id
    AND patient_id = p_patient_id
    AND status IN ('draft', 'pending');
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count <> 1 THEN RAISE EXCEPTION 'Invoice was already paid or changed during payment'; END IF;

  RETURN jsonb_build_object(
    'invoiceId', p_invoice_id,
    'status', 'paid',
    'grandTotal', p_grand_total,
    'prescriptionsUnlocked', jsonb_array_length(COALESCE(p_prescription_links, '[]'::jsonb)),
    'diagnosticsUnlocked', COALESCE(cardinality(p_diagnostic_ids), 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_invoice_payment_atomic(uuid, uuid, text, numeric, timestamptz, jsonb, uuid[], jsonb, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_invoice_payment_atomic(uuid, uuid, text, numeric, timestamptz, jsonb, uuid[], jsonb, uuid[])
  TO service_role;
