import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Checks if the last database operation failed due to session expiration
 * by examining the configuration flags set by is_authorized()
 */
export async function checkSessionExpiration(): Promise<boolean> {
  try {
    // Use RPC to get session status flags from the database
    const { data: sessionExpired } = await supabase
      .rpc('get_config', { 
        config_name: 'app.session_expired' 
      });
    
    return sessionExpired === 'true';
  } catch (error) {
    // If we can't check the flag, assume no session expiration
    return false;
  }
}

/**
 * Hook that provides session expiration handling for database operations
 */
export function useSessionExpiration() {
  const { toast } = useToast();
  
  const handleSessionExpiration = async (clearSession: () => void) => {
    const isExpired = await checkSessionExpiration();
    
    if (isExpired) {
      clearSession();
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      return true;
    }
    
    return false;
  };

  return { handleSessionExpiration };
}

/**
 * Creates an RPC function to get configuration values
 * This will be used to check session status flags
 */
export const createGetConfigFunction = `
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
`;