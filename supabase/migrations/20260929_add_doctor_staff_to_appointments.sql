-- Sparkle Eye Hospital
-- Appointment -> Staff doctor relationship
-- Run this in Supabase SQL Editor before using the updated appointment APIs.

alter table appointments
add column if not exists doctor_staff_id uuid
references staff(id)
on delete set null;

create index if not exists idx_appointments_doctor_staff
on appointments(doctor_staff_id);

-- Backfill existing appointments where the physician display name matches
-- an active doctor/ophthalmologist account.
update appointments a
set doctor_staff_id = s.id
from staff s
where a.doctor_staff_id is null
  and lower(trim(a.physician)) = lower(trim(s.name))
  and s.role in ('DOCTOR', 'OPHTHALMOLOGIST')
  and s.is_active = true
  and s.deleted_at is null;
