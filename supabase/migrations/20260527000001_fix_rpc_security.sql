-- Fix 1: Revoke public execution of process_vnpay_success to prevent anonymous unauthorized crediting
REVOKE EXECUTE ON FUNCTION public.process_vnpay_success(text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_vnpay_success(text, text, text, integer) TO service_role;

-- Fix 2: Rewrite get_revenue_sum to plpgsql and add is_admin() check
CREATE OR REPLACE FUNCTION get_revenue_sum(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS NUMERIC AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT COALESCE(SUM(amount), 0)
    FROM payments
    WHERE status = 'completed'
      AND created_at >= start_date
      AND created_at <= end_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Add is_admin() check to get_revenue_by_period
CREATE OR REPLACE FUNCTION get_revenue_by_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ, p_period TEXT)
RETURNS TABLE (period_date TIMESTAMPTZ, total_amount NUMERIC) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_period = 'daily' THEN
    RETURN QUERY
      SELECT date_trunc('day', created_at) AS period_date, COALESCE(SUM(amount), 0)::NUMERIC AS total_amount
      FROM payments
      WHERE status = 'completed' AND created_at >= start_date AND created_at <= end_date
      GROUP BY date_trunc('day', created_at)
      ORDER BY period_date;
  ELSIF p_period = 'weekly' THEN
    RETURN QUERY
      SELECT date_trunc('week', created_at) AS period_date, COALESCE(SUM(amount), 0)::NUMERIC AS total_amount
      FROM payments
      WHERE status = 'completed' AND created_at >= start_date AND created_at <= end_date
      GROUP BY date_trunc('week', created_at)
      ORDER BY period_date;
  ELSIF p_period = 'monthly' THEN
    RETURN QUERY
      SELECT date_trunc('month', created_at) AS period_date, COALESCE(SUM(amount), 0)::NUMERIC AS total_amount
      FROM payments
      WHERE status = 'completed' AND created_at >= start_date AND created_at <= end_date
      GROUP BY date_trunc('month', created_at)
      ORDER BY period_date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
