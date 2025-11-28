import { Asset } from "@/types/portfolio";
import { useMemo } from "react";

export function useAssetLookup(assets: Asset[]) {
  const assetsByName = useMemo(() => {
    const grouped = new Map<string, Asset[]>();
    assets.forEach(asset => {
      const existing = grouped.get(asset.name) || [];
      grouped.set(asset.name, [...existing, asset]);
    });
    return grouped;
  }, [assets]);

  const findAssetsByName = (name: string): Asset[] => {
    return assetsByName.get(name) || [];
  };

  const getUniqueAssetNames = (): string[] => {
    return Array.from(assetsByName.keys()).sort();
  };

  const findSimilarAssetNames = (partialName: string): string[] => {
    if (!partialName.trim()) return [];
    
    const searchTerm = partialName.toLowerCase();
    return getUniqueAssetNames().filter(name => 
      name.toLowerCase().includes(searchTerm)
    );
  };

  const getAssetTemplate = (name: string): Partial<Asset> | null => {
    const assets = findAssetsByName(name);
    if (assets.length === 0) return null;
    
    // Return shared properties from the first asset with this name
    const template = assets[0];
    return {
      name: template.name,
      class: template.class,
      sub_class: template.sub_class,
      ISIN: template.ISIN,
      origin_currency: template.origin_currency,
      price: template.price,
      factor: template.factor,
      maturity_date: template.maturity_date,
      ytw: template.ytw,
    };
  };

  const getAssetGroupsByClass = (assetClass: string) => {
    const filteredAssets = assets.filter(asset => asset.class === assetClass);
    const groupedByName = new Map<string, Asset[]>();
    
    filteredAssets.forEach(asset => {
      const existing = groupedByName.get(asset.name) || [];
      groupedByName.set(asset.name, [...existing, asset]);
    });
    
    return Array.from(groupedByName.entries()).map(([name, assets]) => ({
      name,
      assets,
      totalQuantity: assets.reduce((sum, asset) => sum + asset.quantity, 0),
      averagePrice: assets.reduce((sum, asset) => sum + (asset.price || 0), 0) / assets.length,
    }));
  };

  const calculateGroupTotalValue = (groupAssets: Asset[], fxRates: any, viewCurrency: string) => {
    // This would use the same calculation logic as in portfolio utils
    // For now, return 0 as placeholder - will be calculated in the component
    return 0;
  };

  // Normalize name for comparison (remove extra spaces, punctuation, case-insensitive)
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[.\-_]/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .trim();
  };

  const findPotentialDuplicates = (newName: string): string[] => {
    const normalizedNew = normalizeName(newName);
    return getUniqueAssetNames().filter(existingName => {
      const normalizedExisting = normalizeName(existingName);
      return normalizedNew === normalizedExisting && newName !== existingName;
    });
  };

  return {
    findAssetsByName,
    getUniqueAssetNames,
    findSimilarAssetNames,
    getAssetTemplate,
    getAssetGroupsByClass,
    calculateGroupTotalValue,
    findPotentialDuplicates,
    assetsByName
  };
}