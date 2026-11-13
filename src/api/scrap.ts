import { apiRequest } from "@/services/api.service";
import type {
  ApproveScrapResult,
  ExpiringBatchesResponse,
  ExpiringLotsResponse,
  LotStatus,
  RejectionReasonCode,
  ScrapOrder,
  ScrapOrderDetail,
  ScrapOrdersResponse,
  ScrapSource,
  ScrapStatistics,
  ScrapStatus,
} from "@/types/scrap";

const base = "/inventory";

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const scrapApi = {
  getExpiringLots(params: { status?: LotStatus; skip?: number; take?: number } = {}) {
    return apiRequest<ExpiringLotsResponse>(`${base}/lots/expiring${query(params)}`);
  },

  /** Same list, but paged over batches: one entry per lot number with its variant items inside. */
  getExpiringBatches(params: { status?: LotStatus; skip?: number; take?: number } = {}) {
    return apiRequest<ExpiringBatchesResponse>(
      `${base}/lots/expiring${query({ ...params, groupBy: "lot" })}`,
    );
  },

  /** Quarantine a quantity of one lot item. The route keeps the batch id in the path for readability. */
  quarantineLot(lotId: string, lotItemId: string, body: { quantity: number; note?: string }) {
    return apiRequest<unknown>(`${base}/lots/${lotId}/items/${lotItemId}/quarantine`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  listScrapOrders(params: { status?: ScrapStatus; skip?: number; take?: number } = {}) {
    return apiRequest<ScrapOrdersResponse>(`${base}/scrap-orders${query(params)}`);
  },

  getScrapOrder(id: string) {
    return apiRequest<ScrapOrderDetail>(`${base}/scrap-orders/${id}`);
  },

  /** Creates the order and its evidence photos in one request. Photos cannot be added or removed afterward. */
  createScrapOrder(body: {
    lotItemId: string;
    scrapReason: string;
    scrapQty?: number;
    scrapSource?: ScrapSource;
    images: File[];
  }) {
    const form = new FormData();
    form.append("lotItemId", body.lotItemId);
    form.append("scrapReason", body.scrapReason);
    if (body.scrapQty !== undefined) form.append("scrapQty", String(body.scrapQty));
    if (body.scrapSource) form.append("scrapSource", body.scrapSource);
    for (const image of body.images) form.append("files", image);
    return apiRequest<ScrapOrder>(`${base}/scrap-orders`, {
      method: "POST",
      body: form,
    });
  },

  updateScrapOrder(id: string, body: { scrapQty?: number; scrapReason?: string }) {
    return apiRequest<ScrapOrder>(`${base}/scrap-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  deleteScrapOrder(id: string) {
    return apiRequest<void>(`${base}/scrap-orders/${id}`, { method: "DELETE" });
  },

  approveScrapOrder(id: string, reviewedImageIds: string[]) {
    return apiRequest<ApproveScrapResult>(`${base}/scrap-orders/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ reviewedImageIds }),
    });
  },

  rejectScrapOrder(id: string, body: { reasonCode: RejectionReasonCode; note?: string }) {
    return apiRequest<ScrapOrder>(`${base}/scrap-orders/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /** Owner only. Closes a pending order without approving it; the lot stays quarantined. */
  cancelScrapOrder(id: string, note?: string) {
    return apiRequest<ScrapOrder>(`${base}/scrap-orders/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ note: note?.trim() || undefined }),
    });
  },

  getScrapStatistics() {
    return apiRequest<ScrapStatistics>(`${base}/scrap-statistics`);
  },

};
