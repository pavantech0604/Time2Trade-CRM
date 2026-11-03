-- Run in the production Supabase SQL Editor as the project administrator.
-- Dummy @time2trade.com addresses are internal login identifiers, not mailboxes.
-- This changes email confirmation only, never passwords, roles or approval.
BEGIN;

UPDATE auth.users AS account
SET email_confirmed_at = NOW(),
    confirmation_token = '',
    updated_at = NOW()
FROM public.users AS profile
WHERE profile.id = account.id
  AND lower(trim(profile.email)) = lower(trim(account.email))
  AND lower(account.email) LIKE '%@time2trade.com'
  AND profile.approval_status = 'approved'
  AND profile.is_active = true
  AND profile.role IN ('admin', 'manager', 'employee')
  AND account.email_confirmed_at IS NULL
RETURNING account.id, account.email, account.email_confirmed_at;

COMMIT;

-- Verify Pavan's setup without exposing any password data.
SELECT account.email,
       account.email_confirmed_at IS NOT NULL AS email_confirmed,
       profile.id IS NOT NULL AS profile_id_matches,
       profile.role,
       profile.is_active,
       profile.approval_status
FROM auth.users AS account
LEFT JOIN public.users AS profile ON profile.id = account.id
WHERE lower(account.email) = 'pavan@time2trade.com';
