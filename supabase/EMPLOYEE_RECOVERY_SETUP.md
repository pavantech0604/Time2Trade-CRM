# Shared employee password recovery

The shared code starts a mandatory password change; it does not create a login
session. After the new personal password is saved in Supabase Auth, the employee
signs in normally. Only active, approved **employee** profiles with matching Auth
IDs and emails qualify. Admins, managers, pending, disabled and banned accounts
cannot use this flow. Existing passwords are unchanged until a reset completes.

A person who knows the shared code and another employee's email can reset that
employee's password. This is the user-requested shared-code recovery model.

## Deployment order

1. Run `employee_password_recovery.sql` in Supabase SQL Editor.
2. Create an Edge Function named `employee-password-recovery` using
   `functions/employee-password-recovery/index.ts`.
3. In Supabase Edge Function secrets, set `EMPLOYEE_RECOVERY_PASSWORD` to the
   shared code chosen by the administrator. Do not put this value in a VITE_
   variable, GitHub, the SQL file, or frontend source.
4. Deploy this one function with JWT verification **off**. Recovery starts before
   a user has a session; the function validates the shared secret and employee
   eligibility itself. Do not disable JWT verification on unrelated functions.
   CLI equivalent:

   ```
   supabase functions deploy employee-password-recovery --project-ref lqydkbfxbaxrgbvdznxn --no-verify-jwt
   ```

5. In Vercel, add `VITE_EMPLOYEE_RECOVERY_ENABLED=true` for Production and
   redeploy. Enable this only after steps 1–4 are complete. Ordinary password
   login remains available when recovery is disabled.

## Employee flow

Enter the registered employee email and the shared code in the normal login
form. The code is checked on the server before normal password authentication.
A matching code opens the new-password form. Set and confirm a personal password
(8–128 characters, different from the shared code). Saving it signs the employee
in using the new Auth password. A working mailbox is not needed.

Recovery tickets expire after five minutes, are stored only as SHA-256 hashes,
are held only in browser component memory, and can be consumed once. Requests
are limited to five per email and thirty per IP within fifteen minutes. Those
limits affect recovery attempts, not ordinary password login. Sensitive tables
and RPCs are accessible only to the server service role. Do not log request
bodies or recovery tickets. The shared code can be rotated in Supabase secrets
without rebuilding the frontend.

Deploying Vercel alone does not deploy the SQL, Edge Function or secret. Test a
real employee end to end after deployment, and verify privileged/inactive
accounts, wrong codes, expired tickets and reused tickets are denied.
