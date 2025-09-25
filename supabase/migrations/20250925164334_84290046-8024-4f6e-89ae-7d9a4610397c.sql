-- Drop the existing account_bank check constraint
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_account_bank_check;

-- Recreate the account_bank constraint with Off-Bank included
ALTER TABLE public.assets ADD CONSTRAINT assets_account_bank_check 
CHECK (account_bank = ANY (ARRAY['U bank'::text, 'Leumi 1'::text, 'Leumi 2'::text, 'Julius Bär'::text, 'Poalim'::text, 'Poalim Phoenix'::text, 'Leumi'::text, 'etoro'::text, 'Tom Trust'::text, 'Off-Bank'::text]));