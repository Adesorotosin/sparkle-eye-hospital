-- Disposable-database integration test for the laboratory lifecycle.
BEGIN;

DO $test$
DECLARE
  v_doctor_id uuid;
  v_lab_id uuid;
  v_patient_id uuid;
  v_order_id uuid;
  v_sample_id uuid;
  v_second_order_id uuid;
  v_rejected_sample_id uuid;
  v_recollected_sample_id uuid;
  v_result_id uuid;
  v_status text;
  v_sample_status text;
  v_sample_count integer;
  v_event_count integer;
  v_rejected boolean := false;
  v_sample_number integer;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-LAB-DOCTOR', 'ci_lab_doctor', 'test-only-not-a-real-password-hash',
          'CI Doctor', 'ci-lab-doctor@example.invalid', 'DOCTOR')
  RETURNING id INTO v_doctor_id;

  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-LAB-SCIENTIST', 'ci_lab_scientist', 'test-only-not-a-real-password-hash',
          'CI Lab Scientist', 'ci-lab-scientist@example.invalid', 'LAB_SCIENTIST')
  RETURNING id INTO v_lab_id;

  INSERT INTO public.patients (patient_code, full_name)
  VALUES ('CI-LAB-LIFECYCLE', 'CI Laboratory Test Patient')
  RETURNING id INTO v_patient_id;

  v_order_id := public.create_lab_order_atomic(
    v_patient_id, 'CI-RBS', 'Random Blood Sugar', 'Blood', 'NORMAL',
    'CI-only test order', v_doctor_id
  );

  v_sample_id := public.collect_lab_sample_atomic(
    v_order_id, 'Blood', 'CI-SAMPLE-1', 'CI collection', v_lab_id
  );

  BEGIN
    PERFORM public.collect_lab_sample_atomic(
      v_order_id, 'Blood', 'CI-SAMPLE-DUPLICATE', NULL, v_lab_id
    );
  EXCEPTION WHEN raise_exception THEN
    v_rejected := true;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'Duplicate collection unexpectedly succeeded';
  END IF;

  SELECT count(*) INTO v_sample_count FROM public.lab_samples
  WHERE lab_order_id = v_order_id;
  IF v_sample_count <> 1 THEN
    RAISE EXCEPTION 'Duplicate collection created an extra sample';
  END IF;

  IF public.receive_lab_sample_atomic(
    v_order_id, v_sample_id, 'ACCEPTABLE', 'CI accepted', v_lab_id
  ) <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'Acceptable sample was not accepted';
  END IF;

  PERFORM public.start_lab_processing_atomic(
    v_order_id, v_sample_id, 'CI processing', v_lab_id
  );

  v_result_id := public.save_lab_result_atomic(
    v_order_id,
    v_sample_id,
    '[{"parameter":"RBS","result":"5.6","unit":"mmol/L","referenceRange":"3.9-7.8","flag":"NORMAL"}]'::jsonb,
    'CI result',
    v_lab_id
  );

  PERFORM public.verify_lab_result_atomic(
    v_order_id, v_result_id, 'CI verified', v_lab_id
  );

  SELECT status INTO v_status FROM public.lab_orders WHERE id = v_order_id;
  SELECT status INTO v_sample_status FROM public.lab_samples WHERE id = v_sample_id;
  SELECT count(*) INTO v_event_count FROM public.lab_events WHERE lab_order_id = v_order_id;

  IF v_status <> 'COMPLETED' OR v_sample_status <> 'COMPLETED' OR v_event_count <> 6 THEN
    RAISE EXCEPTION 'Laboratory lifecycle did not complete atomically (order %, sample %, events %)',
      v_status, v_sample_status, v_event_count;
  END IF;

  v_second_order_id := public.create_lab_order_atomic(
    v_patient_id, 'CI-RECOLLECT', 'CI Recollection Test', 'Blood', 'NORMAL',
    NULL, v_doctor_id
  );
  v_rejected_sample_id := public.collect_lab_sample_atomic(
    v_second_order_id, 'Blood', 'CI-SAMPLE-REJECTED', NULL, v_lab_id
  );

  IF public.receive_lab_sample_atomic(
    v_second_order_id, v_rejected_sample_id, 'HAEMOLYSED', 'CI haemolysed', v_lab_id
  ) <> 'RECOLLECTION' THEN
    RAISE EXCEPTION 'Rejected sample did not request recollection';
  END IF;

  v_recollected_sample_id := public.collect_lab_sample_atomic(
    v_second_order_id, 'Blood', 'CI-SAMPLE-2', 'CI recollection', v_lab_id
  );

  SELECT sample_number INTO v_sample_number
  FROM public.lab_samples WHERE id = v_recollected_sample_id;

  SELECT status INTO v_status FROM public.lab_orders WHERE id = v_second_order_id;

  IF v_sample_number <> 2 OR v_status <> 'COLLECTED' THEN
    RAISE EXCEPTION 'Recollection did not increment sample number and restore collection status';
  END IF;
END;
$test$;

ROLLBACK;
