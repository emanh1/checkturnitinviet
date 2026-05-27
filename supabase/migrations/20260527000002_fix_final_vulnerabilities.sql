-- 1. Fix Race Condition and IDOR in create_order_securely
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

    -- SECURITY FIX 1: Prevent IDOR by ensuring the user can only create orders for their own files
    IF p_file_path NOT LIKE (v_user_id::text || '/%') THEN
        RAISE EXCEPTION 'Invalid file path: must belong to the authenticated user';
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

    -- SECURITY FIX 2: Prevent Race Condition by locking the row FOR UPDATE
    SELECT credits INTO v_current_credits FROM profiles WHERE id = v_user_id FOR UPDATE;

    IF v_current_credits < v_credits_required THEN
        RAISE EXCEPTION 'Not enough credits';
    END IF;

    -- Temporarily disable the profile protection trigger for this transaction
    PERFORM set_config('app.bypass_profile_trigger', 'true', true);

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

-- 2. Revoke public execution of delete_old_documents to prevent unauthorized or premature calls
REVOKE EXECUTE ON FUNCTION public.delete_old_documents() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_old_documents() TO service_role;
