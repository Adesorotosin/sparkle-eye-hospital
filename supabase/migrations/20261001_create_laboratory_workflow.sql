-- ============================================================
-- SPARKLE EYE HOSPITAL
-- LABORATORY WORKFLOW
-- ============================================================

-- ============================================================
-- 1. LAB ORDERS
-- ============================================================

create table if not exists public.lab_orders (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null
    references public.patients(id)
    on delete cascade,

  test_code text not null,
  test_name text not null,

  specimen_type text not null,

  priority text not null default 'NORMAL'
    check (
      priority in ('NORMAL', 'URGENT', 'STAT')
    ),

  status text not null default 'PENDING'
    check (
      status in (
        'PENDING',
        'COLLECTED',
        'PROCESSING',
        'AWAITING_VERIFICATION',
        'COMPLETED',
        'RECOLLECTION'
      )
    ),

  clinical_notes text,

  ordered_by uuid
    references public.staff(id)
    on delete set null,

  ordered_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. LAB SAMPLES
-- One lab order can have multiple samples because a sample
-- may be rejected and recollected.
-- ============================================================

create table if not exists public.lab_samples (
  id uuid primary key default gen_random_uuid(),

  lab_order_id uuid not null
    references public.lab_orders(id)
    on delete cascade,

  sample_number integer not null default 1,

  sample_type text not null,

  sample_id text,

  status text not null default 'COLLECTED'
    check (
      status in (
        'COLLECTED',
        'RECEIVED',
        'REJECTED',
        'PROCESSING',
        'COMPLETED'
      )
    ),

  condition text
    check (
      condition is null
      or condition in (
        'ACCEPTABLE',
        'INSUFFICIENT',
        'CLOTTED',
        'HAEMOLYSED',
        'WRONG_CONTAINER',
        'WRONG_SAMPLE',
        'OTHER'
      )
    ),

  collection_notes text,

  rejection_reason text,

  collected_by uuid
    references public.staff(id)
    on delete set null,

  collected_at timestamptz,

  received_by uuid
    references public.staff(id)
    on delete set null,

  received_at timestamptz,

  rejected_by uuid
    references public.staff(id)
    on delete set null,

  rejected_at timestamptz,

  processing_started_by uuid
    references public.staff(id)
    on delete set null,

  processing_started_at timestamptz,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 3. LAB RESULTS
-- One verified result belongs to one lab order.
-- result_data is JSONB so different investigations can have
-- different parameters.
-- ============================================================

create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),

  lab_order_id uuid not null
    references public.lab_orders(id)
    on delete cascade,

  sample_id uuid
    references public.lab_samples(id)
    on delete set null,

  result_data jsonb not null default '[]'::jsonb,

  laboratory_comments text,

  entered_by uuid
    references public.staff(id)
    on delete set null,

  entered_at timestamptz,

  verified_by uuid
    references public.staff(id)
    on delete set null,

  verified_at timestamptz,

  verification_notes text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- ============================================================
-- 4. LAB TIMELINE / AUDIT EVENTS
-- This gives us a proper clinical history instead of trying
-- to reconstruct everything from the current status.
-- ============================================================

create table if not exists public.lab_events (
  id uuid primary key default gen_random_uuid(),

  lab_order_id uuid not null
    references public.lab_orders(id)
    on delete cascade,

  sample_id uuid
    references public.lab_samples(id)
    on delete set null,

  event_type text not null,

  description text not null,

  performed_by uuid
    references public.staff(id)
    on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 5. INDEXES
-- ============================================================

create index if not exists idx_lab_orders_patient
  on public.lab_orders(patient_id);

create index if not exists idx_lab_orders_status
  on public.lab_orders(status);

create index if not exists idx_lab_orders_created
  on public.lab_orders(created_at);

create index if not exists idx_lab_samples_order
  on public.lab_samples(lab_order_id);

create index if not exists idx_lab_results_order
  on public.lab_results(lab_order_id);

create index if not exists idx_lab_events_order
  on public.lab_events(lab_order_id);

create index if not exists idx_lab_events_created
  on public.lab_events(created_at);


-- ============================================================
-- 6. ENABLE RLS
-- The Sparkle Eye application uses server-side Supabase
-- access, so browser access remains blocked.
-- ============================================================

alter table public.lab_orders enable row level security;
alter table public.lab_samples enable row level security;
alter table public.lab_results enable row level security;
alter table public.lab_events enable row level security;


-- ============================================================
-- 7. UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_lab_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists lab_orders_updated_at
on public.lab_orders;

create trigger lab_orders_updated_at
before update on public.lab_orders
for each row
execute function public.set_lab_updated_at();


drop trigger if exists lab_results_updated_at
on public.lab_results;

create trigger lab_results_updated_at
before update on public.lab_results
for each row
execute function public.set_lab_updated_at();