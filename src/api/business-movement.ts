import type { ProductPerformance } from "@/api/product-performance";
import { apiRequest } from "@/services/api.service";

type Component = { current: string; previous: string; difference: string; impact: string };
export type BusinessMovement = ProductPerformance & {
  components: Record<"grossSales" | "discountAmount" | "refundAmount" | "netRevenue" | "netCogs", Component>;
};

export async function getBusinessMovement(params: { from: string; to: string }) {
  const query = new URLSearchParams(params);
  const result = await apiRequest<BusinessMovement>(`/business-data/business-movement?${query}`);
  if (result.items.length !== result.pagination.total) {
    throw new Error("Không tải được toàn bộ kết quả POS. Vui lòng cập nhật backend và thử lại.");
  }
  return result;
}
