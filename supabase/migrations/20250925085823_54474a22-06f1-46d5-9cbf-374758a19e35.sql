-- Fix security leak: Change session token scope to transaction-only
CREATE OR REPLACE FUNCTION public.set_session_token(token TEXT)
RETURNS void AS $$
BEGIN
  -- Set the session token for the current transaction only (true = transaction scope)
  PERFORM set_config('app.session_token', token, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;