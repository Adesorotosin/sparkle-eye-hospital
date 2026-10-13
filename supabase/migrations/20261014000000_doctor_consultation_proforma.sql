-- Structured doctor consultation fields for the proforma history and combined ocular exam.
-- Existing columns remain in place so older encounters and screens stay compatible.
ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS history_proforma jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS refraction_notes text,
  ADD COLUMN IF NOT EXISTS lens_type text;

COMMENT ON COLUMN public.encounters.history_proforma IS
  'Structured ophthalmology history proforma; each section stores selected options and free-text notes.';
COMMENT ON COLUMN public.encounters.refraction_notes IS
  'Doctor notes attached to the refraction result and optical prescription.';
COMMENT ON COLUMN public.encounters.lens_type IS
  'Doctor-specified lens type for the optical prescription.';
