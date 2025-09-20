import { useState, useEffect } from 'react';
import { Asset } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
        .single();

      if (error) {
        throw error;
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

  // Update existing asset with synchronization
  const updateAsset = async (asset: Asset) => {
    try {
      // Find all assets with the same name
      const assetsWithSameName = assets.filter(a => a.name === asset.name && a.name.trim() !== '');
      const willUpdateMultiple = assetsWithSameName.length > 1;

      if (willUpdateMultiple) {
        // Prepare shared properties for batch update
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
          throw error;
        }

        // Update specific asset's account properties
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
          .single();

        if (specificError) {
          throw specificError;
        }

        // Update local state with all affected assets
        const updatedAssets = (data || []).map(convertFromDb);
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

        return convertFromDb(specificData);
      } else {
        // Single asset update
        const dbAsset = convertToDb(asset);

        const { data, error } = await supabase
          .from('assets')
          .update(dbAsset)
          .eq('id', asset.id)
          .select()
          .single();

        if (error) {
          throw error;
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