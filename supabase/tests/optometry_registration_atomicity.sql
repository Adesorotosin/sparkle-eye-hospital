-- Disposable-database test for atomic visiting optometry registration.
BEGIN;

DO $test$
DECLARE
  v_staff_id uuid;
  v_patient public.patients%ROWTYPE;
  v_encounter_count integer;
BEGIN
  INSERT INTO public.staff (staff_id, username, password_hash, name, email, role)
  VALUES ('CI-OPTOMETRY', 'ci_optometry', 'test-only-not-a-real-password-hash',
          'CI Optometrist', 'ci-optometry@example.invalid', 'OPTOMETRIST')
  RETURNING id INTO v_staff_id;

  v_patient := public.register_visiting_optometry_patient(
    'CI-OPTOMETRY-ATOMIC',
    'CI Optometry Test Patient',
    30,
    NULL,
    'F',
    '0000000000',
    'CI test address',
    'external_referral',
    v_staff_id
  );

  SELECT count(*) INTO v_encounter_count
  FROM public.encounters
  WHERE patient_id = v_patient.id
    AND encounter_type = 'optometry'
    AND optometry_source = 'visiting'
    AND optometry_visit_type = 'external_referral'
    AND status = 'draft';

  IF v_patient.id IS NULL OR v_patient.optometry_status <> 'referred'
     OR v_encounter_count <> 1 THEN
    RAISE EXCEPTION 'Visiting optometry patient and encounter were not created together';
  END IF;

  -- Force the encounter insert to fail after the patient insert. The whole
  -- RPC statement must roll back, leaving no orphan patient record.
  BEGIN
    PERFORM public.register_visiting_optometry_patient(
      'CI-OPTOMETRY-ROLLBACK',
      'CI Optometry Rollback Patient',
      30,
      NULL,
      'F',
      NULL,
      NULL,
      'self_presenting',
      '00000000-0000-0000-0000-000000000001'::uuid
    );
    RAISE EXCEPTION 'Expected invalid staff foreign key to fail registration';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  IF EXISTS (
    SELECT 1 FROM public.patients
    WHERE patient_code = 'CI-OPTOMETRY-ROLLBACK'
  ) THEN
    RAISE EXCEPTION 'Failed visiting optometry registration left an orphan patient';
  END IF;
END;
$test$;

ROLLBACK;
