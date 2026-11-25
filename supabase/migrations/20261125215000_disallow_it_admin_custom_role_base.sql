-- Custom roles must never inherit the IT administrator base role.
alter table public.custom_roles
  drop constraint if exists custom_roles_base_role_check;

alter table public.custom_roles
  add constraint custom_roles_base_role_check
  check (base_role in (
    'OPHTHALMOLOGIST','DOCTOR','PHARMACIST','NURSE','CASHIER',
    'RECEPTIONIST','LAB_SCIENTIST','OPTICIAN','OPTOMETRIST','INVENTORY_MANAGER'
  ));
