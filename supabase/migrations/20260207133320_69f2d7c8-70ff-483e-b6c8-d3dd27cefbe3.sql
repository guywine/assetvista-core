-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule daily at 6:00 AM UTC (8:00 AM Israel time)
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