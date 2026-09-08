-- ====================================================================
-- TIME2TRADE CRM - DATABASE HEALTH & 400 ERROR FIX SCRIPT
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ====================================================================

-- 1. FIX PAYMENTS TABLE TO SUPPORT PROSPECTS & MANUAL CLIENTS
-- Allows direct payment submission before a client is converted to an active trader
ALTER TABLE public.payments ALTER COLUMN trader_id DROP NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- 2. CREATE MISSING ATTENDANCE LOGS TABLE (Fixes 404/400 on status changes)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    event_type TEXT NOT NULL,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_before TEXT,
    status_after TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CREATE MISSING USER PRESENCE TABLE (Fixes 404/400 on staff status sync)
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    current_status TEXT NOT NULL DEFAULT 'offline',
    last_status_change TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    today_login_time TIMESTAMPTZ,
    today_logout_time TIMESTAMPTZ,
    total_break_minutes INT NOT NULL DEFAULT 0,
    total_lunch_minutes INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ENABLE RLS AND SET POLICIES FOR ATTENDANCE & PRESENCE
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations on attendance_logs" ON public.attendance_logs;
CREATE POLICY "Enable all operations on attendance_logs" ON public.attendance_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations on user_presence" ON public.user_presence;
CREATE POLICY "Enable all operations on user_presence" ON public.user_presence FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. ENSURE USERS TABLE ROLES & RLS ALLOW SEAMLESS REGISTRATION & APPROVAL
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'employee', 'pending'));

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations on users" ON public.users;
CREATE POLICY "Enable all operations on users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. CREATE STORAGE BUCKETS FOR RECEIPTS & AVATARS
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('payment-proofs', 'payment-proofs', true),
  ('avatars', 'avatars', true),
  ('expense-receipts', 'expense-receipts', true),
  ('leads-photos', 'leads-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 7. STORAGE BUCKET POLICIES FOR PUBLIC UPLOAD & READ
DROP POLICY IF EXISTS "Public access to payment proofs" ON storage.objects;
CREATE POLICY "Public access to payment proofs" ON storage.objects FOR ALL TO anon, authenticated USING (bucket_id = 'payment-proofs') WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Public access to avatars" ON storage.objects;
CREATE POLICY "Public access to avatars" ON storage.objects FOR ALL TO anon, authenticated USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public access to expense receipts" ON storage.objects;
CREATE POLICY "Public access to expense receipts" ON storage.objects FOR ALL TO anon, authenticated USING (bucket_id = 'expense-receipts') WITH CHECK (bucket_id = 'expense-receipts');
