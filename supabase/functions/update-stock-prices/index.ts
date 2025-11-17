import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketStackDataItem {
  symbol: string;
  close: number;
  name: string;
  date: string;
}

interface MarketStackResponse {
  data: MarketStackDataItem[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting stock price update request');

    // Get API key from environment
    const apiKey = Deno.env.get('MARKETSTACK_API_KEY');
    if (!apiKey) {
      console.error('MARKETSTACK_API_KEY not found in environment');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MarketStack API key not configured',
          message: 'Please configure MARKETSTACK_API_KEY in Supabase secrets',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      console.error('Invalid symbols provided:', symbols);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request',
          message: 'Please provide an array of stock symbols',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Fetching prices for ${symbols.length} symbols:`, symbols);

    // Build MarketStack API URL
    const symbolsParam = symbols.join(',');
    const apiUrl = `http://api.marketstack.com/v2/eod/latest?access_key=${apiKey}&symbols=${symbolsParam}`;

    console.log('Calling MarketStack API...');
    
    // Fetch data from MarketStack
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('MarketStack API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Rate limit exceeded',
            message: 'MarketStack API rate limit exceeded. Please try again later.',
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`MarketStack API returned ${response.status}: ${errorText}`);
    }

    const data: MarketStackResponse = await response.json();
    console.log(`Received data for ${data.data?.length || 0} symbols from MarketStack`);

    // Process the response and build price map
    const prices: { [symbol: string]: number } = {};
    const errors: { [symbol: string]: string } = {};

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((item) => {
        if (item.symbol && typeof item.close === 'number') {
          prices[item.symbol] = item.close;
          console.log(`✓ ${item.symbol}: ${item.close}`);
        }
      });
    }

    // Check for symbols that weren't returned
    const returnedSymbols = new Set(Object.keys(prices));
    symbols.forEach((symbol) => {
      if (!returnedSymbols.has(symbol)) {
        errors[symbol] = 'Symbol not found or no recent data available';
        console.log(`✗ ${symbol}: Not found in API response`);
      }
    });

    const successCount = Object.keys(prices).length;
    const errorCount = Object.keys(errors).length;

    console.log(`Successfully retrieved ${successCount} prices, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        prices,
        errors,
        message: `Updated ${successCount} prices${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in update-stock-prices function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
