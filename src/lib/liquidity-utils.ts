import type { Asset, FXRates, Beneficiary, ViewCurrency } from '@/types/portfolio';
import { calculateAssetValue } from '@/lib/portfolio-utils';
import { BENEFICIARIES } from '@/constants/portfolio';

// Liquidity Categories
export const LIQUIDITY_CATEGORIES = [
  'Cash',
  'Bonds',
  'Equities - Liquid',
  'Equities - Limited Liquidity',
  'Funds',
  'Real Estate',
  'Private Equity'
] as const;

export type LiquidityCategory = typeof LIQUIDITY_CATEGORIES[number];

// Category definitions (for notes display)
export const LIQUIDITY_CATEGORY_DESCRIPTIONS: Record<LiquidityCategory, string> = {
  'Cash': 'Cash class + Bank Deposit + Money Market (Fixed Income)',
  'Bonds': 'Fixed Income excluding Bank Deposit, Money Market, and Private Credit',
  'Equities - Liquid': 'Public Equity + Commodities & more (excluding limited liquidity assets)',
  'Equities - Limited Liquidity': 'Manually flagged assets with limited liquidity',
  'Funds': 'Private Credit (Fixed Income) + Crypto Fund (Ben)',
  'Real Estate': 'All Real Estate class',
  'Private Equity': 'All Private Equity class'
};

/**
 * Classifies an asset into a liquidity category
 */
export function classifyAssetLiquidity(
  asset: Asset,
  limitedLiquidityAssetNames: Set<string>
): LiquidityCategory {
  // Cash: Cash class + Bank Deposit + Money Market
  if (asset.class === 'Cash') {
    return 'Cash';
  }
  if (asset.class === 'Fixed Income' && 
      (asset.sub_class === 'Bank Deposit' || asset.sub_class === 'Money Market')) {
    return 'Cash';
  }
  
  // Funds: Private Credit + Crypto Fund (Ben)
  if (asset.class === 'Fixed Income' && asset.sub_class === 'Private Credit') {
    return 'Funds';
  }
  if (asset.name === 'Crypto Fund (Ben)') {
    return 'Funds';
  }
  
  // Bonds: Fixed Income excluding Bank Deposit, Money Market, Private Credit
  if (asset.class === 'Fixed Income' && 
      !['Bank Deposit', 'Money Market', 'Private Credit'].includes(asset.sub_class)) {
    return 'Bonds';
  }
  
  // Real Estate
  if (asset.class === 'Real Estate') {
    return 'Real Estate';
  }
  
  // Private Equity
  if (asset.class === 'Private Equity') {
    return 'Private Equity';
  }
  
  // Equities (Public Equity + Commodities & more except Crypto Fund)
  if (asset.class === 'Public Equity' || asset.class === 'Commodities & more') {
    if (limitedLiquidityAssetNames.has(asset.name)) {
      return 'Equities - Limited Liquidity';
    }
    return 'Equities - Liquid';
  }
  
  // Fallback
  return 'Equities - Liquid';
}

export interface LiquidityMatrixData {
  matrix: Map<LiquidityCategory, Map<Beneficiary, number>>;
  rowTotals: Map<LiquidityCategory, number>;
  columnTotals: Map<Beneficiary, number>;
  grandTotal: number;
}

/**
 * Calculates the liquidity matrix with totals
 */
export function calculateLiquidityMatrix(
  assets: Asset[],
  limitedLiquidityAssetNames: Set<string>,
  fxRates: FXRates,
  viewCurrency: ViewCurrency
): LiquidityMatrixData {
  // Initialize the matrix
  const matrix = new Map<LiquidityCategory, Map<Beneficiary, number>>();
  LIQUIDITY_CATEGORIES.forEach(category => {
    const beneficiaryMap = new Map<Beneficiary, number>();
    BENEFICIARIES.forEach(beneficiary => {
      beneficiaryMap.set(beneficiary, 0);
    });
    matrix.set(category, beneficiaryMap);
  });

  // Populate the matrix with asset values
  assets.forEach(asset => {
    const category = classifyAssetLiquidity(asset, limitedLiquidityAssetNames);
    const beneficiary = asset.beneficiary as Beneficiary;
    const calculations = calculateAssetValue(asset, fxRates, viewCurrency);
    const value = calculations.display_value;

    const beneficiaryMap = matrix.get(category);
    if (beneficiaryMap && BENEFICIARIES.includes(beneficiary)) {
      const currentValue = beneficiaryMap.get(beneficiary) || 0;
      beneficiaryMap.set(beneficiary, currentValue + value);
    }
  });

  // Calculate row totals
  const rowTotals = new Map<LiquidityCategory, number>();
  LIQUIDITY_CATEGORIES.forEach(category => {
    const beneficiaryMap = matrix.get(category)!;
    let total = 0;
    beneficiaryMap.forEach(value => {
      total += value;
    });
    rowTotals.set(category, total);
  });

  // Calculate column totals
  const columnTotals = new Map<Beneficiary, number>();
  BENEFICIARIES.forEach(beneficiary => {
    let total = 0;
    LIQUIDITY_CATEGORIES.forEach(category => {
      const beneficiaryMap = matrix.get(category)!;
      total += beneficiaryMap.get(beneficiary) || 0;
    });
    columnTotals.set(beneficiary, total);
  });

  // Calculate grand total
  let grandTotal = 0;
  rowTotals.forEach(value => {
    grandTotal += value;
  });

  return {
    matrix,
    rowTotals,
    columnTotals,
    grandTotal
  };
}

/**
 * Gets all assets that can be marked as limited liquidity
 * (Public Equity and Commodities & more, excluding special cases)
 */
export function getEligibleLimitedLiquidityAssets(assets: Asset[]): Asset[] {
  return assets.filter(asset => 
    (asset.class === 'Public Equity' || asset.class === 'Commodities & more') &&
    asset.name !== 'Crypto Fund (Ben)' // This is always in Funds
  );
}
