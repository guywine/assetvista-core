import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Asset } from "@/types/portfolio";

interface UpdateStockPricesResponse {
  success: boolean;
  prices: { [symbol: string]: number };
  errors: { [symbol: string]: string };
  message: string;
}

export function useStockPrices() {
  const [isUpdating, setIsUpdating] = useState(false);

  const isOption = (asset: Asset): boolean => {
    return asset.ISIN?.startsWith('O:') ?? false;
  };

  const isEligibleForUpdate = (asset: Asset): boolean => {
    // Must have a ticker (ISIN field)
    if (!asset.ISIN || asset.ISIN.trim() === '') return false;
    
    // Options are eligible (identified by O: prefix)
    if (isOption(asset)) return true;
    
    // Must be one of these asset types
    if (asset.class === 'Public Equity') return true;
    if (asset.class === 'Fixed Income' && asset.sub_class === 'REIT stock') return true;
    if (asset.class === 'Commodities & more') return true;
    
    return false;
  };

  const isTelAvivStock = (asset: Asset): boolean => {
    // Primary check: ticker ends with .TA
    if (asset.ISIN && asset.ISIN.endsWith('.TA')) return true;
    
    // Secondary check: currency is ILS (backup for TASE stocks)
    if (asset.origin_currency === 'ILS') return true;
    
    return false;
  };

  const updateStockPrices = async (
    assets: Asset[],
    onUpdateAsset: (asset: Asset) => Promise<Asset>
  ): Promise<void> => {
    setIsUpdating(true);

    try {
      // Filter eligible assets
      const eligibleAssets = assets.filter(isEligibleForUpdate);

      if (eligibleAssets.length === 0) {
        toast.info("No assets with tickers found to update");
        setIsUpdating(false);
        return;
      }

      // Extract unique tickers (ISIN values)
      const uniqueTickers = Array.from(
        new Set(eligibleAssets.map((asset) => asset.ISIN).filter((ISIN): ISIN is string => !!ISIN))
      );

      console.log(`Updating prices for ${uniqueTickers.length} unique tickers:`, uniqueTickers);

      // Call edge function
      const { data, error } = await supabase.functions.invoke<UpdateStockPricesResponse>(
        'update-stock-prices',
        {
          body: { symbols: uniqueTickers },
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        toast.error(`Failed to update prices: ${error.message}`);
        setIsUpdating(false);
        return;
      }

      if (!data) {
        toast.error('No response from price update service');
        setIsUpdating(false);
        return;
      }

      console.log('Received price data:', data);

      // Process successful price updates
      const { prices, errors } = data;
      let updatedCount = 0;
      const updatePromises: Promise<Asset>[] = [];

      // Update assets with new prices
      for (const asset of eligibleAssets) {
        const ticker = asset.ISIN;
        if (ticker && prices[ticker] !== undefined) {
          let adjustedPrice = prices[ticker];
          
          // Tel Aviv stocks are quoted in agorot (1/100 shekel)
          if (isTelAvivStock(asset)) {
            adjustedPrice = adjustedPrice / 100;
            console.log(`TASE conversion: ${ticker} ${prices[ticker]} → ${adjustedPrice}`);
          }
          
          const updatedAsset = {
            ...asset,
            price: adjustedPrice,
          };
          
          // Queue the update
          updatePromises.push(onUpdateAsset(updatedAsset));
          updatedCount++;
        }
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Show results to user
      const errorCount = Object.keys(errors).length;
      
      if (updatedCount > 0 && errorCount === 0) {
        toast.success(`Successfully updated ${updatedCount} asset${updatedCount === 1 ? '' : 's'}`);
      } else if (updatedCount > 0 && errorCount > 0) {
        const failedTickers = Object.keys(errors).join(', ');
        toast.warning(
          `Updated ${updatedCount} asset${updatedCount === 1 ? '' : 's'}. Failed: ${failedTickers}`,
          { duration: 5000 }
        );
      } else if (errorCount > 0) {
        const failedTickers = Object.keys(errors).join(', ');
        toast.error(`Failed to update prices for: ${failedTickers}`, { duration: 5000 });
      }

      console.log(`Update complete: ${updatedCount} assets updated, ${errorCount} errors`);
    } catch (error) {
      console.error('Error updating stock prices:', error);
      toast.error(
        error instanceof Error
          ? `Update failed: ${error.message}`
          : 'An unexpected error occurred while updating prices'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateStockPrices,
    isUpdating,
  };
}
