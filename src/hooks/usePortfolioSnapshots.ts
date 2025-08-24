import { useState } from 'react';
import { Asset, FXRates, PortfolioSnapshot } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateAssetValue } from '@/lib/portfolio-utils';

export function usePortfolioSnapshots() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveSnapshot = async (name: string, description: string, assets: Asset[], fxRates: FXRates) => {
    setIsLoading(true);
    try {
      // Calculate class totals in USD
      let privateEquityTotal = 0;
      let publicEquityTotal = 0;
      let fixedIncomeTotal = 0;
      let totalValue = 0;

      assets.forEach(asset => {
        const calculations = calculateAssetValue(asset, fxRates, 'USD');
        const usdValue = calculations.converted_value;
        
        totalValue += usdValue;
        
        switch (asset.class) {
          case 'Private Equity':
            privateEquityTotal += usdValue;
            break;
          case 'Public Equity':
            publicEquityTotal += usdValue;
            break;
          case 'Fixed Income':
            fixedIncomeTotal += usdValue;
            break;
        }
      });

      const { error } = await supabase
        .from('portfolio_snapshots')
        .insert({
          name,
          description,
          assets: JSON.parse(JSON.stringify(assets)),
          fx_rates: JSON.parse(JSON.stringify(fxRates)),
          total_value_usd: totalValue,
          private_equity_value_usd: privateEquityTotal,
          public_equity_value_usd: publicEquityTotal,
          fixed_income_value_usd: fixedIncomeTotal,
        });

      if (error) throw error;

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