-- Pin the lab updated_at trigger to a trusted search path.
CREATE OR REPLACE FUNCTION public.set_lab_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
