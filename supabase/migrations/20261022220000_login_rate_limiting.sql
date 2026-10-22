-- Rate-limit failed staff logins without storing usernames or IP addresses in this table.
-- The application sends SHA-256 hashes for the account+IP pair and IP-only bucket.
CREATE TABLE IF NOT EXISTS public.auth_login_rate_limits (
  rate_key text PRIMARY KEY CHECK (rate_key ~ '^[a-f0-9]{64}$'),
  failures integer NOT NULL DEFAULT 0 CHECK (failures >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_login_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.auth_login_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.auth_login_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.is_login_rate_limited(
  p_identity_ip_hash text,
  p_ip_hash text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.auth_login_rate_limits
      WHERE rate_key = p_identity_ip_hash
        AND failures >= 5
        AND window_started_at > pg_catalog.now() - interval '15 minutes'
    )
    OR EXISTS (
      SELECT 1 FROM public.auth_login_rate_limits
      WHERE rate_key = p_ip_hash
        AND failures >= 20
        AND window_started_at > pg_catalog.now() - interval '15 minutes'
    );
$$;

CREATE OR REPLACE FUNCTION public.record_login_failure(
  p_identity_ip_hash text,
  p_ip_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_key text;
BEGIN
  IF p_identity_ip_hash IS NULL OR p_identity_ip_hash !~ '^[a-f0-9]{64}$'
     OR p_ip_hash IS NULL OR p_ip_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid login rate-limit key';
  END IF;

  FOREACH v_key IN ARRAY ARRAY[p_identity_ip_hash, p_ip_hash] LOOP
    INSERT INTO public.auth_login_rate_limits AS current_limit
      (rate_key, failures, window_started_at, updated_at)
    VALUES (v_key, 1, pg_catalog.now(), pg_catalog.now())
    ON CONFLICT (rate_key) DO UPDATE
    SET failures = CASE
          WHEN current_limit.window_started_at <= pg_catalog.now() - interval '15 minutes' THEN 1
          ELSE current_limit.failures + 1
        END,
        window_started_at = CASE
          WHEN current_limit.window_started_at <= pg_catalog.now() - interval '15 minutes' THEN pg_catalog.now()
          ELSE current_limit.window_started_at
        END,
        updated_at = pg_catalog.now();
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_login_rate_limit(
  p_identity_ip_hash text,
  p_ip_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  DELETE FROM public.auth_login_rate_limits
  WHERE rate_key IN (p_identity_ip_hash, p_ip_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.is_login_rate_limited(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_failure(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_login_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_login_rate_limited(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_failure(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_login_rate_limit(text, text) TO service_role;
