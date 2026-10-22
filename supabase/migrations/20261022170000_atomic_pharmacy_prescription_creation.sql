-- Create a pharmacy prescription, invoice line, and link atomically.
CREATE OR REPLACE FUNCTION public.create_pharmacy_prescription_atomic(
  p_patient_id uuid,
  p_drug_name text,
  p_dosage text,
  p_quantity integer,
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_patient public.patients%ROWTYPE;
  v_stock_item public.inventory_items%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_prescription_id uuid;
  v_invoice_item_id uuid;
  v_total numeric(12,2);
  v_match_count integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a whole number greater than zero';
  END IF;
  IF NULLIF(BTRIM(p_drug_name), '') IS NULL OR NULLIF(BTRIM(p_dosage), '') IS NULL THEN
    RAISE EXCEPTION 'Medication name and dosage are required';
  END IF;

  SELECT * INTO v_patient
  FROM public.patients
  WHERE id = p_patient_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found'; END IF;

  SELECT count(*) INTO v_match_count
  FROM public.inventory_items
  WHERE domain = 'pharmacy'
    AND name = BTRIM(p_drug_name)
    AND is_active = true;

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'Select a medication from the active pharmacy inventory';
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'This medication name is duplicated in pharmacy inventory; ask an administrator to resolve it';
  END IF;

  SELECT * INTO v_stock_item
  FROM public.inventory_items
  WHERE domain = 'pharmacy'
    AND name = BTRIM(p_drug_name)
    AND is_active = true
  FOR UPDATE;

  IF v_stock_item.stock < p_quantity THEN
    RAISE EXCEPTION 'Only % unit(s) of this medication are in stock', v_stock_item.stock;
  END IF;

  v_total := v_stock_item.price * p_quantity;

  v_invoice := public.get_or_create_draft_invoice(p_patient_id);

  -- Lock and re-check the invoice because another workflow may have finalised it.
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = v_invoice.id
    AND patient_id = p_patient_id
    AND status IN ('draft', 'pending')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A draft or pending invoice is required'; END IF;

  INSERT INTO public.prescriptions (
    patient_id, drug_name, dosage, quantity, price_per_unit,
    total_price, status
  )
  VALUES (
    p_patient_id, BTRIM(p_drug_name), BTRIM(p_dosage), p_quantity,
    v_stock_item.price, v_total, 'pending_payment'
  )
  RETURNING id INTO v_prescription_id;

  INSERT INTO public.invoice_items (
    invoice_id, category, name, quantity, unit_price, total_price
  )
  VALUES (
    v_invoice.id, 'pharmacy', BTRIM(p_drug_name), p_quantity,
    v_stock_item.price, v_total
  )
  RETURNING id INTO v_invoice_item_id;

  UPDATE public.prescriptions
  SET invoice_item_id = v_invoice_item_id
  WHERE id = v_prescription_id AND patient_id = p_patient_id;

  RETURN jsonb_build_object(
    'prescription_id', v_prescription_id,
    'invoice_id', v_invoice.id,
    'invoice_item_id', v_invoice_item_id,
    'price_per_unit', v_stock_item.price,
    'total_price', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_pharmacy_prescription_atomic(uuid, text, text, integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pharmacy_prescription_atomic(uuid, text, text, integer, uuid)
  TO service_role;
