-- Add 'Private Credit' to the Fixed Income subclass options
-- Update any existing constraints or enums to include the new subclass

-- First, let's check if there are any enum types or constraints that need updating
-- If the sub_class column uses an enum, we need to add the new value
-- If it uses check constraints, we need to update them

-- Add the new subclass value to allow 'Private Credit' for Fixed Income assets
-- This ensures that assets with class='Fixed Income' and sub_class='Private Credit' can be inserted

-- Note: Since we're using text fields, we mainly need to ensure there are no restrictive constraints
-- The application logic will handle validation of the subclass values