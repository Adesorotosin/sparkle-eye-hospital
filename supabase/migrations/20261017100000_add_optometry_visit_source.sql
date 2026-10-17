-- Track whether an Optometry assessment is handled in-house or by a visiting optometrist.
-- Visit type records whether the patient arrived via an internal doctor referral,
-- an external referral, or self-presentation.
ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS optometry_source text;

ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS optometry_visit_type text;

UPDATE public.encounters
SET optometry_source = 'in_house'
WHERE encounter_type = 'optometry'
  AND optometry_source IS NULL;

UPDATE public.encounters
SET optometry_visit_type = 'doctor_referral'
WHERE encounter_type = 'optometry'
  AND optometry_visit_type IS NULL;

ALTER TABLE public.encounters
  ALTER COLUMN optometry_source SET DEFAULT 'in_house';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'encounters_optometry_source_check'
      AND conrelid = 'public.encounters'::regclass
  ) THEN
    ALTER TABLE public.encounters
      ADD CONSTRAINT encounters_optometry_source_check
      CHECK (optometry_source IS NULL OR optometry_source IN ('in_house', 'visiting'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'encounters_optometry_visit_type_check'
      AND conrelid = 'public.encounters'::regclass
  ) THEN
    ALTER TABLE public.encounters
      ADD CONSTRAINT encounters_optometry_visit_type_check
      CHECK (
        optometry_visit_type IS NULL OR
        optometry_visit_type IN ('doctor_referral', 'external_referral', 'self_presenting')
      );
  END IF;
END $$;
