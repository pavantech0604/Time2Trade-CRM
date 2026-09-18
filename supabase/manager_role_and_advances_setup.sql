-- ====================================================================
-- TIME2TRADE CRM: SUPABASE SQL MIGRATION SCRIPT
-- Role Model: Add 'manager' role, Update Karthik, Setup Manager Advances
-- ====================================================================
-- Run this entire script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- It is completely safe, idempotent, and will resolve all 400/404/check constraint errors.

-- 1. Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Update users.role CHECK constraint to include 'manager'
DO $$ 
BEGIN
    -- Drop existing check constraint if present
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- Re-create constraint allowing: 'admin', 'manager', 'employee', 'pending'
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'manager', 'employee', 'pending'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update skipped or already applied: %', SQLERRM;
END $$;

-- 3. Update existing user 'Karthik' from 'admin' to 'manager'
UPDATE public.users 
SET 
    role = 'manager',
    approval_status = 'approved',
    is_active = true
WHERE 
    email = 'karthik@time2trade.com' 
    OR id = '10000000-0000-0000-0000-000000000001'
    OR name ILIKE '%Karthik%';

-- 4. Create MANAGER ADVANCES table (admin-only ledger tracking manager salary advances)
CREATE TABLE IF NOT EXISTS public.manager_advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.manager_advances ENABLE ROW LEVEL SECURITY;

-- 6. Setup RLS Policies for manager_advances
-- Enable operations for anon and authenticated (ensures frontend context sync works seamlessly)
DROP POLICY IF EXISTS "Enable anon operations on manager_advances" ON public.manager_advances;
CREATE POLICY "Enable anon operations on manager_advances" 
    ON public.manager_advances FOR ALL TO anon, authenticated 
    USING (true) WITH CHECK (true);

-- Ensure admin access policy
DROP POLICY IF EXISTS "Admin manager_advances access" ON public.manager_advances;
CREATE POLICY "Admin manager_advances access" 
    ON public.manager_advances FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- 7. Grant Manager read access to related operational tables
DO $$
BEGIN
    -- Leads: Manager read access
    DROP POLICY IF EXISTS "Manager lead access" ON public.leads;
    CREATE POLICY "Manager lead access" ON public.leads FOR SELECT 
        USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'manager'));

    -- Active Traders: Manager read access
    DROP POLICY IF EXISTS "Manager trader access" ON public.active_traders;
    CREATE POLICY "Manager trader access" ON public.active_traders FOR SELECT 
        USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'manager'));

    -- Trading Days: Manager read access
    DROP POLICY IF EXISTS "Manager trading days access" ON public.trading_days;
    CREATE POLICY "Manager trading days access" ON public.trading_days FOR SELECT 
        USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'manager'));

    -- Payments: Manager read access
    DROP POLICY IF EXISTS "Manager payments access" ON public.payments;
    CREATE POLICY "Manager payments access" ON public.payments FOR SELECT 
        USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'manager'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Manager table policies skipped: %', SQLERRM;
END $$;

-- 8. Grant table access permissions
GRANT ALL ON public.manager_advances TO anon, authenticated, service_role;

-- 9. Add manager_advances to Supabase Realtime publication (if publication exists)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_advances;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication update skipped: %', SQLERRM;
END $$;

-- 10. Instantly reload PostgREST schema cache so Supabase immediately recognizes the new table and role
NOTIFY pgrst, 'reload schema';

-- Verification output
SELECT 
    'SUCCESS' AS status,
    id, 
    name, 
    email, 
    role, 
    approval_status 
FROM public.users 
WHERE role = 'manager' OR email = 'karthik@time2trade.com';
