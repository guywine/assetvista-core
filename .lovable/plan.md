

## Add Daily FX Rates Cron Job

### Current State

The `update-fx-rates` edge function is already fully self-contained:
- Fetches rates from exchangerate.host API
- Calculates cross-rates for all currencies (USD, EUR, CHF, CAD, HKD, GBP, ILS)
- Writes directly to the `fx_rates` table using the service role key

No code changes are needed - we just need to schedule a cron job.

---

### Implementation

**Database Migration Only**

Add a second cron job (alongside the existing stock price update) to call `update-fx-rates` at 6:00 AM UTC (8:00 AM Israel time):

```sql
-- Schedule daily FX rate update at 6:00 AM UTC (8:00 AM Israel time)
SELECT cron.schedule(
  'daily-fx-rate-update',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ntvpatckjaqkfozizszm.supabase.co/functions/v1/update-fx-rates',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dnBhdGNramFxa2Zveml6c3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDM5MDQsImV4cCI6MjA3MTUxOTkwNH0.r-EU8bZsnDIMDOoZMKZAm8B5feDcxAYSM1yMvjAbnw8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

### Result

| Cron Job | Schedule | Function |
|----------|----------|----------|
| `daily-stock-price-update` | 6:00 AM UTC (8:00 AM Israel) | `scheduled-stock-price-update` |
| `daily-fx-rate-update` | 6:00 AM UTC (8:00 AM Israel) | `update-fx-rates` |

Both will run at the same time each morning, updating stock prices and FX rates automatically.

