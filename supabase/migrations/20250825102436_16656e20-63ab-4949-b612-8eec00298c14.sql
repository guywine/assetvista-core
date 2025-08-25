-- Update maturity_date column to allow "none" value for REIT stock
-- Change from date type to text type to accommodate both dates and "none"
ALTER TABLE public.assets ALTER COLUMN maturity_date TYPE text USING maturity_date::text;