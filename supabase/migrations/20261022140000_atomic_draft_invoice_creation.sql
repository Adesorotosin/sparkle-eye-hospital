-- Make draft-invoice creation concurrency-safe and invoice numbers collision-safe.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0;

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;

-- Seed the sequence above existing formatted invoice numbers without changing them.
SELECT setval(
  'public.invoice_number_seq',
  COALESCE(
    MAX(substring(invoice_no FROM '^INV-[0-9]{4}-([0-9]+)$')::bigint),
    0
  ) + 1,
  false
)
FROM public.invoices
WHERE invoice_no ~ '^INV-[0-9]{4}-[0-9]+$';

CREATE OR REPLACE FUNCTION public.get_or_create_draft_invoice(
  p_patient_id uuid
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_year integer;
  v_invoice_no text;
BEGIN
  -- Serialize invoice creation per patient so concurrent clinical actions
  -- reuse the same active draft instead of creating competing bills.
  PERFORM 1
  FROM public.patients
  WHERE id = p_patient_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices
  WHERE patient_id = p_patient_id
    AND status IN ('draft', 'pending')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN v_invoice;
  END IF;

  v_year := EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos'))::integer;
  v_invoice_no := 'INV-' || v_year::text || '-' ||
    lpad(nextval('public.invoice_number_seq')::text, 4, '0');

  INSERT INTO public.invoices (
    invoice_no,
    patient_id,
    status,
    vat_rate,
    vat_amount
  )
  VALUES (
    v_invoice_no,
    p_patient_id,
    'draft',
    0,
    0
  )
  RETURNING * INTO v_invoice;

  RETURN v_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_draft_invoice(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_draft_invoice(uuid)
  TO service_role;
