create or replace function public.record_patient_vitals(
  p_patient_id uuid,
  p_visual_acuity_od text default null,
  p_visual_acuity_os text default null,
  p_visual_acuity_ou text default null,
  p_with_correction boolean default false,
  p_iop_od numeric default null,
  p_iop_os numeric default null,
  p_iop_instrument text default null,
  p_bp_systolic numeric default null,
  p_bp_diastolic numeric default null,
  p_pulse numeric default null,
  p_temperature numeric default null,
  p_spo2 numeric default null,
  p_primary_complaint text default null,
  p_symptoms text default null,
  p_severity text default null,
  p_duration_text text default null,
  p_recorded_by uuid default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_vitals_id uuid;
begin
  /*
   * Make sure the patient exists before writing anything.
   */
  if not exists (
    select 1
    from public.patients
    where id = p_patient_id
  ) then
    raise exception 'Patient not found';
  end if;

  /*
   * Insert the vitals record.
   */
  insert into public.vitals (
    patient_id,
    visual_acuity_od,
    visual_acuity_os,
    visual_acuity_ou,
    with_correction,
    iop_od,
    iop_os,
    iop_instrument,
    bp_systolic,
    bp_diastolic,
    pulse,
    temperature,
    spo2,
    primary_complaint,
    symptoms,
    severity,
    duration_text,
    recorded_by
  )
  values (
    p_patient_id,
    p_visual_acuity_od,
    p_visual_acuity_os,
    p_visual_acuity_ou,
    coalesce(p_with_correction, false),
    p_iop_od,
    p_iop_os,
    p_iop_instrument,
    p_bp_systolic,
    p_bp_diastolic,
    p_pulse,
    p_temperature,
    p_spo2,
    p_primary_complaint,
    p_symptoms,
    p_severity,
    p_duration_text,
    p_recorded_by
  )
  returning id into v_vitals_id;

  /*
   * Move the patient into consultation.
   */
  update public.patients
  set status = 'in_consultation'
  where id = p_patient_id;

  /*
   * Return the newly created vitals ID.
   */
  return v_vitals_id;
end;
$$;