-- Remove user_id requirements from assets table
ALTER TABLE public.assets ALTER COLUMN user_id DROP NOT NULL;

-- Remove user_id requirements from portfolio_snapshots table  
ALTER TABLE public.portfolio_snapshots ALTER COLUMN user_id DROP NOT NULL;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can create their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON public.assets;

DROP POLICY IF EXISTS "Users can view their own snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Users can create their own snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Users can update their own snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Users can delete their own snapshots" ON public.portfolio_snapshots;

-- Disable RLS on both tables to allow public access
ALTER TABLE public.assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots DISABLE ROW LEVEL SECURITY;