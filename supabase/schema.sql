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
    'IT_ADMIN',
    'OPHTHALMOLOGIST',
    'DOCTOR',
    'OPTOMETRIST',
    'OPTICIAN',
    'LAB_SCIENTIST',
    'NURSE',
    'PHARMACIST',
    'CASHIER',
    'RECEPTIONIST',
    'INVENTORY_MANAGER'
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
  status text not null default 'waiting_triage'
    check (status in ('waiting_triage','in_consultation','completed_today')),
  is_walk_in boolean not null default false,
  last_visit_at timestamptz,
  created_at timestamptz not null default now()
);

-- Latest triage vitals per patient (one row per recording, most recent = current)
create table vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visual_acuity_od text,
  visual_acuity_os text,
  visual_acuity_ou text,
  with_correction boolean default false,
  iop_od numeric,
  iop_os numeric,
  iop_instrument text,
  bp_systolic numeric,
  bp_diastolic numeric,
  pulse numeric,
  temperature numeric,
  spo2 numeric,
  primary_complaint text,
  symptoms text,                              -- comma-separated
  severity text,
  duration_text text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references staff(id)
);

create table diagnostic_orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  name text not null,
  price numeric not null,
  status text not null default 'ordered' check (status in ('ordered','ready_for_test','completed')),
  ordered_by uuid references staff(id),
  completed_by uuid references staff(id),
  findings text,
  interpretation text,
  completed_at timestamptz,
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
    check (status in ('awaiting_pharmacy_review','reviewed','pending_payment','ready_for_dispensing','dispensed')),
  prescribed_by uuid references staff(id),
  created_at timestamptz not null default now()
);

-- Consultation / encounter records (slit lamp exam, refraction, diagnosis)
-- saved from app/doctor/patients/[id]/encounter
create table encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_type text not null default 'doctor',
  visual_acuity_od text,
  visual_acuity_os text,
  visual_acuity_ou text,
  with_correction boolean not null default false,
  slit_lamp_od text,
  slit_lamp_os text,
  refraction_od jsonb,          -- flat legacy values or { objective, subjective }
  refraction_os jsonb,
  optometry_source text default 'in_house'
    check (optometry_source is null or optometry_source in ('in_house','visiting')),
  optometry_visit_type text
    check (optometry_visit_type is null or optometry_visit_type in ('doctor_referral','external_referral','self_presenting')),
  diagnosis text,
  treatment_plan text,
  status text not null default 'draft' check (status in ('draft','completed')),
  recorded_by uuid references staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Doctor-to-cashier treatment-plan billing requests. This handoff is not an invoice.
create table if not exists treatment_billing_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid not null unique references encounters(id) on delete cascade,
  treatment_plan text not null check (length(trim(treatment_plan)) > 0),
  status text not null default 'pending' check (status in ('pending','reviewed','cancelled')),
  requested_by uuid references staff(id) on delete set null,
  requested_by_name text not null,
  reviewed_by uuid references staff(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_treatment_billing_requests_status_created
  on treatment_billing_requests(status, created_at desc);
create index if not exists idx_treatment_billing_requests_patient
  on treatment_billing_requests(patient_id);
alter table treatment_billing_requests enable row level security;

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

-- Exact invoice line linked to each pharmacy prescription for payment enforcement.
alter table public.prescriptions
  add column if not exists invoice_item_id uuid
  references public.invoice_items(id) on delete set null;

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  module text not null,                       -- 'Billing' | 'Pharmacy' | 'Diagnostics' | 'Triage' | 'Admin' | 'Scheduling' | 'Consultation'
  category text not null default 'CLINICAL' check (category in ('CLINICAL','BILLING','ADMIN')),
  action text not null,
  details text,
  financial_amount numeric,
  performed_by text not null,                 -- free-text name/label, matches existing UI
  created_at timestamptz not null default now()
);

-- Login/security events, tracked separately from clinical/admin activity
create table security_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete set null,
  username_attempted text not null,
  action text not null,                       -- e.g. 'Successful Login', 'Failed Login Attempt'
  ip_address text,
  device text,
  risk_level text not null default 'LOW' check (risk_level in ('LOW','MEDIUM','CRITICAL')),
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

-- Manually broadcast alerts/announcements from Admin > Notifications.
-- NOTE: these persist and are visible in this Admin view, but are not yet
-- pushed live to other roles' dashboards — that would need each role's
-- page to poll or subscribe for updates, which is a separate feature.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,                         -- 'Emergency' | 'Announcement' | 'Clinical' | 'Finance'
  title text not null,
  message text not null,
  category text not null,                     -- 'Security' | 'Announcements' | 'Clinical Escalations'
  target text,
  triggered_by text,
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
create index idx_security_logs_created on security_logs(created_at);
create index idx_appointments_time on appointments(start_time);
create index idx_notifications_created on notifications(created_at);

