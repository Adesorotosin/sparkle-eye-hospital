-- Add a dedicated inventory-only staff role.
-- This role is intentionally excluded from clinical, cashier, and system administration access.

BEGIN;

ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_role_check
  CHECK (
    role = ANY (
      ARRAY[
        'IT_ADMIN',
        'OPHTHALMOLOGIST',
        'DOCTOR',
        'PHARMACIST',
        'NURSE',
        'CASHIER',
        'RECEPTIONIST',
        'LAB_SCIENTIST',
        'OPTICIAN',
        'OPTOMETRIST',
        'INVENTORY_MANAGER'
      ]::text[]
    )
  );

COMMIT;
