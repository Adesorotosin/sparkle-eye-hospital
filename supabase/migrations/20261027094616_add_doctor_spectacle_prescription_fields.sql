-- Client-approved spectacle prescription fields, authored by the Doctor module.
-- Additive only: existing optical orders and patient records are preserved.
alter table public.optical_orders
  add column if not exists prescription_date date,
  add column if not exists prescriber_name text,
  add column if not exists prescriber_signature text,
  add column if not exists right_sph text,
  add column if not exists right_cyl text,
  add column if not exists right_axis text,
  add column if not exists right_add text,
  add column if not exists right_final_va text,
  add column if not exists right_near_va text,
  add column if not exists left_sph text,
  add column if not exists left_cyl text,
  add column if not exists left_axis text,
  add column if not exists left_add text,
  add column if not exists left_final_va text,
  add column if not exists left_near_va text,
  add column if not exists lens_finish text,
  add column if not exists near_ipd text;
