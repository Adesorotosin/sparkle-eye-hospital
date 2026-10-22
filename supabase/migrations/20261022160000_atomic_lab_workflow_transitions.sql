-- Transaction-backed laboratory workflow transitions.
-- Each function includes the associated timeline event in the same transaction.
CREATE UNIQUE INDEX IF NOT EXISTS lab_results_order_sample_unique
  ON public.lab_results(lab_order_id, sample_id)
  WHERE sample_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_lab_order_atomic(
  p_patient_id uuid,
  p_test_code text,
  p_test_name text,
  p_specimen_type text,
  p_priority text,
  p_clinical_notes text,
  p_ordered_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  IF p_priority NOT IN ('NORMAL', 'URGENT', 'STAT') THEN
    RAISE EXCEPTION 'Invalid laboratory priority';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient_id) THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  INSERT INTO public.lab_orders (
    patient_id, test_code, test_name, specimen_type, priority,
    status, clinical_notes, ordered_by
  )
  VALUES (
    p_patient_id, BTRIM(p_test_code), BTRIM(p_test_name), BTRIM(p_specimen_type),
    p_priority, 'PENDING', NULLIF(BTRIM(p_clinical_notes), ''), p_ordered_by
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.lab_events (
    lab_order_id, event_type, description, performed_by, metadata
  )
  VALUES (
    v_order_id,
    'ORDERED',
    'Laboratory investigation ordered: ' || BTRIM(p_test_name),
    p_ordered_by,
    jsonb_build_object(
      'testCode', BTRIM(p_test_code),
      'testName', BTRIM(p_test_name),
      'specimenType', BTRIM(p_specimen_type),
      'priority', p_priority
    )
  );

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.collect_lab_sample_atomic(
  p_lab_order_id uuid,
  p_sample_type text,
  p_sample_id text,
  p_collection_notes text,
  p_performed_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order public.lab_orders%ROWTYPE;
  v_sample_id uuid;
  v_sample_number integer;
  v_rows integer;
BEGIN
  SELECT * INTO v_order
  FROM public.lab_orders
  WHERE id = p_lab_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Laboratory order not found';
  END IF;
  IF v_order.status NOT IN ('PENDING', 'RECOLLECTION') THEN
    RAISE EXCEPTION 'This laboratory order is not ready for sample collection';
  END IF;

  SELECT COALESCE(MAX(sample_number), 0) + 1 INTO v_sample_number
  FROM public.lab_samples
  WHERE lab_order_id = p_lab_order_id;

  INSERT INTO public.lab_samples (
    lab_order_id, sample_number, sample_type, sample_id, status,
    collection_notes, collected_by, collected_at
  )
  VALUES (
    p_lab_order_id, v_sample_number, BTRIM(p_sample_type),
    NULLIF(BTRIM(p_sample_id), ''), 'COLLECTED',
    NULLIF(BTRIM(p_collection_notes), ''), p_performed_by, now()
  )
  RETURNING id INTO v_sample_id;

  UPDATE public.lab_orders
  SET status = 'COLLECTED'
  WHERE id = p_lab_order_id
    AND status IN ('PENDING', 'RECOLLECTION');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Laboratory order changed during sample collection';
  END IF;

  INSERT INTO public.lab_events (
    lab_order_id, sample_id, event_type, description, performed_by, metadata
  )
  VALUES (
    p_lab_order_id, v_sample_id, 'SAMPLE_COLLECTED',
    'Sample ' || v_sample_number || ' collected.',
    p_performed_by,
    jsonb_build_object(
      'sampleNumber', v_sample_number,
      'sampleType', BTRIM(p_sample_type),
      'sampleId', NULLIF(BTRIM(p_sample_id), '')
    )
  );

  RETURN v_sample_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.receive_lab_sample_atomic(
  p_lab_order_id uuid,
  p_sample_id uuid,
  p_condition text,
  p_reception_notes text,
  p_performed_by uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order public.lab_orders%ROWTYPE;
  v_sample public.lab_samples%ROWTYPE;
  v_reason text;
BEGIN
  IF p_condition NOT IN ('ACCEPTABLE', 'INSUFFICIENT', 'CLOTTED', 'HAEMOLYSED',
                         'WRONG_CONTAINER', 'WRONG_SAMPLE', 'OTHER') THEN
    RAISE EXCEPTION 'Invalid sample condition';
  END IF;

  SELECT * INTO v_order FROM public.lab_orders
  WHERE id = p_lab_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory order not found'; END IF;

  SELECT * INTO v_sample FROM public.lab_samples
  WHERE id = p_sample_id AND lab_order_id = p_lab_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory sample not found'; END IF;
  IF v_sample.status <> 'COLLECTED' OR v_order.status <> 'COLLECTED' THEN
    RAISE EXCEPTION 'This sample is not awaiting laboratory reception';
  END IF;

  IF p_condition = 'ACCEPTABLE' THEN
    UPDATE public.lab_samples
    SET status = 'RECEIVED',
        condition = 'ACCEPTABLE',
        received_by = p_performed_by,
        received_at = now(),
        collection_notes = NULLIF(BTRIM(p_reception_notes), '')
    WHERE id = p_sample_id;

    UPDATE public.lab_orders SET status = 'PROCESSING'
    WHERE id = p_lab_order_id AND status = 'COLLECTED';

    INSERT INTO public.lab_events (
      lab_order_id, sample_id, event_type, description, performed_by, metadata
    )
    VALUES (
      p_lab_order_id, p_sample_id, 'SAMPLE_RECEIVED',
      'Sample ' || v_sample.sample_number || ' received and accepted.',
      p_performed_by,
      jsonb_build_object('condition', 'ACCEPTABLE',
                         'receptionNotes', NULLIF(BTRIM(p_reception_notes), ''))
    );

    RETURN 'ACCEPTED';
  END IF;

  v_reason := COALESCE(NULLIF(BTRIM(p_reception_notes), ''),
                       'Sample rejected: ' || p_condition || '.');

  UPDATE public.lab_samples
  SET status = 'REJECTED',
      condition = p_condition,
      rejection_reason = v_reason,
      rejected_by = p_performed_by,
      rejected_at = now(),
      received_by = p_performed_by,
      received_at = now()
  WHERE id = p_sample_id;

  UPDATE public.lab_orders SET status = 'RECOLLECTION'
  WHERE id = p_lab_order_id AND status = 'COLLECTED';

  INSERT INTO public.lab_events (
    lab_order_id, sample_id, event_type, description, performed_by, metadata
  )
  VALUES (
    p_lab_order_id, p_sample_id, 'SAMPLE_REJECTED',
    'Sample ' || v_sample.sample_number || ' rejected. Recollection required.',
    p_performed_by,
    jsonb_build_object('condition', p_condition, 'rejectionReason', v_reason)
  );

  RETURN 'RECOLLECTION';
END;
$$;

CREATE OR REPLACE FUNCTION public.start_lab_processing_atomic(
  p_lab_order_id uuid,
  p_sample_id uuid,
  p_processing_notes text,
  p_performed_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order public.lab_orders%ROWTYPE;
  v_sample public.lab_samples%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.lab_orders
  WHERE id = p_lab_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory order not found'; END IF;

  SELECT * INTO v_sample FROM public.lab_samples
  WHERE id = p_sample_id AND lab_order_id = p_lab_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory sample not found'; END IF;

  IF v_sample.status <> 'RECEIVED'
     OR v_sample.condition <> 'ACCEPTABLE'
     OR v_order.status NOT IN ('COLLECTED', 'PROCESSING') THEN
    RAISE EXCEPTION 'Only an accepted received sample can enter processing';
  END IF;

  UPDATE public.lab_samples
  SET status = 'PROCESSING',
      processing_started_by = p_performed_by,
      processing_started_at = now()
  WHERE id = p_sample_id AND status = 'RECEIVED';

  UPDATE public.lab_orders SET status = 'PROCESSING'
  WHERE id = p_lab_order_id AND status IN ('COLLECTED', 'PROCESSING');

  INSERT INTO public.lab_events (
    lab_order_id, sample_id, event_type, description, performed_by, metadata
  )
  VALUES (
    p_lab_order_id, p_sample_id, 'PROCESSING_STARTED',
    'Processing started for sample ' || v_sample.sample_number || '.',
    p_performed_by,
    jsonb_build_object('processingNotes', NULLIF(BTRIM(p_processing_notes), ''))
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_lab_result_atomic(
  p_lab_order_id uuid,
  p_sample_id uuid,
  p_result_data jsonb,
  p_laboratory_comments text,
  p_performed_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order public.lab_orders%ROWTYPE;
  v_sample public.lab_samples%ROWTYPE;
  v_result_id uuid;
BEGIN
  IF p_result_data IS NULL OR jsonb_typeof(p_result_data) <> 'array'
     OR jsonb_array_length(p_result_data) = 0 THEN
    RAISE EXCEPTION 'At least one laboratory result is required';
  END IF;

  SELECT * INTO v_order FROM public.lab_orders
  WHERE id = p_lab_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory order not found'; END IF;

  SELECT * INTO v_sample FROM public.lab_samples
  WHERE id = p_sample_id AND lab_order_id = p_lab_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory sample not found'; END IF;

  IF v_order.status NOT IN ('PROCESSING', 'AWAITING_VERIFICATION')
     OR v_sample.status <> 'PROCESSING' THEN
    RAISE EXCEPTION 'This laboratory sample is not currently being processed';
  END IF;

  SELECT id INTO v_result_id FROM public.lab_results
  WHERE lab_order_id = p_lab_order_id AND sample_id = p_sample_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.lab_results
    SET result_data = p_result_data,
        laboratory_comments = NULLIF(BTRIM(p_laboratory_comments), ''),
        entered_by = p_performed_by,
        entered_at = now(),
        verified_by = NULL,
        verified_at = NULL,
        verification_notes = NULL
    WHERE id = v_result_id;
  ELSE
    INSERT INTO public.lab_results (
      lab_order_id, sample_id, result_data, laboratory_comments, entered_by, entered_at
    )
    VALUES (
      p_lab_order_id, p_sample_id, p_result_data,
      NULLIF(BTRIM(p_laboratory_comments), ''), p_performed_by, now()
    )
    RETURNING id INTO v_result_id;
  END IF;

  UPDATE public.lab_samples SET status = 'COMPLETED'
  WHERE id = p_sample_id AND status = 'PROCESSING';

  UPDATE public.lab_orders SET status = 'AWAITING_VERIFICATION'
  WHERE id = p_lab_order_id AND status IN ('PROCESSING', 'AWAITING_VERIFICATION');

  INSERT INTO public.lab_events (
    lab_order_id, sample_id, event_type, description, performed_by, metadata
  )
  VALUES (
    p_lab_order_id, p_sample_id, 'RESULT_ENTERED',
    'Laboratory result entered for ' || v_order.test_name || '. Awaiting verification.',
    p_performed_by,
    jsonb_build_object('resultId', v_result_id,
                       'resultCount', jsonb_array_length(p_result_data))
  );

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_lab_result_atomic(
  p_lab_order_id uuid,
  p_result_id uuid,
  p_verification_notes text,
  p_performed_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order public.lab_orders%ROWTYPE;
  v_result public.lab_results%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.lab_orders
  WHERE id = p_lab_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory order not found'; END IF;
  IF v_order.status <> 'AWAITING_VERIFICATION' THEN
    RAISE EXCEPTION 'This laboratory result is not ready for verification';
  END IF;

  SELECT * INTO v_result FROM public.lab_results
  WHERE id = p_result_id AND lab_order_id = p_lab_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratory result not found'; END IF;
  IF v_result.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'This laboratory result has already been verified';
  END IF;
  IF jsonb_typeof(v_result.result_data) <> 'array'
     OR jsonb_array_length(v_result.result_data) = 0 THEN
    RAISE EXCEPTION 'Cannot verify an empty laboratory result';
  END IF;

  UPDATE public.lab_results
  SET verified_by = p_performed_by,
      verified_at = now(),
      verification_notes = NULLIF(BTRIM(p_verification_notes), '')
  WHERE id = p_result_id AND verified_at IS NULL;

  UPDATE public.lab_orders SET status = 'COMPLETED'
  WHERE id = p_lab_order_id AND status = 'AWAITING_VERIFICATION';

  IF v_result.sample_id IS NOT NULL THEN
    UPDATE public.lab_samples SET status = 'COMPLETED'
    WHERE id = v_result.sample_id;
  END IF;

  INSERT INTO public.lab_events (
    lab_order_id, sample_id, event_type, description, performed_by, metadata
  )
  VALUES (
    p_lab_order_id, v_result.sample_id, 'RESULT_VERIFIED',
    'Laboratory result verified for ' || v_order.test_name || '.',
    p_performed_by,
    jsonb_build_object('resultId', p_result_id,
                       'verificationNotes', NULLIF(BTRIM(p_verification_notes), ''))
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_lab_order_atomic(uuid, text, text, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collect_lab_sample_atomic(uuid, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.receive_lab_sample_atomic(uuid, uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_lab_processing_atomic(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_lab_result_atomic(uuid, uuid, jsonb, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_lab_result_atomic(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_lab_order_atomic(uuid, text, text, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.collect_lab_sample_atomic(uuid, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.receive_lab_sample_atomic(uuid, uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.start_lab_processing_atomic(uuid, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_lab_result_atomic(uuid, uuid, jsonb, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_lab_result_atomic(uuid, uuid, text, uuid) TO service_role;
