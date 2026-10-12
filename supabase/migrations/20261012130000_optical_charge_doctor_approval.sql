-- Doctor approval gate for optical charges.
alter table public.optical_orders
  add column if not exists charge_approval_status text not null default 'not_submitted'
    check (charge_approval_status in ('not_submitted', 'pending', 'approved', 'rejected')),
  add column if not exists charge_approval_note text,
  add column if not exists charge_approved_by uuid references public.staff(id) on delete set null,
  add column if not exists charge_approved_at timestamptz,
  add column if not exists charge_submitted_at timestamptz;

create index if not exists idx_optical_orders_charge_approval
  on public.optical_orders(charge_approval_status, charge_submitted_at);
