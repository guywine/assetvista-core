-- Add beneficiary column to assets table
ALTER TABLE public.assets 
ADD COLUMN beneficiary TEXT DEFAULT 'Kids';

-- Update existing assets with correct beneficiary based on account_entity
UPDATE public.assets 
SET beneficiary = CASE 
    WHEN account_entity IN ('Shimon', 'B Joel') THEN 'Shimon'
    WHEN account_entity = 'Hagit' THEN 'Hagit'
    WHEN account_entity IN ('Guy', 'Roy', 'Roni', 'SW2009', 'Weintraub') THEN 'Kids'
    WHEN account_entity = 'Tom' THEN 'Tom'
    ELSE 'Kids'
END;

-- Make the column NOT NULL after data population
ALTER TABLE public.assets 
ALTER COLUMN beneficiary SET NOT NULL;