-- Update the account_bank check constraint to include all the correct banks
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_account_bank_check;

-- Create new constraint with all the banks from the updated mapping
ALTER TABLE public.assets ADD CONSTRAINT assets_account_bank_check CHECK (
  account_bank IN ('U bank', 'Leumi 1', 'Leumi 2', 'Julius Bär', 'Poalim', 'Poalim Phoenix', 'Leumi', 'etoro', 'Tom Trust')
);