-- Pharmacy dispensing must update the shared inventory movement ledger in the same
-- transaction as the stock deduction and prescription status change.
DROP FUNCTION IF EXISTS public.dispense_patient_prescriptions(uuid);

CREATE OR REPLACE FUNCTION public.dispense_patient_prescriptions(
  p_patient_id uuid,
  p_performed_by uuid,
  p_performed_by_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prescription_record record;
  inventory_record record;
  dispensed_count integer := 0;
  total_quantity integer := 0;
  prescription_ids uuid[] := '{}';
  v_new_stock integer;
  inventory_match_count integer := 0;
BEGIN
  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'Patient ID is required.';
  END IF;
  IF p_performed_by IS NULL OR NULLIF(trim(p_performed_by_name), '') IS NULL THEN
    RAISE EXCEPTION 'Dispensing staff identity is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.prescriptions
    WHERE patient_id = p_patient_id
      AND status = 'ready_for_dispensing'
  ) THEN
    RAISE EXCEPTION 'No prescriptions are ready for dispensing.';
  END IF;

  -- Lock prescriptions so concurrent requests cannot dispense them twice.
  FOR prescription_record IN
    SELECT id, drug_name, quantity
    FROM public.prescriptions
    WHERE patient_id = p_patient_id
      AND status = 'ready_for_dispensing'
    ORDER BY created_at ASC, id ASC
    FOR UPDATE
  LOOP
    -- Do not silently choose the oldest row if duplicate active stock names exist.
    SELECT count(*) INTO inventory_match_count
    FROM public.inventory_items
    WHERE domain = 'pharmacy'
      AND is_active = true
      AND lower(trim(name)) = lower(trim(prescription_record.drug_name));

    IF inventory_match_count = 0 THEN
      RAISE EXCEPTION 'Active pharmacy stock item not found for medication: %',
        prescription_record.drug_name;
    ELSIF inventory_match_count > 1 THEN
      RAISE EXCEPTION 'Multiple active pharmacy stock items match medication: %. Resolve duplicate inventory names before dispensing.',
        prescription_record.drug_name;
    END IF;

    -- Lock the matching active stock row to serialize competing stock deductions.
    SELECT id, name, stock, unit_cost, unit_of_measure
    INTO inventory_record
    FROM public.inventory_items
    WHERE domain = 'pharmacy'
      AND is_active = true
      AND lower(trim(name)) = lower(trim(prescription_record.drug_name))
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Active pharmacy stock item not found for medication: %',
        prescription_record.drug_name;
    END IF;

    IF inventory_record.stock < prescription_record.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %: % available, % required.',
        inventory_record.name,
        inventory_record.stock,
        prescription_record.quantity;
    END IF;

    v_new_stock := inventory_record.stock - prescription_record.quantity;

    UPDATE public.inventory_items
    SET stock = v_new_stock,
        updated_at = now()
    WHERE id = inventory_record.id;

    UPDATE public.prescriptions
    SET status = 'dispensed'
    WHERE id = prescription_record.id
      AND status = 'ready_for_dispensing';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Prescription % is no longer ready for dispensing.',
        prescription_record.id;
    END IF;

    INSERT INTO public.inventory_movements (
      item_id, movement_type, quantity, previous_stock, new_stock,
      unit_cost, department, reference, notes, performed_by, performed_by_name
    ) VALUES (
      inventory_record.id, 'SALE', prescription_record.quantity,
      inventory_record.stock, v_new_stock, inventory_record.unit_cost,
      'Pharmacy', prescription_record.id::text,
      'Dispensed for patient ' || p_patient_id::text,
      p_performed_by, trim(p_performed_by_name)
    );

    prescription_ids := array_append(prescription_ids, prescription_record.id);
    dispensed_count := dispensed_count + 1;
    total_quantity := total_quantity + prescription_record.quantity;
  END LOOP;

  RETURN jsonb_build_object(
    'dispensed_count', dispensed_count,
    'total_quantity', total_quantity,
    'prescription_ids', prescription_ids
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispense_patient_prescriptions(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispense_patient_prescriptions(uuid, uuid, text)
  TO service_role;
