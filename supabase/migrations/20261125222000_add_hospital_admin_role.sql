-- Add a non-clinical Hospital Administrator role.
alter table public.staff
  drop constraint if exists staff_role_check;
alter table public.staff
  add constraint staff_role_check
  check (role in (
    'IT_ADMIN','HOSPITAL_ADMIN','OPHTHALMOLOGIST','DOCTOR','PHARMACIST',
    'NURSE','CASHIER','RECEPTIONIST','LAB_SCIENTIST','OPTICIAN',
    'OPTOMETRIST','INVENTORY_MANAGER'
  ));

alter table public.custom_roles
  drop constraint if exists custom_roles_base_role_check;
alter table public.custom_roles
  add constraint custom_roles_base_role_check
  check (base_role in (
    'HOSPITAL_ADMIN','OPHTHALMOLOGIST','DOCTOR','PHARMACIST','NURSE',
    'CASHIER','RECEPTIONIST','LAB_SCIENTIST','OPTICIAN','OPTOMETRIST','INVENTORY_MANAGER'
  ));
