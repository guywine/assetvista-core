import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExchangeRateResponse {
  success: boolean;
  base: string;
  date: string;
  rates: {
    [key: string]: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const exchangeRateApiKey = Deno.env.get('EXCHANGE_RATE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting FX rates update...');

    // Fetch latest rates from ExchangeRate-API (free tier)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();
    console.log('Fetched rates from API:', data);

    // Get ILS/USD rate for conversions
    const usdToIls = data.rates.ILS || 3.60; // fallback

    // Update rates for our supported currencies
    const currencies = ['ILS', 'USD', 'EUR', 'CHF', 'CAD', 'HKD'];
    const updates = [];

    for (const currency of currencies) {
      let toUsdRate = 1.0;
      let toIlsRate = usdToIls;

      if (currency === 'USD') {
        toUsdRate = 1.0;
        toIlsRate = usdToIls;
      } else if (currency === 'ILS') {
        toUsdRate = 1.0 / usdToIls;
        toIlsRate = 1.0;
      } else {
        const currencyRate = data.rates[currency];
        if (currencyRate) {
          toUsdRate = currencyRate;
          toIlsRate = currencyRate * usdToIls;
        }
      }

      // Update or insert the rate
      const { error } = await supabase
        .from('fx_rates')
        .upsert({
          currency,
          to_usd_rate: toUsdRate,
          to_ils_rate: toIlsRate,
          last_updated: new Date().toISOString(),
          source: 'api',
          is_manual_override: false
        }, {
          onConflict: 'currency'
        });

      if (error) {
        console.error(`Error updating ${currency}:`, error);
      } else {
        updates.push(`${currency}: ${toIlsRate.toFixed(3)} ILS`);
      }
    }

    console.log('Successfully updated rates:', updates);

    return new Response(JSON.stringify({ 
      success: true, 
      updated: updates.length,
      rates: updates,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-fx-rates function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});