-- Drop the public read policy on promo_codes
-- This locks down the table so no client-side queries can read promo codes.
-- The backend API now relies on service_role to validate codes.

DROP POLICY IF EXISTS "Enable read access for all users" ON public.promo_codes;
