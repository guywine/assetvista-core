-- Drop the current RESTRICTIVE policy
DROP POLICY IF EXISTS "Authorized access to account_update_tracker" ON public.account_update_tracker;

-- Recreate it as PERMISSIVE (matches other tables like assets, sessions)
CREATE POLICY "Authorized access to account_update_tracker"
  ON public.account_update_tracker
  AS PERMISSIVE
  FOR ALL
  USING (is_authorized())
  WITH CHECK (is_authorized());