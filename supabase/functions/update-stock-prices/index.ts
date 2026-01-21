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

interface PolygonResponse {
  ticker: string;
  status: string;
  resultsCount: number;
  results?: Array<{
    T: string;  // Ticker
    c: number;  // Close price
    t: number;  // Timestamp
  }>;
}

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

    // Separate options (O:*) from regular stocks
    const optionSymbols = symbols.filter((s: string) => s.startsWith('O:'));
    const stockSymbols = symbols.filter((s: string) => !s.startsWith('O:'));

    console.log(`Processing ${stockSymbols.length} stocks and ${optionSymbols.length} options`);

    const prices: { [symbol: string]: number } = {};
    const errors: { [symbol: string]: string } = {};

    // Fetch stock prices from MarketStack
    if (stockSymbols.length > 0) {
      const marketStackApiKey = Deno.env.get('MARKETSTACK_API_KEY');
      if (!marketStackApiKey) {
        console.error('MARKETSTACK_API_KEY not found in environment');
        stockSymbols.forEach((symbol: string) => {
          errors[symbol] = 'MarketStack API key not configured';
        });
      } else {
        try {
          const symbolsParam = stockSymbols.join(',');
          const apiUrl = `http://api.marketstack.com/v2/eod/latest?access_key=${marketStackApiKey}&symbols=${symbolsParam}`;

          console.log('Calling MarketStack API...');
          const response = await fetch(apiUrl);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('MarketStack API error:', response.status, errorText);
            
            if (response.status === 429) {
              stockSymbols.forEach((symbol: string) => {
                errors[symbol] = 'Rate limit exceeded - try again later';
              });
            } else if (response.status === 503) {
              stockSymbols.forEach((symbol: string) => {
                errors[symbol] = 'MarketStack service temporarily unavailable';
              });
            } else {
              stockSymbols.forEach((symbol: string) => {
                errors[symbol] = `MarketStack API error: ${response.status}`;
              });
            }
          } else {
            const data: MarketStackResponse = await response.json();
            console.log(`Received data for ${data.data?.length || 0} symbols from MarketStack`);

            if (data.data && Array.isArray(data.data)) {
              data.data.forEach((item) => {
                if (item.symbol && typeof item.close === 'number') {
                  prices[item.symbol] = item.close;
                  console.log(`✓ Stock ${item.symbol}: ${item.close}`);
                }
              });
            }

            // Check for symbols that weren't returned
            const returnedSymbols = new Set(Object.keys(prices));
            stockSymbols.forEach((symbol: string) => {
              if (!returnedSymbols.has(symbol)) {
                errors[symbol] = 'Symbol not found or no recent data available';
                console.log(`✗ Stock ${symbol}: Not found in API response`);
              }
            });
          }
        } catch (err) {
          console.error('MarketStack fetch error:', err);
          stockSymbols.forEach((symbol: string) => {
            errors[symbol] = err instanceof Error ? err.message : 'Unknown error';
          });
        }
      }
    }

    // Fetch option prices from Polygon
    if (optionSymbols.length > 0) {
      const polygonApiKey = Deno.env.get('POLYGON_API_KEY');
      if (!polygonApiKey) {
        console.error('POLYGON_API_KEY not found in environment');
        optionSymbols.forEach((symbol: string) => {
          errors[symbol] = 'Polygon API key not configured';
        });
      } else {
        console.log('Fetching option prices from Polygon...');
        
        // Polygon requires individual API calls per ticker
        const polygonPromises = optionSymbols.map(async (symbol: string) => {
          try {
            const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?apiKey=${polygonApiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Polygon API error for ${symbol}:`, response.status, errorText);
              
              if (response.status === 429) {
                errors[symbol] = 'Rate limit exceeded - try again later';
              } else if (response.status === 403) {
                errors[symbol] = 'Polygon API access denied - check your subscription';
              } else {
                errors[symbol] = `Polygon API error: ${response.status}`;
              }
              return;
            }
            
            const data: PolygonResponse = await response.json();
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              prices[symbol] = data.results[0].c;  // Close price
              console.log(`✓ Option ${symbol}: ${data.results[0].c}`);
            } else {
              errors[symbol] = data.status === 'OK' ? 'No data available' : `API status: ${data.status}`;
              console.log(`✗ Option ${symbol}: ${errors[symbol]}`);
            }
          } catch (err) {
            console.error(`Polygon fetch error for ${symbol}:`, err);
            errors[symbol] = err instanceof Error ? err.message : 'Unknown error';
          }
        });
        
        await Promise.all(polygonPromises);
      }
    }

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