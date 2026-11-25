-- Only current assignments, active appointments, and explicit grants grant chart access.
create or replace function public.get_doctor_accessible_patient_ids(p_doctor_staff_id uuid)
returns setof uuid language sql stable security definer set search_path=public,pg_temp
as $$
  select pa.patient_id from public.patient_assignments pa where pa.doctor_staff_id=p_doctor_staff_id and pa.ended_at is null
  union
  select a.patient_id from public.appointments a where a.doctor_staff_id=p_doctor_staff_id and a.patient_id is not null and a.status in ('scheduled','checked_in')
  union
  select g.patient_id from public.patient_access_grants g where g.doctor_staff_id=p_doctor_staff_id and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now());
$$;
revoke all on function public.get_doctor_accessible_patient_ids(uuid) from public,anon,authenticated;
grant execute on function public.get_doctor_accessible_patient_ids(uuid) to service_role;
create or replace function public.can_doctor_access_patient(p_doctor_staff_id uuid,p_patient_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.get_doctor_accessible_patient_ids(p_doctor_staff_id) accessible(patient_id) where accessible.patient_id=p_patient_id); $$;
revoke all on function public.can_doctor_access_patient(uuid,uuid) from public,anon,authenticated;
grant execute on function public.can_doctor_access_patient(uuid,uuid) to service_role;