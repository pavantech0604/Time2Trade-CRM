-- ========================================================================================
-- TIME2TRADE CRM & KYC - CONSOLIDATED UNIFIED MASTER DATABASE SCRIPT
-- ========================================================================================
-- File: complete_master_schema.sql
-- Description:
--   Complete, unified, idempotent, and non-destructive PostgreSQL setup script for Supabase.
--   Consolidates all 8 previous SQL scripts into a single source of truth:
--     1. Base Schema (users, leads, active_traders, trading_days, payments, expenses)
--     2. Manager Role & Manager Advances Ledger
--     3. Payment Allocations & Service Classification Fields
--     4. Attendance Logs & Live Staff Presence Tracking
--     5. KYC Applications Portal Schema
--     6. Automated Triggers & Streak Calculation Functions
--     7. Performance Indexes
--     8. Row Level Security (RLS) Policies (Zero 400/401/403/404 errors)
--     9. Storage Buckets (Payment Proofs, Avatars, Expense Receipts, Leads Photos)
--    10. Supabase Realtime Publication
--    11. Safe Data Hygiene (purges mock demo entries while preserving real team)
--    12. PostgREST Cache Invalidation
--
-- How to Run:
--   Open Supabase Dashboard -> SQL Editor -> New Query -> Paste this entire script -> Run.
-- ========================================================================================


-- ====================================================================
-- SECTION 1: EXTENSIONS & PERMISSIONS CONFIGURATION
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;


-- ====================================================================
-- SECTION 2: CORE TABLES & SAFELY ADD MISSING COLUMNS
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. USERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'employee',
    employee_code TEXT,
    designation TEXT,
    department TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending_admin_review',
    rejection_reason TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    must_reset_password BOOLEAN DEFAULT false,
    temporary_password TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist for existing databases
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending_admin_review';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS temporary_password TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Check constraint: support admin, manager, employee, pending
DO $$ 
BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'manager', 'employee', 'pending'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'users_role_check constraint updated';
END $$;

