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
      // Calculate to_usd_rate correctly for the updated currency
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

      // Update the specific currency
      const { error: updateError } = await supabase
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

      if (updateError) throw updateError;

      // Get all current rates
      const { data: allRates, error: fetchError } = await supabase
        .from('fx_rates')
        .select('*');

      if (fetchError) throw fetchError;

      // Find the updated USD to ILS rate (either the one we just updated or existing)
      let newUsdToIls: number;
      if (currency === 'USD') {
        newUsdToIls = toILS;
      } else {
        const usdRate = allRates?.find(rate => rate.currency === 'USD');
        newUsdToIls = usdRate?.to_ils_rate || 3.33;
      }

      // Recalculate USD rates for all other currencies
      const updatedRates = allRates?.map(rate => {
        if (rate.currency === currency) {
          // Already updated above
          return rate;
        }
        
        if (rate.currency === 'USD') {
          // USD rate might have been updated, keep current values
          return rate;
        }

        // Recalculate to_usd_rate for all other currencies
        const newToUsd = rate.to_ils_rate / newUsdToIls;
        
        return {
          ...rate,
          to_usd_rate: newToUsd,
          last_updated: new Date().toISOString()
        };
      }) || [];

      // Update all currencies with new USD rates (except the one we already updated)
      const ratesToUpdate = updatedRates.filter(rate => rate.currency !== currency);
      
      if (ratesToUpdate.length > 0) {
        const { error: batchUpdateError } = await supabase
          .from('fx_rates')
          .upsert(ratesToUpdate, {
            onConflict: 'currency'
          });

        if (batchUpdateError) throw batchUpdateError;
      }

      // Reload rates
      await loadFXRates();
      
      toast({
        title: "Rates updated",
        description: `${currency} rate updated and all USD rates recalculated`,
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