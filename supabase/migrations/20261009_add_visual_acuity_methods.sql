-- Additional visual-acuity methods recorded during nurse triage.
alter table public.vitals
  add column if not exists visual_acuity_od_glasses text,
  add column if not exists visual_acuity_os_glasses text,
  add column if not exists visual_acuity_ou_glasses text,
  add column if not exists visual_acuity_od_near text,
  add column if not exists visual_acuity_os_near text,
  add column if not exists visual_acuity_ou_near text;
