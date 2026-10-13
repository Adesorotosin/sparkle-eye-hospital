-- Classify Optometry referrals as internal or visiting.
-- Existing referrals are treated as in-house because they entered through the internal doctor referral workflow.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS optometry_source text NOT NULL DEFAULT 'in_house';

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_optometry_source_check;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_optometry_source_check
  CHECK (optometry_source IN ('in_house', 'visiting'));
