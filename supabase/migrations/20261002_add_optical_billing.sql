-- Sparkle Eye Specialist Hospital
-- Optical Billing Integration
--
-- Connects completed optical orders to the existing
-- hospital invoice / cashier payment workflow.

-- ============================================================
-- 1. Extend invoice item categories
-- ============================================================

alter table public.invoice_items
  drop constraint if exists invoice_items_category_check;

alter table public.invoice_items
  add constraint invoice_items_category_check
  check (
    category in (
      'consultation',
      'diagnostic',
      'pharmacy',
      'consumable',
      'optical'
    )
  );


-- ============================================================
-- 2. Add billing information to optical orders
-- ============================================================

alter table public.optical_orders
  add column if not exists invoice_id uuid
    references public.invoices(id)
    on delete set null;

alter table public.optical_orders
  add column if not exists optical_charge numeric
    not null default 0;


-- ============================================================
-- 3. Index invoice relationship
-- ============================================================

create index if not exists idx_optical_orders_invoice
  on public.optical_orders(invoice_id);


-- ============================================================
-- 4. Prevent duplicate optical billing for the same invoice
-- ============================================================

create unique index if not exists idx_optical_orders_unique_invoice
  on public.optical_orders(invoice_id)
  where invoice_id is not null;