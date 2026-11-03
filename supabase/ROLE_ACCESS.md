# CRM access rules

| Feature | Employee | Manager | Admin |
| --- | --- | --- | --- |
| Sales and payment status | Own submissions / assigned sales / allocated shares | All | All |
| Employee personal details | Own profile | All employees | All |
| Monthly sales | Own records | All | All |
| Team chat and sales celebrations | Hidden to avoid disclosing other sales | Yes | Yes |
| Expenses and expense receipts | No | No | Yes |
| Verify, delete or clear payments | No | No | Yes |
| Staff approval and roles | No | No | Yes |
| Reports and company financial administration | No | No | Yes |

Apply `role_access_hardening.sql` after the existing schema scripts in the
Supabase SQL editor. This migration has not been executed by the local build.
Validate with separate authenticated employee, manager and admin accounts before
release. Check direct REST reads as well as direct `?tab=expenses` links.

Connected logins now require real Supabase Auth credentials and an approved
profile. Old temporary-password and local-storage-only login fallbacks no longer
grant access. Provision missing Auth accounts through the administrator workflow
before rollout. Verify that each Auth ID matches its public.users profile ID.

The migration uses restrictive policies alongside the legacy permissive policies.
It makes the expense-receipts storage bucket private. Existing public receipt
links must be replaced with authenticated downloads or short-lived signed URLs
if receipt viewing is added to the expense screen.

Run `node scripts/check-access-control.mjs` and `npm run build` for local checks.
These do not validate deployed database policies or replace multi-account checks.

## Internal email-shaped login identifiers

Addresses such as `pavan@time2trade.com` do not need a working mailbox for
password login. In Supabase Authentication > Sign In / Providers, disable
**Confirm email** and save to avoid mailbox verification for future signups.
This is a hosted Auth setting; deploying frontend code cannot change it.

For existing unconfirmed accounts, run `confirm_approved_staff_accounts.sql`.
It confirms only active, approved `@time2trade.com` staff whose Auth IDs and
emails match their CRM profiles, and reports Pavan's account status. It does
not create accounts, change passwords, assign roles or approve employees.
Accounts that do not match must be reviewed rather than automatically merged.
Password recovery by email will not work for an identifier without a mailbox;
an administrator must manage those passwords through Supabase Auth.
