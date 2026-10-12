-- Keep visiting laboratory patients separate from the hospital's main patient register.
-- Existing in-house lab orders remain linked to patients exactly as before.

create table if not exists public.visiting_lab_patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  source_center text not null,
  contact_phone text,
  sex text,
  date_of_birth date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists visiting_lab_patients_created_at_idx
  on public.visiting_lab_patients (created_at desc);

alter table public.lab_orders
  alter column patient_id drop not null;

alter table public.lab_orders
  add column if not exists visiting_patient_id uuid
  references public.visiting_lab_patients(id) on delete restrict;

create index if not exists lab_orders_visiting_patient_id_idx
  on public.lab_orders (visiting_patient_id);

-- Every order must belong to either a registered patient or a visiting patient,
-- never neither. Existing orders are unaffected because patient_id is populated.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lab_orders_patient_or_visiting_patient_check'
      and conrelid = 'public.lab_orders'::regclass
  ) then
    alter table public.lab_orders
      add constraint lab_orders_patient_or_visiting_patient_check
      check (patient_id is not null or visiting_patient_id is not null)
      not valid;
  end if;
end $$;
