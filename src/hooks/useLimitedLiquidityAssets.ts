import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LimitedLiquidityAsset {
  id: string;
  asset_name: string;
  created_at: string;
  updated_at: string;
}

export function useLimitedLiquidityAssets() {
  const [limitedLiquidityAssets, setLimitedLiquidityAssets] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadLimitedLiquidityAssets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('limited_liquidity_assets')
        .select('*')
        .order('asset_name');

      if (error) {
        console.error('Error loading limited liquidity assets:', error);
        return;
      }

      const assetNames = new Set((data as LimitedLiquidityAsset[]).map(item => item.asset_name));
      setLimitedLiquidityAssets(assetNames);
    } catch (error) {
      console.error('Error loading limited liquidity assets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addLimitedLiquidityAsset = useCallback(async (assetName: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('limited_liquidity_assets')
        .insert({ asset_name: assetName });

      if (error) {
        console.error('Error adding limited liquidity asset:', error);
        toast.error('Failed to add limited liquidity asset');
        return false;
      }

      setLimitedLiquidityAssets(prev => new Set([...prev, assetName]));
      toast.success(`"${assetName}" marked as limited liquidity`);
      return true;
    } catch (error) {
      console.error('Error adding limited liquidity asset:', error);
      toast.error('Failed to add limited liquidity asset');
      return false;
    }
  }, []);

  const removeLimitedLiquidityAsset = useCallback(async (assetName: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('limited_liquidity_assets')
        .delete()
        .eq('asset_name', assetName);

      if (error) {
        console.error('Error removing limited liquidity asset:', error);
        toast.error('Failed to remove limited liquidity asset');
        return false;
      }

      setLimitedLiquidityAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(assetName);
        return newSet;
      });
      toast.success(`"${assetName}" removed from limited liquidity`);
      return true;
    } catch (error) {
      console.error('Error removing limited liquidity asset:', error);
      toast.error('Failed to remove limited liquidity asset');
      return false;
    }
  }, []);

  const isLimitedLiquidity = useCallback((assetName: string): boolean => {
    return limitedLiquidityAssets.has(assetName);
  }, [limitedLiquidityAssets]);

  useEffect(() => {
    loadLimitedLiquidityAssets();
  }, [loadLimitedLiquidityAssets]);

  return {
    limitedLiquidityAssets,
    isLoading,
    addLimitedLiquidityAsset,
    removeLimitedLiquidityAsset,
    isLimitedLiquidity,
    reload: loadLimitedLiquidityAssets
  };
}
