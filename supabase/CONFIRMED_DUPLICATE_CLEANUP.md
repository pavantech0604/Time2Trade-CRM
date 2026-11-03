# Confirmed staff account cleanup

Run the entire `repair_confirmed_staff_duplicates.sql` file in the CRM project's
Supabase SQL Editor. Paste SQL source, not the JSON results returned by a query.

| Person | Retained login | Change |
| --- | --- | --- |
| Karthik | karthik@time2trade.com | Move CRM profile and references to existing Auth ID a8e3c034-b564-418e-85ce-ffd03d7a20ba; retain manager role. |
| Mahaan | mahaan@time2trade.com | Move CRM profile and references to existing Auth ID 5f30903d-2106-44b7-8bd4-7f02e8867a91; retain current admin role. |
| Lokesh | lokesh@time2trade.com | Reassign references from old Gmail duplicate, back up and remove old Auth account 60efb575-c991-4a4a-b82c-f96e599b880f. |
| Madhan | madhakumar@time2trade.com | Reassign references from old typo-domain duplicate, back up and remove old Auth account 89d8ec24-13c5-4169-be6e-b2648d3e29bf. |
| Ramesh | ramesh@time2trade.com | Leave untouched: an unlinked account is not evidence of a duplicate. Administrator must review whether to create a staff profile. |

Retained Auth passwords, roles, payment IDs and amounts are preserved. The two
removed login aliases stop working; staff use the retained addresses above.
The application also preserves Jaga's existing `jagadeesh@time2trade` identifier
instead of silently appending `.com`.

The transaction backs up affected records in the owner-only `crm_maintenance`
schema, including removed Auth records and identities. Those backups contain
sensitive account data and must remain restricted to the database owner.
It updates declared user foreign keys and known legacy user-reference columns.
Historical IDs embedded inside arbitrary JSON, external spreadsheets, and local
browser caches are not rewritten. Sign out and sign back in after the cleanup.
Do not rerun old mock-data seeding scripts that recreate the old Karthik ID.

Unexpected profiles, changed mappings or uniqueness conflicts abort the entire
transaction. Send the actual SQL error if it fails; do not remove guards or
manually delete the old rows. After success, run `employee_login_audit.sql` again.

The migration was tested against an isolated PostgreSQL fixture for reference
preservation, password preservation, idempotency, conflict rollback and backups.
It has not been executed against the live project by the local build.
