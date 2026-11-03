import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import ts from 'typescript';
const testRequire = createRequire(resolve(process.argv[2] || '.', 'package.json'));
const React = testRequire('react');
const { create, act } = testRequire('react-test-renderer');
let serverCalls = 0, savedPassword, serverResult = { success: false, message: 'Password rejected by server' };
globalThis.recoveryFormFixture = {
  React,
  employeeRecovery: async () => { serverCalls++; return serverResult; },
};
let source = await readFile(new URL('../src/components/auth/EmployeeRecoveryForm.tsx', import.meta.url), 'utf8');
source = source.replace(/^import React.*?;$/m, 'const React = globalThis.recoveryFormFixture.React; const {useState} = React;')
  .replace(/^import \{ employeeRecovery \}.*?;$/m, 'const employeeRecovery = globalThis.recoveryFormFixture.employeeRecovery;');
const { outputText } = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020,
} });
const { EmployeeRecoveryForm } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
let renderer;
await act(async () => { renderer = create(React.createElement(EmployeeRecoveryForm, {
  ticket: 'a'.repeat(64), onComplete: async password => { savedPassword = password; }, onCancel() {},
})); });
const submit = () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} });
await act(async () => {
  renderer.root.findByProps({ id: 'employee-new-password' }).props.onChange({ target: { value: 'T2T@Test-only!982' } });
  renderer.root.findByProps({ id: 'employee-confirm-password' }).props.onChange({ target: { value: 'Different-password' } });
});
await act(async () => { await submit(); });
assert.equal(serverCalls, 0, 'Mismatched passwords cannot be submitted');
await act(async () => renderer.root.findByProps({ id: 'employee-confirm-password' }).props.onChange({ target: { value: 'T2T@Test-only!982' } }));
await act(async () => { await submit(); });
assert.equal(savedPassword, undefined, 'Server rejection cannot sign the employee in');
assert.equal(renderer.root.findByProps({ role: 'alert' }).children[0], 'Password rejected by server');
serverResult = { success: true };
await act(async () => { await submit(); });
assert.equal(savedPassword, 'T2T@Test-only!982', 'Sign-in follows only a confirmed server password update');
await act(async () => renderer.unmount());
console.log('Recovery form checks passed: matching passwords, visible failures and mandatory successful save.');
