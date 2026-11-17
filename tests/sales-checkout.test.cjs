const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function load(name, dependencies = {}) {
  const source = readFileSync(path.join(__dirname, '../src/pages/sales', name + '.ts'), 'utf8');
  const context = { exports: {}, require: name => { if (!(name in dependencies)) throw new Error('Unexpected import: ' + name); return dependencies[name]; } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const { submitSaleCheckout } = load('sale-checkout-submit', { './sale-money': load('sale-money') });
const input = { orderCode: 'POS-TEST', shiftId: 'shift', customerId: 'customer', items: [{ variantId: 'sku', quantity: 3 }] };
const payment = { method: 'CASH', expectedAmount: '125000', reference: '' };

test('checkout creates one draft and pays the server total exactly once', async () => {
  const calls = [];
  const api = {
    create: async body => { calls.push(['create', body]); return { id: 'order', totalNetAmount: '125000.00' }; },
    pay: async (...args) => { calls.push(['pay', ...args]); return { status: 'COMPLETED' }; },
  };
  const result = await submitSaleCheckout(api, input, payment);
  assert.equal(result.id, 'order');
  assert.equal(result.notice, '');
  assert.deepEqual(calls, [['create', input], ['pay', 'order', 'CASH', '125000.00', '']]);
});

test('price increases and expired or new discounts require review without collecting payment', async () => {
  for (const totalNetAmount of ['124999.99', '125000.01', '0.00']) {
    let paid = false;
    const result = await submitSaleCheckout({ create: async () => ({ id: 'review-order', totalNetAmount }), pay: async () => { paid = true; } }, input, payment);
    assert.equal(paid, false);
    assert.equal(result.id, 'review-order');
    assert.ok(result.notice.length > 0);
  }
});

test('a payment timeout preserves the created order for status checks without recreating or retrying', async () => {
  let creates = 0, payments = 0;
  const result = await submitSaleCheckout({ create: async () => { creates++; return { id: 'pending', totalNetAmount: '125000.00' }; }, pay: async () => { payments++; throw new Error('timeout'); } }, input, payment);
  assert.equal(creates, 1);
  assert.equal(payments, 1);
  assert.equal(result.id, 'pending');
  assert.ok(result.notice.length > 0);
});

test('a failed order creation never triggers a payment', async () => {
  let paid = false;
  await assert.rejects(submitSaleCheckout({ create: async () => { throw new Error('out of stock'); }, pay: async () => { paid = true; } }, input, payment), /out of stock/);
  assert.equal(paid, false);
});

test('a fully discounted order can complete with zero cash collected', async () => {
  let paid;
  const result = await submitSaleCheckout({ create: async () => ({ id: 'free', totalNetAmount: '0.00' }), pay: async (...args) => { paid = args; } }, input, { ...payment, expectedAmount: '0' });
  assert.equal(result.notice, '');
  assert.deepEqual(paid, ['free', 'CASH', '0.00', '']);
});

test('bank payment retains the selected method and transaction reference', async () => {
  let paid;
  await submitSaleCheckout({ create: async () => ({ id: 'bank', totalNetAmount: '125000.00' }), pay: async (...args) => { paid = args; } }, input, { ...payment, method: 'BANK_TRANSFER', reference: 'BANK-123' });
  assert.deepEqual(paid, ['bank', 'BANK_TRANSFER', '125000.00', 'BANK-123']);
});
