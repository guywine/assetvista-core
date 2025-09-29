import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  isChecking: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const logout = () => {
    localStorage.removeItem('app_session_token');
    localStorage.removeItem('app_session_expires');
    setIsAuthenticated(false);
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive",
    });
  };

  const login = async (password: string): Promise<boolean> => {
    setIsChecking(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-password', {
        body: { password }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        localStorage.setItem('app_session_token', data.sessionToken);
        localStorage.setItem('app_session_expires', data.expiresAt);
        setIsAuthenticated(true);
        toast({
          title: "Access Granted",
          description: "Welcome to your Portfolio Dashboard",
        });
        return true;
      } else {
        toast({
          title: "Access Denied",
          description: data.error || "Incorrect password",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Error",
        description: "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const validateSession = async () => {
    const sessionToken = localStorage.getItem('app_session_token');
    const expiresAt = localStorage.getItem('app_session_expires');
    
    if (sessionToken && expiresAt) {
      const now = new Date();
      const expiry = new Date(expiresAt);
      
      if (now < expiry) {
        try {
          const { data, error } = await supabase.rpc('is_authorized');
          
          if (error) {
            console.error('Session validation error:', error);
            logout();
            return;
          }
          
          if (data === true) {
            setIsAuthenticated(true);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to validate session:', error);
          logout();
        }
      } else {
        logout();
      }
    } else {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    validateSession();

    // Set up periodic validation every 5 minutes
    const intervalRef = setInterval(() => {
      if (isAuthenticated) {
        validateSession();
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalRef);
    };
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isChecking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}