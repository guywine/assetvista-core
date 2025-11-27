import { Asset, PortfolioSnapshot, FXRates, Currency, AssetClass } from '@/types/portfolio';

export interface AssetDelta {
  assetName: string;
  originCurrency: Currency;
  valueA: number;  // Value in origin currency for Portfolio A
  valueB: number;  // Value in origin currency for Portfolio B
  delta: number;   // valueB - valueA (in origin currency)
  deltaUSD: number; // Delta converted to USD (for display and sorting)
}

export interface PositionChange {
  assetName: string;
  assetClass: AssetClass;
  subClass: string;
  originCurrency: Currency;
  value: number;
  valueUSD: number;
  changeType: 'new' | 'deleted';
}

type ComparisonCategory = 'cash' | 'public_equity' | 'fixed_income' | 'private_equity' | 'real_estate';

// Cash-like assets (Cash class + Bank Deposit + Money Market sub-classes)
const CASH_LIKE_SUBCLASSES: string[] = ['Bank Deposit', 'Money Market'];

// Fixed Income subclasses that are NOT cash-like
const NON_CASH_FIXED_INCOME_SUBCLASSES: string[] = ['Gov 1-2', 'Gov long', 'CPI linked', 'Corporate', 'REIT stock', 'Private Credit', 'none'];

const PRIVATE_EQUITY_CLASSES: AssetClass[] = ['Private Equity'];
const REAL_ESTATE_CLASSES: AssetClass[] = ['Real Estate'];

function getAssetsByCategory(assets: Asset[], category: ComparisonCategory): Asset[] {
  switch (category) {
    case 'cash':
      // Cash class + Bank Deposit + Money Market sub-classes
      return assets.filter(asset => 
        asset.class === 'Cash' || 
        (asset.class === 'Fixed Income' && CASH_LIKE_SUBCLASSES.includes(asset.sub_class))
      );
    
    case 'public_equity':
      // Public Equity class only
      return assets.filter(asset => asset.class === 'Public Equity');
    
    case 'fixed_income':
      // Fixed Income (excluding Bank Deposit and Money Market)
      return assets.filter(asset => 
        asset.class === 'Fixed Income' && NON_CASH_FIXED_INCOME_SUBCLASSES.includes(asset.sub_class)
      );
    
    case 'private_equity':
      return assets.filter(asset => PRIVATE_EQUITY_CLASSES.includes(asset.class));
    
    case 'real_estate':
      return assets.filter(asset => REAL_ESTATE_CLASSES.includes(asset.class));
  }
}

function calculateAssetValue(asset: Asset): number {
  const price = asset.price || 1; // Default to 1 for Cash
  const quantity = asset.quantity;
  const factor = asset.factor || 1;
  
  if (asset.class === 'Private Equity' || asset.class === 'Real Estate') {
    return quantity * price * factor;
  }
  
  return quantity * price;
}

export function aggregateAssetsByName(
  assets: Asset[], 
  category: ComparisonCategory
): Map<string, { currency: Currency; totalValue: number }> {
  const categoryAssets = getAssetsByCategory(assets, category);
  const aggregated = new Map<string, { currency: Currency; totalValue: number }>();
  
  for (const asset of categoryAssets) {
    const value = calculateAssetValue(asset);
    const existing = aggregated.get(asset.name);
    
    if (existing) {
      // If same asset name exists, sum the values (assuming same currency)
      existing.totalValue += value;
    } else {
      aggregated.set(asset.name, {
        currency: asset.origin_currency,
        totalValue: value
      });
    }
  }
  
  return aggregated;
}

