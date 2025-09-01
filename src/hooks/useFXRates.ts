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


  // Update manual rate
  const updateManualRate = async (currency: string, toILS: number) => {
    try {
      // Calculate to_usd_rate correctly for each currency
      let toUSD: number;
      if (currency === 'USD') {
        toUSD = 1.0; // USD to USD is always 1
      } else if (currency === 'ILS') {
        toUSD = 1 / toILS; // If 1 USD = 3.33 ILS, then 1 ILS = 0.3 USD
      } else {
        // For other currencies, calculate based on their relationship to USD
        // If we know the ILS rate and we know USD to ILS rate, we can calculate the USD rate
        const usdToILS = fxRates.USD?.to_ILS || 3.33; // Current USD to ILS rate
        toUSD = toILS / usdToILS; // Convert via ILS
      }

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
    updateManualRate,
    refreshRates: loadFXRates,
  };
}