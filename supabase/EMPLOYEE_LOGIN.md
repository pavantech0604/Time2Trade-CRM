# Employee login rollout

Existing passwords must be preserved. Do not bulk reset credentials or recreate
users to resolve login errors: their IDs link sales and employee profiles.

1. In the CRM project, run `employee_login_readiness.sql` after the existing
   role access migration. It confirms only matching active, approved accounts
   and installs server-side pending-profile creation for future signups.
2. Run `employee_login_audit.sql` and review every employee's `login_status`.
3. For future mailbox-free signups, leave Supabase Auth's **Confirm email** off.
   The CRM still requires administrator approval and a valid Auth password.

| Audit result | Action |
| --- | --- |
| READY_USE_EXISTING_PASSWORD | Log in with the exact registered email and existing Auth password. This checks structure, not whether a person knows the password. |
| NEEDS_ADMIN_CONFIRMATION | Apply the readiness migration after approving the profile. |
| MISSING_AUTH_ACCOUNT | Provision an Auth account with the same ID using the server-side Admin API. There is no existing Auth password to preserve. Agree credentials with the employee before creating it. |
| AUTH_ID_MISMATCH_REVIEW_REQUIRED | Review both records and linked sales; do not delete or recreate accounts or change IDs blindly. |
| EMAIL_MISMATCH_REVIEW_REQUIRED | Review the Auth email and CRM profile email; establish the intended login identifier. |
| MISSING_EMAIL_PASSWORD_IDENTITY / PASSWORD_NOT_SET | Administrator must repair the Auth identity or agree a password with the employee. Never invent a default shared password. |
| DISABLED_IN_CRM / REJECTED_IN_CRM / AWAITING_ADMIN_APPROVAL / ROLE_NEEDS_REVIEW | Administrator reviews account access. These are not password errors. |
| AUTH_ACCOUNT_BANNED | Administrator reviews the Auth ban. The migration does not override it. |
| MISSING_CRM_PROFILE | Administrator links or provisions the correct profile after reviewing the Auth identity. |

The readiness migration does not fix missing accounts, identity conflicts or
unknown passwords. The read-only report distinguishes those cases. It never
displays password hashes or plaintext passwords. Treat the report as staff data.

Deploy frontend changes through Vercel. If ongoing administrator password resets
are needed, deploy `admin-reset-password` separately as described in
`PASSWORD_RESET.md`. No service-role key belongs in frontend environment variables.