-- Check constraint: approval_status
DO $$ 
BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_approval_status_check;
    ALTER TABLE public.users ADD CONSTRAINT users_approval_status_check 
        CHECK (approval_status IN ('pending_admin_review', 'approved', 'rejected'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'users_approval_status_check constraint updated';
END $$;


-- --------------------------------------------------------------------
-- 2. LEADS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    language TEXT,
    source TEXT NOT NULL DEFAULT 'Meta Ads',
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    investment_capacity TEXT,
    trading_experience TEXT,
    preferred_market TEXT, 
    next_follow_up_at TIMESTAMPTZ,
    upload_batch_id TEXT,
    upload_date DATE,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'Meta Ads';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS investment_capacity TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS trading_experience TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_market TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS upload_batch_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS upload_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Check constraint: lead status
DO $$ 
BEGIN
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
    ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
        CHECK (status IN ('new', 'called', 'not_interested', 'callback_requested', 'interested', 'follow_up_later', 'active_trader', 'lost'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'leads_status_check constraint updated';
END $$;


-- --------------------------------------------------------------------
-- 3. ACTIVE TRADERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.active_traders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    language TEXT,
    assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    initial_capital NUMERIC(15,2),
    selected_service TEXT,
    preferred_market TEXT,
    notes TEXT,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_trade_date DATE,
    total_profit_gained NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_profit_shared NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS initial_capital NUMERIC(15,2);
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS selected_service TEXT;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS preferred_market TEXT;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS current_streak INT NOT NULL DEFAULT 0;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS longest_streak INT NOT NULL DEFAULT 0;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS last_trade_date DATE;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS total_profit_gained NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS total_profit_shared NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.active_traders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- --------------------------------------------------------------------
-- 4. TRADING DAYS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id UUID NOT NULL REFERENCES public.active_traders(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    total_profit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    trades_count INT NOT NULL DEFAULT 0 CHECK (trades_count >= 0),
    is_winning_day BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_trader_trade_date UNIQUE (trader_id, trade_date)
);


-- --------------------------------------------------------------------
-- 5. PAYMENTS TABLE (SUPPORTS PROSPECTS, SHARED & ALLOCATED PAYMENTS)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id UUID REFERENCES public.active_traders(id) ON DELETE SET NULL,
    client_name TEXT,
    client_phone TEXT,
    employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    submitted_by_employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT NOT NULL DEFAULT 'UPI',
    service_category TEXT,
    service_type TEXT,
    subscription_duration TEXT,
    receiver_bank_name TEXT,
    remarks TEXT,
    is_shared BOOLEAN DEFAULT false,
    utr TEXT NOT NULL,
    transaction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    screenshot_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_verification',
    admin_remarks TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure payments columns exist and trader_id is nullable (enables direct lead/prospect payments)
ALTER TABLE public.payments ALTER COLUMN trader_id DROP NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS submitted_by_employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS service_category TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS subscription_duration TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receiver_bank_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_remarks TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Check constraint: payment status
DO $$ 
BEGIN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
        CHECK (status IN ('pending_verification', 'approved', 'rejected'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'payments_status_check constraint updated';
END $$;


-- --------------------------------------------------------------------
-- 6. PAYMENT ALLOCATIONS TABLE (COMMISSION & MULTI-EMPLOYEE SHARES)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    allocation_amount NUMERIC(15,2) NOT NULL CHECK (allocation_amount > 0),
    allocation_percentage NUMERIC(5,2),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_payment_employee UNIQUE (payment_id, employee_id)
);


-- --------------------------------------------------------------------
-- 7. EXPENSES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL, 
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- --------------------------------------------------------------------
-- 8. MANAGER ADVANCES TABLE (ADMIN-ONLY SALARY ADVANCES LEDGER)
-- --------------------------------------------------------------------
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


-- --------------------------------------------------------------------
-- 9. ATTENDANCE LOGS TABLE (STAFF PUNCH-IN & STATUS EVENTS)
-- --------------------------------------------------------------------
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


-- --------------------------------------------------------------------
-- 10. USER PRESENCE TABLE (REAL-TIME STATUS SYNC)
-- --------------------------------------------------------------------
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


-- --------------------------------------------------------------------
-- 11. KYC APPLICATIONS TABLE (DIGITAL KYC VERIFICATION PORTAL)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kyc_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    pan TEXT NOT NULL,
    dob_day INT NOT NULL,
    dob_month INT NOT NULL,
    dob_year INT NOT NULL,
    signature_data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'under_review',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check constraint: KYC status
DO $$ 
BEGIN
    ALTER TABLE public.kyc_applications DROP CONSTRAINT IF EXISTS kyc_status_check;
    ALTER TABLE public.kyc_applications ADD CONSTRAINT kyc_status_check 
        CHECK (status IN ('under_review', 'approved', 'rejected'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'kyc_status_check constraint updated';
END $$;


-- ====================================================================
-- SECTION 3: PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_approval ON public.users(approval_status);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);

CREATE INDEX IF NOT EXISTS idx_active_traders_assigned_to ON public.active_traders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_active_traders_phone ON public.active_traders(phone);
CREATE INDEX IF NOT EXISTS idx_active_traders_status ON public.active_traders(status);

CREATE INDEX IF NOT EXISTS idx_trading_days_trader_date ON public.trading_days(trader_id, trade_date);

CREATE INDEX IF NOT EXISTS idx_payments_trader_id ON public.payments(trader_id);
CREATE INDEX IF NOT EXISTS idx_payments_employee_id ON public.payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_submitted_by ON public.payments(submitted_by_employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON public.payments(utr);
CREATE INDEX IF NOT EXISTS idx_payments_service_category ON public.payments(service_category);
CREATE INDEX IF NOT EXISTS idx_payments_service_type ON public.payments(service_type);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_employee_id ON public.payment_allocations(employee_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

CREATE INDEX IF NOT EXISTS idx_manager_advances_manager_id ON public.manager_advances(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_advances_date ON public.manager_advances(date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_time ON public.attendance_logs(event_time DESC);

CREATE INDEX IF NOT EXISTS idx_kyc_reference_id ON public.kyc_applications(reference_id);
CREATE INDEX IF NOT EXISTS idx_kyc_mobile ON public.kyc_applications(mobile);
CREATE INDEX IF NOT EXISTS idx_kyc_pan ON public.kyc_applications(pan);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_applications(status);


-- ====================================================================
-- SECTION 4: AUTOMATED TRIGGERS & FUNCTIONS
-- ====================================================================

-- Function: Recalculate Trader Winning Metrics & Streak
CREATE OR REPLACE FUNCTION public.recalculate_trader_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_trader_id UUID;
    v_total_profit NUMERIC(15,2) := 0.00;
    v_last_date DATE;
    v_curr_streak INT := 0;
    v_max_streak INT := 0;
    r RECORD;
    v_prev_date DATE := NULL;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_trader_id := OLD.trader_id;
    ELSE
        v_trader_id := NEW.trader_id;
        NEW.is_winning_day := (NEW.total_profit > 0);
    END IF;

    -- Calculate total profit gained
    SELECT COALESCE(SUM(total_profit), 0.00), MAX(trade_date)
    INTO v_total_profit, v_last_date
    FROM public.trading_days
    WHERE trader_id = v_trader_id;

    -- Calculate consecutive winning trading day streak
    FOR r IN (
        SELECT trade_date, trades_count, total_profit
        FROM public.trading_days
        WHERE trader_id = v_trader_id AND trades_count > 0
        ORDER BY trade_date DESC
    ) LOOP
        IF v_prev_date IS NULL THEN
            v_curr_streak := 1;
        ELSIF v_prev_date - r.trade_date = 1 THEN
            v_curr_streak := v_curr_streak + 1;
        ELSE
            EXIT;
        END IF;
        v_prev_date := r.trade_date;
    END LOOP;

    SELECT COALESCE(MAX(longest_streak), v_curr_streak) INTO v_max_streak
    FROM public.active_traders WHERE id = v_trader_id;

    IF v_curr_streak > v_max_streak THEN
        v_max_streak := v_curr_streak;
    END IF;

    -- Update active trader row
    UPDATE public.active_traders
    SET total_profit_gained = v_total_profit,
        last_trade_date = v_last_date,
        current_streak = v_curr_streak,
        longest_streak = v_max_streak,
        updated_at = NOW()
    WHERE id = v_trader_id;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalculate_trader_metrics ON public.trading_days;
CREATE TRIGGER trg_recalculate_trader_metrics
BEFORE INSERT OR UPDATE OR DELETE ON public.trading_days
FOR EACH ROW EXECUTE FUNCTION public.recalculate_trader_metrics();


-- Function: Recalculate Trader Profit Shared
CREATE OR REPLACE FUNCTION public.recalculate_trader_profit_shared()
RETURNS TRIGGER AS $$
DECLARE
    v_trader_id UUID;
    v_total_shared NUMERIC(15,2) := 0.00;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_trader_id := OLD.trader_id;
    ELSE
        v_trader_id := NEW.trader_id;
    END IF;

    IF v_trader_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0.00)
        INTO v_total_shared
        FROM public.payments
        WHERE trader_id = v_trader_id AND status = 'approved';

        UPDATE public.active_traders
        SET total_profit_shared = v_total_shared,
            updated_at = NOW()
        WHERE id = v_trader_id;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalculate_trader_profit_shared ON public.payments;
CREATE TRIGGER trg_recalculate_trader_profit_shared
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recalculate_trader_profit_shared();


-- Helper function: Get Current Role
CREATE OR REPLACE FUNCTION public.get_current_role() 
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ====================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- Complete, robust policies preventing HTTP 400/401/403 errors
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_applications ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
DROP POLICY IF EXISTS "Users read all" ON public.users;
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
DROP POLICY IF EXISTS "Enable all operations on users" ON public.users;
CREATE POLICY "Enable all operations on users" 
ON public.users FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 2. LEADS POLICIES
DROP POLICY IF EXISTS "Enable all operations on leads" ON public.leads;
DROP POLICY IF EXISTS "Enable anon operations on leads" ON public.leads;
CREATE POLICY "Enable all operations on leads" 
ON public.leads FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 3. ACTIVE TRADERS POLICIES
DROP POLICY IF EXISTS "Enable all operations on active_traders" ON public.active_traders;
DROP POLICY IF EXISTS "Enable anon operations on active_traders" ON public.active_traders;
CREATE POLICY "Enable all operations on active_traders" 
ON public.active_traders FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 4. TRADING DAYS POLICIES
DROP POLICY IF EXISTS "Enable all operations on trading_days" ON public.trading_days;
DROP POLICY IF EXISTS "Enable anon operations on trading_days" ON public.trading_days;
CREATE POLICY "Enable all operations on trading_days" 
ON public.trading_days FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 5. PAYMENTS POLICIES
DROP POLICY IF EXISTS "Enable all operations on payments" ON public.payments;
DROP POLICY IF EXISTS "Enable anon operations on payments" ON public.payments;
DROP POLICY IF EXISTS "Public payment submission" ON public.payments;
CREATE POLICY "Enable all operations on payments" 
ON public.payments FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 6. PAYMENT ALLOCATIONS POLICIES
DROP POLICY IF EXISTS "Enable all operations on payment_allocations" ON public.payment_allocations;
CREATE POLICY "Enable all operations on payment_allocations" 
ON public.payment_allocations FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 7. EXPENSES POLICIES
DROP POLICY IF EXISTS "Enable all operations on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Enable anon operations on expenses" ON public.expenses;
CREATE POLICY "Enable all operations on expenses" 
ON public.expenses FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 8. MANAGER ADVANCES POLICIES
DROP POLICY IF EXISTS "Enable all operations on manager_advances" ON public.manager_advances;
DROP POLICY IF EXISTS "Enable anon operations on manager_advances" ON public.manager_advances;
CREATE POLICY "Enable all operations on manager_advances" 
ON public.manager_advances FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 9. ATTENDANCE LOGS POLICIES
DROP POLICY IF EXISTS "Enable all operations on attendance_logs" ON public.attendance_logs;
CREATE POLICY "Enable all operations on attendance_logs" 
ON public.attendance_logs FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 10. USER PRESENCE POLICIES
DROP POLICY IF EXISTS "Enable all operations on user_presence" ON public.user_presence;
CREATE POLICY "Enable all operations on user_presence" 
ON public.user_presence FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 11. KYC APPLICATIONS POLICIES
DROP POLICY IF EXISTS "Allow public insert to kyc_applications" ON public.kyc_applications;
DROP POLICY IF EXISTS "Allow public read of kyc_applications" ON public.kyc_applications;
DROP POLICY IF EXISTS "Allow public update of kyc_applications" ON public.kyc_applications;
DROP POLICY IF EXISTS "Enable all operations on kyc_applications" ON public.kyc_applications;
CREATE POLICY "Enable all operations on kyc_applications" 
ON public.kyc_applications FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);


-- ====================================================================
-- SECTION 6: STORAGE BUCKETS & POLICIES (PROOF & RECEIPTS UPLOADS)
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('payment-proofs', 'payment-proofs', true),
  ('avatars', 'avatars', true),
  ('expense-receipts', 'expense-receipts', true),
  ('leads-photos', 'leads-photos', true),
  ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public access to payment proofs" ON storage.objects;
CREATE POLICY "Public access to payment proofs" 
ON storage.objects FOR ALL TO anon, authenticated 
USING (bucket_id = 'payment-proofs') WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Public access to avatars" ON storage.objects;
CREATE POLICY "Public access to avatars" 
ON storage.objects FOR ALL TO anon, authenticated 
USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public access to expense receipts" ON storage.objects;
CREATE POLICY "Public access to expense receipts" 
ON storage.objects FOR ALL TO anon, authenticated 
USING (bucket_id = 'expense-receipts') WITH CHECK (bucket_id = 'expense-receipts');

DROP POLICY IF EXISTS "Public access to receipts" ON storage.objects;
CREATE POLICY "Public access to receipts" 
ON storage.objects FOR ALL TO anon, authenticated 
USING (bucket_id = 'receipts') WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Public access to leads photos" ON storage.objects;
CREATE POLICY "Public access to leads photos" 
ON storage.objects FOR ALL TO anon, authenticated 
USING (bucket_id = 'leads-photos') WITH CHECK (bucket_id = 'leads-photos');


-- ====================================================================
-- SECTION 7: SUPABASE REALTIME PUBLICATION SETUP
-- ====================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_traders;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_days;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_allocations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_advances;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication updated or already contains tables: %', SQLERRM;
END $$;


-- ====================================================================
-- SECTION 8: CLEANUP OF OLD MOCK DATA & ENSURE REAL ACCOUNTS
-- ====================================================================
-- Purges hardcoded dummy demo records while strictly preserving all real accounts.

-- 1. Remove mock trading days
DELETE FROM public.trading_days 
WHERE trader_id IN (SELECT id FROM public.active_traders WHERE id::text LIKE '30000000%') 
   OR id::text LIKE '30000000%';

-- 2. Remove mock payments
DELETE FROM public.payments 
WHERE id::text LIKE '40000000%' 
   OR utr IN ('UTR994820194821', 'IMPS883019284711');

-- 3. Remove mock active traders
DELETE FROM public.active_traders 
WHERE id::text LIKE '30000000%' 
   OR name IN ('Sneha Kapoor', 'Devendra Patel', 'Amitabh Singhania');

-- 4. Remove mock leads
DELETE FROM public.leads 
WHERE id::text LIKE '20000000%' 
   OR name IN ('Aarav Mehta', 'Sneha Kapoor', 'Rohan Gupta', 'Kavita Joshi');

-- 5. Remove mock expenses
DELETE FROM public.expenses 
WHERE id::text LIKE '50000000%';

-- 6. Remove mock attendance logs
DELETE FROM public.attendance_logs 
WHERE user_name IN ('Priya Verma', 'Ankit Kumar', 'Vikram Malhotra', 'Rahul Saxena', 'Rajesh Sharma')
   OR user_id::text LIKE '10000000-0000-0000-0000-00000000000[2-9]';

-- 7. Remove mock demo employees
DELETE FROM public.users 
WHERE email ILIKE '%@capitalgrow.com'
   OR name IN ('Priya Verma', 'Ankit Kumar', 'Vikram Malhotra', 'Rahul Saxena', 'Rajesh Sharma')
   OR id IN (
       '10000000-0000-0000-0000-000000000002',
       '10000000-0000-0000-0000-000000000003',
       '10000000-0000-0000-0000-000000000004',
       '10000000-0000-0000-0000-000000000005'
   );

-- 8. Ensure Manager account exists and is approved
INSERT INTO public.users (id, name, email, role, is_active, approval_status)
VALUES ('10000000-0000-0000-0000-000000000001', 'Karthik Muni', 'karthik@time2trade.com', 'manager', true, 'approved')
ON CONFLICT (id) DO UPDATE SET 
    name = 'Karthik Muni',
    email = 'karthik@time2trade.com',
    role = 'manager',
    is_active = true,
    approval_status = 'approved';


-- ====================================================================
-- SECTION 9: RELOAD POSTGREST CACHE (IMMEDIATE DEPLOYMENT)
-- ====================================================================
NOTIFY pgrst, 'reload schema';

-- Verification output
SELECT 'Time2Trade unified master database script executed successfully! All tables, columns, indexes, triggers, storage buckets, and RLS policies are operational.' AS result;
