import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/accountAccess.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { getAccountAccessIssue } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
for (const role of ['employee', 'manager', 'admin']) {
  assert.equal(getAccountAccessIssue({ role, is_active: true, approval_status: 'approved' }), null);
  assert.equal(getAccountAccessIssue({ role, is_active: false, approval_status: 'approved' }).status, 'disabled');
  assert.equal(getAccountAccessIssue({ role, is_active: false, approval_status: 'pending_admin_review' }).status, 'pending');
  assert.equal(getAccountAccessIssue({ role, is_active: false, approval_status: 'rejected' }).status, 'rejected');
  assert.equal(getAccountAccessIssue({ role, is_active: true }).status, 'pending');
}
assert.equal(getAccountAccessIssue({ role: 'pending', is_active: true, approval_status: 'approved' }).status, 'pending');
assert.equal(getAccountAccessIssue({ role: 'unknown', is_active: true, approval_status: 'approved' }).status, 'error');
console.log('Account approval and role checks passed.');
