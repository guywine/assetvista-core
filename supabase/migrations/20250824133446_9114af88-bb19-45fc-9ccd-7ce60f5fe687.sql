-- Remove RLS policies and make assets table public
DROP POLICY IF EXISTS "Users can view their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can create their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON public.assets;

-- Disable RLS on assets table
ALTER TABLE public.assets DISABLE ROW LEVEL SECURITY;

-- Create public access policies
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view all assets" 
ON public.assets 
FOR SELECT 
USING (true);

CREATE POLICY "Public can create assets" 
ON public.assets 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can update assets" 
ON public.assets 
FOR UPDATE 
USING (true);

CREATE POLICY "Public can delete assets" 
ON public.assets 
FOR DELETE 
USING (true);

-- Make user_id nullable since we're removing auth requirement
ALTER TABLE public.assets ALTER COLUMN user_id DROP NOT NULL;