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
    origin_currency: row.origin_currency,
    quantity: parseFloat(row.quantity),
    price: parseFloat(row.price),
    factor: row.factor ? parseFloat(row.factor) : undefined,
    maturity_date: row.maturity_date,
    ytw: row.ytw ? parseFloat(row.ytw) : undefined,
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
    origin_currency: asset.origin_currency,
    quantity: asset.quantity,
    price: asset.price,
    factor: asset.factor,
    maturity_date: asset.maturity_date,
    ytw: asset.ytw,
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

  // Update existing asset
  const updateAsset = async (asset: Asset) => {
    try {
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

  return {
    assets,
    isLoading,
    addAsset,
    updateAsset,
    deleteAsset,
    refreshAssets: loadAssets,
  };
}