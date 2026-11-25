-- Hybrid role-based access control: additive, backward-compatible.
-- Existing staff.role values remain unchanged; custom roles layer permissions
-- over a predefined base role. Existing patient and clinical data is untouched.

create table if not exists public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  base_role text not null check (base_role in (
    'IT_ADMIN','OPHTHALMOLOGIST','DOCTOR','PHARMACIST','NURSE',
    'CASHIER','RECEPTIONIST','LAB_SCIENTIST','OPTICIAN',
    'OPTOMETRIST','INVENTORY_MANAGER'
  )),
  permissions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(permissions) = 'object'),
  is_active boolean not null default true,
  created_by uuid references public.staff(id) on delete set null,
  updated_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_roles_name_nonempty check (length(btrim(name)) > 0),
  constraint custom_roles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

alter table public.staff
  add column if not exists custom_role_id uuid
  references public.custom_roles(id) on delete set null;

create index if not exists idx_staff_custom_role_id
  on public.staff(custom_role_id)
  where custom_role_id is not null;

create index if not exists idx_custom_roles_active
  on public.custom_roles(is_active, name);

alter table public.custom_roles enable row level security;

comment on table public.custom_roles is
  'Reusable custom staff roles. Permissions are layered over the predefined staff.role base role.';
comment on column public.staff.custom_role_id is
  'Optional custom role layered over staff.role. Null preserves the predefined role behaviour.';
