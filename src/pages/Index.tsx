import { PasswordProtection } from '@/components/auth/PasswordProtection';
import { PortfolioDashboard } from '@/components/portfolio/PortfolioDashboard';

const Index = () => {
  return (
    <PasswordProtection>
      <PortfolioDashboard />
    </PasswordProtection>
  );
};

export default Index;
