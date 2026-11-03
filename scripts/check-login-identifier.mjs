import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/loginIdentifier.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { normalizeLoginIdentifier, isLoginIdentifier } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
for (const email of ['jagadeesh@time2trade', 'pavan@time2trade.com', 'lokeshtimetotrade@gmail.com']) {
  assert.equal(normalizeLoginIdentifier(email), email);
  assert.equal(isLoginIdentifier(email), true);
}
assert.equal(normalizeLoginIdentifier(' PAVAN@Time2Trade.com\u200B '), 'pavan@time2trade.com');
assert.equal(normalizeLoginIdentifier('pavan'), 'pavan@time2trade.com');
for (const email of ['', 'a@@b.com', 'a b@c.com', '@example.com']) assert.equal(isLoginIdentifier(email), false);
console.log('Stored login identifier checks passed.');
