-- Sparkle Eye Hospital: diagnostic payment -> investigation workflow
-- Run this once in Supabase SQL Editor on an existing database.
--
-- Existing orders remain "ordered".
-- Cashier payment moves them to "ready_for_test".
-- Diagnostics completes them after the investigation is performed.

alter table public.diagnostic_orders
  drop constraint if exists diagnostic_orders_status_check;

alter table public.diagnostic_orders
  add constraint diagnostic_orders_status_check
  check (status in ('ordered', 'ready_for_test', 'completed'));

alter table public.diagnostic_orders
  add column if not exists completed_by uuid references public.staff(id) on delete set null;

alter table public.diagnostic_orders
  add column if not exists findings text;

alter table public.diagnostic_orders
  add column if not exists interpretation text;

alter table public.diagnostic_orders
  add column if not exists completed_at timestamptz;

create index if not exists idx_diagnostics_status
  on public.diagnostic_orders(status);
