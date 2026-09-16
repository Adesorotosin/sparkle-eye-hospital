-- Sparkle Eye Specialist Hospital — Database Schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)
-- once, on a fresh project.

-- ============================================================
-- STAFF (replaces the hardcoded STAFF_DIRECTORY / INITIAL_STAFF)
-- ============================================================
create table staff (
  id uuid primary key default gen_random_uuid(),
  staff_id text unique not null,              -- e.g. "VF-2024-0142"
  username text unique not null,              -- what they type at login
  password_hash text not null,                -- bcrypt hash, never plaintext
  name text not null,
  email text unique not null,
  role text not null check (role in (
    'IT_ADMIN','OPHTHALMOLOGIST','DOCTOR','PHARMACIST','NURSE','CASHIER','RECEPTIONIST'
  )),
  title text,                                 -- human-readable job title, e.g. "Senior Ophthalmologist"
                                               -- (separate from `role`, which drives login/route access)
  department text,
  assigned_facilities text,
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PATIENTS
-- ============================================================
create table patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text unique not null,          -- e.g. "SPK-30892" (human-facing id)
  full_name text not null,
  coverage_plan text not null default 'Self-Pay',
  age integer,
  gender text,
  phone text,
  allergies text,                             -- free-text, comma-separated
  created_at timestamptz not null default now()
);

-- Latest triage vitals per patient (one row per recording, most recent = current)
create table vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visual_acuity_od text,
  visual_acuity_os text,
  iop numeric,
  primary_complaint text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references staff(id)
);

create table diagnostic_orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  name text not null,
  price numeric not null,
  status text not null default 'ordered' check (status in ('ordered','completed')),
  ordered_by uuid references staff(id),
  created_at timestamptz not null default now()
);

create table prescriptions (
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

-- Consultation / encounter records (slit lamp exam, refraction, diagnosis)
-- saved from app/doctor/patients/[id]/encounter
create table encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  slit_lamp_od text,
  slit_lamp_os text,
  refraction_od jsonb,          -- { sphere, cylinder, axis }
  refraction_os jsonb,
  diagnosis text,
  status text not null default 'draft' check (status in ('draft','completed')),
  recorded_by uuid references staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- BILLING
-- ============================================================
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,            -- e.g. "INV-2026-4851"
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

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  category text not null check (category in ('consultation','diagnostic','pharmacy','consumable')),
  name text not null,
  quantity integer not null default 1,
  unit_price numeric not null,
  total_price numeric not null
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  module text not null check (module in ('Billing','Pharmacy','Diagnostics','Triage')),
  action text not null,
  performed_by text not null,                 -- free-text name/label, matches existing UI
  created_at timestamptz not null default now()
);

-- ============================================================
-- INVENTORY (pharmacy/optical stock)
-- ============================================================
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,                   -- e.g. "INV-001"
  name text not null,
  category text not null,
  domain text not null default 'optical' check (domain in ('optical','pharmacy')),
  stock integer not null default 0,
  reorder_level integer not null default 0,
  price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete set null,
  patient_name text not null,                 -- kept denormalized for walk-ins/no patient record yet
  physician text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','checked_in','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helpful indexes
-- ============================================================
create index idx_vitals_patient on vitals(patient_id);
create index idx_diagnostics_patient on diagnostic_orders(patient_id);
create index idx_prescriptions_patient on prescriptions(patient_id);
create index idx_encounters_patient on encounters(patient_id);
create index idx_invoices_patient on invoices(patient_id);
create index idx_invoice_items_invoice on invoice_items(invoice_id);
create index idx_activity_logs_patient on activity_logs(patient_id);
create index idx_appointments_time on appointments(start_time);

-- ============================================================
-- Row Level Security
-- All access in this app goes through server-side API routes using the
-- Supabase SERVICE ROLE key (which bypasses RLS by design), so RLS here
-- is a safety net in case the anon/public key is ever used directly from
-- the browser. Enable it and deny all client-side access by default.
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
alter table inventory_items enable row level security;
alter table appointments enable row level security;

-- No policies are created, which means: with RLS enabled and the anon key,
-- ALL access is denied by default. Only the service role key (used only
-- in server-side API routes, never shipped to the browser) can read/write.
