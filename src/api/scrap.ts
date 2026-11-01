import { apiRequest } from "@/services/api.service";
import type {
  ApproveScrapResult,
  ExpiringLotsResponse,
  LotStatus,
  RejectionReasonCode,
  ScrapImage,
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

  quarantineLot(lotId: string, body: { quantity: number; note?: string }) {
    return apiRequest<unknown>(`${base}/lots/${lotId}/quarantine`, {
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

  createScrapOrder(body: {
    lotId: string;
    scrapReason: string;
    scrapQty?: number;
    scrapSource?: ScrapSource;
  }) {
    return apiRequest<ScrapOrder>(`${base}/scrap-orders`, {
      method: "POST",
      body: JSON.stringify(body),
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

  getScrapStatistics() {
    return apiRequest<ScrapStatistics>(`${base}/scrap-statistics`);
  },

  uploadScrapImage(orderId: string, file: File, note?: string) {
    const form = new FormData();
    form.append("file", file);
    if (note?.trim()) form.append("note", note.trim());
    return apiRequest<ScrapImage>(`${base}/scrap-orders/${orderId}/images`, {
      method: "POST",
      body: form,
    });
  },

  updateScrapImageNote(imageId: string, note: string | null) {
    return apiRequest<ScrapImage>(`${base}/scrap-order-images/${imageId}`, {
      method: "PATCH",
      body: JSON.stringify({ note }),
    });
  },

  deleteScrapImage(imageId: string) {
    return apiRequest<void>(`${base}/scrap-order-images/${imageId}`, { method: "DELETE" });
  },
};
