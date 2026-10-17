-- Restore structured ophthalmology history, lens notes, and department handoffs.
-- Additive and safe to re-run; this file is NOT applied automatically by this change.
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

CREATE TABLE IF NOT EXISTS public.clinical_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.encounters(id) ON DELETE SET NULL,
  destination text NOT NULL CHECK (destination IN ('CASHIER', 'RECEPTIONIST')),
  handoff_type text NOT NULL CHECK (handoff_type IN ('TREATMENT_PLAN', 'PROCEDURE', 'FOLLOW_UP', 'PRICING_REVIEW')),
  title text NOT NULL,
  details text NOT NULL DEFAULT '',
  interval_value integer,
  interval_unit text CHECK (interval_unit IN ('days', 'months')),
  target_date date,
  preferred_time text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),
  requested_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  received_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_clinical_handoffs_destination_status_created
  ON public.clinical_handoffs(destination, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_handoffs_patient
  ON public.clinical_handoffs(patient_id, created_at DESC);
ALTER TABLE public.clinical_handoffs ENABLE ROW LEVEL SECURITY;

-- Keep the allowed request types compatible if the table was created by an earlier migration.
ALTER TABLE public.clinical_handoffs DROP CONSTRAINT IF EXISTS clinical_handoffs_handoff_type_check;
ALTER TABLE public.clinical_handoffs
  ADD CONSTRAINT clinical_handoffs_handoff_type_check
  CHECK (handoff_type IN ('TREATMENT_PLAN', 'PROCEDURE', 'FOLLOW_UP', 'PRICING_REVIEW'));
