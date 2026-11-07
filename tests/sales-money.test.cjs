const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../src/pages/sales/sale-money.ts'), 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { cashChange } = context.exports;

test('exact cash returns zero change', () => {
  assert.equal(cashChange('125000', '125000.00'), '0.00');
});
test('excess cash returns change without altering the order total', () => {
  assert.equal(cashChange('200000', '125000.00'), '75000.00');
});
test('decimal prices are calculated exactly', () => {
  assert.equal(cashChange('0.30', '0.10'), '0.20');
  assert.equal(cashChange('9999999999.99', '9999999999.98'), '0.01');
});
test('insufficient cash blocks confirmation', () => {
  assert.equal(cashChange('999.99', '1000'), null);
});
test('empty, negative, nonfinite and excess precision inputs are rejected', () => {
  for (const value of ['', '-1', 'NaN', 'Infinity', '1e5', '1.001', '1,000', 'abc']) {
    assert.equal(cashChange(value, '1'), null, value);
    assert.equal(cashChange('1000', value), null, value);
  }
});
