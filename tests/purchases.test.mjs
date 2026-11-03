import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Execute the same TypeScript validation used by the forms, without a browser or database.
async function loadTs(path, transform = (source) => source) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(transform(source), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { total, validateMoney, validateQty, paymentDelta, buildReceiptPayload } = await loadTs("../src/pages/purchases/purchase-input.ts");
const order = { purchaseOrderItems: [
  { id: "line-lot", remainingQty: 6, variant: { sku: "SERUM", template: { hasLotTracking: true } } },
  { id: "line-plain", remainingQty: 10, variant: { sku: "SHIRT", template: { hasLotTracking: false } } },
] };
const count = (overrides = {}) => ({ key: "row", poItemId: "line-lot", qty: "3", price: "50000", lot: "LOT-A", expiration: "2027-01-01", manufacturing: "", ...overrides });

test("currency arithmetic retains cents across quantities and large totals", () => {
  assert.equal(total([{ qty: "3", price: "0.1" }, { qty: "1", price: "0.2" }]), "0.50");
  assert.equal(total([{ qty: "99", price: "9999999999.99" }]), "989999999999.01");
});
test("rejects fractional quantities, negative amounts and unsupported precision", () => {
  for (const value of ["1.5", "-1", "2147483648", "", "1e2"]) assert.throws(() => validateQty(value));
  for (const value of ["-1", "0.001", "10000000000", "NaN", "Infinity", "1e3"]) assert.throws(() => validateMoney(value));
  assert.equal(validateQty("0", true), 0);
  assert.throws(() => validateQty("0"));
});
test("receives a partial delivery across lots and omits undelivered SKUs", () => {
  const payload = buildReceiptPayload(order, " PR-01 ", "100000", [count(), count({ lot: "LOT-B", qty: "1" }), count({ poItemId: "line-plain", qty: "0" })]);
  assert.equal(payload.receiptCode, "PR-01");
  assert.equal(payload.items.length, 2);
  assert.equal(payload.items.reduce((sum, line) => sum + line.receivedQty, 0), 4);
  assert.equal(payload.items[1].lotNumber, "LOT-B");
  assert.equal(payload.paidAmount, "100000");
});
test("receiving across lots cannot exceed the remaining PO quantity", () => {
  assert.throws(() => buildReceiptPayload(order, "PR-02", "0", [count({ qty: "4" }), count({ qty: "3", lot: "LOT-B" })]), /vượt 6/);
  assert.equal(buildReceiptPayload(order, "PR-02", "0", [count(), count({ lot: "LOT-B" })]).items.length, 2);
});
test("enforces lot dates, selected quantities and payment limits", () => {
  assert.throws(() => buildReceiptPayload(order, "PR", "0", [count({ lot: "" })]));
  assert.throws(() => buildReceiptPayload(order, "PR", "0", [count({ manufacturing: "2027-02-01" })]));
  assert.throws(() => buildReceiptPayload(order, "PR", "0", [count({ qty: "0" })]));
  assert.throws(() => buildReceiptPayload(order, "PR", "150000.01", [count()]));
  assert.throws(() => buildReceiptPayload(order, "PR", "0", [count({ poItemId: "other-order-line" })]));
  const plain = buildReceiptPayload(order, "PR", "0", [count({ poItemId: "line-plain" })]);
  assert.equal(plain.items[0].lotNumber, undefined);
  assert.equal(plain.items[0].expirationDate, undefined);
});
test("payment uses a cumulative amount and enforces the cash transaction limit", () => {
  assert.equal(paymentDelta("100000", "150000", "200000"), "50000.00");
  assert.equal(paymentDelta("0.10", "0.30", "0.50"), "0.20");
  assert.throws(() => paymentDelta("100000", "50000", "200000"));
  assert.throws(() => paymentDelta("100000", "100000", "200000"));
  assert.throws(() => paymentDelta("100000", "200000.01", "200000"));
  assert.throws(() => paymentDelta("0", "10000000000", "20000000000"));
});

globalThis.purchaseApiCalls = [];
const stub = `data:text/javascript,${encodeURIComponent('export async function apiRequest(path, init) { globalThis.purchaseApiCalls.push({path, init}); return {}; }')}`;
const { purchasesApi } = await loadTs("../src/api/purchases.ts", (source) => source.replace('"@/services/api.service"', JSON.stringify(stub)));
test("API search encodes special characters and skips empty filters", async () => {
  await purchasesApi.orders({ search: "NCC & A/B", status: "", from: "2026-11-01", page: 2 });
  const call = globalThis.purchaseApiCalls.at(-1);
  const url = new URL(call.path, "http://localhost/api");
  assert.equal(url.searchParams.get("search"), "NCC & A/B");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.has("status"), false);
});
test("confirmation sends the preview token and payment sends the new cumulative amount", async () => {
  await purchasesApi.confirm("po-id", "signed-preview");
  assert.equal(globalThis.purchaseApiCalls.at(-1).path, "/purchases/orders/po-id/receipt-drafts/confirm");
  assert.deepEqual(JSON.parse(globalThis.purchaseApiCalls.at(-1).init.body), { draftToken: "signed-preview" });
  await purchasesApi.pay("receipt-id", "150000.00");
  assert.equal(globalThis.purchaseApiCalls.at(-1).init.method, "PATCH");
  assert.deepEqual(JSON.parse(globalThis.purchaseApiCalls.at(-1).init.body), { paidAmount: "150000.00" });
});
test("correction and debt reconciliation include their concurrency safeguards", async () => {
  const lines = [{ id: "item", receivedQty: 3, actualCost: "20", expectedReceivedQty: 2, expectedActualCost: "10" }];
  await purchasesApi.correct({ id: "receipt-id", totalAmount: "20.00" }, lines);
  assert.deepEqual(JSON.parse(globalThis.purchaseApiCalls.at(-1).init.body), { expectedTotalAmount: "20.00", items: lines });
  await purchasesApi.applyReconciliation({ supplierId: "supplier-id", storedDebtAmount: "-100.00" });
  assert.deepEqual(JSON.parse(globalThis.purchaseApiCalls.at(-1).init.body), { apply: true, expectedDebtAmount: "-100.00" });
});
