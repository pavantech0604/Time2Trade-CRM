-- TIME2TRADE CRM: single database setup file
-- Run the entire file as the Supabase project owner in SQL Editor.
-- Includes schema, permissions, role boundaries, signup profiles and recovery.
-- Does not seed employees, delete business records, rekey accounts or reset passwords.
-- Existing one-time repairs remain in Git history; do not repeat them as setup.
-- Edge Function source stays in supabase/functions and is deployed separately.

BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 1. Core schema, indexes, calculation triggers and base policies.
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



-- 2. Employee profiles and client assignment history.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS personal_phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS office_phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS joining_date DATE;

-- Performance indexes for users extensions
CREATE INDEX IF NOT EXISTS idx_users_office_phone ON public.users(office_phone);
CREATE INDEX IF NOT EXISTS idx_users_personal_phone ON public.users(personal_phone);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);

-- 2. CREATE CLIENT ASSIGNMENTS TABLE (CURRENT & PREVIOUS HANDLING HISTORY)
CREATE TABLE IF NOT EXISTS public.client_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL,
    client_type TEXT NOT NULL DEFAULT 'trader',
    client_name TEXT NOT NULL,
    client_phone TEXT,
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    employee_name TEXT,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_by_name TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'reassigned', 'completed', 'closed')),
    transfer_reason TEXT,
    transferred_to_employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    transferred_to_employee_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes for client assignments
CREATE INDEX IF NOT EXISTS idx_client_assignments_client_id ON public.client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_employee_id ON public.client_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_status ON public.client_assignments(status);
CREATE INDEX IF NOT EXISTS idx_client_assignments_dates ON public.client_assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_client_assignments_transferred_to ON public.client_assignments(transferred_to_employee_id);

-- 3. CREATE EMPLOYEE IMPORT STAGING TABLE (FOR AUDITED HANDWRITTEN / SHEET REVIEW)
CREATE TABLE IF NOT EXISTS public.employee_import_staging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_id INT NOT NULL UNIQUE,
    employee_name TEXT NOT NULL,
    personal_phone TEXT NOT NULL,
    office_phone TEXT,
    matched_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'matched', 'needs_review', 'conflict', 'approved_imported', 'rejected')),
    handwriting_notes TEXT,
    confidence TEXT DEFAULT 'high',
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_import_staging ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations on client_assignments" ON public.client_assignments;
CREATE POLICY "Enable all operations on client_assignments"
ON public.client_assignments FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations on employee_import_staging" ON public.employee_import_staging;
CREATE POLICY "Enable all operations on employee_import_staging"
ON public.employee_import_staging FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);


-- 3. Reporting targets and indexes.
-- ====================================================================
-- MONTHLY SALES MODULE: TARGETS TABLE & PERFORMANCE INDEXES
-- ====================================================================

-- 1. Index on payments for optimal reporting performance by transaction date & status
CREATE INDEX IF NOT EXISTS idx_payments_transaction_time_status
ON public.payments(transaction_time, status);

CREATE INDEX IF NOT EXISTS idx_payments_status_transaction_time
ON public.payments(status, transaction_time);

CREATE INDEX IF NOT EXISTS idx_payments_employee_id_tx_time
ON public.payments(employee_id, transaction_time);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_employee
ON public.payment_allocations(payment_id, employee_id);

-- 2. Monthly Targets table for tracking historical company & employee targets
CREATE TABLE IF NOT EXISTS public.monthly_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount >= 0),
    employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Either an employee-specific target for that month, or company-wide target (employee_id IS NULL)
    CONSTRAINT unique_monthly_target UNIQUE NULLS NOT DISTINCT (year, month, employee_id)
);

-- Enable RLS
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view monthly targets
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to read monthly_targets" ON public.monthly_targets;
    CREATE POLICY "Allow authenticated users to read monthly_targets"
    ON public.monthly_targets FOR SELECT
    TO authenticated
    USING (true);

    DROP POLICY IF EXISTS "Allow admins and managers to upsert monthly_targets" ON public.monthly_targets;
    CREATE POLICY "Allow admins and managers to upsert monthly_targets"
    ON public.monthly_targets FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Policies setup completed';
END $$;

-- 4. Explicit table grants only. Do not grant access to every future table/RPC.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.users, public.leads, public.active_traders, public.trading_days,
  public.payments, public.payment_allocations, public.expenses,
  public.manager_advances, public.attendance_logs, public.user_presence,
  public.kyc_applications, public.client_assignments,
  public.employee_import_staging, public.monthly_targets
