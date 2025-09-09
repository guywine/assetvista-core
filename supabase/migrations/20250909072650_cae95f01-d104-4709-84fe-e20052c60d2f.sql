-- Remove user_id columns from all tables as they are not used anywhere
-- The application uses basic password protection, not user-based authentication

-- Remove user_id from assets table
ALTER TABLE public.assets DROP COLUMN user_id;

-- Remove user_id from asset_liquidation_settings table  
ALTER TABLE public.asset_liquidation_settings DROP COLUMN user_id;

-- Remove user_id from portfolio_snapshots table
ALTER TABLE public.portfolio_snapshots DROP COLUMN user_id;