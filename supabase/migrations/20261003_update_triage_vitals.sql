-- Sparkle Eye Specialist Hospital
-- Triage / Nurse vitals update
--
-- Adds:
--   RBS
--   VA free-text notes
--   Gonioscopy OD
--   Gonioscopy OS
--
-- Removes from the active recording function:
--   IOP
--   IOP instrument
--   Chief complaint
--   Symptoms
--   Severity
--   Duration

alter table public.vitals
  add column if not exists rbs numeric;

alter table public.vitals
  add column if not exists visual_acuity_od_note text;

alter table public.vitals
  add column if not exists visual_acuity_os_note text;

alter table public.vitals
  add column if not exists visual_acuity_ou_note text;

alter table public.vitals
  add column if not exists gonioscopy_od text;

alter table public.vitals
  add column if not exists gonioscopy_os text;


-- Remove the old function signature.
drop function if exists public.record_patient_vitals(
  uuid,
  text,
  text,
  text,
  boolean,
  numeric,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  uuid
);


-- Create the new simplified recording function.
create or replace function public.record_patient_vitals(
  p_patient_id uuid,
  p_visual_acuity_od text default null,
  p_visual_acuity_os text default null,
  p_visual_acuity_ou text default null,
  p_with_correction boolean default false,

  p_visual_acuity_od_note text default null,
  p_visual_acuity_os_note text default null,
  p_visual_acuity_ou_note text default null,

  p_gonioscopy_od text default null,
  p_gonioscopy_os text default null,

  p_bp_systolic numeric default null,
  p_bp_diastolic numeric default null,
  p_pulse numeric default null,
  p_temperature numeric default null,
  p_spo2 numeric default null,
  p_rbs numeric default null,

  p_recorded_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vitals_id uuid;
begin

  if not exists (
    select 1
    from public.patients
    where id = p_patient_id
  ) then
    raise exception 'Patient not found';
  end if;


  insert into public.vitals (
    patient_id,

    visual_acuity_od,
    visual_acuity_os,
    visual_acuity_ou,

    with_correction,

    visual_acuity_od_note,
    visual_acuity_os_note,
    visual_acuity_ou_note,

    gonioscopy_od,
    gonioscopy_os,

    bp_systolic,
    bp_diastolic,
    pulse,
    temperature,
    spo2,
    rbs,

    recorded_by
  )
  values (
    p_patient_id,

    p_visual_acuity_od,
    p_visual_acuity_os,
    p_visual_acuity_ou,

    coalesce(p_with_correction, false),

    nullif(trim(p_visual_acuity_od_note), ''),
    nullif(trim(p_visual_acuity_os_note), ''),
    nullif(trim(p_visual_acuity_ou_note), ''),

    nullif(trim(p_gonioscopy_od), ''),
    nullif(trim(p_gonioscopy_os), ''),

    p_bp_systolic,
    p_bp_diastolic,
    p_pulse,
    p_temperature,
    p_spo2,
    p_rbs,

    p_recorded_by
  )
  returning id into v_vitals_id;


  update public.patients
  set status = 'in_consultation'
  where id = p_patient_id;


  return v_vitals_id;

end;
$$;


-- Keep this function available only to the server-side workflow.
revoke execute on function public.record_patient_vitals(
  uuid,
  text,
  text,
  text,
  boolean,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  uuid
) from public;