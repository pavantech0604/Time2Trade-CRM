-- ====================================================================
-- MASTER DATABASE RESET SCRIPT
-- Completely wipes the public schema and rebuilds it from scratch,
-- ensuring your logged-in user account is correctly synced.
-- ====================================================================

-- 0. Wipe existing schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE (Linked to auth.users if available, or direct user profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'Meta Ads',
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Employee
    status TEXT NOT NULL DEFAULT 'new' CHECK (
        status IN (
            'new',
            'called',
            'not_interested',
            'follow_up_later',
            'interested',
            'active_trader',
            'lost',
            'callback_requested'
        )
    ),
    notes TEXT,
    investment_capacity TEXT,
    trading_experience TEXT CHECK (trading_experience IN ('beginner', 'intermediate', 'advanced')),
    preferred_market TEXT, -- Equity, F&O, Crypto, Commodity
    next_follow_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ACTIVE TRADERS TABLE
CREATE TABLE IF NOT EXISTS public.active_traders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_trade_date DATE,
    total_profit_gained NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_profit_shared NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TRADING DAYS TABLE
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

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id UUID NOT NULL REFERENCES public.active_traders(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- RM or logged-in employee
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT NOT NULL DEFAULT 'UPI' CHECK (payment_mode IN ('UPI', 'Bank Transfer', 'Other')),
    utr TEXT NOT NULL,
    transaction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    screenshot_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'approved', 'rejected')),
    admin_remarks TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL, -- Salary, Software, Ads, Office, etc.
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- AUTOMATED TRIGGERS & FUNCTIONS
-- ====================================================================

-- Function: Recalculate Trader Streak & Profit Gained on Trading Days changes
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

    -- Streak Calculation: Sort by trade_date DESC, count consecutive active trading days
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
            -- Streak broken
            EXIT;
        END IF;
        v_prev_date := r.trade_date;
    END LOOP;

    -- Max streak calculation
    SELECT COALESCE(MAX(longest_streak), v_curr_streak) INTO v_max_streak
    FROM public.active_traders WHERE id = v_trader_id;

    IF v_curr_streak > v_max_streak THEN
        v_max_streak := v_curr_streak;
    END IF;

    -- Update active_trader record
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

CREATE OR REPLACE TRIGGER trg_recalculate_trader_metrics
BEFORE INSERT OR UPDATE OR DELETE ON public.trading_days
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_trader_metrics();

-- Function: Recalculate Trader Profit Shared on Payment Approval
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

    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_shared
    FROM public.payments
    WHERE trader_id = v_trader_id AND status = 'approved';

    UPDATE public.active_traders
    SET total_profit_shared = v_total_shared,
        updated_at = NOW()
    WHERE id = v_trader_id;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_recalculate_trader_profit_shared
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_trader_profit_shared();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Helper function: Get current user role
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Users Policy
CREATE POLICY "Users read all" ON public.users FOR SELECT USING (true);
CREATE POLICY "Admin manage users" ON public.users FOR ALL USING (public.get_current_role() = 'admin');

-- Allow anon to select and insert (for testing/mock hybrid mode)
CREATE POLICY "Enable anon operations on leads" ON public.leads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable anon operations on active_traders" ON public.active_traders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable anon operations on trading_days" ON public.trading_days FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable anon operations on payments" ON public.payments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable anon operations on expenses" ON public.expenses FOR ALL TO anon USING (true) WITH CHECK (true);

-- Leads Policy
CREATE POLICY "Admin lead access" ON public.leads FOR ALL USING (public.get_current_role() = 'admin');
CREATE POLICY "Employee lead access" ON public.leads FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "Employee lead update" ON public.leads FOR UPDATE USING (assigned_to = auth.uid());

-- Active Traders Policy
CREATE POLICY "Admin trader access" ON public.active_traders FOR ALL USING (public.get_current_role() = 'admin');
CREATE POLICY "Employee trader access" ON public.active_traders FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "Employee trader modify" ON public.active_traders FOR ALL USING (assigned_to = auth.uid());

-- Trading Days Policy
CREATE POLICY "Admin trading days access" ON public.trading_days FOR ALL USING (public.get_current_role() = 'admin');
CREATE POLICY "Employee trading days access" ON public.trading_days FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.active_traders
        WHERE active_traders.id = trading_days.trader_id
        AND active_traders.assigned_to = auth.uid()
    )
);

-- Payments Policy
CREATE POLICY "Admin payments access" ON public.payments FOR ALL USING (public.get_current_role() = 'admin');
CREATE POLICY "Employee payments access" ON public.payments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.active_traders
        WHERE active_traders.id = payments.trader_id
        AND active_traders.assigned_to = auth.uid()
    )
);
CREATE POLICY "Public payment submission" ON public.payments FOR INSERT WITH CHECK (true);

-- Expenses Policy
CREATE POLICY "Admin expenses access" ON public.expenses FOR ALL USING (public.get_current_role() = 'admin');

-- Storage Buckets for Proof Screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- FINAL SYNC: COPY YOUR AUTH SESSION INTO THE DATABASE
-- ====================================================================
INSERT INTO public.users (id, name, email, role, is_active)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 
  email, 
  CASE WHEN email = 'karthik@time2trade.com' THEN 'admin' ELSE 'employee' END,
  true
FROM auth.users
ON CONFLICT (id) DO NOTHING;
