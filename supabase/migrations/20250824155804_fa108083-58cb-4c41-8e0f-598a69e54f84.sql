-- Create fx_rates table for storing exchange rates
CREATE TABLE public.fx_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL UNIQUE,
  to_usd_rate NUMERIC(10,6) NOT NULL DEFAULT 0,
  to_ils_rate NUMERIC(10,6) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'api',
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- Create policies - fx rates are public data
CREATE POLICY "FX rates are viewable by everyone" 
ON public.fx_rates 
FOR SELECT 
USING (true);

CREATE POLICY "FX rates can be updated by anyone" 
ON public.fx_rates 
FOR UPDATE 
USING (true);

CREATE POLICY "FX rates can be inserted by anyone" 
ON public.fx_rates 
FOR INSERT 
WITH CHECK (true);

-- Insert default rates for supported currencies
INSERT INTO public.fx_rates (currency, to_usd_rate, to_ils_rate, source) VALUES
('ILS', 0.28, 1.00, 'default'),
('USD', 1.00, 3.60, 'default'),
('EUR', 1.05, 3.78, 'default'),
('CHF', 1.10, 3.96, 'default'),
('CAD', 0.72, 2.59, 'default'),
('HKD', 0.13, 0.47, 'default');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fx_rates_updated_at
BEFORE UPDATE ON public.fx_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();