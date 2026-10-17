-- Ensure the nurse triage vitals schema and RPC match the current application.
-- Safe to apply to an existing database; columns are added only when missing.

alter table public.vitals
  add column if not exists visual_acuity_ou text,
  add column if not exists with_correction boolean default false,
  add column if not exists visual_acuity_od_note text,
  add column if not exists visual_acuity_os_note text,
  add column if not exists visual_acuity_ou_note text,
  add column if not exists visual_acuity_od_pinhole text,
  add column if not exists visual_acuity_os_pinhole text,
  add column if not exists visual_acuity_od_glasses text,
  add column if not exists visual_acuity_os_glasses text,
  add column if not exists visual_acuity_ou_glasses text,
  add column if not exists visual_acuity_od_near text,
  add column if not exists visual_acuity_os_near text,
  add column if not exists visual_acuity_ou_near text,
  add column if not exists gonioscopy_od text,
  add column if not exists gonioscopy_os text,
  add column if not exists bp_systolic numeric,
  add column if not exists bp_diastolic numeric,
  add column if not exists pulse numeric,
  add column if not exists temperature numeric,
  add column if not exists spo2 numeric,
  add column if not exists rbs numeric,
  add column if not exists recorded_by uuid references public.staff(id);

-- Remove both the legacy signature and the current signature before
-- recreating one unambiguous RPC for the named arguments sent by the app.
drop function if exists public.record_patient_vitals(
  uuid, text, text, text, boolean, numeric, numeric, text,
  numeric, numeric, numeric, numeric, numeric, text, text, text, text, uuid
);

drop function if exists public.record_patient_vitals(
  uuid, text, text, text, boolean, text, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric, numeric, uuid
);

create function public.record_patient_vitals(
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

  -- Keep the handoff atomic: the patient moves to the doctor queue only
  -- when the vitals row has been recorded successfully.
  update public.patients
  set status = 'in_consultation'
  where id = p_patient_id;

  return v_vitals_id;
end;
$$;

revoke execute on function public.record_patient_vitals(
  uuid, text, text, text, boolean, text, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric, numeric, uuid
) from public, anon, authenticated;

grant execute on function public.record_patient_vitals(
  uuid, text, text, text, boolean, text, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric, numeric, uuid
) to service_role;
