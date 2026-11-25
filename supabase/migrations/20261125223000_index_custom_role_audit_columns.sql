-- Index custom-role audit foreign keys for efficient staff joins and audit attribution.
create index if not exists idx_custom_roles_created_by
  on public.custom_roles(created_by)
  where created_by is not null;

create index if not exists idx_custom_roles_updated_by
  on public.custom_roles(updated_by)
  where updated_by is not null;
