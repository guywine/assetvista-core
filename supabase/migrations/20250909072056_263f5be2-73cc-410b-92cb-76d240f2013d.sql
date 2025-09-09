-- Remove the asset_id column from asset_liquidation_settings table
-- This column is no longer needed since we use asset_name as the primary identifier
ALTER TABLE public.asset_liquidation_settings DROP COLUMN asset_id;