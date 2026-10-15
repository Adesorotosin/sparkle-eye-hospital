-- Doctor-to-cashier treatment-plan billing requests.
-- The clinical plan stays in the encounter; this table is an auditable handoff,
-- not an invoice and never creates a charge automatically.
create table if not exists public.treatment_billing_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  encounter_id uuid not null unique references public.encounters(id) on delete cascade,
  treatment_plan text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'cancelled')),
  requested_by uuid references public.staff(id) on delete set null,
  requested_by_name text not null,
  reviewed_by uuid references public.staff(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(treatment_plan)) > 0)
);

create index if not exists idx_treatment_billing_requests_status_created
  on public.treatment_billing_requests(status, created_at desc);
create index if not exists idx_treatment_billing_requests_patient
  on public.treatment_billing_requests(patient_id);

alter table public.treatment_billing_requests enable row level security;
