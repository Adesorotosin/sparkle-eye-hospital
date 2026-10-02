alter table public.encounters
  add column if not exists visual_acuity_od text,
  add column if not exists visual_acuity_os text,
  add column if not exists visual_acuity_ou text,
  add column if not exists with_correction boolean default false;

create index if not exists idx_encounters_optometry_type
  on public.encounters(patient_id, encounter_type);