-- Fix authorization function: remove admin bypass and resolve column ambiguity
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_token TEXT;  -- Renamed from session_token to avoid column ambiguity
  session_exists BOOLEAN := false;
  headers_json JSON;
BEGIN
  -- Remove admin bypass - all users must authenticate via session token
  
  -- Extract session token from PostgREST request headers (lower-cased keys)
  BEGIN
    headers_json := current_setting('request.headers', true)::json;
    auth_token := NULLIF(headers_json->>'x-session-token', '');
  EXCEPTION WHEN OTHERS THEN
    auth_token := NULL;
  END;

  -- If we have a session token, check it's valid and not expired
  IF auth_token IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.sessions s
      WHERE s.session_token = auth_token
      AND s.expires_at > now()
    ) INTO session_exists;

    RETURN session_exists;
  END IF;

  RETURN false;
END;
$$;