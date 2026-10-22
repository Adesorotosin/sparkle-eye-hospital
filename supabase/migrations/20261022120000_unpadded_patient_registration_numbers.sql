-- Future registration numbers use the agreed unpadded format: 1/26, 2/26, ...
-- Existing assigned numbers are deliberately not rewritten.
CREATE OR REPLACE FUNCTION public.assign_patient_registration_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_registration_year integer;
  v_next_number integer;
BEGIN
  IF NEW.registration_number IS NOT NULL
     AND btrim(NEW.registration_number) <> '' THEN
    RETURN NEW;
  END IF;

  v_registration_year :=
    EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos'))::integer;

  INSERT INTO public.patient_registration_counters AS counters
    (registration_year, last_number)
  VALUES (v_registration_year, 1)
  ON CONFLICT (registration_year) DO UPDATE
    SET last_number = counters.last_number + 1
  RETURNING last_number INTO v_next_number;

  NEW.registration_number :=
    v_next_number::text || '/' || right(v_registration_year::text, 2);

  RETURN NEW;
END;
$$;
