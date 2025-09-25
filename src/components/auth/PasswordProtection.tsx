import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

export function PasswordProtection({ children }: PasswordProtectionProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  // Check for existing session on component mount
  useEffect(() => {
    const sessionToken = localStorage.getItem('app_session_token');
    const expiresAt = localStorage.getItem('app_session_expires');
    
    if (sessionToken && expiresAt) {
      const now = new Date();
      const expiry = new Date(expiresAt);
      
      if (now < expiry) {
        setIsAuthenticated(true);
      } else {
        // Clear expired session
        localStorage.removeItem('app_session_token');
        localStorage.removeItem('app_session_expires');
      }
    }
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);

    try {
      // Call the edge function to validate password
      const { data, error } = await supabase.functions.invoke('validate-password', {
        body: { password }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        // Store session information
        localStorage.setItem('app_session_token', data.sessionToken);
        localStorage.setItem('app_session_expires', data.expiresAt);
        
        setIsAuthenticated(true);
        toast({
          title: "Access Granted",
          description: "Welcome to your Portfolio Dashboard",
        });
      } else {
        toast({
          title: "Access Denied",
          description: data.error || "Incorrect password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Error",
        description: "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-financial-primary to-financial-primary/70 bg-clip-text text-transparent">
            Zaza Portfolio Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit"
              className="w-full"
              disabled={isChecking || !password}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Access Application'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}