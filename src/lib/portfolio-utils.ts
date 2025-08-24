import { Asset, AssetCalculations, FXRates, ViewCurrency, AssetClass, AccountEntity } from '@/types/portfolio';

export const ACCOUNT_BANK_MAP: Record<string, string[]> = {
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

export const CLASS_SUBCLASS_MAP = {
  'Public Equity': ['Big Tech', 'China', 'other'],
  'Private Equity': ['Initial', 'Near Future', 'Growth', 'none'],
  'Fixed Income': ['Money Market', 'Gov 1-2', 'Gov long', 'CPI linked', 'Corporate', 'REIT stock', 'none'],
  'Cash & other': ['Cash', 'Crypto', 'Commodities'],
};

export const DEFAULT_FX_RATES: FXRates = {
  'USD': { to_USD: 1.0, to_ILS: 3.65, last_updated: new Date().toISOString() },
  'ILS': { to_USD: 0.274, to_ILS: 1.0, last_updated: new Date().toISOString() },
  'EUR': { to_USD: 1.09, to_ILS: 3.98, last_updated: new Date().toISOString() },
  'CHF': { to_USD: 1.11, to_ILS: 4.05, last_updated: new Date().toISOString() },
  'CAD': { to_USD: 0.74, to_ILS: 2.70, last_updated: new Date().toISOString() },
  'HKD': { to_USD: 0.128, to_ILS: 0.467, last_updated: new Date().toISOString() },
};

export function calculateAssetValue(
  asset: Asset,
  fxRates: FXRates,
  viewCurrency: ViewCurrency
): AssetCalculations {
  // For Cash assets, price is optional and defaults to 1
  const price = asset.price ?? (asset.class === 'Cash & other' && asset.sub_class === 'Cash' ? 1 : 0);
  const rawBaseValue = asset.quantity * price;
  
  const fxRate = viewCurrency === 'USD' 
    ? fxRates[asset.origin_currency]?.to_USD || 1
    : fxRates[asset.origin_currency]?.to_ILS || 1;
    
  const convertedValue = rawBaseValue * fxRate;
  
  const displayValue = asset.class === 'Private Equity' 
    ? convertedValue * (asset.factor || 1.0)
    : convertedValue;
    
  return {
    raw_base_value: rawBaseValue,
    converted_value: convertedValue,
    display_value: displayValue,
    percentage_of_scope: 0, // Will be calculated based on scope
  };
}

export function calculatePercentages(
  assets: Asset[],
  calculations: Map<string, AssetCalculations>
): Map<string, AssetCalculations> {
  const totalValue = assets.reduce((sum, asset) => {
    const calc = calculations.get(asset.id);
    return sum + (calc?.display_value || 0);
  }, 0);
  
  const updatedCalculations = new Map(calculations);
  
  assets.forEach(asset => {
    const calc = calculations.get(asset.id);
    if (calc) {
      updatedCalculations.set(asset.id, {
        ...calc,
        percentage_of_scope: totalValue > 0 ? (calc.display_value / totalValue) * 100 : 0,
      });
    }
  });
  
  return updatedCalculations;
}

export function formatCurrency(amount: number, currency: ViewCurrency): string {
  const symbol = currency === 'USD' ? '$' : '₪';
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getSubClassOptions(assetClass: AssetClass): string[] {
  return CLASS_SUBCLASS_MAP[assetClass] || [];
}

export function getBankOptions(entity: AccountEntity): string[] {
  return ACCOUNT_BANK_MAP[entity] || [];
}

export function validateAsset(asset: Partial<Asset>): string[] {
  const errors: string[] = [];
  
  if (!asset.name?.trim()) errors.push('Name is required');
  if (!asset.class) errors.push('Asset class is required');
  if (!asset.account_entity) errors.push('Account entity is required');
  if (!asset.account_bank) errors.push('Account bank is required');
  if (!asset.origin_currency) errors.push('Currency is required');
  if (typeof asset.quantity !== 'number' || asset.quantity < 0) errors.push('Quantity must be non-negative');
  
  // Price validation: required for all except Cash assets
  if (asset.class === 'Cash & other' && asset.sub_class === 'Cash') {
    // Price is optional for Cash assets, defaults to 1
  } else {
    if (typeof asset.price !== 'number' || asset.price < 0) errors.push('Price must be non-negative');
  }
  
  if (asset.class === 'Private Equity' && asset.factor !== undefined) {
    if (asset.factor < 0 || asset.factor > 1) errors.push('Factor must be between 0 and 1');
  }
  
  if (asset.account_entity && asset.account_bank) {
    const validBanks = getBankOptions(asset.account_entity);
    if (!validBanks.includes(asset.account_bank)) {
      errors.push(`Invalid bank for entity ${asset.account_entity}`);
    }
  }
  
  return errors;
}