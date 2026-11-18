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
const { formatMoneyInput, parseMoneyInput, moneyInputError, validateDeliveryDate, total, validateMoney, validateQty, paymentDelta, paymentTotal, buildReceiptPayload } = await loadTs("../src/pages/purchases/purchase-input.ts");
const order = { purchaseOrderItems: [
  { id: "line-lot", remainingQty: 6, variant: { sku: "SERUM", template: { hasLotTracking: true } } },
  { id: "line-plain", remainingQty: 10, variant: { sku: "SHIRT", template: { hasLotTracking: false } } },
] };
const count = (overrides = {}) => ({ key: "row", poItemId: "line-lot", qty: "3", price: "50000", lot: "LOT-A", expiration: "2027-01-01", manufacturing: "", ...overrides });

test("money inputs display Vietnamese grouping and retain plain API values", () => {
  assert.equal(formatMoneyInput("500000000"), "500.000.000");
  assert.equal(parseMoneyInput("500.000.000"), "500000000");
  assert.equal(formatMoneyInput("1234.50"), "1.234,50");
  assert.equal(parseMoneyInput("1.234,50"), "1234.50");
  assert.equal(parseMoneyInput("0500000"), "500000");
  assert.equal(parseMoneyInput(""), "");
  for (const value of ["-1", "1e3", "abc", "1,234", "1,2,3"]) assert.equal(parseMoneyInput(value), undefined);
  assert.equal(moneyInputError("500000000", "0", "500000000"), "");
  assert.match(moneyInputError("500000001", "0", "500000000"), /500\.000\.000/);
  assert.ok(moneyInputError("0", "0.01"));
  const payload = buildReceiptPayload(order, "PR-MONEY", parseMoneyInput("1.234,50"), [count({ qty: "1", price: parseMoneyInput("1.234,50") })]);
  assert.equal(payload.paidAmount, "1234.50");
  assert.equal(payload.items[0].actualCost, "1234.50");
});

test("order delivery date is required and cannot precede order date", () => {
  assert.throws(() => validateDeliveryDate("", "2026-11-03"), /Vui lòng chọn ngày giao dự kiến/);
  assert.throws(() => validateDeliveryDate("2026-11-02", "2026-11-03"), /không được trước ngày đặt/);
  assert.equal(validateDeliveryDate("2026-11-03", "2026-11-03"), "2026-11-03");
  assert.equal(validateDeliveryDate("2026-11-04", "2026-11-03"), "2026-11-04");
});

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

test("paying an additional amount calculates the API total exactly and prevents overpayment", () => {
  assert.equal(paymentTotal("100000.00", "50000", "200000.00"), "150000.00");
  assert.equal(paymentTotal("0.10", "0.20", "0.30"), "0.30");
  assert.equal(paymentTotal("100000.00", "100000.00", "200000.00"), "200000.00");
  for (const amount of ["0", "-1", "", "NaN", "0.001", "100000.01", "10000000000"]) {
    assert.throws(() => paymentTotal("100000.00", amount, "200000.00"));
  }
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

test("supplier catalog and receipt history stay separate and quoted prices retain decimals", async () => {
  await purchasesApi.supplierProducts("supplier-id", { search: "SKU & A/B", page: 2 }, "history");
  const url = new URL(globalThis.purchaseApiCalls.at(-1).path, "http://localhost/api");
  assert.equal(url.pathname, "/purchases/suppliers/supplier-id/products");
  assert.equal(url.searchParams.get("kind"), "history");
  assert.equal(url.searchParams.get("search"), "SKU & A/B");
  assert.equal(url.searchParams.get("page"), "2");
  await purchasesApi.supplierProducts("supplier-id", {});
  assert.equal(new URL(globalThis.purchaseApiCalls.at(-1).path, "http://localhost/api").searchParams.get("kind"), "catalog");
  await purchasesApi.saveSupplierProduct("supplier-id", "variant-id", "123.45");
  assert.equal(globalThis.purchaseApiCalls.at(-1).init.method, "PUT");
  assert.deepEqual(JSON.parse(globalThis.purchaseApiCalls.at(-1).init.body), { variantId: "variant-id", supplyPrice: "123.45" });
  await purchasesApi.removeSupplierProduct("supplier-id", "variant-id");
  assert.equal(globalThis.purchaseApiCalls.at(-1).path, "/purchases/suppliers/supplier-id/products/variant-id");
  assert.equal(globalThis.purchaseApiCalls.at(-1).init.method, "DELETE");
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
