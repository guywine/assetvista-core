import { useState } from 'react';
import { Asset, FXRates, PortfolioSnapshot } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateAssetValue } from '@/lib/portfolio-utils';
import { useSessionExpiration } from '@/lib/session-utils';
import { useSessionAuth } from '@/hooks/useSessionAuth';

export function usePortfolioSnapshots() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { handleSessionExpiration } = useSessionExpiration();
  const { clearSession } = useSessionAuth();

  const saveSnapshot = async (name: string, description: string, assets: Asset[], fxRates: FXRates) => {
    setIsLoading(true);
    try {
      console.log('Starting portfolio snapshot save...', { name, description, assetsCount: assets.length });
      console.log('FX Rates:', fxRates);

      // Calculate class totals in USD
      let privateEquityTotal = 0;
      let liquidFixedIncomeTotal = 0;
      let realEstateTotal = 0;
      let totalValue = 0;
      const invalidAssets: string[] = [];

      assets.forEach(asset => {
        try {
        const calculations = calculateAssetValue(asset, fxRates, 'USD');
        const usdValue = calculations.display_value; // Use display_value to include factor for Private Equity
          
          // Validate calculated value
          if (isNaN(usdValue) || !isFinite(usdValue) || usdValue < 0) {
            invalidAssets.push(`${asset.name}: invalid USD value ${usdValue}`);
            return;
          }
          
          totalValue += usdValue;
          
          switch (asset.class) {
            case 'Private Equity':
              privateEquityTotal += usdValue;
              break;
            case 'Real Estate':
              realEstateTotal += usdValue;
              break;
            default:
              // All other classes (Public Equity, Fixed Income, Cash, Commodities & more) go to liquid + fixed income
              liquidFixedIncomeTotal += usdValue;
              break;
          }
        } catch (calcError) {
          invalidAssets.push(`${asset.name}: calculation error ${calcError}`);
          console.error('Asset calculation error:', calcError, asset);
        }
      });

      // Check for invalid calculations
      if (invalidAssets.length > 0) {
        throw new Error(`Invalid asset calculations: ${invalidAssets.join(', ')}`);
      }

      // Validate final totals
      const totals = [totalValue, liquidFixedIncomeTotal, privateEquityTotal, realEstateTotal];
      const invalidTotals = totals.filter(total => isNaN(total) || !isFinite(total) || total < 0);
      if (invalidTotals.length > 0) {
        throw new Error(`Invalid calculated totals: ${JSON.stringify({
          totalValue,
          liquidFixedIncomeTotal,
          privateEquityTotal,
          realEstateTotal
        })}`);
      }

      console.log('Calculated totals:', {
        totalValue,
        liquidFixedIncomeTotal,
        privateEquityTotal,
        realEstateTotal
      });

      // Prepare data for database insertion
      const insertData = {
        name,
        description,
        assets: assets as any, // Cast to satisfy Supabase Json type
        fx_rates: fxRates as any, // Cast to satisfy Supabase Json type
        total_value_usd: totalValue,
        liquid_fixed_income_value_usd: liquidFixedIncomeTotal,
        private_equity_value_usd: privateEquityTotal,
        real_estate_value_usd: realEstateTotal,
      };

      console.log('Data being sent to Supabase:', insertData);

      const { error } = await supabase
        .from('portfolio_snapshots')
        .insert(insertData);

      if (error) {
        console.error('Supabase insert error:', error);
        // Check if session expired before showing generic error
        const sessionExpired = await handleSessionExpiration(clearSession);
        if (!sessionExpired) {
          throw error;
        }
        return false;
      }

      toast({
        title: "Portfolio Saved",
        description: `Snapshot "${name}" has been saved successfully.`,
      });

      return true;
    } catch (error) {
      console.error('Error saving snapshot:', error);
      toast({
        title: "Error",
        description: "Failed to save portfolio snapshot",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveSnapshot,
    isLoading,
  };
}