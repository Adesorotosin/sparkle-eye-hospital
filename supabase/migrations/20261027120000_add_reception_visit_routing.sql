-- Reception-only visit routing. This records arrival intent without creating clinical orders,
-- prescriptions, lab orders, diagnostic orders, procedures, or billing items.
create table if not exists public.patient_visit_routes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  destination text not null check (destination in (
    'TRIAGE', 'DOCTOR', 'PHARMACY', 'LABORATORY', 'DIAGNOSTICS', 'OPTOMETRY'
  )),
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'acknowledged', 'completed', 'cancelled')),
  created_by uuid,
  handled_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  handled_at timestamptz,
  constraint patient_visit_routes_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete restrict,
  constraint patient_visit_routes_created_by_fkey
    foreign key (created_by) references public.staff(id) on delete set null,
  constraint patient_visit_routes_handled_by_fkey
    foreign key (handled_by) references public.staff(id) on delete set null
);

create index if not exists patient_visit_routes_destination_status_created_idx
  on public.patient_visit_routes (destination, status, created_at);

create index if not exists patient_visit_routes_patient_created_idx
  on public.patient_visit_routes (patient_id, created_at desc);

alter table public.patient_visit_routes enable row level security;

-- Access is mediated by authenticated server actions using the service role.
-- No client-side table policies are added.
