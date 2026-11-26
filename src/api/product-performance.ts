import { apiRequest } from "@/services/api.service";

export type PerformanceAmounts = {
  unitsSold: number;
  unitsReturned: number;
  grossSales: string;
  discountAmount: string;
  refundAmount: string;
  netRevenue: string;
  netCogs: string;
  grossProfit: string;
  marginPercent: string | null;
};

type Change = { difference: string; percent: string | null };
export type PerformanceComparison = {
  current: PerformanceAmounts;
  previous: PerformanceAmounts;
  changes: { unitsSold: Change; unitsReturned: Change; netRevenue: Change; grossProfit: Change };
};
export type PerformanceProduct = PerformanceComparison & {
  id: string;
  name: string;
  variants: (PerformanceComparison & { id: string; sku: string })[];
};
export type ProductPerformance = {
  ranges: { current: { from: string; to: string; dayCount: number }; previous: { from: string; to: string; dayCount: number } };
  asOf: string;
  totals: PerformanceComparison;
  warnings: { excludedSaleItems: number; excludedReturnItems: number; missingReturnCostLinks: number };
  hasSyntheticSku: boolean;
  items: PerformanceProduct[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export async function getProductPerformance(params: { from: string; to: string }) {
  const query = new URLSearchParams({
    from: params.from, to: params.to, all: "true",
  });
  const result = await apiRequest<ProductPerformance>(`/business-data/product-performance?${query}`);
  if (result.items.length !== result.pagination.total) {
    throw new Error("Không tải được toàn bộ kết quả POS. Vui lòng cập nhật backend và thử lại.");
  }
  return result;
}
