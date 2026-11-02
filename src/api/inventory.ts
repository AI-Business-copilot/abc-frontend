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
  appliedAt: string | null;
  createdAt: string;
  createdByUser: { fullName: string; email: string };
  totalLines: number;
  totalQuantity: number;
  totalValue: number;
};

export type OpeningStockListResponse = {
  rows: OpeningStockSheetSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusStats: { draft: number; applied: number; cancelled: number };
  totals: { totalQuantity: number; totalValue: number; totalSku: number };
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

