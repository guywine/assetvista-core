-- Enable Row Level Security on both tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Since this is a password-protected app without user authentication,
-- create policies that allow all operations for authenticated sessions
-- (the password protection handles access control at the application level)

-- Assets table policies
CREATE POLICY "Allow all operations on assets" ON public.assets
FOR ALL USING (true)
WITH CHECK (true);

-- Portfolio snapshots table policies  
CREATE POLICY "Allow all operations on portfolio_snapshots" ON public.portfolio_snapshots
FOR ALL USING (true)
WITH CHECK (true);