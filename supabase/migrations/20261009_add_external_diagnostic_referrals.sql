-- Track referrals from other centres for investigation-only visits.
alter table public.diagnostic_orders
  add column if not exists referral_source text,
  add column if not exists external_referral boolean not null default false;
