import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSessionAuth() {
  useEffect(() => {
    // Set up session token for Supabase requests using RPC
    const setupSession = async () => {
      const sessionToken = localStorage.getItem('app_session_token');
      const expiresAt = localStorage.getItem('app_session_expires');
      
      if (sessionToken && expiresAt) {
        const now = new Date();
        const expiry = new Date(expiresAt);
        
        if (now < expiry) {
          // Set session token using a database function call
          try {
            await supabase.rpc('set_config', {
              setting_name: 'app.session_token',
              setting_value: sessionToken,
              is_local: true
            });
          } catch (error) {
            console.error('Failed to set session token:', error);
          }
        } else {
          // Clear expired session
          localStorage.removeItem('app_session_token');
          localStorage.removeItem('app_session_expires');
        }
      }
    };

    setupSession();
  }, []);

  const setSessionToken = async (sessionToken: string, expiresAt: string) => {
    localStorage.setItem('app_session_token', sessionToken);
    localStorage.setItem('app_session_expires', expiresAt);
    
    // Set session token in database session
    try {
      await supabase.rpc('set_config', {
        setting_name: 'app.session_token',
        setting_value: sessionToken,
        is_local: true
      });
    } catch (error) {
      console.error('Failed to set session token:', error);
    }
  };

  const clearSession = () => {
    localStorage.removeItem('app_session_token');
    localStorage.removeItem('app_session_expires');
  };

  return { setSessionToken, clearSession };
}