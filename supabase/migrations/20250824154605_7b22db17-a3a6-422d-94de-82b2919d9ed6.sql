-- Update asset class check constraint to include new classes
ALTER TABLE public.assets 
DROP CONSTRAINT IF EXISTS assets_class_check;

ALTER TABLE public.assets 
ADD CONSTRAINT assets_class_check 
CHECK (class IN ('Public Equity', 'Private Equity', 'Fixed Income', 'Cash', 'Commodities & more', 'Real Estate'));

-- Update sub_class check constraint to include new subclasses
ALTER TABLE public.assets 
DROP CONSTRAINT IF EXISTS assets_sub_class_check;

ALTER TABLE public.assets 
ADD CONSTRAINT assets_sub_class_check 
CHECK (sub_class IN (
  'Big Tech', 'China', 'other',
  'Initial', 'Near Future', 'Growth', 'none',
  'Money Market', 'Gov 1-2', 'Gov long', 'CPI linked', 'Corporate', 'REIT stock',
  'Cryptocurrency', 'Commodities',
  'Living', 'Tel-Aviv', 'Abroad'
));