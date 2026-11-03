import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TABLE public.users(id uuid PRIMARY KEY, role text, is_active boolean, approval_status text);
  INSERT INTO public.users VALUES ('12345678-1234-4234-8234-123456789012','employee',true,'approved');`);
const sql = await readFile(new URL('../supabase/employee_password_recovery.sql', import.meta.url), 'utf8');
await db.exec(sql);
await db.exec(sql);
for (let i = 0; i < 5; i++) {
  assert.equal((await db.query("SELECT public.crm_allow_employee_recovery('email','ip') AS allowed")).rows[0].allowed, true);
}
assert.equal((await db.query("SELECT public.crm_allow_employee_recovery('email','ip') AS allowed")).rows[0].allowed, false);
await db.exec("UPDATE public.employee_recovery_attempts SET created_at=NOW()-INTERVAL '16 minutes'");
assert.equal((await db.query("SELECT public.crm_allow_employee_recovery('email','ip') AS allowed")).rows[0].allowed, true);
await db.exec(`INSERT INTO public.employee_recovery_tickets VALUES
  ('valid','12345678-1234-4234-8234-123456789012',NOW()+INTERVAL '5 minutes',NULL),
  ('expired','12345678-1234-4234-8234-123456789012',NOW()-INTERVAL '1 second',NULL),
  ('disabled','12345678-1234-4234-8234-123456789012',NOW()+INTERVAL '5 minutes',NULL);`);
const consume = async ticket => (await db.query('SELECT public.crm_consume_employee_recovery($1) AS id', [ticket])).rows[0].id;
assert.equal(await consume('valid'), '12345678-1234-4234-8234-123456789012');
assert.equal(await consume('valid'), null);
assert.equal(await consume('expired'), null);
await db.exec("UPDATE public.users SET role='manager'");
assert.equal(await consume('disabled'), null);
await db.exec("UPDATE public.users SET role='employee',is_active=false");
assert.equal(await consume('disabled'), null);
await db.exec("UPDATE public.users SET is_active=true,approval_status='pending_admin_review'");
assert.equal(await consume('disabled'), null);
for (const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(db.query('SELECT * FROM public.employee_recovery_tickets'), /permission denied/);
  await assert.rejects(db.query("SELECT public.crm_consume_employee_recovery('disabled')"), /permission denied/);
  await db.exec('RESET ROLE');
}
await db.close();
console.log('Recovery database checks passed: limits, expiry, replay, eligibility and permissions.');
