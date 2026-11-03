-- Apply after the existing schema scripts. Restrictive policies also constrain
-- legacy permissive policies; rerunning old setup scripts must not remove these.
BEGIN;

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
    ('users', 'public.crm_access_role() = ''admin'' OR id = auth.uid() OR (public.crm_access_role() = ''manager'' AND role = ''employee'')'),
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

COMMIT;
