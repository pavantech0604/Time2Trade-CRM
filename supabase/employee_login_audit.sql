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
