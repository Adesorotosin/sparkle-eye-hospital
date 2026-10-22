-- Disposable PostgreSQL test for login rate limits. All writes roll back.
BEGIN;

DO $test$
DECLARE
  v_identity_hash text := repeat('a', 64);
  v_ip_hash text := repeat('b', 64);
  v_other_identity_hash text := repeat('c', 64);
  v_limited boolean;
  v_failures integer;
BEGIN
  IF public.is_login_rate_limited(v_identity_hash, v_ip_hash) THEN
    RAISE EXCEPTION 'Fresh login keys should not be limited';
  END IF;

  FOR i IN 1..4 LOOP
    PERFORM public.record_login_failure(v_identity_hash, v_ip_hash);
  END LOOP;
  IF public.is_login_rate_limited(v_identity_hash, v_ip_hash) THEN
    RAISE EXCEPTION 'Identity/IP bucket was limited before five failures';
  END IF;

  PERFORM public.record_login_failure(v_identity_hash, v_ip_hash);
  IF NOT public.is_login_rate_limited(v_identity_hash, v_ip_hash) THEN
    RAISE EXCEPTION 'Identity/IP bucket was not limited after five failures';
  END IF;

  IF public.is_login_rate_limited(v_other_identity_hash, v_ip_hash) THEN
    RAISE EXCEPTION 'IP-only bucket should not block before twenty failures';
  END IF;

  UPDATE public.auth_login_rate_limits
  SET window_started_at = now() - interval '16 minutes'
  WHERE rate_key IN (v_identity_hash, v_ip_hash);
  IF public.is_login_rate_limited(v_identity_hash, v_ip_hash) THEN
    RAISE EXCEPTION 'Expired failure window should no longer block login';
  END IF;

  PERFORM public.record_login_failure(v_identity_hash, v_ip_hash);
  SELECT failures INTO v_failures FROM public.auth_login_rate_limits WHERE rate_key = v_identity_hash;
  IF v_failures <> 1 THEN
    RAISE EXCEPTION 'Expired window should reset failure count to one, got %', v_failures;
  END IF;

  PERFORM public.clear_login_rate_limit(v_identity_hash, v_ip_hash);
  IF EXISTS (SELECT 1 FROM public.auth_login_rate_limits WHERE rate_key IN (v_identity_hash, v_ip_hash)) THEN
    RAISE EXCEPTION 'Successful login cleanup did not clear rate-limit entries';
  END IF;

  FOR i IN 1..20 LOOP
    PERFORM public.record_login_failure(v_identity_hash, v_ip_hash);
  END LOOP;
  IF NOT public.is_login_rate_limited(v_other_identity_hash, v_ip_hash) THEN
    RAISE EXCEPTION 'IP bucket was not limited after twenty failures';
  END IF;
END;
$test$;

ROLLBACK;
