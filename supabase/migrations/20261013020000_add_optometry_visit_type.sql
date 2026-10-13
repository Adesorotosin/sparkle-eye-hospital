-- Distinguish visiting Optometry patients who were referred externally from those who presented independently.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS optometry_visit_type text;

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_optometry_visit_type_check;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_optometry_visit_type_check
  CHECK (
    optometry_visit_type IS NULL
    OR optometry_visit_type IN ('external_referral', 'self_presenting')
  );

COMMENT ON COLUMN public.patients.optometry_visit_type IS
  'For visiting Optometry patients, records whether they arrived by external referral or presented independently.';
