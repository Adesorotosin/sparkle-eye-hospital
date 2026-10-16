-- Ensure a successful nurse triage handoff enters the Doctor queue as waiting_doctor.
-- The previous hardening migration accidentally changed this transition to
-- in_consultation, which should be reserved for a consultation started by a doctor.
-- This migration changes the RPC definition only; it does not rewrite patient records.

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

  -- Only expose the patient to the Doctor queue after vitals save succeeds.
  -- Only move a patient forward when they are still waiting for triage.
  -- This RPC is also callable from doctor workflows, so do not move an
  -- in-consultation or otherwise progressed patient back into the queue.
  update public.patients
  set status = 'waiting_doctor'
  where id = p_patient_id
    and status = 'waiting_triage';

  return v_vitals_id;
end;
$$;

-- Keep this RPC server-side only, matching the hardened migration.
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
) from public, anon, authenticated;

grant execute on function public.record_patient_vitals(
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
) to service_role;
