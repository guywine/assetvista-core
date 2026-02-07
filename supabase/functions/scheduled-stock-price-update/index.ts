import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchAllPrices } from '../_shared/stock-prices.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  name: string;
  isin: string | null;
  class: string;
  sub_class: string;
  origin_currency: string;
  price: number;
}

/**
 * Check if an asset is eligible for automatic price updates
 * Mirrors the logic in useStockPrices.ts
 */
function isEligibleForUpdate(asset: Asset): boolean {
  // Must have a ticker (ISIN field)
  if (!asset.isin || asset.isin.trim() === '') return false;
  
  // Options are eligible (identified by O: prefix)
  if (asset.isin.startsWith('O:')) return true;
  
  // Must be one of these asset types
  if (asset.class === 'Public Equity') return true;
  if (asset.class === 'Fixed Income' && asset.sub_class === 'REIT stock') return true;
  if (asset.class === 'Commodities & more') return true;
  
  return false;
}

/**
 * Check if an asset is a Tel Aviv stock (prices in agorot)
 * Mirrors the logic in useStockPrices.ts
 */
function isTelAvivStock(asset: Asset): boolean {
  // Primary check: ticker ends with .TA
  if (asset.isin && asset.isin.endsWith('.TA')) return true;
  
  // Secondary check: currency is ILS (backup for TASE stocks)
  if (asset.origin_currency === 'ILS') return true;
  
  return false;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled stock price update');

    // Create Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all assets from database
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('id, name, isin, class, sub_class, origin_currency, price');

    if (fetchError) {
      throw new Error(`Failed to fetch assets: ${fetchError.message}`);
    }

    if (!assets || assets.length === 0) {
      console.log('No assets found in database');
      return new Response(
        JSON.stringify({ success: true, message: 'No assets to update' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${assets.length} total assets`);

    // Filter eligible assets
    const eligibleAssets = assets.filter(isEligibleForUpdate);

    if (eligibleAssets.length === 0) {
      console.log('No eligible assets for price update');
      return new Response(
        JSON.stringify({ success: true, message: 'No eligible assets to update' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract unique tickers
    const uniqueTickers = Array.from(
      new Set(eligibleAssets.map((asset) => asset.isin).filter((isin): isin is string => !!isin))
    );

    console.log(`Updating prices for ${uniqueTickers.length} unique tickers:`, uniqueTickers);

    // Fetch prices using shared module
    const { prices, errors } = await fetchAllPrices(uniqueTickers);

    console.log(`Received ${Object.keys(prices).length} prices, ${Object.keys(errors).length} errors`);

    // Update assets in database
    let updatedCount = 0;
    const updateErrors: string[] = [];

    for (const asset of eligibleAssets) {
      const ticker = asset.isin;
      if (ticker && prices[ticker] !== undefined) {
        let adjustedPrice = prices[ticker];
        
        // Tel Aviv stocks are quoted in agorot (1/100 shekel)
        if (isTelAvivStock(asset)) {
          adjustedPrice = adjustedPrice / 100;
          console.log(`TASE conversion: ${ticker} ${prices[ticker]} → ${adjustedPrice}`);
        }
        
        // Update asset price in database
        const { error: updateError } = await supabase
          .from('assets')
          .update({ price: adjustedPrice })
          .eq('id', asset.id);

        if (updateError) {
          console.error(`Failed to update ${asset.name}:`, updateError);
          updateErrors.push(`${asset.name}: ${updateError.message}`);
        } else {
          console.log(`✓ Updated ${asset.name} (${ticker}): ${adjustedPrice}`);
          updatedCount++;
        }
      }
    }

    const errorCount = Object.keys(errors).length;
    const summary = {
      success: updatedCount > 0,
      updated: updatedCount,
      priceErrors: errorCount,
      updateErrors: updateErrors.length,
      message: `Updated ${updatedCount} assets. Price fetch errors: ${errorCount}. DB update errors: ${updateErrors.length}`,
    };

    console.log('Scheduled update complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scheduled-stock-price-update:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
