import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

export function PasswordProtection({ children }: PasswordProtectionProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);

    // Simple password check
    const appPassword = import.meta.env.VITE_APP_PASSWORD;
    if (password === appPassword) {
      setIsAuthenticated(true);
      toast({
        title: "Access Granted",
        description: "Welcome to your Portfolio Dashbord",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password",
        variant: "destructive",
      });
    }

    setIsChecking(false);
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-financial-primary to-financial-primary/70 bg-clip-text text-transparent">
            Zaza Portfolio Dashbord
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