-- Add GBP currency to fx_rates table
INSERT INTO public.fx_rates (currency, to_usd_rate, to_ils_rate, source)
VALUES ('GBP', 1.27, 4.63, 'manual')
ON CONFLICT (currency) DO NOTHING;