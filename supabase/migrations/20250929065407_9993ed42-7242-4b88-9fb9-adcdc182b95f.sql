-- Fix FX rates security: Replace permissive policies with session-authenticated ones

-- Drop existing permissive policies
DROP POLICY "FX rates can be updated by anyone" ON fx_rates;
DROP POLICY "FX rates can be inserted by anyone" ON fx_rates;

-- Create new secured policies that require valid session authentication
CREATE POLICY "Authorized users can update FX rates" ON fx_rates
  FOR UPDATE USING (is_authorized());

CREATE POLICY "Authorized users can insert FX rates" ON fx_rates
  FOR INSERT WITH CHECK (is_authorized());