import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FXRates } from '@/types/portfolio';
import { useToast } from '@/hooks/use-toast';
import { handleWriteError } from '@/lib/session-utils';
import { useAuth } from '@/contexts/AuthContext';

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
  const { logout } = useAuth();

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
      // First, update the specific currency that was changed
      let toUSD: number;
      if (currency === 'USD') {
        toUSD = 1.0; // USD to USD is always 1
      } else {
        // For any non-USD currency, calculate to_USD based on current USD rate
        const currentUsdToIls = fxRates.USD?.to_ILS || 3.33;
        toUSD = toILS / currentUsdToIls;
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

      if (updateError) {
        const sessionExpired = await handleWriteError(updateError, logout);
        if (sessionExpired) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          return;
        }
        throw updateError;
      }

      // Now, if USD was updated, we need to recalculate all other currencies' to_USD rates
      if (currency === 'USD') {
        // Get all current rates except USD
        const { data: allRates, error: fetchError } = await supabase
          .from('fx_rates')
          .select('*')
          .neq('currency', 'USD');

        if (fetchError) throw fetchError;

        // Recalculate to_USD rates for all currencies based on the new USD to ILS rate
        const updatedRates = allRates?.map(rate => ({
          ...rate,
          to_usd_rate: rate.currency === 'ILS' 
            ? 1 / toILS  // ILS to USD = 1 / (USD to ILS)
            : rate.to_ils_rate / toILS,  // Other currencies: Currency_to_ILS / USD_to_ILS
          last_updated: new Date().toISOString()
        })) || [];

        // Batch update all other currencies
        if (updatedRates.length > 0) {
          const { error: batchUpdateError } = await supabase
            .from('fx_rates')
            .upsert(updatedRates, {
              onConflict: 'currency'
            });

          if (batchUpdateError) {
            const sessionExpired = await handleWriteError(batchUpdateError, logout);
            if (sessionExpired) {
              toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
              return;
            }
            throw batchUpdateError;
          }
        }
      }

      // Reload rates
      await loadFXRates();
      
      toast({
        title: "Rates updated",
        description: currency === 'USD' 
          ? `USD rate updated and all other USD rates recalculated`
          : `${currency} rate updated`,
      });
    } catch (error) {
      console.error('Error updating manual rate:', error);
      toast({
        title: "Failed to update rate",
        description: error?.message || "Please try again",
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