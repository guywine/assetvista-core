-- Add is_cash_equivalent column to assets table
ALTER TABLE public.assets 
ADD COLUMN is_cash_equivalent BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering performance
CREATE INDEX idx_assets_is_cash_equivalent ON public.assets(is_cash_equivalent);

-- Update existing assets to set is_cash_equivalent based on current logic
UPDATE public.assets 
SET is_cash_equivalent = true 
WHERE class = 'Cash';

-- Update Fixed Income assets: Money Market and Bank Deposits
UPDATE public.assets 
SET is_cash_equivalent = true 
WHERE class = 'Fixed Income' 
AND sub_class IN ('Money Market', 'Bank Deposit');

-- Update Fixed Income assets maturing within 365 days
UPDATE public.assets 
SET is_cash_equivalent = true 
WHERE class = 'Fixed Income' 
AND maturity_date IS NOT NULL 
AND maturity_date != '' 
AND (
  -- Check if maturity_date is within next 365 days
  -- Parse the date string (assuming format like '2024-12-31')
  CASE 
    WHEN maturity_date ~ '^\d{4}-\d{2}-\d{2}$' THEN 
      TO_DATE(maturity_date, 'YYYY-MM-DD') <= (CURRENT_DATE + INTERVAL '365 days')
    ELSE false
  END
);