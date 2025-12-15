-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authorized access to pending_assets" ON public.pending_assets;

-- Create separate policies for each operation with proper access control
CREATE POLICY "Authorized users can view pending_assets"
ON public.pending_assets
FOR SELECT
USING (is_authorized());

CREATE POLICY "Authorized users can insert pending_assets"
ON public.pending_assets
FOR INSERT
WITH CHECK (is_authorized());

CREATE POLICY "Authorized users can update pending_assets"
ON public.pending_assets
FOR UPDATE
USING (is_authorized())
WITH CHECK (is_authorized());

CREATE POLICY "Authorized users can delete pending_assets"
ON public.pending_assets
FOR DELETE
USING (is_authorized());