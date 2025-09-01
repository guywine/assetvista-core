-- Fix incorrect USD conversion rates in fx_rates table
-- Update USD rate to always be 1.0
UPDATE fx_rates 
SET to_usd_rate = 1.0 
WHERE currency = 'USD';

-- Update ILS rate (if 1 USD = to_ils_rate ILS, then 1 ILS = 1/to_ils_rate USD)
UPDATE fx_rates 
SET to_usd_rate = 1.0 / to_ils_rate 
WHERE currency = 'ILS';

-- Update other currencies based on their relationship to USD via ILS
-- Get the current USD to ILS rate first
UPDATE fx_rates 
SET to_usd_rate = to_ils_rate / (
  SELECT to_ils_rate FROM fx_rates WHERE currency = 'USD' LIMIT 1
)
WHERE currency NOT IN ('USD', 'ILS');