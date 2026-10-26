-- Add the near interpupillary distance field from the hospital's spectacle prescription form.
-- Additive only; does not modify existing optical orders or patient data.
ALTER TABLE public.optical_orders
  ADD COLUMN IF NOT EXISTS pd_near text;

COMMENT ON COLUMN public.optical_orders.pd_near IS
  'Near interpupillary distance (IPD) in millimetres recorded during optical preparation.';
