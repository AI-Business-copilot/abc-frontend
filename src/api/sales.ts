import { apiRequest } from "@/services/api.service";
import type { Page, Query, Shift } from "./purchases";

export type Customer = { id: string; name: string; phone: string };
export type SaleVariant = { id: string; sku: string; productName: string; basePrice: number; onHand: number; hasLotTracking: boolean; attributeText: string; imageUrl: string | null };
export type Sale = {
  id: string; orderCode: string; status: "DRAFT" | "COMPLETED" | "CANCELLED"; cashierId: string; shiftId: string; createdAt: string;
  totalNetAmount: string; customer: Customer | null;
  orderItems: { id: string; variantId: string; quantity: number; unitPrice: string; subtotal: string; variant?: { sku: string; template: { name: string } }; lot: { lotNumber: string; expirationDate: string } | null }[];
  orderPayments: { id: string; paymentMethod: string; amount: string; paymentReference: string | null; createdAt: string }[];
};
const query = (params: Query) => new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
const read = <T>(path: string) => apiRequest<T>(`/sales${path}`);
const write = <T>(path: string, body: unknown) => apiRequest<T>(`/sales${path}`, { method: "POST", body: JSON.stringify(body) });
export const salesApi = {
  orders: (params: Query) => read<Page<Sale>>(`/orders?${query(params)}`),
  order: (id: string) => read<Sale>(`/orders/${id}`),
  create: (body: { orderCode: string; customerId?: string; shiftId: string; items: { variantId: string; quantity: number }[] }) => write<Sale>("/orders", body),
  pay: (id: string, paymentMethod: "CASH" | "BANK_TRANSFER", amount: string, paymentReference: string) => write<Sale>(`/orders/${id}/payments`, { confirmed: true, paymentMethod, amount, ...(paymentReference.trim() ? { paymentReference: paymentReference.trim() } : {}) }),
  cancel: (id: string) => write<Sale>(`/orders/${id}/cancel`, {}),
  shift: () => read<Shift | null>("/cash-shifts/current"),
  openShift: (openingCash: string) => write<Shift>("/cash-shifts", { openingCash }),
  customers: (params: Query) => read<Page<Customer>>(`/customers?${query(params)}`),
  createCustomer: (name: string, phone: string) => write<Customer>("/customers", { name: name.trim(), phone: phone.trim() }),
  variants: (search: string) => apiRequest<{ items: SaleVariant[] }>(`/inventory/variants?${new URLSearchParams({ search, limit: "50" })}`),
};
