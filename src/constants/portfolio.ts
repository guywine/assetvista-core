import type { 
  AssetClass, 
  PublicEquitySubClass, 
  PrivateEquitySubClass, 
  FixedIncomeSubClass, 
  CashSubClass, 
  CommoditiesMoreSubClass, 
  RealEstateSubClass,
  AccountEntity,
  AccountBank,
  Currency
} from '@/types/portfolio';

// Currencies
export const CURRENCIES: Currency[] = ['ILS', 'USD', 'CHF', 'EUR', 'CAD', 'HKD'];

// Asset Classes
export const ASSET_CLASSES: AssetClass[] = [
  'Public Equity',
  'Private Equity', 
  'Fixed Income',
  'Cash',
  'Commodities & more',
  'Real Estate'
];

// Sub-class mappings
export const PUBLIC_EQUITY_SUBCLASSES: PublicEquitySubClass[] = ['Big Tech', 'China', 'other'];
export const PRIVATE_EQUITY_SUBCLASSES: PrivateEquitySubClass[] = ['Initial', 'Near Future', 'Growth', 'none'];
export const FIXED_INCOME_SUBCLASSES: FixedIncomeSubClass[] = ['Money Market', 'Gov 1-2', 'Gov long', 'CPI linked', 'Corporate', 'REIT stock', 'none'];
export const CASH_SUBCLASSES: CashSubClass[] = CURRENCIES;
export const COMMODITIES_MORE_SUBCLASSES: CommoditiesMoreSubClass[] = ['Cryptocurrency', 'Commodities'];
export const REAL_ESTATE_SUBCLASSES: RealEstateSubClass[] = ['Living', 'Tel-Aviv', 'Abroad'];

export const CLASS_SUBCLASS_MAP: Record<AssetClass, string[]> = {
  'Public Equity': PUBLIC_EQUITY_SUBCLASSES,
  'Private Equity': PRIVATE_EQUITY_SUBCLASSES,
  'Fixed Income': FIXED_INCOME_SUBCLASSES,
  'Cash': CASH_SUBCLASSES,
  'Commodities & more': COMMODITIES_MORE_SUBCLASSES,
  'Real Estate': REAL_ESTATE_SUBCLASSES,
};

// Account Entities
export const ACCOUNT_ENTITIES: AccountEntity[] = [
  'Roy', 'Roni', 'Guy', 'Shimon', 'Hagit', 'SW2009', 'Weintraub', 'B Joel', 'Tom'
];

// Account Banks by Entity
export const ACCOUNT_BANK_MAP: Record<AccountEntity, AccountBank[]> = {
  'Roy': ['U bank', 'Leumi 1', 'Leumi 2', 'Julius Bär'],
  'Roni': ['Poalim', 'Poalim Phoenix'],
  'Guy': ['Leumi'],
  'Shimon': ['etoro'],
  'Hagit': ['Leumi'],
  'SW2009': ['Leumi'],
  'Weintraub': ['Leumi'],
  'B Joel': ['Leumi'],
  'Tom': ['Tom Trust'],
};

// All Banks
export const ACCOUNT_BANKS: AccountBank[] = [
  'U bank', 'Leumi 1', 'Leumi 2', 'Julius Bär', 'Poalim', 'Poalim Phoenix',
  'Leumi', 'etoro', 'Tom Trust'
];


// Default FX Rates
export const DEFAULT_FX_RATES = {
  ILS: { to_USD: 0.27, to_ILS: 1, last_updated: '2024-01-01' },
  USD: { to_USD: 1, to_ILS: 3.70, last_updated: '2024-01-01' },
  CHF: { to_USD: 1.10, to_ILS: 4.07, last_updated: '2024-01-01' },
  EUR: { to_USD: 1.08, to_ILS: 4.00, last_updated: '2024-01-01' },
  CAD: { to_USD: 0.74, to_ILS: 2.74, last_updated: '2024-01-01' },
  HKD: { to_USD: 0.13, to_ILS: 0.48, last_updated: '2024-01-01' },
};