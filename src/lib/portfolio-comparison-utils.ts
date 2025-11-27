import { Asset, PortfolioSnapshot, FXRates, Currency, AssetClass } from '@/types/portfolio';

export interface AssetDelta {
  assetName: string;
  originCurrency: Currency;
  valueA: number;  // Value in origin currency for Portfolio A
  valueB: number;  // Value in origin currency for Portfolio B
  delta: number;   // valueB - valueA (in origin currency)
  deltaUSD: number; // Delta converted to USD (for display and sorting)
}

type ComparisonCategory = 'liquid' | 'private_equity' | 'real_estate';

const LIQUID_CLASSES: AssetClass[] = ['Cash', 'Fixed Income', 'Public Equity', 'Commodities & more'];
const PRIVATE_EQUITY_CLASSES: AssetClass[] = ['Private Equity'];
const REAL_ESTATE_CLASSES: AssetClass[] = ['Real Estate'];

function getAssetsByCategory(assets: Asset[], category: ComparisonCategory): Asset[] {
  let targetClasses: AssetClass[];
  
  switch (category) {
    case 'liquid':
      targetClasses = LIQUID_CLASSES;
      break;
    case 'private_equity':
      targetClasses = PRIVATE_EQUITY_CLASSES;
      break;
    case 'real_estate':
      targetClasses = REAL_ESTATE_CLASSES;
      break;
  }
  
  return assets.filter(asset => targetClasses.includes(asset.class));
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
