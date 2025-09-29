import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/types/portfolio';
import { handleWriteError } from '@/lib/session-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AssetLiquidationSetting {
  id: string;
  asset_name: string;
  liquidation_year: string;
  created_at: string;
  updated_at: string;
}

export function useAssetLiquidationSettings() {
  const [liquidationSettings, setLiquidationSettings] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { logout } = useAuth();
  const { toast } = useToast();

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
        settingsMap.set(setting.asset_name, setting.liquidation_year);
      });

      setLiquidationSettings(settingsMap);
    } catch (error) {
      console.error('Error loading liquidation settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLiquidationYear = async (assetName: string, liquidationYear: string) => {
    try {
      console.log('Saving liquidation year:', assetName, liquidationYear);
      
      const { data, error } = await supabase
        .from('asset_liquidation_settings')
        .upsert(
          {
            asset_name: assetName,
            liquidation_year: liquidationYear,
          },
          {
            onConflict: 'asset_name',
          }
        );

      if (error) {
        console.error('Error saving liquidation setting:', error);
        const sessionExpired = await handleWriteError(error, logout);
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

      console.log('Successfully saved liquidation setting');
      
      // Update local state
      setLiquidationSettings(prev => new Map(prev).set(assetName, liquidationYear));
    } catch (error) {
      console.error('Error saving liquidation setting:', error);
      throw error;
    }
  };

  const deleteLiquidationSetting = async (assetName: string) => {
    try {
      const { error } = await supabase
        .from('asset_liquidation_settings')
        .delete()
        .eq('asset_name', assetName);

      if (error) {
        console.error('Error deleting liquidation setting:', error);
        const sessionExpired = await handleWriteError(error, logout);
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

      // Update local state
      setLiquidationSettings(prev => {
        const newMap = new Map(prev);
        newMap.delete(assetName);
        return newMap;
      });
    } catch (error) {
      console.error('Error deleting liquidation setting:', error);
    }
  };

  const getLiquidationYear = (asset: Asset): string => {
    return liquidationSettings.get(asset.name) || 'later';
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