import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/accessControl.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { canAccessTab, ownsPayment } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

for (const role of ['employee', 'manager', 'pending']) {
  for (const tab of ['expenses', 'reports', 'payment-verification', 'employee-management', 'manager-advances', 'dashboard']) {
    assert.equal(canAccessTab(role, tab), false, `${role} must not access ${tab}`);
    assert.equal(canAccessTab('admin', tab), true);
  }
}
for (const tab of ['employee-sales', 'employee-details', 'employee-scorecards', 'manager-dashboard']) {
  assert.equal(canAccessTab('manager', tab), true);
}
assert.equal(canAccessTab('employee', 'manager-dashboard'), false);
assert.equal(canAccessTab('employee', 'employee-sales'), false);
assert.equal(canAccessTab('employee', 'employee-dashboard'), true);
assert.equal(canAccessTab('employee', 'team-chat'), false);
assert.equal(ownsPayment({ employee_id: 'other', employee_name: 'Alex', remarks: 'Alex' }, 'alex-id'), false);
assert.equal(ownsPayment({ employee_id: 'alex-id' }, 'alex-id'), true);
assert.equal(ownsPayment({ submitted_by_employee_id: 'alex-id' }, 'alex-id'), true);
assert.equal(ownsPayment({ allocations: [{ employee_id: 'alex-id' }] }, 'alex-id'), true);
console.log('Access control checks passed.');
