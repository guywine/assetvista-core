-- Add "Bank Deposit" to the Fixed Income sub-class constraint
ALTER TABLE public.assets DROP CONSTRAINT assets_sub_class_check;

ALTER TABLE public.assets ADD CONSTRAINT assets_sub_class_check 
CHECK ((((class = 'Public Equity'::text) AND (sub_class = ANY (ARRAY['Big Tech'::text, 'China'::text, 'other'::text]))) OR 
        ((class = 'Private Equity'::text) AND (sub_class = ANY (ARRAY['Initial'::text, 'Near Future'::text, 'Growth'::text, 'none'::text]))) OR 
        ((class = 'Fixed Income'::text) AND (sub_class = ANY (ARRAY['Money Market'::text, 'Gov 1-2'::text, 'Gov long'::text, 'CPI linked'::text, 'Corporate'::text, 'REIT stock'::text, 'Private Credit'::text, 'Bank Deposit'::text, 'none'::text]))) OR 
        ((class = 'Cash'::text) AND (sub_class = ANY (ARRAY['ILS'::text, 'USD'::text, 'CHF'::text, 'EUR'::text, 'CAD'::text, 'HKD'::text]))) OR 
        ((class = 'Commodities & more'::text) AND (sub_class = ANY (ARRAY['Cryptocurrency'::text, 'Commodities'::text]))) OR 
        ((class = 'Real Estate'::text) AND (sub_class = ANY (ARRAY['Living'::text, 'Tel-Aviv'::text, 'Abroad'::text])))));