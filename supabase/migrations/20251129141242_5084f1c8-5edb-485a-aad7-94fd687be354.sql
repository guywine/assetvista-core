-- Fix RLS policy to allow INSERT operations with WITH CHECK clause
DROP POLICY IF EXISTS "Authorized access to account_update_tracker" ON public.account_update_tracker;

CREATE POLICY "Authorized access to account_update_tracker"
  ON public.account_update_tracker
  AS RESTRICTIVE
  FOR ALL
  USING (is_authorized())
  WITH CHECK (is_authorized());