-- 1. Secure `profiles` table UPDATE policy
-- Prevent users from updating their own `role` and `credits`
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is authenticated (not a service role or postgres admin)
  -- we prevent them from modifying role and credits.
  -- Supabase API calls from clients have auth.uid() defined.
  IF auth.uid() IS NOT NULL THEN
    NEW.role = OLD.role;
    NEW.credits = OLD.credits;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_profile_security ON profiles;
CREATE TRIGGER ensure_profile_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();

-- 2. Revoke manual INSERT on orders and documents
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;

-- 3. Secure employee UPDATE policy on orders
DROP POLICY IF EXISTS "Employees can update assigned orders" ON orders;
CREATE POLICY "Employees can update assigned orders"
ON orders
FOR UPDATE
USING (
  is_employee() AND (assigned_to = auth.uid() OR assigned_to IS NULL)
)
WITH CHECK (
  is_employee() AND (assigned_to = auth.uid() OR assigned_to IS NULL)
);

-- 4. Secure Order Creation RPC
-- Atomically deducts credits and creates document + order
CREATE OR REPLACE FUNCTION create_order_securely(
    p_file_name TEXT,
    p_file_path TEXT,
    p_file_size INT,
    p_mime_type TEXT,
    p_check_type TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

    SELECT * INTO v_settings FROM system_settings LIMIT 1;

    IF p_check_type = 'ai' THEN
        v_credits_required := v_settings.ai_credit_cost;
    ELSIF p_check_type = 'similarity' THEN
        v_credits_required := v_settings.similarity_credit_cost;
    ELSIF p_check_type = 'combo' THEN
        v_credits_required := v_settings.combo_credit_cost;
    ELSE
        RAISE EXCEPTION 'Invalid check type';
    END IF;

    SELECT credits INTO v_current_credits FROM profiles WHERE id = v_user_id;

    IF v_current_credits < v_credits_required THEN
        RAISE EXCEPTION 'Not enough credits';
    END IF;

    UPDATE profiles
    SET credits = credits - v_credits_required
    WHERE id = v_user_id;

    INSERT INTO documents (
        user_id,
        original_filename,
        stored_filename,
        file_path,
        file_size,
        mime_type
    ) VALUES (
        v_user_id,
        p_file_name,
        split_part(p_file_path, '/', 2),
        p_file_path,
        p_file_size,
        p_mime_type
    ) RETURNING id INTO v_document_id;

    INSERT INTO orders (
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

    RETURN jsonb_build_object(
        'id', v_order_id,
        'user_id', v_user_id,
        'document_id', v_document_id,
        'check_type', p_check_type,
        'status', v_order_status,
        'created_at', v_order_created_at
    );
END;
$$;