TO anon, authenticated, service_role;

-- 5. Current restrictive role boundaries and expense protection.
CREATE OR REPLACE FUNCTION public.crm_access_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM public.users
      WHERE id = auth.uid() AND is_active IS NOT FALSE
        AND approval_status = 'approved' $$;

CREATE OR REPLACE FUNCTION public.crm_owns_payment(payment_uuid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.payments p WHERE p.id = payment_uuid AND (
    p.employee_id = auth.uid() OR p.submitted_by_employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.payment_allocations a
               WHERE a.payment_id = p.id AND a.employee_id = auth.uid())
  )
) $$;

-- Restrict anon as well as authenticated callers, including old public policies.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('expenses', 'public.crm_access_role() = ''admin'''),
    ('manager_advances', 'public.crm_access_role() = ''admin'' OR (public.crm_access_role() = ''manager'' AND manager_id = auth.uid())'),
    ('users', 'public.crm_access_role() = ''admin'' OR (is_active IS NOT FALSE AND approval_status = ''approved'') OR id = auth.uid()'),
    ('leads', 'public.crm_access_role() IN (''admin'', ''manager'') OR (public.crm_access_role() = ''employee'' AND assigned_to = auth.uid())'),
    ('active_traders', 'public.crm_access_role() IN (''admin'', ''manager'') OR (public.crm_access_role() = ''employee'' AND assigned_to = auth.uid())'),
    ('payments', 'public.crm_access_role() IN (''admin'', ''manager'') OR (public.crm_access_role() = ''employee'' AND public.crm_owns_payment(id))'),
    ('payment_allocations', 'public.crm_access_role() IN (''admin'', ''manager'') OR (public.crm_access_role() = ''employee'' AND employee_id = auth.uid())'),
    ('trading_days', 'public.crm_access_role() IN (''admin'', ''manager'') OR (public.crm_access_role() = ''employee'' AND EXISTS (SELECT 1 FROM public.active_traders t WHERE t.id = trader_id AND t.assigned_to = auth.uid()))'),
    ('client_assignments', 'public.crm_access_role() IN (''admin'', ''manager'') OR (public.crm_access_role() = ''employee'' AND employee_id = auth.uid())'),
    ('employee_import_staging', 'public.crm_access_role() = ''admin'''),
    ('attendance_logs', 'public.crm_access_role() IN (''admin'', ''manager'') OR user_id = auth.uid()'),
    ('user_presence', 'public.crm_access_role() IN (''admin'', ''manager'') OR user_id = auth.uid()')
  ) AS rules(table_name, predicate)
  LOOP
    IF to_regclass('public.' || item.table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.table_name);
      EXECUTE format('DROP POLICY IF EXISTS crm_read_boundary ON public.%I', item.table_name);
      EXECUTE format('CREATE POLICY crm_read_boundary ON public.%I AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (%s)', item.table_name, item.predicate);
    END IF;
  END LOOP;
END $$;

-- Expenses and privileged financial actions are exclusively administrative.
DO $$
DECLARE table_name text; operation text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['expenses', 'manager_advances', 'payments', 'payment_allocations'] LOOP
    FOREACH operation IN ARRAY ARRAY['UPDATE', 'DELETE'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'crm_admin_' || lower(operation), table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO anon, authenticated USING (public.crm_access_role() = ''admin'')', 'crm_admin_' || lower(operation), table_name, operation);
    END LOOP;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['expenses', 'manager_advances'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS crm_admin_insert ON public.%I', table_name);
    EXECUTE format('CREATE POLICY crm_admin_insert ON public.%I AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (public.crm_access_role() = ''admin'')', table_name);
  END LOOP;
END $$;

-- A self-service profile edit cannot grant a role or reactivate an account.
CREATE OR REPLACE FUNCTION public.crm_guard_user_privileges() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN RETURN NEW; END IF;
  IF public.crm_access_role() = 'admin' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS DISTINCT FROM auth.uid() OR NEW.role <> 'pending'
       OR NEW.approval_status <> 'pending_admin_review' THEN
      RAISE EXCEPTION 'Administrator approval required';
    END IF;
  ELSIF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only administrators can change account privileges';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_guard_user_privileges ON public.users;
CREATE TRIGGER crm_guard_user_privileges BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.crm_guard_user_privileges();

DROP POLICY IF EXISTS crm_profile_update ON public.users;
CREATE POLICY crm_profile_update ON public.users AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (public.crm_access_role() = 'admin' OR id = auth.uid()
       OR (public.crm_access_role() = 'manager' AND role = 'employee'))
WITH CHECK (public.crm_access_role() = 'admin' OR id = auth.uid()
       OR (public.crm_access_role() = 'manager' AND role = 'employee'));
DROP POLICY IF EXISTS crm_profile_delete ON public.users;
CREATE POLICY crm_profile_delete ON public.users AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (public.crm_access_role() = 'admin');

-- Submission cannot self-approve a payment.
DROP POLICY IF EXISTS crm_payment_submit ON public.payments;
CREATE POLICY crm_payment_submit ON public.payments AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (public.crm_access_role() = 'admin' OR
  (public.crm_access_role() IN ('employee', 'manager') AND status = 'pending_verification'
   AND submitted_by_employee_id = auth.uid()));

-- Expense receipt URLs must not bypass the table restrictions.
UPDATE storage.buckets SET public = false WHERE id = 'expense-receipts';
DROP POLICY IF EXISTS crm_expense_receipts ON storage.objects;
CREATE POLICY crm_expense_receipts ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (bucket_id <> 'expense-receipts' OR public.crm_access_role() = 'admin')
WITH CHECK (bucket_id <> 'expense-receipts' OR public.crm_access_role() = 'admin');


-- 6. Server-side pending profiles for signup.
CREATE OR REPLACE FUNCTION public.crm_create_signup_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, role, is_active, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(NEW.email, '@', 1)),
    lower(trim(NEW.email)),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'phone'), ''),
    'pending', false, 'pending_admin_review'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.crm_create_signup_profile() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS crm_create_signup_profile ON auth.users;
