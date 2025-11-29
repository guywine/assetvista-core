-- Create account_update_tracker table
CREATE TABLE public.account_update_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_entity TEXT NOT NULL,
  account_bank TEXT NOT NULL,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_entity, account_bank)
);

-- Enable RLS
ALTER TABLE public.account_update_tracker ENABLE ROW LEVEL SECURITY;

-- RLS policy (same pattern as other tables)
CREATE POLICY "Authorized access to account_update_tracker"
  ON public.account_update_tracker
  AS RESTRICTIVE
  FOR ALL
  USING (is_authorized());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_account_update_tracker_updated_at
BEFORE UPDATE ON public.account_update_tracker
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();