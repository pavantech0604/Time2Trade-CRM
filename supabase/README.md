# Supabase setup

`setup.sql` is the only database setup script. It includes the current tables,
indexes, calculation triggers, role restrictions, signup profile creation,
password-recovery storage and service-only RPCs, storage configuration, realtime
registration, and a read-only employee login audit.

Run the entire file in the CRM project's Supabase SQL Editor as the project owner.
It applies setup in one transaction. It does not create or approve staff, change
passwords, delete employees, repeat duplicate-account repairs, or insert demo data.
The two result sets at the end are account readiness reports. For a read-only
login audit, run only the `SELECT` statements in section 9.
Existing production accounts and sales must retain their current IDs.

An existing deployment does not need this setup rerun just because the repository
was cleaned up. For a new project, the owner must approve the initial admin
profile after its matching Auth account is created.

## Roles

| Role | Access |
| --- | --- |
| Employee | Own sales, payment status, assigned leads, and profile |
| Manager | Employee profiles and team sales; expenses unavailable |
| Admin | Full CRM access, expenses, payment approval and staff review |

Each Auth user ID must match its public.users profile ID. New registrations stay
pending and inactive until an administrator approves them.

## Password reset functions

Keep both directories under `functions/`: they are required server code, not test
scripts. Deploy them separately from SQL with the Supabase CLI:

```
npx supabase functions deploy employee-password-recovery --remote=lqydkbfxbaxrgbvdznxn --no-verify-jwt --use-api --yes
npx supabase functions deploy admin-reset-password --remote=lqydkbfxbaxrgbvdznxn --use-api --yes
```

Set `EMPLOYEE_RECOVERY_PASSWORD` (or `UNIVERSAL_RECOVERY_PASSWORD`) as a Supabase Edge Function secret. Keep its value
out of Git and frontend environment variables. Universal password recovery is available in
the frontend without a separate Vercel feature flag. Active, approved staff profiles
(employees, managers, and admins) qualify to use this universal recovery password to reset
their password. The shared code starts a password-change form and never grants a dashboard session directly.
Tickets expire after five minutes and can be consumed once. Attempts are limited.
Anyone with the shared code and a staff member's email can reset that account's
password; distribute and rotate the code accordingly.

Internal email-shaped login identifiers do not require working mailboxes. For
future mailbox-free signups, disable Confirm email in Supabase Auth settings.
Existing unconfirmed accounts and mismatched IDs need administrator review; setup
never silently approves or merges them. Email-based recovery cannot deliver to a
dummy mailbox. Use the existing admin reset workflow for those accounts.

The expense-receipts bucket is private. Receipt viewing must use authenticated
downloads or signed URLs. CLI linkage/cache files stay local under `.temp/` and are
ignored by Git. Old one-time repair/password examples remain available in Git
history, outside the active setup.
