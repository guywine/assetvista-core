

## Set Up Daily FX Rate Cron Job

The stock price cron job already exists and runs at `0 6 * * *` (6:00 AM UTC daily). I'll add an identical cron job for FX rates.

### What I'll Do

Run this SQL via the Supabase SQL tools to schedule the FX rate update:

```sql
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

This mirrors the existing stock price cron job pattern exactly. Both will run daily at 6:00 AM UTC.

No code changes needed — just the cron job registration.

