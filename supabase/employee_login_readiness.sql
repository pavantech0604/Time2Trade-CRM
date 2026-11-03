-- Run AFTER role_access_hardening.sql. Existing passwords and account IDs are
-- preserved. Missing accounts and ID/email mismatches require admin review.
BEGIN;

-- Password login identifiers do not require a working mailbox for approved staff.
UPDATE auth.users account
SET email_confirmed_at = NOW(), confirmation_token = '', updated_at = NOW()
FROM public.users profile
WHERE account.id = profile.id
  AND lower(trim(account.email)) = lower(trim(profile.email))
  AND profile.role IN ('admin', 'manager', 'employee')
  AND profile.is_active = true
  AND profile.approval_status = 'approved'
  AND account.email_confirmed_at IS NULL;

-- Signup creates a real pending profile on the server, including when Auth
-- has not returned a session. Never trust user metadata for role or approval.
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

COMMIT;

-- Counts only. Run employee_login_audit.sql for the per-account repair report.
SELECT COUNT(*) AS approved_staff,
       COUNT(*) FILTER (WHERE account.id IS NOT NULL
         AND lower(trim(account.email)) = lower(trim(profile.email))
         AND account.email_confirmed_at IS NOT NULL
         AND COALESCE(account.encrypted_password, '') <> ''
         AND (account.banned_until IS NULL OR account.banned_until <= NOW())
         AND EXISTS (SELECT 1 FROM auth.identities identity
                     WHERE identity.user_id = account.id AND identity.provider = 'email')) AS structurally_ready
FROM public.users profile
LEFT JOIN auth.users account ON account.id = profile.id
WHERE profile.is_active = true AND profile.approval_status = 'approved'
  AND profile.role IN ('admin', 'manager', 'employee');
