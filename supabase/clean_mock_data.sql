-- ====================================================================
-- TIME2TRADE CRM - CLEAN ALL MOCK DATA & UPDATE SCHEMA
-- Run this script in your Supabase SQL Editor.
-- It safely adds missing approval columns, purges all mock data,
-- and preserves your real admin and real employee accounts.
-- ====================================================================

-- 1. Ensure all required columns exist in the users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Remove mock trading days
DELETE FROM public.trading_days 
WHERE trader_id IN (
    SELECT id FROM public.active_traders WHERE id::text LIKE '30000000%'
) OR id::text LIKE '30000000%';

-- 3. Remove mock payments
DELETE FROM public.payments 
WHERE id::text LIKE '40000000%' 
   OR utr IN ('UTR994820194821', 'IMPS883019284711');

-- 4. Remove mock active traders
DELETE FROM public.active_traders 
WHERE id::text LIKE '30000000%' 
   OR name IN ('Sneha Kapoor', 'Devendra Patel', 'Amitabh Singhania');

-- 5. Remove mock leads
DELETE FROM public.leads 
WHERE id::text LIKE '20000000%' 
   OR name IN ('Aarav Mehta', 'Sneha Kapoor', 'Rohan Gupta', 'Kavita Joshi');

-- 6. Remove mock expenses
DELETE FROM public.expenses 
WHERE id::text LIKE '50000000%';

-- 7. Remove mock attendance logs if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_logs') THEN
        DELETE FROM public.attendance_logs 
        WHERE user_name IN ('Priya Verma', 'Ankit Kumar', 'Vikram Malhotra', 'Rahul Saxena', 'Rajesh Sharma')
           OR user_id::text LIKE '10000000-0000-0000-0000-00000000000[2-9]';
    END IF;
END $$;

-- 8. Remove mock employees from users table (KEEPS real employees and admin)
DELETE FROM public.users 
WHERE email ILIKE '%@capitalgrow.com'
   OR name IN ('Priya Verma', 'Ankit Kumar', 'Vikram Malhotra', 'Rahul Saxena', 'Rajesh Sharma')
   OR id IN (
       '10000000-0000-0000-0000-000000000002',
       '10000000-0000-0000-0000-000000000003',
       '10000000-0000-0000-0000-000000000004',
       '10000000-0000-0000-0000-000000000005'
   );

-- 9. Confirm admin user exists and is approved
INSERT INTO public.users (id, name, email, role, is_active, approval_status)
VALUES ('10000000-0000-0000-0000-000000000001', 'Karthik Muni', 'karthik@time2trade.com', 'admin', true, 'approved')
ON CONFLICT (id) DO UPDATE SET 
    name = 'Karthik Muni',
    email = 'karthik@time2trade.com',
    role = 'admin',
    is_active = true,
    approval_status = 'approved';
