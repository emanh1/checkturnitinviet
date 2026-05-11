CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_price INTEGER NOT NULL DEFAULT 15000,
    ai_credit_cost INTEGER NOT NULL DEFAULT 1,
    similarity_credit_cost INTEGER NOT NULL DEFAULT 1,
    combo_credit_cost INTEGER NOT NULL DEFAULT 2,
    announcement_text TEXT,
    announcement_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.system_settings TO authenticated;
GRANT SELECT ON public.system_settings TO anon;
GRANT ALL ON public.system_settings TO service_role;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.system_settings USING (is_admin());

-- Insert initial default row
INSERT INTO public.system_settings (credit_price, ai_credit_cost, similarity_credit_cost, combo_credit_cost, announcement_text, announcement_active)
VALUES (15000, 1, 1, 2, 'Chào mừng bạn đến với CheckTurnitinViet!', false);
