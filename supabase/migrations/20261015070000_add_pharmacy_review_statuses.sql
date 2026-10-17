-- Allow doctor-created prescription requests to wait for pharmacy review
-- before a billable medication is selected from inventory.
alter table public.prescriptions
  drop constraint if exists prescriptions_status_check;

alter table public.prescriptions
  add constraint prescriptions_status_check
  check (
    status in (
      'awaiting_pharmacy_review',
      'reviewed',
      'pending_payment',
      'ready_for_dispensing',
      'dispensed'
    )
  );
