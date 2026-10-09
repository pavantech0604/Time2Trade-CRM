-- ====================================================================
-- TIME2TRADE CRM: ADVANCED EMPLOYEE DETAILS & CLIENT HANDLING SCHEMA
-- Migration: employee_details_and_client_handling_schema.sql
-- ====================================================================

-- 1. EXTEND USERS TABLE FOR EMPLOYEE PROFILES
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

-- 5. REALTIME PUBLICATION
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_assignments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_import_staging;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication updated for client assignments and staging: %', SQLERRM;
END $$;

-- 6. POPULATE INITIAL STAGING RECORDS FROM HANDWRITTEN SHEET
INSERT INTO public.employee_import_staging (raw_id, employee_name, personal_phone, office_phone, confidence, handwriting_notes, status)
VALUES
  (1, 'Karthik Mani', '9500788897', NULL, 'high', 'Manager account. Office phone left blank/NULL.', 'matched'),
  (2, 'Pandiya Raj', '9894685438', '8463980327', 'high', 'Legible. Matches Pandiyaraj Subramani.', 'matched'),
  (3, 'Bhavani', '9591268897', NULL, 'high', 'Office phone left blank/NULL. Matches Bhavani N.', 'matched'),
  (4, 'Varsha Sree J', '8008734601', '8142676308', 'high', 'Legible. Matches Varsha sree in CRM.', 'matched'),
  (5, 'Dhanalakshmi S', '8778285890', '9631420130', 'high', 'Legible. Matches S Dhanalakshmi.', 'matched'),
  (6, 'Aswini G', '9123588603', '8696827197', 'high', 'Legible. Matches Aswini. G.', 'matched'),
  (7, 'Arthi P', '7639920834', '7285983828', 'high', 'Legible. Matches Arthi P.', 'matched'),
  (8, 'S. Sravanthi', '8639200600', '7287098647', 'medium_ambiguous', 'Handwritten personal phone digit 2 vs 7 (8639200600 vs CRM database 8639700600). Needs review.', 'needs_review'),
  (9, 'Santhosh Kumar', '7676610021', '8501949643', 'high', 'Legible. Matches SANTHOSH KUMAR.', 'matched'),
  (10, 'Vidhyalakshmi B', '6379068840', '8142319293', 'high', 'Phone matches 6379068840. Initial written as B; CRM account has Vidhyalakshmi S.', 'matched'),
  (11, 'Anupriya S', '9123569028', '7095641088', 'high', 'Legible. Matches Anupriya.S.', 'matched'),
  (12, 'Stella H', '8870801191', '8465904989', 'medium_ambiguous', 'Last digit of personal phone looks like 1 or 7 (8870801191 vs CRM database 8870801197). Office phone is 8465904989.', 'needs_review'),
  (13, 'Pavanasan K', '8778405700', '7659823167', 'medium_ambiguous', 'Handwritten name looks like Pavanasan / Poovarasan. Phone digit 0 vs 9 (8778405700 vs CRM 8778495100). Needs review.', 'needs_review'),
  (14, 'G. Madan Kumar', '9384586321', '9160676958', 'high', 'Legible. Matches Madhan.G (9384586321).', 'matched'),
  (15, 'A. Praveen Kumar', '9360777279', '7036127666', 'high', 'Legible. Matches Praveen (9360777279).', 'matched')
ON CONFLICT (raw_id) DO UPDATE SET
  employee_name = EXCLUDED.employee_name,
  personal_phone = EXCLUDED.personal_phone,
  office_phone = EXCLUDED.office_phone,
  handwriting_notes = EXCLUDED.handwriting_notes;

-- 7. SEED ACTIVE CLIENT ASSIGNMENTS FROM EXISTING ACTIVE TRADERS
INSERT INTO public.client_assignments (
    id, client_id, client_type, client_name, client_phone, employee_id, employee_name, start_date, status
)
SELECT 
    uuid_generate_v4(),
    t.id,
    'trader',
    t.name,
    t.phone,
    t.assigned_to,
    COALESCE(u.name, 'Assigned Staff'),
    COALESCE(t.joined_at::timestamptz, NOW()),
    'active'
FROM public.active_traders t
LEFT JOIN public.users u ON u.id = t.assigned_to
WHERE t.assigned_to IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.client_assignments ca 
      WHERE ca.client_id = t.id AND ca.status = 'active'
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Employee details & client handling management module schema migrated successfully!' AS result;
