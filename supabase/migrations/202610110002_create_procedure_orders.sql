-- Receptionist workflow for clinician-approved procedures.
-- Procedures are scheduled and billed through the existing invoice/cashier workflow.
create table if not exists public.procedure_orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  procedure_name text not null,
  referral_type text not null check (referral_type in ('doctor_order', 'external_referral')),
  order_reference text not null,
  scheduled_date date,
  notes text,
  price numeric(12,2) not null default 0 check (price >= 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  invoice_id uuid references public.invoices(id) on delete set null,
  registered_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_procedure_orders_patient
  on public.procedure_orders(patient_id);
create index if not exists idx_procedure_orders_status_date
  on public.procedure_orders(status, scheduled_date);
create index if not exists idx_procedure_orders_invoice
  on public.procedure_orders(invoice_id);

alter table public.procedure_orders enable row level security;

-- Preserve the existing billing categories, including laboratory,
-- and allow optical and procedure items for their respective workflows.
alter table public.invoice_items
  drop constraint if exists invoice_items_category_check;

alter table public.invoice_items
  add constraint invoice_items_category_check
  check (category in (
    'consultation',
    'consumable',
    'diagnostic',
    'laboratory',
    'pharmacy',
    'optical',
    'procedure'
  ));
