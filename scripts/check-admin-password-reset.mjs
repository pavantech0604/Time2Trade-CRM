import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

let handler, role = 'admin', validSession = true, authFailure = false;
const writes = [];
globalThis.Deno = { env: { get: () => 'test' }, serve: fn => { handler = fn; } };
globalThis.testCreateClient = () => ({
  auth: {
    getUser: async () => ({ data: { user: validSession ? { id: 'caller' } : null }, error: null }),
    admin: { updateUserById: async (id, attrs) => {
      writes.push({ id, ...attrs });
      return { error: authFailure ? { message: 'Rejected by password policy' } : null };
    } },
  },
  from: () => ({
    select: () => ({ eq: (_column, id) => ({ maybeSingle: async () => ({
      data: id === 'caller' ? { role, is_active: true, approval_status: 'approved' }
        : { id, is_active: true, approval_status: 'approved', must_reset_password: false }, error: null,
    }) }) }),
    update: attrs => ({ eq: async () => { writes.push(attrs); return { error: null }; } }),
  }),
});
let source = await readFile(new URL('../supabase/functions/admin-reset-password/index.ts', import.meta.url), 'utf8');
source = source.replace(/import .*?;\r?\n/, 'const createClient = globalThis.testCreateClient;\n');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const request = (password = 'T2T@Test-only!982', token = true) => new Request('https://example.test/reset', {
  method: 'POST', headers: token ? { Authorization: 'Bearer test' } : {},
  body: JSON.stringify({ userId: '12345678-1234-4234-8234-123456789012', password }),
});
assert.equal((await handler(request(undefined, false))).status, 401);
validSession = false;
assert.equal((await handler(request())).status, 401);
validSession = true;
for (role of ['employee', 'manager', 'pending']) assert.equal((await handler(request())).status, 403);
role = 'admin';
assert.equal((await handler(request('T2T@'))).status, 400);
assert.equal(writes.length, 0, 'Unauthorized and invalid requests must not change account data');
assert.equal((await handler(request())).status, 200);
assert.equal(writes[1].password, 'T2T@Test-only!982');
authFailure = true;
assert.equal((await handler(request())).status, 400);
assert.deepEqual(writes.at(-1), { must_reset_password: false }, 'Rejected resets restore the previous flag');
console.log('Admin password reset authorization checks passed.');
