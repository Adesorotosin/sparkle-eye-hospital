-- Create the procedure order and its billing line in one database transaction.
CREATE OR REPLACE FUNCTION public.register_procedure_with_invoice_item(
  p_patient_id uuid,
  p_invoice_id uuid,
  p_procedure_name text,
  p_scheduled_date date,
  p_notes text,
  p_price numeric,
  p_registered_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_procedure_id uuid;
BEGIN
  IF NULLIF(BTRIM(p_procedure_name), '') IS NULL THEN
    RAISE EXCEPTION 'Procedure name is required';
  END IF;

  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'Procedure price must be zero or greater';
  END IF;

  PERFORM 1
  FROM public.patients
  WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  -- Lock and validate the invoice before writing either the order or line item.
  PERFORM 1
  FROM public.invoices
  WHERE id = p_invoice_id
    AND patient_id = p_patient_id
    AND status IN ('draft', 'pending')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A draft or pending invoice for this patient is required';
  END IF;

  INSERT INTO public.procedure_orders (
    patient_id,
    procedure_name,
    referral_type,
    order_reference,
    scheduled_date,
    notes,
    price,
    status,
    invoice_id,
    registered_by
  )
  VALUES (
    p_patient_id,
    BTRIM(p_procedure_name),
    'doctor_order',
    'In-house after doctor''s review',
    p_scheduled_date,
    NULLIF(BTRIM(p_notes), ''),
    p_price,
    'scheduled',
    p_invoice_id,
    p_registered_by
  )
  RETURNING id INTO v_procedure_id;

  INSERT INTO public.invoice_items (
    invoice_id,
    category,
    name,
    quantity,
    unit_price,
    total_price
  )
  VALUES (
    p_invoice_id,
    'procedure',
    BTRIM(p_procedure_name),
    1,
    p_price,
    p_price
  );

  RETURN v_procedure_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_procedure_with_invoice_item(
  uuid, uuid, text, date, text, numeric, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_procedure_with_invoice_item(
  uuid, uuid, text, date, text, numeric, uuid
) TO service_role;
