import { apiJson } from "@/lib/api-client";

export type OpeningStockItemDetail = {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  attributeText?: string;
  unitOfMeasure?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  lotId?: string | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  manufacturingDate?: string | null;
};

export type OpeningStockSheetDetail = {
  id: string;
  code: string;
  note: string | null;
  status: "DRAFT" | "APPLIED" | "CANCELLED";
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByEmail: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  items: OpeningStockItemDetail[];
};

export type OpeningStockSheetSummary = {
  id: string;
  code: string;
  note: string | null;
  status: string;
  createdByName: string;
  createdAt: string;
  appliedAt: string | null;
  itemCount: number;
  totalQty: number;
  totalValue: number;
};

export type OpeningStockListResponse = {
  items: OpeningStockSheetSummary[];
  stats: {
    totalSheets: number;
    appliedSheets: number;
    draftSheets: number;
    loadedSkuCount: number;
    totalSkuCount: number;
    totalOpeningValue: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type LedgerEntry = {
  id: string;
  createdAt: string;
  transactionType: string;
  quantityChanged: number;
  balanceAfter: number;
  unitCost: number;
  totalCostValue: number;
  variantId: string;
  sku: string;
  productName: string;
  imageUrl?: string | null;
  createdBy: string;
  sheetCode?: string | null;
  lotNumber?: string | null;
};

export type LedgerListResponse = {
  items: LedgerEntry[];
  stats: {
    totalRecords: number;
    positiveQuantity: number;
    negativeQuantity: number;
    totalIncreaseValue: number;
    totalDecreaseValue: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export const inventoryApi = {
  listSheets: (params: { search?: string; status?: string; month?: string; page?: number; pageSize?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.status) sp.set("status", params.status);
    if (params.month) sp.set("month", params.month);
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    const qs = sp.toString();
    return apiJson<OpeningStockListResponse>(`/inventory/opening-sheets${qs ? `?${qs}` : ""}`);
  },

  getLedger: (params: { search?: string; type?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.type) sp.set("type", params.type);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    const qs = sp.toString();
    return apiJson<LedgerListResponse>(`/inventory/ledger${qs ? `?${qs}` : ""}`);
  },

  getSheet: (id: string, limit = 500, offset = 0) => {
    return apiJson<OpeningStockSheetDetail>(`/inventory/opening-sheets/${id}?limit=${limit}&offset=${offset}`);
  },

  applySheet: (id: string) => {
    return apiJson<OpeningStockSheetDetail>(`/inventory/opening-sheets/${id}/apply`, {
      method: "POST",
    });
  },

  deleteSheet: (id: string) => {
    return apiJson<{ success: boolean }>(`/inventory/opening-sheets/${id}`, {
      method: "DELETE",
    });
  },
};
