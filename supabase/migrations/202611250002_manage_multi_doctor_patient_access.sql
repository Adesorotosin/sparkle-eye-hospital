-- Server-only transactional operations for assignment and temporary access grants.
create or replace function public.manage_patient_access(
  p_action text,p_patient_id uuid,p_doctor_staff_id uuid,p_performed_by uuid,p_reason text,
  p_grant_type text default null,p_expires_at timestamptz default null,p_grant_id uuid default null
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_doctor_role text; v_assignment_id uuid; v_grant_id uuid; v_patient_id uuid; v_doctor_id uuid;
begin
  if p_reason is null or length(btrim(p_reason))<5 then raise exception 'A reason of at least 5 characters is required'; end if;
  if not exists(select 1 from public.patients where id=p_patient_id) then raise exception 'Patient not found'; end if;
  select role into v_doctor_role from public.staff where id=p_doctor_staff_id and is_active=true and deleted_at is null;
  if v_doctor_role is null or v_doctor_role not in ('DOCTOR','OPHTHALMOLOGIST') then raise exception 'Selected doctor is not active or does not have a doctor role'; end if;
  if not exists(select 1 from public.staff where id=p_performed_by and is_active=true and deleted_at is null) then raise exception 'Performing staff account is not active'; end if;
  if p_action='ASSIGN' then
    update public.patient_assignments set ended_at=now(),ended_by=p_performed_by,end_reason='Reassigned: '||btrim(p_reason) where patient_id=p_patient_id and ended_at is null;
    insert into public.patient_assignments(patient_id,doctor_staff_id,assigned_by,assignment_reason) values(p_patient_id,p_doctor_staff_id,p_performed_by,btrim(p_reason)) returning id into v_assignment_id;
    insert into public.patient_access_audit(patient_id,doctor_staff_id,performed_by,action,reason,metadata) values(p_patient_id,p_doctor_staff_id,p_performed_by,'REASSIGNED',btrim(p_reason),jsonb_build_object('assignment_id',v_assignment_id));
    return jsonb_build_object('assignment_id',v_assignment_id);
  elsif p_action='GRANT' then
    if p_grant_type not in ('SHARED_CARE','EMERGENCY') then raise exception 'Invalid grant type'; end if;
    if p_grant_type='EMERGENCY' and (p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '24 hours') then raise exception 'Emergency access must expire within 24 hours'; end if;
    insert into public.patient_access_grants(patient_id,doctor_staff_id,granted_by,grant_type,reason,expires_at) values(p_patient_id,p_doctor_staff_id,p_performed_by,p_grant_type,btrim(p_reason),p_expires_at) returning id into v_grant_id;
    insert into public.patient_access_audit(patient_id,doctor_staff_id,performed_by,action,reason,grant_id) values(p_patient_id,p_doctor_staff_id,p_performed_by,case when p_grant_type='EMERGENCY' then 'EMERGENCY_ACCESS_GRANTED' else 'SHARED_ACCESS_GRANTED' end,btrim(p_reason),v_grant_id);
    return jsonb_build_object('grant_id',v_grant_id);
  elsif p_action='REVOKE' then
    update public.patient_access_grants set revoked_at=now(),revoked_by=p_performed_by where id=p_grant_id and revoked_at is null returning id,patient_id,doctor_staff_id into v_grant_id,v_patient_id,v_doctor_id;
    if v_grant_id is null then raise exception 'Active access grant not found'; end if;
    insert into public.patient_access_audit(patient_id,doctor_staff_id,performed_by,action,reason,grant_id) values(v_patient_id,v_doctor_id,p_performed_by,'ACCESS_REVOKED',btrim(p_reason),v_grant_id);
    return jsonb_build_object('grant_id',v_grant_id);
  else raise exception 'Unsupported patient access action'; end if;
end;
$$;
revoke all on function public.manage_patient_access(text,uuid,uuid,uuid,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.manage_patient_access(text,uuid,uuid,uuid,text,text,timestamptz,uuid) to service_role;