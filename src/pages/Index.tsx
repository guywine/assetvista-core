import { AuthProvider } from '@/contexts/AuthContext';
import { PasswordProtection } from '@/components/auth/PasswordProtection';
import { PortfolioDashboard } from '@/components/portfolio/PortfolioDashboard';

const Index = () => {
  return (
    <AuthProvider>
      <PasswordProtection>
        <PortfolioDashboard />
      </PasswordProtection>
    </AuthProvider>
  );
};

export default Index;
