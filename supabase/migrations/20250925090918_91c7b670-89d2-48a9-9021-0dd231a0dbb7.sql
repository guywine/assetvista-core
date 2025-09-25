-- Fix authorization: use session_user instead of current_user to prevent SECURITY DEFINER bypass
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_token TEXT;
  session_exists BOOLEAN := false;
  headers_json JSON;
BEGIN
  -- Allow if user is admin via Supabase dashboard (use session_user not current_user)
  IF session_user IN ('postgres', 'supabase_admin') THEN
    RETURN true;
  END IF;

  -- Extract session token from PostgREST request headers (lower-cased keys)
  BEGIN
    headers_json := current_setting('request.headers', true)::json;
    session_token := NULLIF(headers_json->>'x-session-token', '');
  EXCEPTION WHEN OTHERS THEN
    session_token := NULL;
  END;

  -- If we have a session token, check it's valid and not expired
  IF session_token IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.sessions s
      WHERE s.session_token = session_token
      AND s.expires_at > now()
    ) INTO session_exists;

    RETURN session_exists;
  END IF;

  RETURN false;
END;
$$;