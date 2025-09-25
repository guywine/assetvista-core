-- Create app_config table for secure password storage
CREATE TABLE public.app_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a single-row config table)
CREATE POLICY "Allow all operations on app_config" 
ON public.app_config 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert the current password
INSERT INTO public.app_config (password_hash) VALUES ('Messi87');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();