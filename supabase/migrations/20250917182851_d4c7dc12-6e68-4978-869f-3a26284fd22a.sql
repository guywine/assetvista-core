-- Drop old columns and add new ones for portfolio snapshots
ALTER TABLE public.portfolio_snapshots 
DROP COLUMN public_equity_value_usd,
DROP COLUMN fixed_income_value_usd;

-- Add new columns for the three categories
ALTER TABLE public.portfolio_snapshots 
ADD COLUMN liquid_fixed_income_value_usd NUMERIC DEFAULT 0,
ADD COLUMN real_estate_value_usd NUMERIC DEFAULT 0;