// Supply an installed @electric-sql/pglite module path as the first argument
// to run this migration against an isolated PostgreSQL fixture.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const migration = await readFile(new URL('../supabase/repair_confirmed_staff_duplicates.sql', import.meta.url), 'utf8');
const ids = {
  oldK: '10000000-0000-0000-0000-000000000001', k: 'a8e3c034-b564-418e-85ce-ffd03d7a20ba',
  oldM: 'a2e51b6b-3a79-4791-a992-01e41df4fb9e', m: '5f30903d-2106-44b7-8bd4-7f02e8867a91',
  oldL: '60efb575-c991-4a4a-b82c-f96e599b880f', l: '50a38af4-74e4-4941-b690-94b23008d785',
  oldD: '89d8ec24-13c5-4169-be6e-b2648d3e29bf', d: 'af554cef-d912-41b6-9369-9a24c4f6651c',
  r: '2400cf76-6de9-4117-9ec8-2d5c1bfbc5e6',
};
async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text UNIQUE, encrypted_password text, email_confirmed_at timestamptz);
    CREATE TABLE auth.identities(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users ON DELETE CASCADE);
    CREATE TABLE public.users(id uuid PRIMARY KEY, name text, email text UNIQUE, role text,
      is_active boolean, approval_status text, manager_id uuid REFERENCES public.users);
    CREATE TABLE public.payments(id int PRIMARY KEY, employee_id uuid REFERENCES public.users ON DELETE CASCADE, amount int);
    CREATE TABLE public.legacy_notes(id int PRIMARY KEY, created_by text);
    CREATE TABLE public.payment_allocations(id int PRIMARY KEY, payment_id int,
      employee_id uuid REFERENCES public.users, UNIQUE(payment_id, employee_id));
  `);
  const authAccounts = [
    [ids.k, 'karthik@time2trade.com'], [ids.m, 'mahaan@time2trade.com'],
    [ids.l, 'lokesh@time2trade.com'], [ids.oldL, 'lokeshtimetotrade@gmail.com'],
    [ids.d, 'madhakumar@time2trade.com'], [ids.oldD, 'madhan@tame2trade.com'], [ids.r, 'ramesh@time2trade.com'],
  ];
  for (const [id, email] of authAccounts) {
    await db.query('INSERT INTO auth.users VALUES ($1,$2,$3,NULL)', [id, email, `unchanged-${id}`]);
    await db.query('INSERT INTO auth.identities VALUES ($1,$1)', [id]);
  }
  for (const [id, email, role] of [
    [ids.oldK, 'karthik@time2trade.com', 'manager'], [ids.oldM, 'mahaan@time2trade.com', 'admin'],
    [ids.l, 'lokesh@time2trade.com', 'employee'], [ids.d, 'madhakumar@time2trade.com', 'employee'],
  ]) await db.query("INSERT INTO public.users VALUES ($1,$2,$2,$3,true,'approved',NULL)", [id,email,role]);
  await db.query('UPDATE public.users SET manager_id=$1 WHERE id=$2', [ids.oldK, ids.l]);
  await db.query('INSERT INTO public.payments VALUES (1,$1,100),(2,$2,200)', [ids.oldK, ids.oldM]);
  await db.query('INSERT INTO public.legacy_notes VALUES (1,$1)', [ids.oldL]);
  return db;
}

const db = await fixture();
await db.exec(migration);
assert.equal((await db.query('SELECT count(*)::int AS count FROM public.users')).rows[0].count, 4);
assert.deepEqual((await db.query('SELECT employee_id,amount FROM public.payments ORDER BY id')).rows,
  [{ employee_id: ids.k, amount: 100 }, { employee_id: ids.m, amount: 200 }]);
assert.equal((await db.query('SELECT manager_id FROM public.users WHERE id=$1', [ids.l])).rows[0].manager_id, ids.k);
assert.equal((await db.query('SELECT created_by FROM public.legacy_notes')).rows[0].created_by, ids.l);
for (const id of [ids.k,ids.m,ids.l,ids.d,ids.r]) {
  const account = (await db.query('SELECT encrypted_password FROM auth.users WHERE id=$1', [id])).rows[0];
  assert.equal(account.encrypted_password, `unchanged-${id}`);
}
assert.equal((await db.query('SELECT count(*)::int AS count FROM auth.users WHERE id IN ($1,$2)', [ids.oldL,ids.oldD])).rows[0].count, 0);
assert.equal((await db.query("SELECT count(*)::int AS count FROM crm_maintenance.staff_cleanup_backup WHERE entity='auth.users'")).rows[0].count, 2);
await db.exec(migration); // Re-running must not damage retained accounts.
await db.close();

const conflict = await fixture();
// A real profile unexpectedly attached to an old login must prevent deletion.
await conflict.query("INSERT INTO public.users VALUES ($1,'Unexpected','unexpected@example.com','employee',true,'approved',NULL)", [ids.oldL]);
await assert.rejects(conflict.exec(migration), /Duplicate now has a CRM profile/);
await conflict.exec('ROLLBACK');
assert.equal((await conflict.query('SELECT employee_id FROM public.payments WHERE id=1')).rows[0].employee_id, ids.oldK);
assert.equal((await conflict.query('SELECT count(*)::int AS count FROM auth.users')).rows[0].count, 7);
await conflict.close();
console.log('PostgreSQL cleanup checks passed: account links, references, passwords, backup, idempotency and rollback.');
