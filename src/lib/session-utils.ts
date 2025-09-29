import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Checks if an error indicates session expiration by examining error patterns
 */
export function isSessionExpiredError(error: any): boolean {
  if (!error) return false;
  
  // Check for HTTP status codes indicating auth issues
  if (error.status === 401 || error.status === 403) {
    return true;
  }
  
  // Check for PostgreSQL RLS policy violations
  if (error.code === '42501') {
    return true;
  }
  
  // Check for PostgREST error messages
  if (error.message && error.message.includes('row-level security policy')) {
    return true;
  }
  
  // Check for PostgREST no-row results when one was expected (PGRST116)
  if (error.code === 'PGRST116' && error.details && error.details.includes('Results contain 0 rows')) {
    return true;
  }
  
  return false;
}

/**
 * Verifies if the current session is still valid
 */
export async function verifySession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_authorized');
    if (error) {
      console.debug('Session verification error:', error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.debug('Session verification failed:', error);
    return false;
  }
}

/**
 * Handles write operation errors by checking for session expiration
 * Returns true if session expired and logout was triggered, false otherwise
 */
export async function handleWriteError(error: any, clearSession: () => void): Promise<boolean> {
  console.debug('Checking error for session expiration:', error);
  
  // First check if error directly indicates session issues
  if (isSessionExpiredError(error)) {
    console.debug('Error indicates session expiration');
    clearSession();
    return true;
  }
  
  // For other errors, verify session is still valid
  const sessionValid = await verifySession();
  if (!sessionValid) {
    console.debug('Session verification failed, logging out');
    clearSession();
    return true;
  }
  
  return false;
}

/**
 * Hook that provides session expiration handling for database operations
 */
export function useSessionExpiration() {
  const { toast } = useToast();
  
  const handleSessionExpiration = async (clearSession: () => void) => {
    const sessionValid = await verifySession();
    
    if (!sessionValid) {
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