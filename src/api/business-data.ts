import { apiRequest } from "@/services/api.service";

export type ShopeePreview = {
  platform: "SHOPEE";
  alreadyImported: boolean;
  importedAt: string | null;
  reportFrom: string | null;
  reportTo: string | null;
  sourceRowCount: number;
  uniqueRowCount: number;
  counts: Record<"ORDER" | "SKU" | "ADJUSTMENT" | "SERVICE_FEE" | "SHIPPING_DISCREPANCY", number>;
  financeTotals: Record<string, number>;
  notes: string[];
};

export type BusinessDataBatch = {
  id: string;
  reportFrom: string | null;
  reportTo: string | null;
  sourceRowCount: number;
  importedRowCount: number;
  summary: { counts?: Record<string, number>; financeTotals?: Record<string, number> } | null;
  createdAt: string;
};

export type AiReadyData = {
  range: { from: string; to: string; dayCount: number };
  pos: {
    metrics: Array<{
      metricDate: string;
      unitsSold: number;
      unitsReturned: number;
      orderCount: number;
      grossSales: string;
      discountAmount: string;
      refundAmount: string;
      netRevenue: string;
      netCogs: string;
      variant: { id: string; sku: string; template: { name: string; unitOfMeasure: string } };
    }>;
    hasMetrics: boolean;
  };
  shopee: {
    financialRecords: Array<{
      recordType: string;
      externalOrderId: string | null;
      externalProductId: string | null;
      productName: string | null;
      transactionDate: string | null;
      settlementDate: string | null;
      financialData: Record<string, number | string> | null;
      sourceSheet: string;
    }>;
    recordLimit: number;
    batches: BusinessDataBatch[];
    quantityDataAvailable: boolean;
    notes: string[];
  };
};

const request = <T>(path: string, init?: RequestInit) => apiRequest<T>(`/business-data${path}`, init);

function workbookForm(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

export const businessDataApi = {
  previewShopee: (file: File) => request<ShopeePreview>("/shopee/preview", { method: "POST", body: workbookForm(file) }),
  importShopee: (file: File) => request<BusinessDataBatch & { skippedDuplicateRows: number }>("/shopee/import", { method: "POST", body: workbookForm(file) }),
  listImports: () => request<BusinessDataBatch[]>("/shopee/imports"),
  aggregatePos: (from: string, to: string) => request<{
    ordersProcessed: number;
    returnsProcessed: number;
    productDaysWritten: number;
    excludedInvalidSaleItems: number;
    excludedInvalidReturnItems: number;
    excludedReturnCostLinks: number;
  }>("/pos/aggregate", {
    method: "POST",
    body: JSON.stringify({ from, to }),
  }),
  aiReady: (from: string, to: string) => request<AiReadyData>(`/ai-ready?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
};
