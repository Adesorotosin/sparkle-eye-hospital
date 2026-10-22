-- Atomically create an outside optometry patient and the linked encounter.
-- A failure inserting the encounter rolls back the patient insert as well.
CREATE OR REPLACE FUNCTION public.register_visiting_optometry_patient(
  p_patient_code text,
  p_full_name text,
  p_age integer,
  p_date_of_birth date,
  p_gender text,
  p_phone text,
  p_address text,
  p_visit_type text,
  p_recorded_by uuid
)
RETURNS public.patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_patient public.patients%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(p_patient_code), '') IS NULL THEN
    RAISE EXCEPTION 'Patient code is required';
  END IF;

  IF NULLIF(BTRIM(p_full_name), '') IS NULL THEN
    RAISE EXCEPTION 'Patient full name is required';
  END IF;

  IF p_visit_type NOT IN ('external_referral', 'self_presenting') THEN
    RAISE EXCEPTION 'Invalid optometry visit type';
  END IF;

  INSERT INTO public.patients (
    patient_code,
    full_name,
    coverage_plan,
    age,
    date_of_birth,
    gender,
    phone,
    address,
    status,
    is_walk_in,
    optometry_status,
    last_visit_at
  )
  VALUES (
    BTRIM(p_patient_code),
    BTRIM(p_full_name),
    'Self-Pay',
    p_age,
    p_date_of_birth,
    NULLIF(BTRIM(p_gender), ''),
    NULLIF(BTRIM(p_phone), ''),
    NULLIF(BTRIM(p_address), ''),
    'in_consultation',
    true,
    'referred',
    now()
  )
  RETURNING * INTO v_patient;

  INSERT INTO public.encounters (
    patient_id,
    encounter_type,
    optometry_source,
    optometry_visit_type,
    status,
    recorded_by,
    updated_at
  )
  VALUES (
    v_patient.id,
    'optometry',
    'visiting',
    p_visit_type,
    'draft',
    p_recorded_by,
    now()
  );

  RETURN v_patient;
END;
$$;

REVOKE ALL ON FUNCTION public.register_visiting_optometry_patient(
  text, text, integer, date, text, text, text, text, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_visiting_optometry_patient(
  text, text, integer, date, text, text, text, text, uuid
) TO service_role;
