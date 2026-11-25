-- Multi-doctor patient access foundation.
-- Additive only: existing patients, appointments, encounters and staff rows are untouched.

create table if not exists public.patient_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_staff_id uuid not null references public.staff(id) on delete restrict,
  assigned_by uuid not null references public.staff(id) on delete restrict,
  assignment_reason text not null check (length(btrim(assignment_reason)) > 0),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references public.staff(id) on delete restrict,
  end_reason text,
  created_at timestamptz not null default now(),
  constraint patient_assignments_end_consistency check (
    (ended_at is null and ended_by is null) or
    (ended_at is not null and ended_by is not null)
  )
);

create unique index if not exists patient_assignments_one_active_doctor_idx
  on public.patient_assignments(patient_id, doctor_staff_id)
  where ended_at is null;

create index if not exists patient_assignments_doctor_active_idx
  on public.patient_assignments(doctor_staff_id, patient_id)
  where ended_at is null;

create table if not exists public.patient_access_grants (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_staff_id uuid not null references public.staff(id) on delete restrict,
  granted_by uuid not null references public.staff(id) on delete restrict,
  grant_type text not null check (grant_type in ('SHARED_CARE', 'EMERGENCY')),
  reason text not null check (length(btrim(reason)) > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.staff(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint patient_access_grants_emergency_expiry check (
    grant_type <> 'EMERGENCY' or
    (expires_at is not null and expires_at > starts_at and expires_at <= starts_at + interval '24 hours')
  ),
  constraint patient_access_grants_revoke_consistency check (
    (revoked_at is null and revoked_by is null) or
    (revoked_at is not null and revoked_by is not null)
  )
);

create index if not exists patient_access_grants_doctor_active_idx
  on public.patient_access_grants(doctor_staff_id, patient_id, starts_at, expires_at)
  where revoked_at is null;

create table if not exists public.patient_access_audit (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_staff_id uuid not null references public.staff(id) on delete restrict,
  performed_by uuid not null references public.staff(id) on delete restrict,
  action text not null check (action in ('ASSIGNED', 'REASSIGNED', 'SHARED_ACCESS_GRANTED', 'EMERGENCY_ACCESS_GRANTED', 'ACCESS_REVOKED', 'PATIENT_RECORD_ACCESSED')),
  reason text not null check (length(btrim(reason)) > 0),
  grant_id uuid references public.patient_access_grants(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists patient_access_audit_patient_created_idx
  on public.patient_access_audit(patient_id, created_at desc);
create index if not exists patient_access_audit_doctor_created_idx
  on public.patient_access_audit(doctor_staff_id, created_at desc);

alter table public.patient_assignments enable row level security;
alter table public.patient_access_grants enable row level security;
alter table public.patient_access_audit enable row level security;

-- The application authenticates staff through its own hashed session-cookie
-- system and accesses Postgres only from server routes using SUPABASE_SECRET_KEY.
-- Do not add auth.uid()-based policies: staff accounts are not Supabase Auth users.
revoke all on public.patient_assignments from anon, authenticated;
revoke all on public.patient_access_grants from anon, authenticated;
revoke all on public.patient_access_audit from anon, authenticated;
grant all on public.patient_assignments to service_role;
grant all on public.patient_access_grants to service_role;
grant all on public.patient_access_audit to service_role;

create or replace function public.get_doctor_accessible_patient_ids(p_doctor_staff_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pa.patient_id
  from public.patient_assignments pa
  where pa.doctor_staff_id = p_doctor_staff_id
    and pa.ended_at is null

  union

  select a.patient_id
  from public.appointments a
  where a.doctor_staff_id = p_doctor_staff_id
    and a.patient_id is not null
    and a.status not in ('cancelled', 'no_show')

  union

  select e.patient_id
  from public.encounters e
  where e.recorded_by = p_doctor_staff_id

  union

  select g.patient_id
  from public.patient_access_grants g
  where g.doctor_staff_id = p_doctor_staff_id
    and g.revoked_at is null
    and g.starts_at <= now()
    and (g.expires_at is null or g.expires_at > now());
$$;

create or replace function public.can_doctor_access_patient(
  p_doctor_staff_id uuid,
  p_patient_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.get_doctor_accessible_patient_ids(p_doctor_staff_id) accessible(patient_id)
    where accessible.patient_id = p_patient_id
  );
$$;

revoke all on function public.get_doctor_accessible_patient_ids(uuid) from public, anon, authenticated;
revoke all on function public.can_doctor_access_patient(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_doctor_accessible_patient_ids(uuid) to service_role;
grant execute on function public.can_doctor_access_patient(uuid, uuid) to service_role;

comment on table public.patient_assignments is
  'Active primary doctor assignments. Historical rows are retained with ended_at and ended_by.';
comment on table public.patient_access_grants is
  'Time-bounded or standing shared-care access grants for doctors; emergency grants expire within 24 hours.';
comment on table public.patient_access_audit is
  'Immutable audit trail for patient assignment and cross-doctor access events.';
