-- Create a function to set session configuration
CREATE OR REPLACE FUNCTION public.set_session_token(token TEXT)
RETURNS void AS $$
BEGIN
  -- Set the session token in the current session
  PERFORM set_config('app.session_token', token, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;