// Pass a directory with React 18 and react-test-renderer installed, or use the
// workspace dependencies if react-test-renderer is installed there.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import ts from 'typescript';

const testRequire = createRequire(resolve(process.argv[2] || '.', 'package.json'));
const React = testRequire('react');
const { create, act } = testRequire('react-test-renderer');
const listeners = new Set();
let finishLogin;
let authState = { currentUser: null, loading: true, mustResetPassword: false, login };
function updateAuth(patch) {
  authState = { ...authState, ...patch };
  listeners.forEach(listener => listener());
}
async function login() {
  updateAuth({ loading: true });
  const result = await new Promise(resolve => { finishLogin = resolve; });
  updateAuth({ loading: false });
  return result;
}
globalThis.loginFixture = {
  React,
  useAuth: () => React.useSyncExternalStore(
    listener => { listeners.add(listener); return () => listeners.delete(listener); },
    () => authState,
  ),
  stub: ({ children }) => children || null,
};
globalThis.window = { location: { search: '' } };

async function loadComponent(path, isApp = false) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  source = source.replace(/^import\s+([\s\S]+?)\s+from\s+['"](.+?)['"];?$/gm, (_line, names, module) => {
    if (module === 'react') return 'const React = globalThis.loginFixture.React; const {useState,useEffect} = React;';
    const named = [...names.matchAll(/\b[A-Za-z][A-Za-z0-9_]*\b/g)].map(match => match[0]);
    return named.map(name => {
      if (name === 'useAuth') return `const useAuth = globalThis.loginFixture.useAuth;`;
      if (name === 'LoginPage' && isApp) return 'const LoginPage = globalThis.loginFixture.LoginPage;';
      if (name === 'canAccessTab') return 'const canAccessTab = () => true;';
      return `const ${name} = globalThis.loginFixture.stub;`;
    }).join('\n');
  });
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
loginFixture.LoginPage = (await loadComponent('../src/components/auth/LoginPage.tsx')).LoginPage;
const { App } = await loadComponent('../src/App.tsx', true);
let renderer;
await act(async () => { renderer = create(React.createElement(App)); });
await act(async () => updateAuth({ loading: false }));
const input = id => renderer.root.findByProps({ id });
await act(async () => {
  input('login-email').props.onChange({ target: { value: 'staff@time2trade.com' } });
  input('login-password').props.onChange({ target: { value: 'T2T@Test-only!982' } });
});
let submission;
await act(async () => { submission = renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
assert.equal(input('login-email').props.value, 'staff@time2trade.com', 'Busy login must keep its form mounted');
assert.equal(renderer.root.findByProps({ type: 'submit' }).props.disabled, true);
await act(async () => {
  finishLogin({ success: false, status: 'error', message: 'Credentials rejected by Auth' });
  await submission;
});
assert.equal(input('login-email').props.value, 'staff@time2trade.com', 'Rejected login must retain the email');
assert.equal(renderer.root.findByProps({ role: 'alert' }).findAll(node => node.children.includes('Credentials rejected by Auth')).length, 1);
assert.equal(renderer.root.findByProps({ type: 'submit' }).props.disabled, false);
assert.equal(input('login-email').props.placeholder, 'Enter your registered login email');
await act(async () => renderer.unmount());
console.log('Login form checks passed: fields and errors survive authentication loading.');
