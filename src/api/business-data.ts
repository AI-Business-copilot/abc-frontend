import { apiRequest } from "@/services/api.service";

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
};

const request = <T>(path: string, init?: RequestInit) => apiRequest<T>(`/business-data${path}`, init);

export const businessDataApi = {
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
