-- Add a separate, human-friendly year-based registration number.
-- Existing patient_code values remain unchanged for all clinical workflows.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS registration_number text;

CREATE UNIQUE INDEX IF NOT EXISTS patients_registration_number_unique
  ON public.patients (registration_number)
  WHERE registration_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.patient_registration_counters (
  registration_year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

-- Initialize counters from any registration numbers already present.
-- This makes the migration safe to rerun and avoids reusing assigned numbers.
INSERT INTO public.patient_registration_counters (registration_year, last_number)
SELECT
  CASE
    WHEN substring(p.registration_number from '/([0-9]{2})$')::integer <= 69
      THEN 2000 + substring(p.registration_number from '/([0-9]{2})$')::integer
    ELSE 1900 + substring(p.registration_number from '/([0-9]{2})$')::integer
  END AS registration_year,
  MAX(substring(p.registration_number from '^([0-9]+)')::integer) AS last_number
FROM public.patients p
WHERE p.registration_number ~ '^[0-9]+/[0-9]{2}$'
GROUP BY 1
ON CONFLICT (registration_year) DO UPDATE
SET last_number = GREATEST(
  patient_registration_counters.last_number,
  EXCLUDED.last_number
);

-- Seed the current Nigeria-local calendar year even when no registration
-- numbers have been assigned yet. New patients start at 001 for that year.
INSERT INTO public.patient_registration_counters (registration_year, last_number)
VALUES (
  EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos'))::integer,
  0
)
ON CONFLICT (registration_year) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_patient_registration_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  registration_year integer;
  next_number integer;
BEGIN
  IF NEW.registration_number IS NOT NULL AND btrim(NEW.registration_number) <> '' THEN
    RETURN NEW;
  END IF;

  registration_year :=
    EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos'))::integer;

  INSERT INTO public.patient_registration_counters (registration_year, last_number)
  VALUES (registration_year, 1)
  ON CONFLICT (registration_year) DO UPDATE
    SET last_number = patient_registration_counters.last_number + 1
  RETURNING last_number INTO next_number;

  NEW.registration_number :=
    lpad(next_number::text, 3, '0') || '/' || right(registration_year::text, 2);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS patients_assign_registration_number ON public.patients;

CREATE TRIGGER patients_assign_registration_number
BEFORE INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.assign_patient_registration_number();
