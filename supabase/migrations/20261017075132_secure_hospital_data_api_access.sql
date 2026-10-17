-- The hospital application authenticates staff in server actions and uses
-- SUPABASE_SECRET_KEY only on the server. Deny direct Data API access to PHI.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        'public' = ANY (roles)
        OR 'anon' = ANY (roles)
        OR 'authenticated' = ANY (roles)
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Service-role server actions continue to work; direct browser API roles do not.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      r.schema_name, r.table_name);
  END LOOP;
END $$;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
