import { fetchAllPrices } from '../_shared/stock-prices.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting stock/option price update request');

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

    // Fetch prices using shared module
    const { prices, errors } = await fetchAllPrices(symbols);

    const successCount = Object.keys(prices).length;
    const errorCount = Object.keys(errors).length;

    console.log(`Update complete: ${successCount} prices retrieved, ${errorCount} errors`);

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
