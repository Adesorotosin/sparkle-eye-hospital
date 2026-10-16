-- Allow the explicit Doctor queue status while preserving every existing allowed status.
-- This supports the record_patient_vitals triage handoff migration.

alter table public.patients
  drop constraint if exists patients_status_check;

alter table public.patients
  add constraint patients_status_check
  check (
    status = any (
      array[
        'Waiting'::text,
        'Unfulfilled'::text,
        'waiting_triage'::text,
        'waiting_doctor'::text,
        'in_consultation'::text,
        'completed_today'::text,
        'dispensed'::text
      ]
    )
  );
