import { apiRequest } from "@/services/api.service";

export type Money = string;
export type Page<T> = { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
export type Supplier = { id: string; name: string; phone: string | null; contactPerson: string | null; debtAmount: Money };
export type Variant = { id: string; sku: string; template: { name: string; unitOfMeasure: string | null; hasLotTracking: boolean } };
export type StockVariant = { id: string; sku: string; productName: string; costPrice: number; onHand: number; hasLotTracking: boolean };
export type SupplierProduct = StockVariant & { isActive: boolean; supplyPrice: Money | null; lastPurchase: { id: string; receiptCode: string; receivedAt: string; actualCost: Money; receivedQty: number } | null };
export type OrderStatus = "ORDERED" | "PARTIALLY_RECEIVED" | "COMPLETED" | "CLOSED_SHORT" | "CANCELLED";
export type OrderItem = { id: string; variantId: string; variant: Variant; orderedQty: number; receivedQty: number; remainingQty: number; unitPrice: Money; subtotal: Money };
export type Receipt = { id: string; receiptCode: string; poId: string; status: "RECEIVED" | "CANCELLED"; receivedAt: string; totalAmount: Money; paidAmount: Money; debtAmount: Money; supplier: Pick<Supplier, "id" | "name">; po?: { id: string; poCode: string } };
export type Order = { id: string; poCode: string; supplierId: string; supplier: Pick<Supplier, "id" | "name">; status: OrderStatus; orderDate: string; expectedDeliveryDate: string | null; purchaseOrderItems: OrderItem[]; purchaseReceipts: Receipt[]; totals: { orderedQty: number; receivedQty: number; orderedAmount: Money; receivedAmount: Money; paidAmount: Money; debtAmount: Money } };
export type ReceiptItem = { id: string; variant: Variant; receivedQty: number; actualCost: Money; subtotal: Money; lot: { lotNumber: string; expirationDate: string; manufacturingDate: string | null } | null };
export type ReceiptDetail = Receipt & { purchaseReceiptItems: ReceiptItem[]; inventoryLedger: { id: string; createdAt: string; transactionType: string; quantityChanged: number; balanceAfter: number; totalCostValue: Money }[] };
export type PaymentHistory = { paidAmount: Money; recordedPaymentAmount: Money; untrackedPaidAmount: Money; historyComplete: boolean; items: { id: string; amount: Money; createdAt: string; createdByUser: { fullName: string | null } }[] };
export type Shift = { id: string; status: string; openedAt: string; openingCash: Money };
export type Reconciliation = { supplierId: string; storedDebtAmount: Money; receiptDebtAmount: Money; vendorReturnCreditAmount: Money; calculatedDebtAmount: Money; difference: Money; applied: boolean };
export type OrderPayload = { poCode: string; supplierId: string; orderDate: string; expectedDeliveryDate: string; items: { variantId: string; orderedQty: number; unitPrice: Money }[] };
export type ReceiptPayload = { receiptCode: string; paidAmount: Money; items: { poItemId: string; receivedQty: number; actualCost: Money; lotNumber?: string; expirationDate?: string; manufacturingDate?: string }[] };
export type Draft = { draftToken: string; expiresAt: string; totalAmount: Money; debtAmount: Money; receipt: ReceiptPayload };
export type Query = { page?: number; pageSize?: number; search?: string; status?: string; from?: string; to?: string; supplierId?: string };

function query(params: Query) {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") values.set(key, String(value)); });
  return values.toString();
}
const read = <T>(path: string) => apiRequest<T>(`/purchases${path}`);
const write = <T>(path: string, body: unknown, method = "POST") => apiRequest<T>(`/purchases${path}`, { method, body: JSON.stringify(body) });

export const purchasesApi = {
  orders: (params: Query) => read<Page<Order>>(`/orders?${query(params)}`),
  order: (id: string) => read<Order>(`/orders/${id}`),
  saveOrder: (body: OrderPayload, id?: string) => write<{ id: string }>(id ? `/orders/${id}` : "/orders", body, id ? "PATCH" : "POST"),
  finishOrder: (id: string, action: "cancel" | "close") => write(`/orders/${id}/${action}`, {}),
  receive: (id: string, body: ReceiptPayload) => write<{ id: string }>(`/orders/${id}/receipts`, body),
  preview: (id: string, body: ReceiptPayload) => write<Draft>(`/orders/${id}/receipt-drafts`, body),
  confirm: (id: string, draftToken: string) => write<{ id: string }>(`/orders/${id}/receipt-drafts/confirm`, { draftToken }),
  receipts: (params: Query) => read<Page<Receipt>>(`/receipts?${query(params)}`),
  receipt: (id: string) => read<ReceiptDetail>(`/receipts/${id}`),
  pay: (id: string, paidAmount: Money) => write(`/receipts/${id}/payment`, { paidAmount }, "PATCH"),
  payments: (id: string) => read<PaymentHistory>(`/receipts/${id}/payments`),
  correct: (receipt: ReceiptDetail, items: { id: string; receivedQty: number; actualCost: Money; expectedReceivedQty: number; expectedActualCost: Money }[]) => write(`/receipts/${receipt.id}/items`, { expectedTotalAmount: receipt.totalAmount, items }, "PATCH"),
  suppliers: (params: Query) => read<Page<Supplier>>(`/suppliers?${query(params)}`),
  createSupplier: (body: { name: string; phone?: string; contactPerson?: string }) => write<Supplier>("/suppliers", body),
  supplierProducts: (id: string, params: Query, kind: "catalog" | "history" = "catalog") => read<Page<SupplierProduct> & { supplier: Supplier }>(`/suppliers/${id}/products?${query(params)}&kind=${kind}`),
  saveSupplierProduct: (id: string, variantId: string, supplyPrice: Money) => write(`/suppliers/${id}/products`, { variantId, supplyPrice }, "PUT"),
  removeSupplierProduct: (id: string, variantId: string) => apiRequest(`/purchases/suppliers/${id}/products/${variantId}`, { method: "DELETE" }),
  shift: () => read<Shift | null>("/cash-shifts/current"),
  openShift: (openingCash: Money) => write<Shift>("/cash-shifts", { openingCash }),
  reconcile: (id: string) => read<Reconciliation>(`/suppliers/${id}/debt-reconciliation`),
  applyReconciliation: (preview: Reconciliation) => write<Reconciliation>(`/suppliers/${preview.supplierId}/debt-reconciliation`, { apply: true, expectedDebtAmount: preview.storedDebtAmount }),
  variants: (search: string) => apiRequest<{ items: StockVariant[]; total: number }>(`/inventory/variants?${new URLSearchParams({ search, limit: "50" })}`),
};
