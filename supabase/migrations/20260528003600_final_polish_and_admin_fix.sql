-- 1. Fix Admin Profile Management & Search Path in Trigger
-- The previous trigger prevented even Admins from updating user roles or credits via the client API.
-- We also add SET search_path = '' to trigger functions for defense-in-depth against search path attacks.

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- If bypass is set, allow the update (used by create_order_securely)
  IF pg_catalog.current_setting('app.bypass_profile_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow admins to update role and credits for users
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Otherwise, prevent changes to role and credits if called by authenticated user
  IF auth.uid() IS NOT NULL THEN
    NEW.role = OLD.role;
    NEW.credits = OLD.credits;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Add search_path = '' to update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;
