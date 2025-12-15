import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AssetClass } from '@/types/portfolio';

export interface PendingAsset {
  id: string;
  name: string;
  asset_class: AssetClass;
  value_usd: number;
  created_at: string;
  updated_at: string;
}

export function usePendingAssets() {
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_assets')
        .select('*')
        .order('value_usd', { ascending: false });

      if (error) throw error;
      setPendingAssets((data || []) as PendingAsset[]);
    } catch (error: any) {
      console.error('Error fetching pending assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending assets',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAssets();
  }, []);

  const addPendingAsset = async (name: string, assetClass: AssetClass, valueUsd: number) => {
    try {
      const { data, error } = await supabase
        .from('pending_assets')
        .insert({
          name,
          asset_class: assetClass,
          value_usd: valueUsd,
        })
        .select()
        .single();

      if (error) throw error;

      const typedData = data as PendingAsset;
      setPendingAssets(prev => 
        [...prev, typedData].sort((a, b) => b.value_usd - a.value_usd)
      );

      toast({
        title: 'Success',
        description: 'Pending asset added',
      });

      return data;
    } catch (error: any) {
      console.error('Error adding pending asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to add pending asset',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletePendingAsset = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pending_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPendingAssets(prev => prev.filter(asset => asset.id !== id));

      toast({
        title: 'Removed',
        description: 'Pending asset removed',
      });
    } catch (error: any) {
      console.error('Error deleting pending asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove pending asset',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updatePendingAsset = async (id: string, assetClass: AssetClass, valueUsd: number) => {
    try {
      const { data, error } = await supabase
        .from('pending_assets')
        .update({
          asset_class: assetClass,
          value_usd: valueUsd,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const typedData = data as PendingAsset;
      setPendingAssets(prev => 
        prev.map(asset => asset.id === id ? typedData : asset)
          .sort((a, b) => b.value_usd - a.value_usd)
      );

      toast({
        title: 'Success',
        description: 'Pending asset updated',
      });

      return data;
    } catch (error: any) {
      console.error('Error updating pending asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pending asset',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const totalValue = pendingAssets.reduce((sum, asset) => sum + asset.value_usd, 0);

  return {
    pendingAssets,
    isLoading,
    addPendingAsset,
    updatePendingAsset,
    deletePendingAsset,
    totalValue,
    refetch: fetchPendingAssets,
  };
}
