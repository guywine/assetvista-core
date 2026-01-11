-- Create table to store assets flagged as limited liquidity
CREATE TABLE public.limited_liquidity_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.limited_liquidity_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (same pattern as asset_liquidation_settings)
CREATE POLICY "Authorized access to limited_liquidity_assets"
  ON public.limited_liquidity_assets FOR ALL
  USING (is_authorized())
  WITH CHECK (is_authorized());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_limited_liquidity_assets_updated_at
  BEFORE UPDATE ON public.limited_liquidity_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();