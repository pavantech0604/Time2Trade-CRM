import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
let handler, role = 'employee', active = true, approved = true, banned = false, limited = false;
const passwordWrites = [], tickets = new Map();
const secret = 'Fixture-only-recovery-code!';
const userId = '12345678-1234-4234-8234-123456789012';
const email = 'staff@example.test';
globalThis.Deno = { env: { get: name => name === 'EMPLOYEE_RECOVERY_PASSWORD' ? secret : 'test' }, serve: fn => { handler = fn; } };
globalThis.recoveryTestClient = () => ({
  rpc: async (name, params) => {
    if (name === 'crm_allow_employee_recovery') return { data: !limited, error: null };
    const ticket = tickets.get(params.ticket_digest);
    if (!ticket || ticket.used || role !== 'employee' || !active || !approved) return { data: null, error: null };
    ticket.used = true;
    return { data: userId, error: null };
  },
  from: table => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
      id: userId, email, role, is_active: active, approval_status: approved ? 'approved' : 'pending_admin_review',
    }, error: null }) }) }),
    insert: async row => { tickets.set(row.token_hash, { ...row, used: false }); return { error: null }; },
    update: () => ({ eq: async () => ({ error: null }) }),
  }),
  auth: { admin: {
    getUserById: async () => ({ data: { user: { id: userId, email, banned_until: banned ? '2999-01-01' : null } }, error: null }),
    updateUserById: async (_id, attributes) => { passwordWrites.push(attributes); return { error: null }; },
  } },
});
let source = await readFile(new URL('../supabase/functions/employee-password-recovery/index.ts', import.meta.url), 'utf8');
source = source.replace(/import .*?;\r?\n/, 'const createClient = globalThis.recoveryTestClient;\n');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const call = async body => (await handler(new Request('https://example.test/recovery', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}))).json();
const start = password => call({ action: 'start', email, password });
assert.equal((await start('incorrect')).success, false);
assert.equal(tickets.size, 0);
for (role of ['admin','manager','pending']) assert.equal((await start(secret)).success, false);
role = 'employee';
active = false; assert.equal((await start(secret)).success, false); active = true;
approved = false; assert.equal((await start(secret)).success, false); approved = true;
banned = true; assert.equal((await start(secret)).success, false); banned = false;
limited = true; assert.equal((await start(secret)).success, false); limited = false;
const result = await start(secret);
assert.equal(result.success, true);
assert.match(result.recoveryToken, /^[a-f0-9]{64}$/);
assert.equal(result.access_token, undefined);
assert.equal(result.session, undefined);
assert.equal(tickets.has(result.recoveryToken), false, 'Database must store a hash, not the raw ticket');
assert.equal(passwordWrites.length, 0, 'Starting recovery must not change a password');
const finish = password => call({ action: 'finish', ticket: result.recoveryToken, newPassword: password });
assert.equal((await finish(secret)).success, false);
assert.equal((await finish('short')).success, false);
assert.equal((await finish('T2T@Fixture-personal!982')).success, true);
assert.equal(passwordWrites[0].password, 'T2T@Fixture-personal!982');
assert.equal((await finish('Different-personal!823')).success, false);
assert.equal(passwordWrites.length, 1);
console.log('Recovery function checks passed: shared-code validation, role gates, bans, hashed tickets, forced change and replay rejection.');
