-- Ensure the optical-order billing workflow is represented in versioned schema.
-- Existing deployments already have this table; IF NOT EXISTS is intentionally non-destructive.
CREATE TABLE IF NOT EXISTS public.optical_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  optometry_encounter_id uuid NULL REFERENCES public.encounters(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'referred'
    CHECK (status IN ('referred', 'measurements', 'ready_for_dispense', 'collected')),
  pd_binocular text,
  pd_od text,
  pd_os text,
  segment_height_od text,
  segment_height_os text,
  frame_selection text,
  lens_type text,
  lens_material text,
  lens_coating text,
  dispensing_notes text,
  optical_charge numeric(12,2) NOT NULL DEFAULT 0 CHECK (optical_charge >= 0),
  invoice_id uuid NULL REFERENCES public.invoices(id) ON DELETE SET NULL,
  patient_code text,
  patient_name text,
  charge_approval_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (charge_approval_status IN ('not_submitted', 'pending', 'approved', 'rejected')),
  charge_approval_note text,
  charge_submitted_at timestamptz,
  charge_approved_by uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  charge_approved_at timestamptz,
  referred_at timestamptz,
  measurements_started_at timestamptz,
  ready_at timestamptz,
  collected_at timestamptz,
  recorded_by uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  collected_by uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.optical_orders
  ADD COLUMN IF NOT EXISTS patient_code text,
  ADD COLUMN IF NOT EXISTS patient_name text,
  ADD COLUMN IF NOT EXISTS invoice_item_id uuid NULL
    REFERENCES public.invoice_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS optical_orders_patient_status_idx
  ON public.optical_orders(patient_id, status);

CREATE OR REPLACE FUNCTION public.finalize_optical_order_billing_atomic(
  p_order_id uuid,
  p_staff_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order public.optical_orders%ROWTYPE;
  v_patient public.patients%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_item public.invoice_items%ROWTYPE;
  v_invoice_id uuid;
  v_item_id uuid;
  v_item_name text;
  v_item_count integer;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_taxable numeric(12,2);
  v_vat numeric(12,2);
  v_charge numeric(12,2);
BEGIN
  SELECT * INTO v_order
  FROM public.optical_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Optical order not found'; END IF;
  IF v_order.status = 'collected' THEN
    RAISE EXCEPTION 'This optical order has already been collected';
  END IF;

  SELECT * INTO v_patient
  FROM public.patients
  WHERE id = v_order.patient_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found'; END IF;

  IF v_order.status = 'ready_for_dispense' AND v_order.invoice_item_id IS NOT NULL THEN
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = v_order.invoice_id;
    IF FOUND AND v_invoice.status IN ('draft', 'pending', 'paid') THEN
      RETURN jsonb_build_object(
        'order_id', v_order.id,
        'invoice_id', v_invoice.id,
        'invoice_item_id', v_order.invoice_item_id,
        'grand_total', v_invoice.grand_total,
        'already_ready', true
      );
    END IF;
  END IF;

  IF v_order.status NOT IN ('referred', 'measurements', 'ready_for_dispense') THEN
    RAISE EXCEPTION 'Only optical orders in preparation can be marked ready';
  END IF;
  IF NULLIF(BTRIM(COALESCE(v_order.pd_binocular, '')), '') IS NULL
     AND (
       NULLIF(BTRIM(COALESCE(v_order.pd_od, '')), '') IS NULL
       OR NULLIF(BTRIM(COALESCE(v_order.pd_os, '')), '') IS NULL
     ) THEN
    RAISE EXCEPTION 'Record binocular PD or both monocular PD measurements before billing';
  END IF;
  IF NULLIF(BTRIM(COALESCE(v_order.frame_selection, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Select a frame before marking the order ready';
  END IF;
  IF NULLIF(BTRIM(COALESCE(v_order.lens_type, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Select a lens type before marking the order ready';
  END IF;
  IF v_order.charge_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Doctor approval is required before optical billing';
  END IF;

  v_charge := ROUND(COALESCE(v_order.optical_charge, 0), 2);
  IF v_charge <= 0 THEN RAISE EXCEPTION 'Approved optical charge must be greater than zero'; END IF;

  -- Reuse an active linked invoice; otherwise get/create the patient's active invoice.
  IF v_order.invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = v_order.invoice_id
    FOR UPDATE;
    IF FOUND AND v_invoice.status = 'paid' THEN
      RAISE EXCEPTION 'This optical order is linked to a paid invoice';
    END IF;
    IF FOUND AND v_invoice.status IN ('draft', 'pending') THEN
      v_invoice_id := v_invoice.id;
    END IF;
  END IF;

  IF v_invoice_id IS NULL THEN
    v_invoice := public.get_or_create_draft_invoice(v_order.patient_id);
    v_invoice_id := v_invoice.id;
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = v_invoice_id
    FOR UPDATE;
  END IF;

  v_item_name := 'Optical eyewear - ' || v_patient.full_name || ' (' || v_patient.patient_code || ')';

  v_item_id := v_order.invoice_item_id;
  IF v_item_id IS NOT NULL THEN
    SELECT * INTO v_item
    FROM public.invoice_items
    WHERE id = v_item_id AND invoice_id = v_invoice_id AND category = 'optical'
    FOR UPDATE;
    IF NOT FOUND THEN v_item_id := NULL; END IF;
  END IF;

  -- Backward-compatible recovery for one unambiguously matching legacy line.
  IF v_item_id IS NULL THEN
    SELECT COUNT(*), MIN(id::text)::uuid
    INTO v_item_count, v_item_id
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id
      AND category = 'optical'
      AND LOWER(BTRIM(name)) = LOWER(BTRIM(v_item_name));
    IF v_item_count > 1 THEN
      RAISE EXCEPTION 'Multiple legacy optical bill lines match this patient; reconcile billing before proceeding';
    END IF;
  END IF;

  IF v_item_id IS NULL THEN
    INSERT INTO public.invoice_items(invoice_id, category, name, quantity, unit_price, total_price)
    VALUES (v_invoice_id, 'optical', v_item_name, 1, v_charge, v_charge)
    RETURNING id INTO v_item_id;
  ELSE
    UPDATE public.invoice_items
    SET name = v_item_name, quantity = 1, unit_price = v_charge, total_price = v_charge
    WHERE id = v_item_id AND invoice_id = v_invoice_id AND category = 'optical';
    IF NOT FOUND THEN RAISE EXCEPTION 'Optical invoice line changed; refresh and retry'; END IF;
  END IF;

  SELECT COALESCE(ROUND(SUM(total_price), 2), 0)
  INTO v_subtotal
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  v_discount := LEAST(GREATEST(COALESCE(v_invoice.discount_amount, 0), 0), v_subtotal);
  v_taxable := GREATEST(v_subtotal - v_discount, 0);
  v_vat := ROUND(v_taxable * (GREATEST(COALESCE(v_invoice.vat_rate, 0), 0) / 100), 2);

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      discount_amount = v_discount,
      vat_amount = v_vat,
      grand_total = ROUND(v_taxable + v_vat, 2)
  WHERE id = v_invoice_id;

  UPDATE public.optical_orders
  SET invoice_id = v_invoice_id,
      invoice_item_id = v_item_id,
      status = 'ready_for_dispense',
      ready_at = COALESCE(ready_at, now()),
      updated_at = now(),
      recorded_by = p_staff_id
  WHERE id = v_order.id
    AND status IN ('referred', 'measurements', 'ready_for_dispense')
    AND charge_approval_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Optical order changed while billing; no changes were committed';
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'invoice_id', v_invoice_id,
    'invoice_item_id', v_item_id,
    'optical_charge', v_charge,
    'grand_total', ROUND(v_taxable + v_vat, 2),
    'vat_amount', v_vat,
    'already_ready', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_optical_order_billing_atomic(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_optical_order_billing_atomic(uuid, uuid)
  TO service_role;
