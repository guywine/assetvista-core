import { useState, useEffect } from 'react';
import { Asset } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { handleWriteError, verifySession } from '@/lib/session-utils';
import { useSessionAuth } from '@/hooks/useSessionAuth';
import { calculatePEPrice } from '@/lib/portfolio-utils';

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { clearSession } = useSessionAuth();

  // Convert database row to Asset
  const convertFromDb = (row: any): Asset => ({
    id: row.id,
    name: row.name,
    class: row.class,
    sub_class: row.sub_class,
    ISIN: row.isin,
    account_entity: row.account_entity,
    account_bank: row.account_bank,
    beneficiary: row.beneficiary,
    origin_currency: row.origin_currency,
    quantity: parseFloat(row.quantity),
    price: parseFloat(row.price),
    factor: row.factor ? parseFloat(row.factor) : undefined,
    maturity_date: row.maturity_date,
    ytw: row.ytw === null || row.ytw === undefined ? undefined : Number(row.ytw),
    pe_company_value: row.pe_company_value ? parseFloat(row.pe_company_value) : undefined,
    pe_holding_percentage: row.pe_holding_percentage ? parseFloat(row.pe_holding_percentage) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  // Convert Asset to database format
  const convertToDb = (asset: Asset) => ({
    id: asset.id,
    name: asset.name,
    class: asset.class,
    sub_class: asset.sub_class,
    isin: asset.ISIN,
    account_entity: asset.account_entity,
    account_bank: asset.account_bank,
    beneficiary: asset.beneficiary,
    origin_currency: asset.origin_currency,
    quantity: asset.quantity,
    price: asset.price,
    factor: asset.factor,
    maturity_date: asset.maturity_date,
    ytw: asset.ytw,
    pe_company_value: asset.pe_company_value,
    pe_holding_percentage: asset.pe_holding_percentage,
  });

  // Load assets from database
  const loadAssets = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const convertedAssets = (data || []).map(convertFromDb);
      setAssets(convertedAssets);
    } catch (error: any) {
      toast({
        title: "Error Loading Assets",
        description: error.message || "Failed to load assets from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add new asset
  const addAsset = async (asset: Asset) => {
    try {
      const dbAsset = convertToDb(asset);

      const { data, error } = await supabase
        .from('assets')
        .insert([dbAsset])
        .select()
        .maybeSingle();

      if (error) {
        const sessionExpired = await handleWriteError(error, clearSession);
        if (sessionExpired) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      if (!data) {
        // Check if this might be due to session expiration
        const sessionValid = await verifySession();
        if (!sessionValid) {
          clearSession();
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          return;
        }
        throw new Error('Asset was not created. Please try again.');
      }

      const newAsset = convertFromDb(data);
      setAssets(prev => [newAsset, ...prev]);
      
      toast({
        title: "Asset Added",
        description: `${asset.name} has been successfully added to your portfolio.`,
      });

      return newAsset;
    } catch (error: any) {
      toast({
        title: "Error Adding Asset",
        description: error.message || "Failed to add asset to database",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Define shared vs account-specific properties (class-aware)
  const getSharedProperties = (asset: Asset) => {
    const baseShared = {
      name: asset.name,
      class: asset.class,
      sub_class: asset.sub_class,
      ISIN: asset.ISIN,
      origin_currency: asset.origin_currency,
      factor: asset.factor,
      maturity_date: asset.maturity_date,
      ytw: asset.ytw,
      pe_company_value: asset.pe_company_value,
    };

    // For Private Equity and Real Estate, price is account-specific
    if (asset.class === 'Private Equity' || asset.class === 'Real Estate') {
      return baseShared;
    }

    // For other asset classes, price is shared
    return {
      ...baseShared,
      price: asset.price,
    };
  };

  const getAccountSpecificProperties = (asset: Asset) => {
    const baseAccountSpecific = {
      account_entity: asset.account_entity,
      account_bank: asset.account_bank,
      quantity: asset.quantity,
    };

    // For Private Equity and Real Estate, price is account-specific
    if (asset.class === 'Private Equity') {
      return {
        ...baseAccountSpecific,
        price: asset.price,
        pe_holding_percentage: asset.pe_holding_percentage,
      };
    }

    if (asset.class === 'Real Estate') {
      return {
        ...baseAccountSpecific,
        price: asset.price,
      };
    }

    return baseAccountSpecific;
  };

  // Helper function to detect what type of changes were made
  const detectChanges = (originalAsset: Asset, updatedAsset: Asset) => {
    const originalShared = getSharedProperties(originalAsset);
    const updatedShared = getSharedProperties(updatedAsset);
    const originalAccountSpecific = getAccountSpecificProperties(originalAsset);
    const updatedAccountSpecific = getAccountSpecificProperties(updatedAsset);

    const sharedChanged = JSON.stringify(originalShared) !== JSON.stringify(updatedShared);
    const accountSpecificChanged = JSON.stringify(originalAccountSpecific) !== JSON.stringify(updatedAccountSpecific);

    return {
      sharedChanged,
      accountSpecificChanged,
      bothChanged: sharedChanged && accountSpecificChanged,
      neitherChanged: !sharedChanged && !accountSpecificChanged
    };
  };

  // Update existing asset with synchronization
  const updateAsset = async (asset: Asset) => {
    try {
      // Find all assets with the same name
      const assetsWithSameName = assets.filter(a => a.name === asset.name && a.name.trim() !== '');
      const willUpdateMultiple = assetsWithSameName.length > 1;

      if (willUpdateMultiple) {
        // Find the original asset to compare changes
        const originalAsset = assets.find(a => a.id === asset.id);
        if (!originalAsset) {
          throw new Error("Original asset not found");
        }

        // Detect what type of changes were made
        const changes = detectChanges(originalAsset, asset);

        if (changes.neitherChanged) {
          // No changes detected, return original asset
          return originalAsset;
        }

        let updatedAssets: Asset[] = [];
        let specificUpdatedAsset: Asset;

        if (changes.sharedChanged && !changes.accountSpecificChanged) {
          // Only shared properties changed - batch update all holdings
          const sharedProps = getSharedProperties(asset);
          const sharedDbProps: any = {
            name: sharedProps.name,
            class: sharedProps.class,
            sub_class: sharedProps.sub_class,
            isin: sharedProps.ISIN,
            origin_currency: sharedProps.origin_currency,
            factor: sharedProps.factor,
            maturity_date: sharedProps.maturity_date,
            ytw: sharedProps.ytw,
            pe_company_value: sharedProps.pe_company_value,
          };

          // Only include price in shared props if it's not Private Equity or Real Estate
          if (asset.class !== 'Private Equity' && asset.class !== 'Real Estate' && 'price' in sharedProps) {
            sharedDbProps.price = (sharedProps as any).price;
          }

          // Batch update all assets with same name
          const { data, error } = await supabase
            .from('assets')
            .update(sharedDbProps)
            .eq('name', asset.name)
            .select();

          if (error) {
            const sessionExpired = await handleWriteError(error, clearSession);
            if (sessionExpired) {
              toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              return originalAsset;
            }
            throw error;
          }

          updatedAssets = (data || []).map(convertFromDb);
          specificUpdatedAsset = updatedAssets.find(a => a.id === asset.id) || asset;

          setAssets(prev => 
            prev.map(a => {
              const updated = updatedAssets.find(u => u.id === a.id);
              return updated || a;
            })
          );

          toast({
            title: "Assets Updated",
            description: `${asset.name} updated across ${updatedAssets.length} holdings.`,
          });

        } else if (!changes.sharedChanged && changes.accountSpecificChanged) {
          // Only account-specific properties changed - update only this asset
          const accountSpecificProps = getAccountSpecificProperties(asset);
          const accountSpecificDbProps: any = {
            quantity: accountSpecificProps.quantity,
            account_entity: accountSpecificProps.account_entity,
            account_bank: accountSpecificProps.account_bank,
          };

          // For Private Equity, also update price and pe_holding_percentage
          if (asset.class === 'Private Equity') {
            const peProps = accountSpecificProps as any;
            accountSpecificDbProps.price = peProps.price;
            accountSpecificDbProps.pe_holding_percentage = peProps.pe_holding_percentage;
          }

          // For Real Estate, also update price
          if (asset.class === 'Real Estate') {
            const reProps = accountSpecificProps as any;
            accountSpecificDbProps.price = reProps.price;
          }

          const { data: specificData, error: specificError } = await supabase
            .from('assets')
            .update(accountSpecificDbProps)
            .eq('id', asset.id)
            .select()
            .maybeSingle();

          if (specificError) {
            const sessionExpired = await handleWriteError(specificError, clearSession);
            if (sessionExpired) {
              toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              return originalAsset;
            }
            throw specificError;
          }

          if (!specificData) {
            const sessionValid = await verifySession();
            if (!sessionValid) {
              clearSession();
              toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              return originalAsset;
            }
            throw new Error('Asset update failed. Please try again.');
          }

          specificUpdatedAsset = convertFromDb(specificData);

          setAssets(prev => 
            prev.map(a => a.id === asset.id ? specificUpdatedAsset : a)
          );

          toast({
            title: "Asset Updated",
            description: `${asset.name} has been successfully updated.`,
          });

        } else {
          // Both shared and account-specific properties changed
          // First do batch update for shared properties
          const sharedProps = getSharedProperties(asset);
          const sharedDbProps: any = {
            name: sharedProps.name,
            class: sharedProps.class,
            sub_class: sharedProps.sub_class,
            isin: sharedProps.ISIN,
            origin_currency: sharedProps.origin_currency,
            factor: sharedProps.factor,
            maturity_date: sharedProps.maturity_date,
            ytw: sharedProps.ytw,
            pe_company_value: sharedProps.pe_company_value,
          };

          // Only include price in shared props if it's not Private Equity or Real Estate
          if (asset.class !== 'Private Equity' && asset.class !== 'Real Estate' && 'price' in sharedProps) {
            sharedDbProps.price = (sharedProps as any).price;
          }

          // Batch update all assets with same name
          const { data, error } = await supabase
            .from('assets')
            .update(sharedDbProps)
            .eq('name', asset.name)
            .select();

          if (error) {
            const sessionExpired = await handleWriteError(error, clearSession);
            if (sessionExpired) {
              toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              return originalAsset;
            }
            throw error;
          }

          // Then update specific asset's account properties
          const accountSpecificProps = getAccountSpecificProperties(asset);
          const accountSpecificDbProps: any = {
            quantity: accountSpecificProps.quantity,
            account_entity: accountSpecificProps.account_entity,
            account_bank: accountSpecificProps.account_bank,
          };

          // For Private Equity, also update price and pe_holding_percentage
          if (asset.class === 'Private Equity') {
            const peProps = accountSpecificProps as any;
            accountSpecificDbProps.price = peProps.price;
            accountSpecificDbProps.pe_holding_percentage = peProps.pe_holding_percentage;
          }

          // For Real Estate, also update price
          if (asset.class === 'Real Estate') {
            const reProps = accountSpecificProps as any;
            accountSpecificDbProps.price = reProps.price;
          }

          const { data: specificData, error: specificError } = await supabase
            .from('assets')
            .update(accountSpecificDbProps)
            .eq('id', asset.id)
            .select()
            .maybeSingle();

          if (specificError) {
            const sessionExpired = await handleWriteError(specificError, clearSession);
            if (sessionExpired) {
              toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              return originalAsset;
            }
            throw specificError;
          }

          if (!specificData) {
            const sessionValid = await verifySession();
            if (!sessionValid) {
              clearSession();
              toast({
                title: "Session Expired", 
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              return originalAsset;
            }
            throw new Error('Asset update failed. Please try again.');
          }

          updatedAssets = (data || []).map(convertFromDb);
          specificUpdatedAsset = convertFromDb(specificData);

          setAssets(prev => 
            prev.map(a => {
              // First check if this is the specifically updated asset
              if (a.id === specificUpdatedAsset.id) {
                return specificUpdatedAsset;
              }
              // Then check for batch updates
              const updated = updatedAssets.find(u => u.id === a.id);
              if (updated) {
                // For Private Equity assets, recalculate derived properties
                const assetClass = updated.class ?? a.class;
                if (assetClass === 'Private Equity') {
                  const companyValue = updated.pe_company_value ?? a.pe_company_value;
                  const holdingPercentage = updated.pe_holding_percentage ?? a.pe_holding_percentage;
                  const quantity = updated.quantity ?? a.quantity;
                  
                  if (companyValue && holdingPercentage && quantity) {
                    return {
                      ...updated,
                      price: calculatePEPrice(companyValue, holdingPercentage, quantity)
                    };
                  }
                }
                return updated;
              }
              return a;
            })
          );

          toast({
            title: "Assets Updated",
            description: `${asset.name} updated across ${updatedAssets.length} holdings.`,
          });
        }

        return specificUpdatedAsset;
      } else {
        // Single asset update
        const dbAsset = convertToDb(asset);

        const { data, error } = await supabase
          .from('assets')
          .update(dbAsset)
          .eq('id', asset.id)
          .select()
          .maybeSingle();

        if (error) {
          const sessionExpired = await handleWriteError(error, clearSession);
          if (sessionExpired) {
            toast({
              title: "Session Expired",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
            return asset;
          }
          throw error;
        }

        if (!data) {
          const sessionValid = await verifySession();
          if (!sessionValid) {
            clearSession();
            toast({
              title: "Session Expired",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
            return asset;
          }
          throw new Error('Asset update failed. Please try again.');
        }

        const updatedAsset = convertFromDb(data);
        setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
        
        toast({
          title: "Asset Updated",
          description: `${asset.name} has been successfully updated.`,
        });

        return updatedAsset;
      }
    } catch (error: any) {
      toast({
        title: "Error Updating Asset",
        description: error.message || "Failed to update asset in database",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Delete asset
  const deleteAsset = async (asset: Asset) => {
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', asset.id);

      if (error) {
        const sessionExpired = await handleWriteError(error, clearSession);
        if (sessionExpired) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setAssets(prev => prev.filter(a => a.id !== asset.id));
      
      toast({
        title: "Asset Deleted",
        description: `${asset.name} has been successfully removed from your portfolio.`,
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error Deleting Asset",
        description: error.message || "Failed to delete asset from database",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Load assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  // Get count of assets with same name
  const getAssetNameCount = (name: string) => {
    return assets.filter(a => a.name === name && a.name.trim() !== '').length;
  };

  return {
    assets,
    isLoading,
    addAsset,
    updateAsset,
    deleteAsset,
    refreshAssets: loadAssets,
    getAssetNameCount,
  };
}