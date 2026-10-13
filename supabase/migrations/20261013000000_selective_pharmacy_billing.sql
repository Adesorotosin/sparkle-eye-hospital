-- Link each pharmacy invoice line to the exact prescription it bills.
-- This avoids ambiguous matching when medications share names and prices.
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS prescription_id uuid
  REFERENCES public.prescriptions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_items_prescription_unique
  ON public.invoice_items(prescription_id)
  WHERE prescription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status_created
  ON public.prescriptions(patient_id, status, created_at);

-- Replace the draft invoice pharmacy lines atomically so a failed insert
-- cannot leave the patient bill partially updated.
CREATE OR REPLACE FUNCTION public.prepare_selected_prescriptions_for_payment(
  p_patient_id uuid,
  p_invoice_id uuid,
  p_prescription_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_status text;
  v_selected_count integer;
  v_selected_total numeric;
BEGIN
  IF p_patient_id IS NULL OR p_invoice_id IS NULL OR p_prescription_ids IS NULL
     OR cardinality(p_prescription_ids) = 0 THEN
    RAISE EXCEPTION 'Patient, invoice, and at least one prescription are required.';
  END IF;

  SELECT status INTO v_invoice_status
  FROM public.invoices
  WHERE id = p_invoice_id AND patient_id = p_patient_id
  FOR UPDATE;

  IF NOT FOUND OR v_invoice_status NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION 'The patient invoice is unavailable or cannot be changed.';
  END IF;

  PERFORM p.id
  FROM public.prescriptions p
  WHERE p.patient_id = p_patient_id
    AND p.id = ANY(p_prescription_ids)
    AND p.status = 'pending_payment'
  FOR UPDATE;

  SELECT count(*), COALESCE(sum(total_price), 0)
  INTO v_selected_count, v_selected_total
  FROM public.prescriptions
  WHERE patient_id = p_patient_id
    AND id = ANY(p_prescription_ids)
    AND status = 'pending_payment';

  IF v_selected_count <> cardinality(p_prescription_ids) THEN
    RAISE EXCEPTION 'One or more selected prescriptions are no longer awaiting payment.';
  END IF;

  -- Remove stale linked lines first, then replace legacy/current pharmacy lines.
  DELETE FROM public.invoice_items
  WHERE prescription_id = ANY(p_prescription_ids);

  DELETE FROM public.invoice_items
  WHERE invoice_id = p_invoice_id AND category = 'pharmacy';

  INSERT INTO public.invoice_items (
    invoice_id, prescription_id, category, name, quantity, unit_price, total_price
  )
  SELECT
    p_invoice_id, p.id, 'pharmacy', p.drug_name, p.quantity, p.price_per_unit, p.total_price
  FROM public.prescriptions p
  WHERE p.patient_id = p_patient_id
    AND p.id = ANY(p_prescription_ids)
    AND p.status = 'pending_payment';

  RETURN jsonb_build_object(
    'selected_count', v_selected_count,
    'selected_total', v_selected_total
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prepare_selected_prescriptions_for_payment(uuid, uuid, uuid[])
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_selected_prescriptions_for_payment(uuid, uuid, uuid[])
TO service_role;
