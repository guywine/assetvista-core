-- Update the sub_class check constraint to allow currencies for Cash assets
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_sub_class_check;

-- Create new constraint that allows currencies as Cash subclasses
ALTER TABLE public.assets ADD CONSTRAINT assets_sub_class_check CHECK (
  (class = 'Public Equity' AND sub_class IN ('Big Tech', 'China', 'other')) OR
  (class = 'Private Equity' AND sub_class IN ('Initial', 'Near Future', 'Growth', 'none')) OR
  (class = 'Fixed Income' AND sub_class IN ('Money Market', 'Gov 1-2', 'Gov long', 'CPI linked', 'Corporate', 'REIT stock', 'none')) OR
  (class = 'Cash' AND sub_class IN ('ILS', 'USD', 'CHF', 'EUR', 'CAD', 'HKD')) OR
  (class = 'Commodities & more' AND sub_class IN ('Cryptocurrency', 'Commodities')) OR
  (class = 'Real Estate' AND sub_class IN ('Living', 'Tel-Aviv', 'Abroad'))
);