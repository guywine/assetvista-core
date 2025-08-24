-- Create table for portfolio snapshots
CREATE TABLE public.portfolio_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  fx_rates JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_value_usd NUMERIC DEFAULT 0,
  private_equity_value_usd NUMERIC DEFAULT 0,
  public_equity_value_usd NUMERIC DEFAULT 0,
  fixed_income_value_usd NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching assets table pattern)
CREATE POLICY "Public can view all snapshots" 
ON public.portfolio_snapshots 
FOR SELECT 
USING (true);

CREATE POLICY "Public can create snapshots" 
ON public.portfolio_snapshots 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can update snapshots" 
ON public.portfolio_snapshots 
FOR UPDATE 
USING (true);

CREATE POLICY "Public can delete snapshots" 
ON public.portfolio_snapshots 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_portfolio_snapshots_updated_at
BEFORE UPDATE ON public.portfolio_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();