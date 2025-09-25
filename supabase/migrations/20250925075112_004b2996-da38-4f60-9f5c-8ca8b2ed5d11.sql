-- Step 1: Create sessions table to track valid session tokens
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Step 2: Create session validation function
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Update RLS policies for all tables to use the authorization function

-- Update app_config policies
DROP POLICY IF EXISTS "Allow all operations on app_config" ON public.app_config;
CREATE POLICY "Authorized access to app_config" ON public.app_config
  FOR ALL USING (public.is_authorized());

-- Update assets policies  
DROP POLICY IF EXISTS "Allow all operations on assets" ON public.assets;
CREATE POLICY "Authorized access to assets" ON public.assets
  FOR ALL USING (public.is_authorized());

-- Update asset_liquidation_settings policies
DROP POLICY IF EXISTS "Allow all operations on asset_liquidation_settings" ON public.asset_liquidation_settings;
CREATE POLICY "Authorized access to asset_liquidation_settings" ON public.asset_liquidation_settings
  FOR ALL USING (public.is_authorized());

-- Update portfolio_snapshots policies
DROP POLICY IF EXISTS "Allow all operations on portfolio_snapshots" ON public.portfolio_snapshots;  
CREATE POLICY "Authorized access to portfolio_snapshots" ON public.portfolio_snapshots
  FOR ALL USING (public.is_authorized());

-- Keep fx_rates policies as they are (public read access is fine for FX rates)

-- Sessions table policies (only authorized users can manage sessions)
CREATE POLICY "Authorized access to sessions" ON public.sessions
  FOR ALL USING (public.is_authorized());

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;