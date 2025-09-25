-- Create function to set session token in the current session
CREATE OR REPLACE FUNCTION public.set_session_token(token TEXT)
RETURNS void AS $$
BEGIN
  -- Set the session token for the current database session
  PERFORM set_config('app.session_token', token, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;