-- Routed requests from Doctor to Cashier and Receptionist.
CREATE TABLE IF NOT EXISTS public.clinical_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.encounters(id) ON DELETE SET NULL,
  destination text NOT NULL CHECK (destination IN ('CASHIER', 'RECEPTIONIST')),
  handoff_type text NOT NULL CHECK (handoff_type IN ('TREATMENT_PLAN', 'PROCEDURE', 'FOLLOW_UP')),
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
