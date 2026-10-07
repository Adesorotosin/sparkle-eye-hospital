-- Sparkle Eye Specialist Hospital
-- Doctor consultation documentation fields
--
-- Extends the existing shared encounters table so the Doctor EMR can
-- capture the complete clinical consultation in one encounter.

alter table public.encounters
  add column if not exists presenting_complaint text,
  add column if not exists history_of_presenting_complaint text,
  add column if not exists past_medical_history text,
  add column if not exists past_ocular_history text,
  add column if not exists family_ocular_history text,
  add column if not exists ocular_exam_od text,
  add column if not exists ocular_exam_os text,
  add column if not exists other_examination_findings text,
  add column if not exists iop_od numeric,
  add column if not exists iop_os numeric,
  add column if not exists iop_instrument text,
  add column if not exists treatment_plan text;

create index if not exists idx_encounters_patient_created_at
  on public.encounters(patient_id, created_at desc);
