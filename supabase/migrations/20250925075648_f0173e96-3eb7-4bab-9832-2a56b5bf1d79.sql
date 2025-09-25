-- Fix security warnings by setting search_path on functions

-- Update is_authorized function to set search_path
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow if user is admin via Supabase dashboard (has postgres role)
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN true;
  END IF;
  
  -- Check for valid session token in request headers
  -- The session token will be passed via custom headers from the frontend
  DECLARE
    session_token TEXT;
    session_exists BOOLEAN := false;
  BEGIN
    -- Get session token from current_setting (will be set by edge function)
    BEGIN
      session_token := current_setting('app.session_token', true);
    EXCEPTION WHEN OTHERS THEN
      session_token := null;
    END;
    
    -- If we have a session token, check if it's valid and not expired
    IF session_token IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.sessions 
        WHERE session_token = is_authorized.session_token 
        AND expires_at > now()
      ) INTO session_exists;
      
      RETURN session_exists;
    END IF;
    
    RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update set_session_token function to set search_path
CREATE OR REPLACE FUNCTION public.set_session_token(token TEXT)
RETURNS void AS $$
BEGIN
  -- Set the session token for the current database session
  PERFORM set_config('app.session_token', token, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update cleanup_expired_sessions function to set search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;