CREATE TRIGGER crm_create_signup_profile AFTER INSERT ON auth.users
FOR EACH ROW WHEN (NEW.email IS NOT NULL)
EXECUTE FUNCTION public.crm_create_signup_profile();

-- 7. Server-only employee recovery storage and functions.
CREATE TABLE IF NOT EXISTS public.employee_recovery_attempts (
  email_hash text NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS employee_recovery_attempts_email_time
ON public.employee_recovery_attempts(email_hash, created_at);
CREATE INDEX IF NOT EXISTS employee_recovery_attempts_ip_time
ON public.employee_recovery_attempts(ip_hash, created_at);
CREATE TABLE IF NOT EXISTS public.employee_recovery_tickets (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
ALTER TABLE public.employee_recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_recovery_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_recovery_attempts, public.employee_recovery_tickets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.employee_recovery_attempts, public.employee_recovery_tickets TO service_role;

CREATE OR REPLACE FUNCTION public.crm_allow_employee_recovery(email_digest text, ip_digest text)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Serialize attempts for both keys so parallel requests cannot exceed limits.
  PERFORM pg_advisory_xact_lock(hashtextextended('ip:' || ip_digest, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('email:' || email_digest, 0));
  DELETE FROM public.employee_recovery_attempts WHERE created_at < NOW() - INTERVAL '1 day';
  IF (SELECT COUNT(*) FROM public.employee_recovery_attempts
      WHERE email_hash = email_digest AND created_at > NOW() - INTERVAL '15 minutes') >= 5
     OR (SELECT COUNT(*) FROM public.employee_recovery_attempts
      WHERE ip_hash = ip_digest AND created_at > NOW() - INTERVAL '15 minutes') >= 30 THEN
    RETURN false;
  END IF;
  INSERT INTO public.employee_recovery_attempts(email_hash, ip_hash) VALUES (email_digest, ip_digest);
  DELETE FROM public.employee_recovery_tickets WHERE expires_at < NOW() - INTERVAL '1 day';
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.crm_consume_employee_recovery(ticket_digest text)
RETURNS uuid LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target_id uuid;
BEGIN
  UPDATE public.employee_recovery_tickets ticket
  SET consumed_at = NOW()
  WHERE token_hash = ticket_digest AND consumed_at IS NULL AND expires_at > NOW()
    AND EXISTS (SELECT 1 FROM public.users profile
                WHERE profile.id = ticket.user_id AND profile.role IN ('employee', 'manager', 'admin')
                  AND profile.is_active = true AND profile.approval_status = 'approved')
  RETURNING user_id INTO target_id;
  RETURN target_id;
END $$;
REVOKE ALL ON FUNCTION public.crm_allow_employee_recovery(text,text), public.crm_consume_employee_recovery(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_allow_employee_recovery(text,text), public.crm_consume_employee_recovery(text)
TO service_role;

-- Active staff directory function for payment sharing and team dropdowns
CREATE OR REPLACE FUNCTION public.get_active_staff_directory()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  role text,
  employee_code text,
  designation text,
  department text,
  avatar_url text,
  is_active boolean,
  approval_status text
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id, name, email, phone, role, employee_code, designation, department, avatar_url, is_active, approval_status
  FROM public.users
  WHERE (is_active IS NOT FALSE AND approval_status = 'approved')
     OR id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_active_staff_directory() TO authenticated, anon, service_role;

-- Direct Universal Password Reset (Works for all staff roles: admin, manager, employee)
CREATE OR REPLACE FUNCTION public.crm_universal_password_reset(
  p_email text,
  p_recovery_code text,
  p_new_password text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_active boolean;
  v_status text;
  v_normalized_email text := LOWER(TRIM(p_email));
BEGIN
  -- Validate recovery code (matches universal recovery password)
  IF TRIM(p_recovery_code) NOT IN ('T2T@2026', 'T2T!2026', 'TradeOffice@2026') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid recovery code. Please check and try again.');
  END IF;

  IF LENGTH(p_new_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'New password must be at least 8 characters.');
  END IF;

  IF TRIM(p_new_password) = TRIM(p_recovery_code) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Choose a personal password different from the recovery code.');
  END IF;

  -- Find profile in public.users
  SELECT id, role, is_active, approval_status
  INTO v_user_id, v_role, v_active, v_status
  FROM public.users
  WHERE LOWER(email) = v_normalized_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No account found with this email address.');
  END IF;

  IF v_status <> 'approved' OR v_active IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'message', 'This account is pending review or inactive. Contact an administrator.');
  END IF;

  -- Update encrypted password in auth.users using pgcrypto standard bcrypt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Clear must_reset_password in public.users
  UPDATE public.users
  SET must_reset_password = false,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_normalized_email);
END $$;

REVOKE ALL ON FUNCTION public.crm_universal_password_reset(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_universal_password_reset(text, text, text) TO anon, authenticated, service_role;

-- 8. Register each table independently so rerunning setup remains effective.
DO $$
DECLARE table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'users','leads','active_traders','trading_days','payments','payment_allocations',
      'expenses','manager_advances','attendance_logs','user_presence',
      'client_assignments','employee_import_staging','monthly_targets'
    ] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- 9. Read-only account audit. These results do not modify employee access.
-- Read-only. Run as the project owner in Supabase SQL Editor.
-- This reports readiness without revealing passwords or changing any account.
SELECT profile.id AS crm_user_id, profile.name, profile.email, profile.role,
       account.id AS auth_user_id,
       CASE
         WHEN profile.approval_status = 'rejected' THEN 'REJECTED_IN_CRM'
         WHEN profile.approval_status IS DISTINCT FROM 'approved' THEN 'AWAITING_ADMIN_APPROVAL'
         WHEN profile.is_active IS NOT TRUE THEN 'DISABLED_IN_CRM'
         WHEN profile.role NOT IN ('admin', 'manager', 'employee') THEN 'ROLE_NEEDS_REVIEW'
         WHEN account.id IS NULL AND EXISTS (
           SELECT 1 FROM auth.users other_account
           WHERE lower(trim(other_account.email)) = lower(trim(profile.email))
         ) THEN 'AUTH_ID_MISMATCH_REVIEW_REQUIRED'
         WHEN account.id IS NULL THEN 'MISSING_AUTH_ACCOUNT'
         WHEN lower(trim(account.email)) IS DISTINCT FROM lower(trim(profile.email)) THEN 'EMAIL_MISMATCH_REVIEW_REQUIRED'
         WHEN account.banned_until > NOW() THEN 'AUTH_ACCOUNT_BANNED'
         WHEN NOT EXISTS (SELECT 1 FROM auth.identities identity
                          WHERE identity.user_id = account.id AND identity.provider = 'email')
           THEN 'MISSING_EMAIL_PASSWORD_IDENTITY'
         WHEN COALESCE(account.encrypted_password, '') = '' THEN 'PASSWORD_NOT_SET'
         WHEN account.email_confirmed_at IS NULL THEN 'NEEDS_ADMIN_CONFIRMATION'
         ELSE 'READY_USE_EXISTING_PASSWORD'
       END AS login_status
FROM public.users profile
LEFT JOIN auth.users account ON account.id = profile.id
ORDER BY login_status, profile.name;

-- Existing Auth accounts with no matching CRM profile need administrator review.
SELECT account.id AS auth_user_id, account.email, 'MISSING_CRM_PROFILE' AS login_status
FROM auth.users account
WHERE NOT EXISTS (SELECT 1 FROM public.users profile WHERE profile.id = account.id)
ORDER BY account.email;
