import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FXRates } from '@/types/portfolio';
import { useToast } from '@/hooks/use-toast';

export interface FXRateData {
  currency: string;
  to_usd_rate: number;
  to_ils_rate: number;
  last_updated: string;
  source: string;
  is_manual_override: boolean;
}

export function useFXRates() {
  const [fxRates, setFxRates] = useState<FXRates>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Load FX rates from database
  const loadFXRates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fx_rates')
        .select('*')
        .order('currency');

      if (error) throw error;

      if (data && data.length > 0) {
        const rates: FXRates = {};
        let mostRecentUpdate: Date | null = null;

        data.forEach((rate: FXRateData) => {
          rates[rate.currency as keyof FXRates] = {
            to_USD: rate.to_usd_rate,
            to_ILS: rate.to_ils_rate,
            last_updated: rate.last_updated,
          };

          const updateTime = new Date(rate.last_updated);
          if (!mostRecentUpdate || updateTime > mostRecentUpdate) {
            mostRecentUpdate = updateTime;
          }
        });

        setFxRates(rates);
        setLastUpdated(mostRecentUpdate);
      }
    } catch (error) {
      console.error('Error loading FX rates:', error);
      toast({
        title: "Error loading FX rates",
        description: "Using default rates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update FX rates from API
  const updateFXRates = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-fx-rates');

      if (error) throw error;

      if (data.success) {
        toast({
          title: "FX rates updated",
          description: `Updated ${data.updated} currencies`,
        });
        
        // Reload rates from database
        await loadFXRates();
      } else {
        throw new Error(data.error || 'Failed to update rates');
      }
    } catch (error) {
      console.error('Error updating FX rates:', error);
      toast({
        title: "Failed to update FX rates",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Update manual rate
  const updateManualRate = async (currency: string, toILS: number) => {
    try {
      const toUSD = currency === 'ILS' ? 1 / toILS : toILS / (fxRates.ILS?.to_ILS || 3.60);

      const { error } = await supabase
        .from('fx_rates')
        .upsert({
          currency,
          to_usd_rate: toUSD,
          to_ils_rate: toILS,
          last_updated: new Date().toISOString(),
          source: 'manual',
          is_manual_override: true
        }, {
          onConflict: 'currency'
        });

      if (error) throw error;

      // Reload rates
      await loadFXRates();
      
      toast({
        title: "Rate updated",
        description: `${currency} rate updated manually`,
      });
    } catch (error) {
      console.error('Error updating manual rate:', error);
      toast({
        title: "Failed to update rate",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Load rates on mount
  useEffect(() => {
    loadFXRates();
  }, []);

  return {
    fxRates,
    lastUpdated,
    isLoading,
    isUpdating,
    updateFXRates,
    updateManualRate,
    refreshRates: loadFXRates,
  };
}