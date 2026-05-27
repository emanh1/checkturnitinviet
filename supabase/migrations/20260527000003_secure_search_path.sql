-- Fix search_path vulnerability for SECURITY DEFINER functions
-- By setting search_path = '' we ensure that attackers cannot manipulate the search_path
-- to execute malicious functions in place of expected ones (e.g., auth.uid() or table queries).

-- 1. is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. is_employee
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'employee'
  );
$$;

-- 3. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    credits
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      pg_catalog.split_part(NEW.email, '@', 1),
      'User'
    ),
    0
  );

  RETURN NEW;
END;
$$;

-- 4. create_order_securely
CREATE OR REPLACE FUNCTION public.create_order_securely(
    p_file_name TEXT,
    p_file_path TEXT,
    p_file_size INT,
    p_mime_type TEXT,
    p_check_type TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_credits_required INT;
    v_current_credits INT;
    v_document_id UUID;
    v_order_id UUID;
    v_order_status TEXT;
    v_order_created_at TIMESTAMP WITH TIME ZONE;
    v_settings record;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_file_path NOT LIKE (v_user_id::text || '/%') THEN
        RAISE EXCEPTION 'Invalid file path: must belong to the authenticated user';
    END IF;

    SELECT * INTO v_settings FROM public.system_settings LIMIT 1;

    IF p_check_type = 'ai' THEN
        v_credits_required := v_settings.ai_credit_cost;
    ELSIF p_check_type = 'similarity' THEN
        v_credits_required := v_settings.similarity_credit_cost;
    ELSIF p_check_type = 'combo' THEN
        v_credits_required := v_settings.combo_credit_cost;
    ELSE
        RAISE EXCEPTION 'Invalid check type';
    END IF;

    SELECT credits INTO v_current_credits FROM public.profiles WHERE id = v_user_id FOR UPDATE;

    IF v_current_credits < v_credits_required THEN
        RAISE EXCEPTION 'Not enough credits';
    END IF;

    PERFORM pg_catalog.set_config('app.bypass_profile_trigger', 'true', true);

    UPDATE public.profiles
    SET credits = credits - v_credits_required
    WHERE id = v_user_id;

    INSERT INTO public.documents (
        user_id,
        original_filename,
        stored_filename,
        file_path,
        file_size,
        mime_type
    ) VALUES (
        v_user_id,
        p_file_name,
        pg_catalog.split_part(p_file_path, '/', 2),
        p_file_path,
        p_file_size,
        p_mime_type
    ) RETURNING id INTO v_document_id;

    INSERT INTO public.orders (
        user_id,
        document_id,
        check_type,
        status
    ) VALUES (
        v_user_id,
        v_document_id,
        p_check_type,
        'pending'
    ) RETURNING id, status, created_at INTO v_order_id, v_order_status, v_order_created_at;

    RETURN pg_catalog.jsonb_build_object(
        'id', v_order_id,
        'user_id', v_user_id,
        'document_id', v_document_id,
        'check_type', p_check_type,
        'status', v_order_status,
        'created_at', v_order_created_at
    );
END;
$$;

-- 5. process_vnpay_success
CREATE OR REPLACE FUNCTION public.process_vnpay_success(
  p_transaction_id text,
  p_transaction_no text,
  p_bank_code text,
  p_expected_amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment record;
BEGIN
  SELECT * INTO v_payment FROM public.payments 
  WHERE transaction_id = p_transaction_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_payment.status = 'completed' THEN
    RETURN;
  END IF;

  IF (v_payment.amount * 100) != p_expected_amount THEN
    RAISE EXCEPTION 'Amount mismatch';
  END IF;

  UPDATE public.payments
  SET status = 'completed',
      transaction_no = p_transaction_no,
      bank_code = p_bank_code,
      updated_at = now()
  WHERE id = v_payment.id;

  UPDATE public.profiles
  SET credits = coalesce(credits, 0) + v_payment.credits_added,
      updated_at = now()
  WHERE id = v_payment.user_id;

END;
$$;

-- 6. get_revenue_sum
CREATE OR REPLACE FUNCTION public.get_revenue_sum(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.payments
    WHERE status = 'completed'
      AND created_at >= start_date
      AND created_at <= end_date
  );
END;
$$;

-- 7. get_revenue_by_period
CREATE OR REPLACE FUNCTION public.get_revenue_by_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ, p_period TEXT)
RETURNS TABLE (period_date TIMESTAMPTZ, total_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_period = 'daily' THEN
    RETURN QUERY
      SELECT date_trunc('day', created_at) AS period_date, COALESCE(SUM(amount), 0)::NUMERIC AS total_amount
      FROM public.payments
      WHERE status = 'completed' AND created_at >= start_date AND created_at <= end_date
      GROUP BY date_trunc('day', created_at)
      ORDER BY period_date;
  ELSIF p_period = 'weekly' THEN
    RETURN QUERY
      SELECT date_trunc('week', created_at) AS period_date, COALESCE(SUM(amount), 0)::NUMERIC AS total_amount
      FROM public.payments
      WHERE status = 'completed' AND created_at >= start_date AND created_at <= end_date
      GROUP BY date_trunc('week', created_at)
      ORDER BY period_date;
  ELSIF p_period = 'monthly' THEN
    RETURN QUERY
      SELECT date_trunc('month', created_at) AS period_date, COALESCE(SUM(amount), 0)::NUMERIC AS total_amount
      FROM public.payments
      WHERE status = 'completed' AND created_at >= start_date AND created_at <= end_date
      GROUP BY date_trunc('month', created_at)
      ORDER BY period_date;
  END IF;
END;
$$;

-- 8. delete_old_documents
CREATE OR REPLACE FUNCTION public.delete_old_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'documents'
  AND name IN (
    SELECT file_path 
    FROM public.documents 
    WHERE uploaded_at < NOW() - INTERVAL '3 days'
    AND file_path != '[DELETED]'
  );

  UPDATE public.documents 
  SET file_path = '[DELETED]'
  WHERE uploaded_at < NOW() - INTERVAL '3 days'
  AND file_path != '[DELETED]';
END;
$$;
