-- Fix critical security vulnerability: Make assets table user-specific
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public can view all assets" ON public.assets;
DROP POLICY IF EXISTS "Public can create assets" ON public.assets;
DROP POLICY IF EXISTS "Public can update assets" ON public.assets;
DROP POLICY IF EXISTS "Public can delete assets" ON public.assets;

-- Create secure user-specific policies
CREATE POLICY "Users can view their own assets" 
ON public.assets 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets" 
ON public.assets 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" 
ON public.assets 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" 
ON public.assets 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Also secure the portfolio_snapshots table
DROP POLICY IF EXISTS "Public can view all snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Public can create snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Public can update snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Public can delete snapshots" ON public.portfolio_snapshots;

CREATE POLICY "Users can view their own snapshots" 
ON public.portfolio_snapshots 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshots" 
ON public.portfolio_snapshots 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots" 
ON public.portfolio_snapshots 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots" 
ON public.portfolio_snapshots 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);