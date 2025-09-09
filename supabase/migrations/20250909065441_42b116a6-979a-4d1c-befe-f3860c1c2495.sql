-- First, let's see what data exists in asset_liquidation_settings
-- to properly migrate it

-- Step 1: Add new asset_name column
ALTER TABLE asset_liquidation_settings 
ADD COLUMN asset_name TEXT;

-- Step 2: Populate asset_name from assets table
UPDATE asset_liquidation_settings 
SET asset_name = (
  SELECT name FROM assets WHERE assets.id = asset_liquidation_settings.asset_id
);

-- Step 3: Make asset_name NOT NULL (after populating)
ALTER TABLE asset_liquidation_settings 
ALTER COLUMN asset_name SET NOT NULL;

-- Step 4: Create unique constraint on asset_name
ALTER TABLE asset_liquidation_settings 
ADD CONSTRAINT unique_asset_name UNIQUE (asset_name);

-- Step 5: Drop the old asset_id column (we'll keep it for now to be safe)
-- We can drop it later: ALTER TABLE asset_liquidation_settings DROP COLUMN asset_id;