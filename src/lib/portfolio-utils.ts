import { Asset, AssetCalculations, FXRates, ViewCurrency, AssetClass, AccountEntity, FilterCriteria } from '@/types/portfolio';
import { ACCOUNT_BANK_MAP, CLASS_SUBCLASS_MAP } from '@/constants/portfolio';
import { addDays, parseISO, isBefore } from 'date-fns';

export function calculateAssetValue(
  asset: Asset,
  fxRates: FXRates,
  viewCurrency: ViewCurrency
): AssetCalculations {
  // For Cash assets, price is optional and defaults to 1
  const price = asset.price ?? (asset.class === 'Cash' ? 1 : 0);
  const rawBaseValue = asset.quantity * price;
  
  // Get the correct exchange rate based on view currency
  let fxRate = 1;
  if (viewCurrency === 'USD') {
    // For USD view, calculate rate as: (origin_to_ILS) / (USD_to_ILS)
    const originToILS = fxRates[asset.origin_currency]?.to_ILS || 1;
    const usdToILS = fxRates['USD']?.to_ILS || 1;
    fxRate = originToILS / usdToILS;
  } else { // ILS
    fxRate = fxRates[asset.origin_currency]?.to_ILS || 1;
  }
  
  console.log(`Asset: ${asset.name}, Origin: ${asset.origin_currency}, View: ${viewCurrency}, Rate: ${fxRate}, Raw: ${rawBaseValue}`);
    
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

export function calculateWeightedYTW(
  assets: Asset[],
  calculations: Map<string, AssetCalculations>
): number {
  const fixedIncomeAssets = assets.filter(asset => asset.class === 'Fixed Income' && asset.ytw !== undefined);
  
  if (fixedIncomeAssets.length === 0) return 0;
  
  const totalValue = fixedIncomeAssets.reduce((sum, asset) => {
    const calc = calculations.get(asset.id);
    return sum + (calc?.display_value || 0);
  }, 0);
  
  if (totalValue === 0) return 0;
  
  const weightedYTW = fixedIncomeAssets.reduce((sum, asset) => {
    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;
    return sum + asset.ytw! * value;
  }, 0);
  
  return weightedYTW / totalValue;
}

export function validateAsset(asset: Partial<Asset>): string[] {
  const errors: string[] = [];
  
  // Name validation: required for all except Cash assets
  if (asset.class !== 'Cash') {
    if (!asset.name?.trim()) errors.push('Name is required');
  }
  if (!asset.class) errors.push('Asset class is required');
  if (!asset.account_entity) errors.push('Account entity is required');
  if (!asset.account_bank) errors.push('Account bank is required');
  if (!asset.origin_currency) errors.push('Currency is required');
  if (typeof asset.quantity !== 'number' || asset.quantity < 0) errors.push('Quantity must be non-negative');
  
  // Validate that Cash assets have matching sub_class and origin_currency
  if (asset.class === 'Cash' && asset.sub_class !== asset.origin_currency) {
    errors.push('Cash assets must have matching sub-class and currency');
  }
  
  // Price validation: required for all except Cash assets
  if (asset.class === 'Cash') {
    // Price is optional for Cash assets, defaults to 1
    if (typeof asset.price !== 'number' || asset.price <= 0) {
      // Set default price to 1 for cash assets if not provided or invalid
      asset.price = 1;
    }
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

export function filterAssetsByFilters(assets: Asset[], filters: FilterCriteria): Asset[] {
  return assets.filter(asset => {
    // Include filters - asset must match if specified
    if (filters.class && !filters.class.includes(asset.class)) return false;
    if (filters.sub_class && !filters.sub_class.includes(asset.sub_class)) return false;
    if (filters.account_entity && !filters.account_entity.includes(asset.account_entity)) return false;
    if (filters.account_bank && !filters.account_bank.includes(asset.account_bank)) return false;
    if (filters.origin_currency && !filters.origin_currency.includes(asset.origin_currency)) return false;
    if (filters.beneficiary && !filters.beneficiary.includes(asset.beneficiary)) return false;
    
    // Exclude filters - asset must NOT match any if specified
    if (filters.exclude_class && filters.exclude_class.includes(asset.class)) return false;
    if (filters.exclude_sub_class && filters.exclude_sub_class.includes(asset.sub_class)) return false;
    if (filters.exclude_account_entity && filters.exclude_account_entity.includes(asset.account_entity)) return false;
    if (filters.exclude_account_bank && filters.exclude_account_bank.includes(asset.account_bank)) return false;
    if (filters.exclude_origin_currency && filters.exclude_origin_currency.includes(asset.origin_currency)) return false;
    if (filters.exclude_beneficiary && filters.exclude_beneficiary.includes(asset.beneficiary)) return false;
    
    // For maturity date filters, exclude assets without maturity dates
    if (filters.maturity_date_from || filters.maturity_date_to) {
      if (!asset.maturity_date) return false;
    }
    
    if (filters.maturity_date_from && asset.maturity_date) {
      if (asset.maturity_date < filters.maturity_date_from) return false;
    }
    if (filters.maturity_date_to && asset.maturity_date) {
      if (asset.maturity_date > filters.maturity_date_to) return false;
    }
    
    return true;
  });
}

export function calculatePEPrice(
  companyValue: number,
  holdingPercentage: number,
  quantity: number
): number {
  if (!companyValue || !holdingPercentage || !quantity || quantity <= 0) {
    return 0;
  }
  
  const calculatedPrice = (companyValue * (holdingPercentage / 100)) / quantity;
  return Math.round(calculatedPrice);
}

export function isMaturityWithinYear(maturityDate: string | undefined): boolean {
  if (!maturityDate || maturityDate === 'none') return false;
  
  try {
    const maturity = parseISO(maturityDate);
    const oneYearFromNow = addDays(new Date(), 365);
    return isBefore(maturity, oneYearFromNow);
  } catch {
    return false;
  }
}