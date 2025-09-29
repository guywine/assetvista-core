-- Create RPC function to get configuration values for session checking
CREATE OR REPLACE FUNCTION public.get_config(config_name text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN current_setting(config_name, true);
END;
$$;