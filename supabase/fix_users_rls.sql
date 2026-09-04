-- ====================================================================
-- TIME2TRADE CRM - FIX USERS RLS POLICIES (RUN IN SUPABASE SQL EDITOR)
-- Fixes HTTP 401 on /rest/v1/users so employees can submit signups
-- and administrators can review and approve employees.
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read all" ON public.users;
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
DROP POLICY IF EXISTS "Enable all operations on users" ON public.users;

CREATE POLICY "Enable all operations on users" 
ON public.users 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
