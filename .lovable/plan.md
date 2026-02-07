

## Refactor Stock Price Update with Shared Logic + Cron Job

### Approach

Extract the API-calling logic into a shared utility file that both the existing `update-stock-prices` function and the new `scheduled-stock-price-update` function can import. This avoids code duplication.

```text
supabase/functions/
├── _shared/
│   └── stock-prices.ts        ← NEW: Shared price-fetching logic
├── update-stock-prices/
│   └── index.ts               ← Refactored: Uses shared logic
└── scheduled-stock-price-update/
    └── index.ts               ← NEW: Cron-triggered, uses shared logic + DB write
```

---

### Changes Required

#### 1. Create Shared Module: `supabase/functions/_shared/stock-prices.ts`

Extract the core price-fetching logic:
- `fetchStockPrices(symbols: string[])` - calls MarketStack API
- `fetchOptionPrices(symbols: string[])` - calls Polygon API  
- `fetchAllPrices(symbols: string[])` - separates stocks/options and calls both

This module returns `{ prices, errors }` without any HTTP response handling.

#### 2. Refactor Existing: `supabase/functions/update-stock-prices/index.ts`

Simplify to:
1. Parse request body for symbols
2. Call `fetchAllPrices(symbols)` from shared module
3. Return JSON response

#### 3. Create New: `supabase/functions/scheduled-stock-price-update/index.ts`

This function will:
1. Fetch all assets from database (using service role key)
2. Filter eligible assets (same logic as frontend `useStockPrices.ts`)
3. Call `fetchAllPrices(tickers)` from shared module
4. Handle Tel Aviv stock conversion (agorot → shekels)
5. Update asset prices directly in database

#### 4. Update Config: `supabase/config.toml`

Add:
```toml
[functions.scheduled-stock-price-update]
verify_jwt = false
```

#### 5. Database: Enable Extensions + Create Cron Job

SQL to run (via migration tool):
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule daily at 6:00 AM UTC (8:00 AM Israel)
SELECT cron.schedule(
  'daily-stock-price-update',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ntvpatckjaqkfozizszm.supabase.co/functions/v1/scheduled-stock-price-update',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dnBhdGNramFxa2Zveml6c3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDM5MDQsImV4cCI6MjA3MTUxOTkwNH0.r-EU8bZsnDIMDOoZMKZAm8B5feDcxAYSM1yMvjAbnw8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

### Summary of Files

| File | Action | Purpose |
|------|--------|---------|
| `_shared/stock-prices.ts` | Create | Shared price-fetching logic |
| `update-stock-prices/index.ts` | Refactor | Use shared module, keep HTTP handling |
| `scheduled-stock-price-update/index.ts` | Create | Cron handler: read assets, fetch prices, update DB |
| `config.toml` | Update | Add new function config |
| Database migration | Run | Enable pg_cron, pg_net, create schedule |

---

### Result

- **Manual button**: Works exactly as before (frontend → `update-stock-prices` → returns prices → frontend updates DB)
- **Automated cron**: Runs at 8:00 AM Israel time daily, updates all eligible assets directly
- **No code duplication**: Both functions share the same API-calling logic

