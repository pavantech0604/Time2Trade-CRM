# Time2Trade CRM

Staff operations app built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## Run locally

```
npm ci
npm run dev
```

Create a local `.env` containing `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` for the intended project. Keep credentials out of Git.

```
npm run build
npm run preview
```

## Access and workflows

Employees see their own sales, payment status, assigned leads, profile, and account
notifications. Managers see employee profiles and team sales. Expenses and payment
approval are reserved for administrators. Signup creates a pending profile that an
administrator reviews before access is activated.

The login, signup, approval and reset screens support smaller viewports. Approved
employees can recover a forgotten password using the server-configured recovery
code and must save a new personal password before entering their dashboard.
Admins and managers retain their separate reset process. Notification read and
dismiss preferences are saved in the current browser.

## Database and deployment

[`supabase/setup.sql`](supabase/setup.sql) is the single database setup file.
See [`supabase/README.md`](supabase/README.md) for setup, account readiness and
Edge Function deployment. Both function directories under `supabase/functions/`
are required by the app and deploy separately from SQL.

Frontend deployment uses the connected Vercel project. Local CLI linkage/cache
files under `supabase/.temp/` and local environment files are ignored by Git.
Obsolete SQL fixes, one-time account/password repair examples, test scripts and
unreferenced UI components have been removed from the working tree; their earlier
versions remain in Git history. No live database records are changed by this
repository cleanup.
