-- Enhance is_authorized function to set session status flags
CREATE OR REPLACE FUNCTION public.is_authorized()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  auth_token TEXT;
  session_exists BOOLEAN := false;
  headers_json JSON;
BEGIN
  -- Clear any previous session flags
  PERFORM set_config('app.session_expired', '', true);
  PERFORM set_config('app.no_session', '', true);
  
  -- Extract session token from PostgREST request headers (lower-cased keys)
  BEGIN
    headers_json := current_setting('request.headers', true)::json;
    auth_token := NULLIF(headers_json->>'x-session-token', '');
  EXCEPTION WHEN OTHERS THEN
    auth_token := NULL;
  END;

  -- If no session token provided
  IF auth_token IS NULL THEN
    PERFORM set_config('app.no_session', 'true', true);
    RETURN false;
  END IF;

  -- Check if session token exists and is valid
  SELECT EXISTS(
    SELECT 1 FROM public.sessions s
    WHERE s.session_token = auth_token
    AND s.expires_at > now()
  ) INTO session_exists;

  -- If session token exists but is expired or invalid
  IF NOT session_exists THEN
    -- Check if token exists but is expired
    IF EXISTS(SELECT 1 FROM public.sessions s WHERE s.session_token = auth_token) THEN
      PERFORM set_config('app.session_expired', 'true', true);
    ELSE
      PERFORM set_config('app.no_session', 'true', true);
    END IF;
    RETURN false;
  END IF;

  RETURN true;
END;
$function$