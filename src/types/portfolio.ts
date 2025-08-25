export type AssetClass = 'Public Equity' | 'Private Equity' | 'Fixed Income' | 'Cash' | 'Commodities & more' | 'Real Estate';

export type PublicEquitySubClass = 'Big Tech' | 'China' | 'other';
export type PrivateEquitySubClass = 'Initial' | 'Near Future' | 'Growth' | 'none';
export type FixedIncomeSubClass = 'Money Market' | 'Gov 1-2' | 'Gov long' | 'CPI linked' | 'Corporate' | 'REIT stock' | 'none';
export type CashSubClass = Currency;
export type CommoditiesMoreSubClass = 'Cryptocurrency' | 'Commodities';
export type RealEstateSubClass = 'Living' | 'Tel-Aviv' | 'Abroad';

export type SubClass = PublicEquitySubClass | PrivateEquitySubClass | FixedIncomeSubClass | CashSubClass | CommoditiesMoreSubClass | RealEstateSubClass;

export type AccountEntity = 'Roy' | 'Roni' | 'Guy' | 'Shimon' | 'Hagit' | 'SW2009' | 'Weintraub' | 'B Joel' | 'Tom';

export type AccountBank = 
  | 'U bank' | 'Leumi 1' | 'Leumi 2' | 'Julius Bär' | 'Poalim' | 'Poalim Phoenix'
  | 'Leumi' | 'etoro' | 'Tom Trust';

export type Currency = 'ILS' | 'USD' | 'CHF' | 'EUR' | 'CAD' | 'HKD';

export interface Asset {
  id: string;
  name: string;
  class: AssetClass;
  sub_class: SubClass;
  ISIN?: string;
  account_entity: AccountEntity;
  account_bank: AccountBank;
  origin_currency: Currency;
  quantity: number;
  price?: number; // Optional for Cash assets
  factor?: number; // 0-1, Private Equity only
  maturity_date?: string; // Fixed Income only
  ytw?: number; // Fixed Income only, stored as decimal
  created_at: string;
  updated_at: string;
}

export interface FXRates {
  [key: string]: {
    to_USD: number;
    to_ILS: number;
    last_updated: string;
  };
}

export interface Transaction {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  asset_id: string;
  quantity: number;
  price: number;
  notes?: string;
  created_at: string;
}

export interface Snapshot {
  id: string;
  name: string;
  description: string;
  saved_at: string;
  assets: Asset[];
  fx_rates: FXRates;
}

export interface PortfolioSnapshot {
  id: string;
  name: string;
  description?: string;
  snapshot_date: string;
  assets: Asset[];
  fx_rates: FXRates;
  total_value_usd: number;
  private_equity_value_usd: number;
  public_equity_value_usd: number;
  fixed_income_value_usd: number;
  created_at: string;
}

export type ViewCurrency = 'USD' | 'ILS';

export interface AssetCalculations {
  raw_base_value: number;
  converted_value: number;
  display_value: number;
  percentage_of_scope: number;
}

export interface FilterCriteria {
  class?: AssetClass[];
  sub_class?: SubClass[];
  account_entity?: AccountEntity[];
  account_bank?: AccountBank[];
  origin_currency?: Currency[];
  maturity_date_from?: string;
  maturity_date_to?: string;
  exclude_class?: AssetClass[];
  exclude_sub_class?: SubClass[];
  exclude_account_entity?: AccountEntity[];
  exclude_account_bank?: AccountBank[];
  exclude_origin_currency?: Currency[];
}

export interface GroupBy {
  fields: (keyof Asset)[];
}

export interface GroupedAssets {
  key: string;
  assets: Asset[];
  aggregates: {
    totalValue: number;
    assetCount: number;
  };
}

export interface Summary {
  holdings_by_class: Array<{
    class: AssetClass;
    count: number;
    value: number;
    percentage: number;
  }>;
  holdings_by_entity: Array<{
    entity: AccountEntity;
    value: number;
    percentage: number;
  }>;
  top_positions: Array<{
    name: string;
    class: AssetClass;
    sub_class: SubClass;
    value: number;
    percentage: number;
  }>;
  fixed_income_ytw: {
    weighted_average: number;
    by_subclass: Array<{
      sub_class: FixedIncomeSubClass;
      weighted_ytw: number;
      total_value: number;
    }>;
  };
}