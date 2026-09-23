-- Addendum to supabase/catch-up.sql — run this too if you already ran that
-- earlier script. Adds the richer vitals fields Triage now actually
-- collects and saves for real.
--
-- Safe to run regardless of your current state (all IF NOT EXISTS).

alter table vitals add column if not exists visual_acuity_ou text;
alter table vitals add column if not exists with_correction boolean default false;
alter table vitals add column if not exists iop_od numeric;
alter table vitals add column if not exists iop_os numeric;
alter table vitals add column if not exists iop_instrument text;
alter table vitals add column if not exists bp_systolic numeric;
alter table vitals add column if not exists bp_diastolic numeric;
alter table vitals add column if not exists pulse numeric;
alter table vitals add column if not exists temperature numeric;
alter table vitals add column if not exists spo2 numeric;
alter table vitals add column if not exists symptoms text;
alter table vitals add column if not exists severity text;
alter table vitals add column if not exists duration_text text;

-- The old single "iop" column (if your table predates this round) is no
-- longer written to, but left in place harmlessly — no need to drop it.
