import { PasswordProtection } from '@/components/auth/PasswordProtection';
import { PortfolioDashboard } from '@/components/portfolio/PortfolioDashboard';
import { Asset } from '@/types/portfolio';
import { generateId } from '@/lib/portfolio-utils';
import { getBeneficiaryFromEntity } from '@/lib/beneficiary-utils';

// Sample data for demonstration
const sampleAssets: Asset[] = [
  {
    id: generateId(),
    name: 'Apple Inc.',
    class: 'Public Equity',
    sub_class: 'Big Tech',
    ISIN: 'US0378331005',
    account_entity: 'Roy',
    account_bank: 'Julius Bär',
    beneficiary: getBeneficiaryFromEntity('Roy'),
    origin_currency: 'USD',
    quantity: 100,
    price: 175.50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: 'US Treasury 10Y',
    class: 'Fixed Income',
    sub_class: 'Gov long',
    ISIN: 'US912828XG48',
    account_entity: 'Hagit',
    account_bank: 'Julius Bär',
    beneficiary: getBeneficiaryFromEntity('Hagit'),
    origin_currency: 'USD',
    quantity: 10000,
    price: 98.75,
    ytw: 4.25,
    maturity_date: '2034-02-15',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: 'Tech Venture Fund III',
    class: 'Private Equity',
    sub_class: 'Growth',
    account_entity: 'SW2009',
    account_bank: 'Poalim',
    beneficiary: getBeneficiaryFromEntity('SW2009'),
    origin_currency: 'USD',
    quantity: 1,
    price: 500000,
    factor: 0.75,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const Index = () => {
  return (
    <PasswordProtection>
      <PortfolioDashboard initialAssets={sampleAssets} />
    </PasswordProtection>
  );
};

export default Index;
