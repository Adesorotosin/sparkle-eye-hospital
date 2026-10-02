-- Sparkle Eye Specialist Hospital
-- Optometry workflow foundation
--
-- Adds a clinical encounter type so doctor consultations and optometry
-- examinations can coexist in the same encounters table without creating
-- a second clinical-record table.

alter table public.encounters
  add column if not exists encounter_type text not null default 'consultation';

do $$
begin
  alter table public.encounters
    add constraint encounters_encounter_type_check
    check (encounter_type in ('consultation', 'optometry'));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_encounters_patient_type
  on public.encounters(patient_id, encounter_type);

-- Optometry referral state is kept on the patient record so the queue can
-- be queried without introducing another patient table.
alter table public.patients
  add column if not exists optometry_status text;

do $$
begin
  alter table public.patients
    add constraint patients_optometry_status_check
    check (
      optometry_status is null
      or optometry_status in ('referred', 'in_examination', 'completed')
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_patients_optometry_status
  on public.patients(optometry_status);
