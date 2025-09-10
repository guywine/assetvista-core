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
  Currency,
  Beneficiary
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
export const FIXED_INCOME_SUBCLASSES: FixedIncomeSubClass[] = ['Money Market', 'Gov 1-2', 'Gov long', 'CPI linked', 'Corporate', 'REIT stock', 'Private Credit', 'Bank Deposit', 'none'];
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

// Beneficiaries
export const BENEFICIARIES: Beneficiary[] = ['Shimon', 'Hagit', 'Kids', 'Tom'];

// Entity to Beneficiary mapping
export const ENTITY_BENEFICIARY_MAP: Record<AccountEntity, Beneficiary> = {
  'Shimon': 'Shimon',
  'B Joel': 'Shimon',
  'Hagit': 'Hagit',
  'Guy': 'Kids',
  'Roy': 'Kids',
  'Roni': 'Kids',
  'SW2009': 'Kids',
  'Weintraub': 'Kids',
  'Tom': 'Tom'
};

// Account Banks by Entity
export const ACCOUNT_BANK_MAP: Record<AccountEntity, AccountBank[]> = {
  'Hagit': ['U bank', 'Leumi 1', 'Leumi 2', 'Julius Bär', 'Poalim', 'Poalim Phoenix'],
  'Guy': ['Poalim', 'Julius Bär'],
  'Roni': ['Julius Bär'],
  'Roy': ['Poalim', 'Julius Bär', 'etoro'],
  'SW2009': ['Poalim', 'Julius Bär'],
  'Weintraub': ['Poalim', 'Julius Bär'],
  'Shimon': ['U bank', 'Leumi', 'Julius Bär', 'Poalim', 'Poalim Phoenix'],
  'B Joel': ['Poalim', 'Julius Bär'],
  'Tom': ['Tom Trust'],
};

// All Banks
export const ACCOUNT_BANKS: AccountBank[] = [
  'U bank', 'Leumi 1', 'Leumi 2', 'Julius Bär', 'Poalim', 'Poalim Phoenix',
  'Leumi', 'etoro', 'Tom Trust'
];

