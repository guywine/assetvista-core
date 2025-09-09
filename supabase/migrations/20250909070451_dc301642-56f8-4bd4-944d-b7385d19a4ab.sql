-- Make asset_id nullable since we're using asset_name as the primary identifier
ALTER TABLE public.asset_liquidation_settings 
ALTER COLUMN asset_id DROP NOT NULL;