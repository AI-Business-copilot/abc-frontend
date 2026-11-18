import { apiRequest } from "@/services/api.service";
import type { Page, Query, Shift } from "./purchases";

export interface ReturnableOrderItem {
  id: string;
  orderId: string;
  variantId: string;
  lotId: string | null;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discountAmount: number;
  subtotal: number;
  previouslyReturnedQty: number;
  returnableQty: number;
  variant: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    unitOfMeasure: string;
    isLockedForAudit?: boolean;
  };
  lot: {
    id: string;
    lotNumber: string;
    manufacturingDate: string | null;
    expirationDate: string;
  } | null;
}

export interface LookupOrderResult {
  order: {
    id: string;
    orderCode: string;
    createdAt: string;
    status: string;
    totalGrossAmount: number;
    discountAmount: number;
    totalNetAmount: number;
    shiftId: string;
    customer: {
      id: string;
      name: string;
      phone: string;
    } | null;
    cashier: {
      id: string;
      fullName: string;
      email: string;
    } | null;
  };
  items: ReturnableOrderItem[];
}

export interface CustomerReturnRecord {
  id: string;
  returnCode: string;
  createdAt: string;
  status: string;
  refundMethod: string;
  totalRefundAmount: number;
  originalOrder: {
    id: string;
    orderCode: string;
    createdAt: string;
    totalNetAmount: number;
    customer: { id: string; name: string; phone: string } | null;
  } | null;
  cashier: { id: string; fullName: string; email: string } | null;
  customerReturnItems: {
    id: string;
    returnQty: number;
    refundUnitPrice: number;
    refundAmount?: number;
    itemCondition: "RESTOCKABLE" | "DAMAGED_QUARANTINE";
    variant: {
      id: string;
      sku: string;
      name: string;
      unitOfMeasure: string;
      costPrice?: number;
    } | null;
    lot: { id: string; lotNumber: string; expirationDate: string } | null;
  }[];
}

export interface SupplierItem {
  id: string;
  name: string;
  phone: string;
  contactPerson?: string;
  debtAmount: number;
}

export interface VendorReturnRecord {
  id: string;
  returnCode: string;
  createdAt: string;
  status: string;
  totalReturnValue?: number;
  supplierId: string;
  receiptId: string | null;
  supplier: {
    id: string;
    name: string;
    phone: string;
    debtAmount: number;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  items: {
    id: string;
    returnQty: number;
    returnUnitPrice?: number;
    variant: {
      id: string;
      sku: string;
      name: string;
      unitOfMeasure: string;
      costPrice?: number;
    } | null;
    lot: {
      id: string;
      lotNumber: string;
      expirationDate: string;
    } | null;
  }[];
}

const query = (params: Query) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );

export const returnsApi = {
  // F05 Customer Returns
  lookupOrder: (orderCode: string) =>
    apiRequest<LookupOrderResult>(`/customer-returns/lookup/${encodeURIComponent(orderCode)}`),

  listCustomerReturns: (params: Query) =>
    apiRequest<Page<CustomerReturnRecord>>(`/customer-returns?${query(params)}`),

  createCustomerReturn: (body: {
    orderCode?: string;
    originalOrderId?: string;
    refundMethod?: "CASH" | "BANK_TRANSFER" | "EXCHANGE_OFFSET" | "NONE";
    isUnverifiedOrigin?: boolean;
    items: {
      orderItemId?: string;
      variantId: string;
      lotId?: string | null;
      returnQty: number;
      refundUnitPrice?: number;
      itemCondition: "RESTOCKABLE" | "DAMAGED_QUARANTINE";
      returnReason?: string;
    }[];
    exchangeItems?: {
      variantId: string;
      quantity: number;
    }[];
  }) =>
    apiRequest<any>("/customer-returns", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // F06 Vendor Returns
  listVendorReturns: (params: Query) =>
    apiRequest<Page<VendorReturnRecord>>(`/vendor-returns?${query(params)}`),

  getSuppliers: () => apiRequest<SupplierItem[]>("/vendor-returns/suppliers"),

  createVendorReturn: (body: {
    supplierId: string;
    receiptId?: string | null;
    items: {
      variantId: string;
      lotId?: string | null;
      returnQty: number;
      returnUnitPrice?: number;
      source?: "SELLABLE" | "DAMAGED_STOCK";
      itemCondition?: "RESTOCKABLE" | "DAMAGED_QUARANTINE";
    }[];
  }) =>
    apiRequest<any>("/vendor-returns", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  shift: () => apiRequest<Shift | null>("/sales/cash-shifts/current"),
};
