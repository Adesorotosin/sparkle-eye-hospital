-- Allow pharmacy prescriptions to be deferred due to patient affordability.
-- Deferred prescriptions remain recorded but are excluded from billing/dispensing
-- until restored by the application workflow.

ALTER TABLE public.prescriptions
  DROP CONSTRAINT IF EXISTS prescriptions_status_check;

ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'awaiting_pharmacy_review'::text,
        'reviewed'::text,
        'pending_payment'::text,
        'ready_for_dispensing'::text,
        'dispensed'::text,
        'deferred_due_to_cost'::text
      ]
    )
  );
