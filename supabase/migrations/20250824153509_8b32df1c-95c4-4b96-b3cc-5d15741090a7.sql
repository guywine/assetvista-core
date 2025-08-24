-- Update the assets table check constraint to include the new "Cash & other" asset class
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_class_check;

-- Add the updated constraint that includes "Cash & other"
ALTER TABLE public.assets ADD CONSTRAINT assets_class_check 
CHECK (class IN ('Public Equity', 'Private Equity', 'Fixed Income', 'Cash & other'));