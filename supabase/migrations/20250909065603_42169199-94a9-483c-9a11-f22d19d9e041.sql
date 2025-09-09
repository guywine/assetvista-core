-- Step 1: Add new asset_name column
ALTER TABLE asset_liquidation_settings 
ADD COLUMN asset_name TEXT;

-- Step 2: Populate asset_name from assets table
UPDATE asset_liquidation_settings 
SET asset_name = (
  SELECT name FROM assets WHERE assets.id = asset_liquidation_settings.asset_id
);

-- Step 3: Delete duplicate entries, keeping only the earliest one for each asset name
DELETE FROM asset_liquidation_settings a
USING asset_liquidation_settings b
WHERE a.id > b.id 
  AND a.asset_name = b.asset_name;

-- Step 4: Make asset_name NOT NULL (after populating and deduplicating)
ALTER TABLE asset_liquidation_settings 
ALTER COLUMN asset_name SET NOT NULL;

-- Step 5: Create unique constraint on asset_name
ALTER TABLE asset_liquidation_settings 
ADD CONSTRAINT unique_asset_name UNIQUE (asset_name);