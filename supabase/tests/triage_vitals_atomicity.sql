-- Disposable-database integration test for atomic vitals + queue handoff.
-- Every fixture is rolled back. Run only against isolated CI PostgreSQL.
BEGIN;

DO $test$
DECLARE
  v_patient_id uuid;
  v_vitals_id uuid;
  v_status text;
  v_row public.vitals%ROWTYPE;
BEGIN
  INSERT INTO public.patients (patient_code, full_name, status)
  VALUES ('CI-TRIAGE-ATOMIC', 'CI Triage Test Patient', 'waiting_triage')
  RETURNING id INTO v_patient_id;

  v_vitals_id := public.record_patient_vitals_complete(
    v_patient_id,
    '6/9',
    '6/12',
    '6/9',
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    120,
    80,
    72,
    36.6,
    98,
    NULL,
    NULL,
    '6/6',
    '6/9',
    '6/6',
    '6/9',
    '6/6',
    'N6',
    'N8',
    'N6'
  );

  SELECT * INTO v_row
  FROM public.vitals
  WHERE id = v_vitals_id;

  SELECT status INTO v_status
  FROM public.patients
  WHERE id = v_patient_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Atomic RPC did not create a vitals record';
  END IF;

  IF v_row.visual_acuity_od_pinhole <> '6/6'
     OR v_row.visual_acuity_os_pinhole <> '6/9'
     OR v_row.visual_acuity_od_glasses <> '6/6'
     OR v_row.visual_acuity_ou_near <> 'N6' THEN
    RAISE EXCEPTION 'Additional visual-acuity fields were not saved in the vitals insert';
  END IF;

  IF v_row.bp_systolic <> 120 OR v_row.bp_diastolic <> 80
     OR v_row.pulse <> 72 OR v_row.temperature <> 36.6
     OR v_row.spo2 <> 98 THEN
    RAISE EXCEPTION 'Core vital measurements were not saved correctly';
  END IF;

  IF v_status <> 'waiting_doctor' THEN
    RAISE EXCEPTION 'Expected waiting_doctor after successful triage, got %', v_status;
  END IF;
END;
$test$;

ROLLBACK;
