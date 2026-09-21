-- Sparkle Eye Specialist Hospital — CONSOLIDATED CATCH-UP SCRIPT
--
-- Safe to run once against your existing Supabase project, no matter which
-- of the earlier round-by-round SQL snippets you've already applied.
-- Everything here uses IF NOT EXISTS / DO-block guards, so anything already
-- in place is skipped harmlessly.
--
-- Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run.

-- ============================================================
-- STAFF — add columns from later rounds, if missing
-- ============================================================
alter table staff add column if not exists title text;

-- ============================================================
-- PATIENTS — add columns from the Pharmacy round and the
-- Doctor Patients Directory round, if missing
-- ============================================================
alter table patients add column if not exists age integer;
alter table patients add column if not exists gender text;
alter table patients add column if not exists phone text;
alter table patients add column if not exists allergies text;
alter table patients add column if not exists status text not null default 'waiting_triage';
alter table patients add column if not exists is_walk_in boolean not null default false;
alter table patients add column if not exists last_visit_at timestamptz;

do $$ begin
  alter table patients add constraint patients_status_check
    check (status in ('waiting_triage','in_consultation','completed_today'));
exception when duplicate_object then null;
end $$;

-- ============================================================
-- INVENTORY_ITEMS — add domain column from the Pharmacy round
-- ============================================================
alter table inventory_items add column if not exists domain text not null default 'optical';

do $$ begin
  alter table inventory_items add constraint inventory_items_domain_check
    check (domain in ('optical','pharmacy'));
exception when duplicate_object then null;
end $$;

-- ============================================================
-- VITALS, DIAGNOSTIC_ORDERS, PRESCRIPTIONS, ENCOUNTERS, INVOICES,
-- INVOICE_ITEMS — create if this project predates them
-- ============================================================
create table if not exists vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visual_acuity_od text,
  visual_acuity_os text,
  iop numeric,
  primary_complaint text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references staff(id)
);

create table if not exists diagnostic_orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  name text not null,
  price numeric not null,
  status text not null default 'ordered' check (status in ('ordered','completed')),
  ordered_by uuid references staff(id),
  created_at timestamptz not null default now()
);

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  drug_name text not null,
  dosage text not null,
  quantity integer not null default 1,
  price_per_unit numeric not null,
  total_price numeric not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','ready_for_dispensing','dispensed')),
  prescribed_by uuid references staff(id),
  created_at timestamptz not null default now()
);

create table if not exists encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  slit_lamp_od text,
  slit_lamp_os text,
  refraction_od jsonb,
  refraction_os jsonb,
  diagnosis text,
  status text not null default 'draft' check (status in ('draft','completed')),
  recorded_by uuid references staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,
  patient_id uuid not null references patients(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','pending','paid','cancelled')),
  subtotal numeric not null default 0,
  discount_amount numeric not null default 0,
  discount_reason text,
  approved_by_pin text,
  grand_total numeric not null default 0,
  payment_method text check (payment_method in ('cash','pos','transfer','card','hmo')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  category text not null check (category in ('consultation','diagnostic','pharmacy','consumable')),
  name text not null,
  quantity integer not null default 1,
  unit_price numeric not null,
  total_price numeric not null
);

-- ============================================================
-- ACTIVITY_LOGS — add columns from the Admin round, if missing,
-- and relax the old module check constraint
-- ============================================================
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  module text not null,
  action text not null,
  performed_by text not null,
  created_at timestamptz not null default now()
);

alter table activity_logs add column if not exists staff_id uuid references staff(id) on delete set null;
alter table activity_logs add column if not exists category text not null default 'CLINICAL';
alter table activity_logs add column if not exists details text;
alter table activity_logs add column if not exists financial_amount numeric;

do $$ begin
  alter table activity_logs add constraint activity_logs_category_check
    check (category in ('CLINICAL','BILLING','ADMIN'));
exception when duplicate_object then null;
end $$;

-- Drop the old restrictive module check, if it's still there from the
-- very first schema version (module used to only allow 4 fixed values)
alter table activity_logs drop constraint if exists activity_logs_module_check;

-- ============================================================
-- SECURITY_LOGS, APPOINTMENTS, NOTIFICATIONS — create if missing
-- ============================================================
create table if not exists security_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete set null,
  username_attempted text not null,
  action text not null,
  ip_address text,
  device text,
  risk_level text not null default 'LOW' check (risk_level in ('LOW','MEDIUM','CRITICAL')),
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete set null,
  patient_name text not null,
  physician text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','checked_in','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text not null,
  category text not null,
  target text,
  triggered_by text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes (safe to re-run)
-- ============================================================
create index if not exists idx_vitals_patient on vitals(patient_id);
create index if not exists idx_diagnostics_patient on diagnostic_orders(patient_id);
create index if not exists idx_prescriptions_patient on prescriptions(patient_id);
create index if not exists idx_encounters_patient on encounters(patient_id);
create index if not exists idx_invoices_patient on invoices(patient_id);
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);
create index if not exists idx_activity_logs_patient on activity_logs(patient_id);
create index if not exists idx_security_logs_created on security_logs(created_at);
create index if not exists idx_appointments_time on appointments(start_time);
create index if not exists idx_notifications_created on notifications(created_at);

-- ============================================================
-- Row Level Security (safe to re-run)
-- ============================================================
alter table staff enable row level security;
alter table patients enable row level security;
alter table vitals enable row level security;
alter table diagnostic_orders enable row level security;
alter table prescriptions enable row level security;
alter table encounters enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table activity_logs enable row level security;
alter table security_logs enable row level security;
alter table inventory_items enable row level security;
alter table appointments enable row level security;
alter table notifications enable row level security;
