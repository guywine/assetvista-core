import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExchangeRateResponse {
  success: boolean;
  quotes: {
    [key: string]: number;
  };
  source: string;
  timestamp: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting FX rate update from exchangerate.host API');

    const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY');
    if (!apiKey) {
      throw new Error('EXCHANGE_RATE_API_KEY not configured');
    }

    // Make a single API call with ILS as source, fetching all needed currencies
    const currencies = 'USD,EUR,CHF,CAD,HKD,GBP';
    const apiUrl = `https://api.exchangerate.host/live?access_key=${apiKey}&source=ILS&currencies=${currencies}`;
    
    console.log('Fetching rates from API...');
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
      throw new Error(`API request failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const apiData: ExchangeRateResponse = await apiResponse.json();
    
    if (!apiData.success) {
      throw new Error('API returned unsuccessful response');
    }

    console.log('API response received:', apiData);

    // Extract rates from the response
    const ilsToUsd = apiData.quotes['ILSUSD'];
    const ilsToEur = apiData.quotes['ILSEUR'];
    const ilsToChf = apiData.quotes['ILSCHF'];
    const ilsToCad = apiData.quotes['ILSCAD'];
    const ilsToHkd = apiData.quotes['ILSHKD'];
    const ilsToGbp = apiData.quotes['ILSGBP'];

    if (!ilsToUsd) {
      throw new Error('Missing USD rate in API response');
    }

    console.log('Calculating cross-rates...');

    // Calculate all rates for database
    const ratesToUpdate = [
      {
        currency: 'ILS',
        to_usd_rate: ilsToUsd,
        to_ils_rate: 1.0,
      },
      {
        currency: 'USD',
        to_usd_rate: 1.0,
        to_ils_rate: 1 / ilsToUsd,
      },
      {
        currency: 'EUR',
        to_usd_rate: ilsToUsd / ilsToEur,
        to_ils_rate: 1 / ilsToEur,
      },
      {
        currency: 'CHF',
        to_usd_rate: ilsToUsd / ilsToChf,
        to_ils_rate: 1 / ilsToChf,
      },
      {
        currency: 'CAD',
        to_usd_rate: ilsToUsd / ilsToCad,
        to_ils_rate: 1 / ilsToCad,
      },
      {
        currency: 'HKD',
        to_usd_rate: ilsToUsd / ilsToHkd,
        to_ils_rate: 1 / ilsToHkd,
      },
      {
        currency: 'GBP',
        to_usd_rate: ilsToUsd / ilsToGbp,
        to_ils_rate: 1 / ilsToGbp,
      },
    ];

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Updating database with calculated rates...');

    // Batch update all rates with override (ignores is_manual_override)
    const { error: updateError } = await supabase
      .from('fx_rates')
      .upsert(
        ratesToUpdate.map(rate => ({
          currency: rate.currency,
          to_usd_rate: rate.to_usd_rate,
          to_ils_rate: rate.to_ils_rate,
          last_updated: new Date().toISOString(),
          source: 'api',
          is_manual_override: false, // Reset manual override flag
        })),
        {
          onConflict: 'currency',
        }
      );

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Successfully updated all FX rates');

    const response = {
      success: true,
      updated_count: ratesToUpdate.length,
      rates: Object.fromEntries(
        ratesToUpdate.map(r => [
          r.currency,
          { to_ils: r.to_ils_rate, to_usd: r.to_usd_rate }
        ])
      ),
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in update-fx-rates function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