export function calculatePortfolioDeltas(
  portfolioA: PortfolioSnapshot,
  portfolioB: PortfolioSnapshot,
  currentFxRates: FXRates,
  category: ComparisonCategory
): AssetDelta[] {
  const assetsA = aggregateAssetsByName(portfolioA.assets as Asset[], category);
  const assetsB = aggregateAssetsByName(portfolioB.assets as Asset[], category);
  
  // Get all unique asset names from both portfolios
  const allAssetNames = new Set([...assetsA.keys(), ...assetsB.keys()]);
  
  const deltas: AssetDelta[] = [];
  
  for (const assetName of allAssetNames) {
    const assetDataA = assetsA.get(assetName);
    const assetDataB = assetsB.get(assetName);
    
    // Determine the currency (prefer the one that exists)
    const currency = assetDataA?.currency || assetDataB?.currency || 'USD';
    
    const valueA = assetDataA?.totalValue || 0;
    const valueB = assetDataB?.totalValue || 0;
    const delta = valueB - valueA;
    
    // Convert delta to USD using the same logic as main portfolio
    const originToILS = currentFxRates[currency]?.to_ILS || 1;
    const usdToILS = currentFxRates['USD']?.to_ILS || 1;
    const deltaUSD = delta * (originToILS / usdToILS);
    
    deltas.push({
      assetName,
      originCurrency: currency,
      valueA,
      valueB,
      delta,
      deltaUSD: deltaUSD  // Store actual signed value
    });
  }
  
  return deltas;
}

export function getTopDeltas(deltas: AssetDelta[], limit: number): AssetDelta[] {
  // Sort by absolute USD value descending
  const sorted = [...deltas].sort((a, b) => Math.abs(b.deltaUSD) - Math.abs(a.deltaUSD));
  
  // Return top N
  return sorted.slice(0, limit);
}

export function findNewAndDeletedPositions(
  portfolioA: PortfolioSnapshot,  // Earlier portfolio
  portfolioB: PortfolioSnapshot,  // Later portfolio
  currentFxRates: FXRates
): PositionChange[] {
  const assetsA = portfolioA.assets as Asset[];
  const assetsB = portfolioB.assets as Asset[];
  
  // Filter out cash-like assets from both portfolios
  const filteredA = assetsA.filter(asset => 
    !(asset.class === 'Cash' || 
      (asset.class === 'Fixed Income' && CASH_LIKE_SUBCLASSES.includes(asset.sub_class)))
  );
  
  const filteredB = assetsB.filter(asset => 
    !(asset.class === 'Cash' || 
      (asset.class === 'Fixed Income' && CASH_LIKE_SUBCLASSES.includes(asset.sub_class)))
  );
  
  const assetNamesA = new Set(filteredA.map(a => a.name));
  const assetNamesB = new Set(filteredB.map(a => a.name));
  
  const changes: PositionChange[] = [];
  
  // Find new positions (in B but not in A)
  for (const asset of filteredB) {
    if (!assetNamesA.has(asset.name)) {
      const value = calculateAssetValue(asset);
      const originToILS = currentFxRates[asset.origin_currency]?.to_ILS || 1;
      const usdToILS = currentFxRates['USD']?.to_ILS || 1;
      const valueUSD = value * (originToILS / usdToILS);
      
      changes.push({
        assetName: asset.name,
        assetClass: asset.class,
        subClass: asset.sub_class,
        originCurrency: asset.origin_currency,
        value,
        valueUSD,
        changeType: 'new'
      });
    }
  }
  
  // Find deleted positions (in A but not in B)
  for (const asset of filteredA) {
    if (!assetNamesB.has(asset.name)) {
      const value = calculateAssetValue(asset);
      const originToILS = currentFxRates[asset.origin_currency]?.to_ILS || 1;
      const usdToILS = currentFxRates['USD']?.to_ILS || 1;
      const valueUSD = value * (originToILS / usdToILS);
      
      changes.push({
        assetName: asset.name,
        assetClass: asset.class,
        subClass: asset.sub_class,
        originCurrency: asset.origin_currency,
        value,
        valueUSD,
        changeType: 'deleted'
      });
    }
  }
  
  // Sort by absolute USD value descending
  return changes.sort((a, b) => Math.abs(b.valueUSD) - Math.abs(a.valueUSD));
}

export function formatCurrencyValue(value: number, currency: Currency): string {
  const currencySymbols: Record<Currency, string> = {
    'USD': '$',
    'ILS': '₪',
    'EUR': '€',
    'GBP': '£',
    'CHF': 'CHF',
    'CAD': 'C$',
    'HKD': 'HK$'
  };
  
  const symbol = currencySymbols[currency] || currency;
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  } else if (absValue >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(0)}K`;
  } else {
    return `${symbol}${value.toFixed(0)}`;
  }
}
