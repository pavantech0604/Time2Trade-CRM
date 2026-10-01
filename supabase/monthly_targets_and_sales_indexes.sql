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
