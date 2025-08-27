-- Create asset liquidation settings table
CREATE TABLE public.asset_liquidation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  liquidation_year TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id)
);

-- Enable Row Level Security
ALTER TABLE public.asset_liquidation_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for asset liquidation settings
CREATE POLICY "Allow all operations on asset_liquidation_settings" 
ON public.asset_liquidation_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_asset_liquidation_settings_updated_at
BEFORE UPDATE ON public.asset_liquidation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();