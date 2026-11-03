import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/passwordService.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { saveAuthPassword } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
let saved;
const client = {
  auth: {
    getUser: async () => ({ data: { user: { id: 'staff' } }, error: null }),
    updateUser: async ({ password }) => { saved = password; return { error: null }; },
  },
};
await saveAuthPassword(client, 'staff', 'T2T@Test-only!982');
assert.equal(saved, 'T2T@Test-only!982');
await saveAuthPassword(client, 'staff', '  T2T@Test-only!982  ');
assert.equal(saved, '  T2T@Test-only!982  ', 'Passwords must not be trimmed or rewritten');
await assert.rejects(saveAuthPassword(client, 'other', 'T2T@Test-only!982'), /session has expired/);
await assert.rejects(saveAuthPassword(client, 'staff', 'T2T@'), /at least 6/);
client.auth.updateUser = async () => ({ error: { message: 'Password rejected by Auth policy' } });
await assert.rejects(saveAuthPassword(client, 'staff', 'T2T@Test-only!982'), /Password rejected by Auth policy/);
client.auth.getUser = async () => ({ data: { user: null }, error: { message: 'Expired' } });
await assert.rejects(saveAuthPassword(client, 'staff', 'T2T@Test-only!982'), /session has expired/);
console.log('Password service checks passed.');
