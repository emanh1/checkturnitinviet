-- Secure process_vnpay_success RPC
-- This function processes webhook events from VNPay and adds credits to users.
-- It must NOT be callable by clients or anonymous users to prevent credit spoofing.

-- 1. Revoke execute permission from the public role
REVOKE EXECUTE ON FUNCTION public.process_vnpay_success(text, text, text, integer) FROM PUBLIC;

-- 2. Revoke execute permission from anon and authenticated roles
REVOKE EXECUTE ON FUNCTION public.process_vnpay_success(text, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_vnpay_success(text, text, text, integer) FROM authenticated;

-- 3. Explicitly grant execute permission to the service_role
-- The trusted backend webhook handler should use the service_role key to invoke this.
GRANT EXECUTE ON FUNCTION public.process_vnpay_success(text, text, text, integer) TO service_role;
