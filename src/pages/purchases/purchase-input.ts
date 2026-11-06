import type { Order, ReceiptPayload } from "@/api/purchases";

export function formatMoneyInput(value: string) {
  if (!value) return "";
  const [whole, fraction] = value.split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (fraction === undefined ? "" : `,${fraction}`);
}

export function parseMoneyInput(value: string): string | undefined {
  const plain = value.replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d*(\.\d{0,2})?$/.test(plain)) return undefined;
  if (!plain) return "";
  const [whole, fraction] = plain.split(".");
  return (whole.replace(/^0+(?=\d)/, "") || "0") + (fraction === undefined ? "" : `.${fraction}`);
}

export function moneyInputError(value: string, min = "0", max?: string | number) {
  if (!value) return ""; // The required attribute handles empty input.
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return "Vui lòng nhập số tiền hợp lệ, tối đa 2 chữ số thập phân.";
  if (Number(value) < Number(min)) return `Số tiền phải từ ${formatMoneyInput(min)} đ trở lên.`;
  if (max !== undefined && Number(value) > Number(max)) return `Số tiền không được vượt quá ${formatMoneyInput(String(max))} đ.`;
  return "";
}

export function validateDeliveryDate(value: string, orderDate: string) {
  if (!value) throw new Error("Vui lòng chọn ngày giao dự kiến.");
  if (value < orderDate) throw new Error("Ngày giao dự kiến không được trước ngày đặt.");
  return value;
}

export function validateMoney(value: string, max = 10_000_000_000) {
  if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) >= max) throw new Error("Số tiền phải không âm, tối đa 2 chữ số thập phân và trong giới hạn cho phép.");
  return value;
}
export function validateQty(value: string, allowZero = false) {
  if (!/^\d+$/.test(value) || !Number.isInteger(Number(value)) || Number(value) < (allowZero ? 0 : 1) || Number(value) > 2_147_483_647) throw new Error("Số lượng phải là số nguyên trong giới hạn cho phép.");
  return Number(value);
}
function cents(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function decimal(value: bigint) { return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`; }
export function total(lines: { qty: string; price: string }[]) {
  let amount = 0n;
  for (const line of lines) {
    if (!/^\d+(\.\d{1,2})?$/.test(line.price) || !/^\d+$/.test(line.qty)) continue;
    amount += cents(line.price) * BigInt(line.qty);
  }
  return decimal(amount);
}
export function paymentDelta(previous: string, next: string, receiptTotal: string) {
  validateMoney(next, 1_000_000_000_000);
  const difference = cents(next) - cents(previous);
  if (difference <= 0n || cents(next) > cents(receiptTotal)) throw new Error("Tổng mới phải lớn hơn tổng đã trả và không vượt tiền hàng.");
  // Each actual cash transaction has a smaller database precision than receipt totals.
  const result = decimal(difference);
  validateMoney(result);
  return result;
}
export function paymentTotal(previous: string, amount: string, receiptTotal: string) {
  validateMoney(amount);
  if (cents(amount) <= 0n || cents(previous) + cents(amount) > cents(receiptTotal)) throw new Error("Số tiền trả lần này phải lớn hơn 0 và không vượt số tiền còn nợ.");
  return decimal(cents(previous) + cents(amount));
}
export type CountLine = { key: string; poItemId: string; qty: string; price: string; lot: string; expiration: string; manufacturing: string };
export function buildReceiptPayload(order: Order, receiptCode: string, paid: string, lines: CountLine[]): ReceiptPayload {
  const counts = new Map<string, number>();
  const selected = lines.filter((line) => validateQty(line.qty, true) > 0);
  if (!selected.length || selected.length > 500) throw new Error("Nhập số lượng thực nhận lớn hơn 0 cho ít nhất một dòng, tối đa 500 dòng.");
  const items = selected.map((line) => {
    const item = order.purchaseOrderItems.find((item) => item.id === line.poItemId);
    if (!item) throw new Error("Dòng nhận không thuộc đơn đặt mua.");
    const qty = validateQty(line.qty); const counted = (counts.get(item.id) || 0) + qty; counts.set(item.id, counted);
    if (counted > item.remainingQty) throw new Error(`SKU ${item.variant.sku}: tổng số nhận vượt ${item.remainingQty} còn thiếu.`);
    if (item.variant.template.hasLotTracking && (!line.lot.trim() || !line.expiration)) throw new Error(`SKU ${item.variant.sku} cần số lô và hạn sử dụng.`);
    if (line.manufacturing && line.expiration && line.manufacturing > line.expiration) throw new Error("Ngày sản xuất không được sau hạn sử dụng.");
    return { poItemId: item.id, receivedQty: qty, actualCost: validateMoney(line.price), ...(item.variant.template.hasLotTracking ? { lotNumber: line.lot.trim(), expirationDate: line.expiration, ...(line.manufacturing ? { manufacturingDate: line.manufacturing } : {}) } : {}) };
  });
  const sum = total(selected);
  validateMoney(sum, 1_000_000_000_000); validateMoney(paid, 1_000_000_000_000);
  if (cents(paid) > cents(sum)) throw new Error("Tiền trả không được vượt tiền hàng thực nhận.");
  validateMoney(paid);
  return { receiptCode: receiptCode.trim(), paidAmount: paid, items };
}
