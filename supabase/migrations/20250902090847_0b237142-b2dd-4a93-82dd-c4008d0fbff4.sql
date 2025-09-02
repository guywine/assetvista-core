-- Add Private Equity specific fields to assets table
ALTER TABLE public.assets 
ADD COLUMN pe_company_value numeric,
ADD COLUMN pe_holding_percentage numeric;