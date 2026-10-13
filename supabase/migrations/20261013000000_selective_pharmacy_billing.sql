-- Link each pharmacy invoice line to the exact prescription it bills.
-- This avoids ambiguous matching when medications share names and prices.
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS prescription_id uuid
  REFERENCES public.prescriptions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_items_prescription_unique
  ON public.invoice_items(prescription_id)
  WHERE prescription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status_created
  ON public.prescriptions(patient_id, status, created_at);
