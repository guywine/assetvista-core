-- Create pending_assets table
CREATE TABLE public.pending_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  value_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pending_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy using existing is_authorized function
CREATE POLICY "Authorized access to pending_assets"
ON public.pending_assets
AS RESTRICTIVE
FOR ALL
USING (is_authorized())
WITH CHECK (is_authorized());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pending_assets_updated_at
BEFORE UPDATE ON public.pending_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();