-- Shared inventory foundation for optical products and hospital consumables.
-- Existing inventory_items rows are preserved; pharmacy dispensing keeps using domain='pharmacy'.

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_domain_check;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_domain_check
  CHECK (domain IN ('optical', 'pharmacy', 'hospital'));

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS unit_of_measure text NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (
    movement_type IN ('RECEIVE', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'SALE', 'DAMAGE', 'EXPIRED')
  ),
  quantity integer NOT NULL CHECK (quantity > 0),
  previous_stock integer NOT NULL CHECK (previous_stock >= 0),
  new_stock integer NOT NULL CHECK (new_stock >= 0),
  unit_cost numeric(12,2),
  sale_amount numeric(12,2) NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.inventory_suppliers(id) ON DELETE SET NULL,
  department text,
  reference text,
  notes text,
  performed_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  performed_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created
  ON public.inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created
  ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_domain_category
  ON public.inventory_items(domain, category);
CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_active
  ON public.inventory_suppliers(is_active, name);

ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Receive stock and write its audit ledger row in one database transaction.
CREATE OR REPLACE FUNCTION public.inventory_receive_stock(
  p_item_id uuid,
  p_quantity integer,
  p_performed_by uuid,
  p_performed_by_name text,
  p_unit_cost numeric DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.inventory_items%ROWTYPE;
  v_new_stock integer;
BEGIN
  IF p_item_id IS NULL OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Select an item and enter a quantity greater than zero.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The inventory item was not found or is inactive.';
  END IF;

  IF p_unit_cost IS NOT NULL AND p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Unit cost cannot be negative.';
  END IF;

  v_new_stock := v_item.stock + p_quantity;

  UPDATE public.inventory_items
  SET stock = v_new_stock,
      unit_cost = COALESCE(p_unit_cost, unit_cost),
      updated_at = now()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_movements (
    item_id, movement_type, quantity, previous_stock, new_stock,
    unit_cost, supplier_id, reference, notes, performed_by, performed_by_name
  ) VALUES (
    p_item_id, 'RECEIVE', p_quantity, v_item.stock, v_new_stock,
    COALESCE(p_unit_cost, v_item.unit_cost), p_supplier_id,
    NULLIF(trim(p_reference), ''), NULLIF(trim(p_notes), ''),
    p_performed_by, p_performed_by_name
  );

  RETURN jsonb_build_object('item_id', p_item_id, 'previous_stock', v_item.stock, 'new_stock', v_new_stock);
END;
$$;

-- Department issues are atomic and cannot drive stock below zero.
CREATE OR REPLACE FUNCTION public.inventory_issue_stock(
  p_item_id uuid,
  p_quantity integer,
  p_department text,
  p_performed_by uuid,
  p_performed_by_name text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.inventory_items%ROWTYPE;
  v_new_stock integer;
BEGIN
  IF p_item_id IS NULL OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Select an item and enter a quantity greater than zero.';
  END IF;

  IF NULLIF(trim(p_department), '') IS NULL THEN
    RAISE EXCEPTION 'Select the department receiving the stock.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The inventory item was not found or is inactive.';
  END IF;

  IF v_item.stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Only % % available.',
      v_item.stock, v_item.unit_of_measure;
  END IF;

  v_new_stock := v_item.stock - p_quantity;

  UPDATE public.inventory_items
  SET stock = v_new_stock, updated_at = now()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_movements (
    item_id, movement_type, quantity, previous_stock, new_stock,
    department, reference, notes, performed_by, performed_by_name
  ) VALUES (
    p_item_id, 'ISSUE', p_quantity, v_item.stock, v_new_stock,
    trim(p_department), NULLIF(trim(p_reference), ''),
    NULLIF(trim(p_notes), ''), p_performed_by, p_performed_by_name
  );

  RETURN jsonb_build_object('item_id', p_item_id, 'previous_stock', v_item.stock, 'new_stock', v_new_stock);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.inventory_receive_stock(uuid, integer, uuid, text, numeric, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_receive_stock(uuid, integer, uuid, text, numeric, uuid, text, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.inventory_issue_stock(uuid, integer, text, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_issue_stock(uuid, integer, text, uuid, text, text, text)
  TO service_role;

-- ============================================================
-- Pharmacy dispensing must update the shared inventory movement ledger in the same
-- transaction as the stock deduction and prescription status change.
DROP FUNCTION IF EXISTS public.dispense_patient_prescriptions(uuid);

CREATE OR REPLACE FUNCTION public.dispense_patient_prescriptions(
  p_patient_id uuid,
  p_performed_by uuid,
  p_performed_by_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prescription_record record;
  inventory_record record;
  dispensed_count integer := 0;
  total_quantity integer := 0;
  prescription_ids uuid[] := '{}';
  v_new_stock integer;
  inventory_match_count integer := 0;
BEGIN
  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'Patient ID is required.';
  END IF;
  IF p_performed_by IS NULL OR NULLIF(trim(p_performed_by_name), '') IS NULL THEN
    RAISE EXCEPTION 'Dispensing staff identity is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.prescriptions
    WHERE patient_id = p_patient_id
      AND status = 'ready_for_dispensing'
  ) THEN
    RAISE EXCEPTION 'No prescriptions are ready for dispensing.';
  END IF;

  -- Lock prescriptions so concurrent requests cannot dispense them twice.
  FOR prescription_record IN
    SELECT id, drug_name, quantity, invoice_item_id, price_per_unit
    FROM public.prescriptions
    WHERE patient_id = p_patient_id
      AND status = 'ready_for_dispensing'
    ORDER BY created_at ASC, id ASC
    FOR UPDATE
  LOOP
    -- Dispensing is allowed only for a prescription linked to its own paid invoice item.
    IF prescription_record.invoice_item_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.invoice_items ii
      JOIN public.invoices i ON i.id = ii.invoice_id
      WHERE ii.id = prescription_record.invoice_item_id
        AND ii.category = 'pharmacy'
        AND i.patient_id = p_patient_id
        AND i.status = 'paid'
        AND lower(trim(ii.name)) = lower(trim(prescription_record.drug_name))
        AND ii.quantity = prescription_record.quantity
        AND ii.unit_price = prescription_record.price_per_unit
    ) THEN
      RAISE EXCEPTION 'Prescription % is not linked to a paid invoice item. Complete payment before dispensing.',
        prescription_record.id;
    END IF;

    -- Do not silently choose the oldest row if duplicate active stock names exist.
    SELECT count(*) INTO inventory_match_count
    FROM public.inventory_items
    WHERE domain = 'pharmacy'
      AND is_active = true
      AND lower(trim(name)) = lower(trim(prescription_record.drug_name));

    IF inventory_match_count = 0 THEN
      RAISE EXCEPTION 'Active pharmacy stock item not found for medication: %',
        prescription_record.drug_name;
    ELSIF inventory_match_count > 1 THEN
      RAISE EXCEPTION 'Multiple active pharmacy stock items match medication: %. Resolve duplicate inventory names before dispensing.',
        prescription_record.drug_name;
    END IF;

    -- Lock the matching active stock row to serialize competing stock deductions.
    SELECT id, name, stock, unit_cost, unit_of_measure
    INTO inventory_record
    FROM public.inventory_items
    WHERE domain = 'pharmacy'
      AND is_active = true
      AND lower(trim(name)) = lower(trim(prescription_record.drug_name))
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Active pharmacy stock item not found for medication: %',
        prescription_record.drug_name;
    END IF;

    IF inventory_record.stock < prescription_record.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %: % available, % required.',
        inventory_record.name,
        inventory_record.stock,
        prescription_record.quantity;
    END IF;

    v_new_stock := inventory_record.stock - prescription_record.quantity;

    UPDATE public.inventory_items
    SET stock = v_new_stock,
        updated_at = now()
    WHERE id = inventory_record.id;

    UPDATE public.prescriptions
    SET status = 'dispensed'
    WHERE id = prescription_record.id
      AND status = 'ready_for_dispensing';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Prescription % is no longer ready for dispensing.',
        prescription_record.id;
    END IF;

    INSERT INTO public.inventory_movements (
      item_id, movement_type, quantity, previous_stock, new_stock,
      unit_cost, department, reference, notes, performed_by, performed_by_name
    ) VALUES (
      inventory_record.id, 'SALE', prescription_record.quantity,
      inventory_record.stock, v_new_stock, inventory_record.unit_cost,
      'Pharmacy', prescription_record.id::text,
      'Dispensed for patient ' || p_patient_id::text,
      p_performed_by, trim(p_performed_by_name)
    );

    prescription_ids := array_append(prescription_ids, prescription_record.id);
    dispensed_count := dispensed_count + 1;
    total_quantity := total_quantity + prescription_record.quantity;
  END LOOP;

  RETURN jsonb_build_object(
    'dispensed_count', dispensed_count,
    'total_quantity', total_quantity,
    'prescription_ids', prescription_ids
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispense_patient_prescriptions(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispense_patient_prescriptions(uuid, uuid, text)
  TO service_role;


-- Compatibility overload for an older deployed application that still calls the
-- one-argument RPC. It deliberately fails closed; it must never bypass payment,
-- staff identity, or inventory-ledger checks.
CREATE OR REPLACE FUNCTION public.dispense_patient_prescriptions(
  p_patient_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Pharmacy dispensing requires the updated application. Please retry after the hospital system has been updated.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispense_patient_prescriptions(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispense_patient_prescriptions(uuid)
  TO service_role;

-- Audited daily sales for non-prescription pharmacy transactions.
CREATE OR REPLACE FUNCTION public.inventory_record_pharmacy_daily_sale(
  p_item_id uuid,
  p_quantity integer,
  p_sale_date date,
  p_performed_by uuid,
  p_performed_by_name text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
DECLARE
  v_item public.inventory_items%ROWTYPE;
  v_new_stock integer;
  v_sale_amount numeric(12,2);
BEGIN
  IF p_item_id IS NULL OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Select a pharmacy item and enter a quantity greater than zero.';
  END IF;
  IF p_sale_date IS NULL THEN
    RAISE EXCEPTION 'Sale date is required.';
  END IF;
  IF p_performed_by IS NULL OR NULLIF(pg_catalog.btrim(p_performed_by_name), '') IS NULL THEN
    RAISE EXCEPTION 'Staff identity is required to record a sale.';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id AND domain = 'pharmacy' AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected pharmacy item is unavailable.';
  END IF;
  IF v_item.stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for %: % available, % requested.',
      v_item.name, v_item.stock, p_quantity;
  END IF;

  v_new_stock := v_item.stock - p_quantity;
  v_sale_amount := round(v_item.price * p_quantity, 2);

  UPDATE public.inventory_items
  SET stock = v_new_stock, updated_at = pg_catalog.now()
  WHERE id = v_item.id;

  INSERT INTO public.inventory_movements (
    item_id, movement_type, quantity, previous_stock, new_stock,
    unit_cost, department, reference, notes, performed_by,
    performed_by_name, sale_amount
  ) VALUES (
    v_item.id, 'SALE', p_quantity, v_item.stock, v_new_stock,
    v_item.unit_cost, 'Pharmacy',
    'DAILY-SALE-' || pg_catalog.to_char(p_sale_date, 'YYYY-MM-DD'),
    'Daily pharmacy sale recorded for ' || pg_catalog.to_char(p_sale_date, 'YYYY-MM-DD') ||
      CASE WHEN NULLIF(pg_catalog.btrim(p_notes), '') IS NULL THEN '' ELSE ': ' || pg_catalog.btrim(p_notes) END,
    p_performed_by, pg_catalog.btrim(p_performed_by_name), v_sale_amount
  );

  RETURN pg_catalog.jsonb_build_object(
    'item_id', v_item.id, 'quantity', p_quantity,
    'sale_amount', v_sale_amount, 'new_stock', v_new_stock
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.inventory_record_pharmacy_daily_sale(uuid, integer, date, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_record_pharmacy_daily_sale(uuid, integer, date, uuid, text, text)
  TO service_role;

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
alter table security_logs enable row level security;
alter table inventory_items enable row level security;
alter table inventory_suppliers enable row level security;
alter table inventory_movements enable row level security;
alter table appointments enable row level security;
alter table notifications enable row level security;

-- No policies are created, which means: with RLS enabled and the anon key,
-- ALL access is denied by default. Only the service role key (used only
-- in server-side API routes, never shipped to the browser) can read/write.
-- ============================================================
-- AUTHENTICATION SESSIONS
-- Server-side sessions for hospital staff
-- ============================================================

create table auth_sessions (
  id uuid primary key default gen_random_uuid(),

  staff_id uuid not null
    references staff(id)
    on delete cascade,

  token_hash text unique not null,

  expires_at timestamptz not null,

  created_at timestamptz not null default now(),

  last_seen_at timestamptz,

  revoked_at timestamptz
);

create index idx_auth_sessions_token_hash
  on auth_sessions(token_hash);

create index idx_auth_sessions_staff_id
  on auth_sessions(staff_id);

create index idx_auth_sessions_expires_at
  on auth_sessions(expires_at);

alter table auth_sessions enable row level security;

-- No public/anon policies.
-- Only the server-side Supabase secret key can access sessions.