-- Store the outside-facility referral details on the patient's full hospital record.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS optometry_referral_facility text,
  ADD COLUMN IF NOT EXISTS optometry_referring_clinician text,
  ADD COLUMN IF NOT EXISTS optometry_referral_reason text,
  ADD COLUMN IF NOT EXISTS optometry_referral_notes text;

COMMENT ON COLUMN public.patients.optometry_referral_facility IS 'Outside hospital or eye centre that referred the patient to Optometry.';
COMMENT ON COLUMN public.patients.optometry_referring_clinician IS 'Clinician at the outside facility who referred the patient.';
COMMENT ON COLUMN public.patients.optometry_referral_reason IS 'Reason the outside facility referred the patient for Optometry.';
COMMENT ON COLUMN public.patients.optometry_referral_notes IS 'Additional notes received with the outside Optometry referral.';
