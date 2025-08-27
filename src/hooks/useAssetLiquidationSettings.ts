import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/types/portfolio';

interface AssetLiquidationSetting {
  id: string;
  asset_id: string;
  liquidation_year: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export function useAssetLiquidationSettings() {
  const [liquidationSettings, setLiquidationSettings] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const loadLiquidationSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('asset_liquidation_settings')
        .select('*');

      if (error) {
        console.error('Error loading liquidation settings:', error);
        return;
      }

      const settingsMap = new Map<string, string>();
      data?.forEach((setting: AssetLiquidationSetting) => {
        settingsMap.set(setting.asset_id, setting.liquidation_year);
      });

      setLiquidationSettings(settingsMap);
    } catch (error) {
      console.error('Error loading liquidation settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLiquidationYear = async (assetId: string, liquidationYear: string) => {
    try {
      const { data, error } = await supabase
        .from('asset_liquidation_settings')
        .upsert(
          {
            asset_id: assetId,
            liquidation_year: liquidationYear,
          },
          {
            onConflict: 'asset_id',
          }
        );

      if (error) {
        console.error('Error saving liquidation setting:', error);
        return;
      }

      // Update local state
      setLiquidationSettings(prev => new Map(prev).set(assetId, liquidationYear));
    } catch (error) {
      console.error('Error saving liquidation setting:', error);
    }
  };

  const deleteLiquidationSetting = async (assetId: string) => {
    try {
      const { error } = await supabase
        .from('asset_liquidation_settings')
        .delete()
        .eq('asset_id', assetId);

      if (error) {
        console.error('Error deleting liquidation setting:', error);
        return;
      }

      // Update local state
      setLiquidationSettings(prev => {
        const newMap = new Map(prev);
        newMap.delete(assetId);
        return newMap;
      });
    } catch (error) {
      console.error('Error deleting liquidation setting:', error);
    }
  };

  const getLiquidationYear = (asset: Asset): string => {
    return liquidationSettings.get(asset.id) || 'later';
  };

  useEffect(() => {
    loadLiquidationSettings();
  }, []);

  return {
    liquidationSettings,
    isLoading,
    getLiquidationYear,
    saveLiquidationYear,
    deleteLiquidationSetting,
    refreshSettings: loadLiquidationSettings,
  };
}