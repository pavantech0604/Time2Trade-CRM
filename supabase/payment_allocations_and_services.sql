-- ====================================================================
-- TIME2TRADE CRM - BULLETPROOF SUPABASE SETUP & PAYMENT ALLOCATIONS
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- It safely adds all columns, creates the allocations table,
-- configures RLS for both staff & public forms, and fixes storage uploads.
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. UPDATE PAYMENTS TABLE (SAFE & NON-DESTRUCTIVE)
ALTER TABLE public.payments ALTER COLUMN trader_id DROP NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS service_category TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS subscription_duration TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receiver_bank_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS submitted_by_employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- 3. CREATE PAYMENT ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    allocation_amount NUMERIC(15,2) NOT NULL CHECK (allocation_amount > 0),
    allocation_percentage NUMERIC(5,2),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_payment_employee UNIQUE (payment_id, employee_id)
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_employee_id ON public.payment_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_service_category ON public.payments(service_category);
CREATE INDEX IF NOT EXISTS idx_payments_service_type ON public.payments(service_type);
CREATE INDEX IF NOT EXISTS idx_payments_submitted_by ON public.payments(submitted_by_employee_id);

-- 5. ROW LEVEL SECURITY (RLS) - PREVENTS 401/403 AUTH ERRORS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations on payments" ON public.payments;
CREATE POLICY "Enable all operations on payments" 
ON public.payments 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations on payment_allocations" ON public.payment_allocations;
CREATE POLICY "Enable all operations on payment_allocations" 
ON public.payment_allocations 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 6. STORAGE BUCKET FOR SCREENSHOT PROOFS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access to payment proofs" ON storage.objects;
CREATE POLICY "Public access to payment proofs" 
ON storage.objects 
FOR ALL TO anon, authenticated 
USING (bucket_id = 'payment-proofs') 
WITH CHECK (bucket_id = 'payment-proofs');

-- 7. GRANT PERMISSIONS TO ANON AND AUTHENTICATED ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 8. RELOAD POSTGREST SCHEMA CACHE (IMMEDIATE AVAILABILITY)
NOTIFY pgrst, 'reload schema';
