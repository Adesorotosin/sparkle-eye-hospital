-- Editable fixed-price catalogue for clinician-approved procedures.
-- Prices are provisional starting values and must be reviewed by hospital management.
create table if not exists public.procedure_price_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'Eye service',
  price numeric(12,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.procedure_price_catalog enable row level security;

insert into public.procedure_price_catalog (code, name, category, price)
values
  ('refraction', 'Refraction', 'Refraction & optical', 5000),
  ('iop-measurement', 'Intraocular pressure (IOP) measurement', 'Diagnostic eye tests', 3000),
  ('gonioscopy', 'Gonioscopy', 'Diagnostic eye tests', 10000),
  ('pachymetry', 'Pachymetry', 'Diagnostic eye tests', 10000),
  ('visual-field', 'Visual field test', 'Diagnostic eye tests', 20000),
  ('oct-macula', 'OCT macula', 'OCT imaging', 25000),
  ('oct-rnfl-onh', 'OCT RNFL / ONH', 'OCT imaging', 25000),
  ('fundus-photography', 'Fundus photography', 'Diagnostic eye tests', 15000),
  ('foreign-body-removal', 'Foreign body removal', 'Clinical procedures', 15000),
  ('minor-eye-procedure', 'Minor eye procedure', 'Clinical procedures', 25000),
  ('eyelid-procedure', 'Eyelid procedure', 'Clinical procedures', 30000),
  ('intravitreal-injection', 'Intravitreal injection (procedure fee only)', 'Clinical procedures', 50000)
on conflict (code) do nothing;
