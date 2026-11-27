import { apiRequest } from "@/services/api.service";
import type {
  ApproveScrapResult,
  DisposalDossierReport,
  DisposalMethod,
  ExpiringBatchesResponse,
  ExpiringLotsResponse,
  ExpiringProductsResponse,
  LotStatus,
  RejectionReasonCode,
  ScrapCauseCode,
  ScrapOrder,
  ScrapOrderDetail,
  ScrapOrdersResponse,
  ScrapSource,
  ScrapStatistics,
  ScrapStatus,
  VariantQuarantine,
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

  /** Same list, but paged over products: one entry per product with its SKUs and their lots. */
  getExpiringProducts(params: { status?: LotStatus; skip?: number; take?: number } = {}) {
    return apiRequest<ExpiringProductsResponse>(
      `${base}/lots/expiring${query({ ...params, groupBy: "product" })}`,
    );
  },

  /** Quarantine a quantity of one lot item. The route keeps the batch id in the path for readability. */
  quarantineLot(lotId: string, lotItemId: string, body: { quantity: number; note?: string }) {
    return apiRequest<unknown>(`${base}/lots/${lotId}/items/${lotItemId}/quarantine`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** Quarantine a quantity of one product that has no lot item. */
  quarantineVariant(variantId: string, body: { quantity: number; note?: string }) {
    return apiRequest<VariantQuarantine>(`${base}/variants/${variantId}/quarantine`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** The variant-level quarantine of a SKU, or null when it is not quarantined. */
  getVariantQuarantine(variantId: string) {
    return apiRequest<VariantQuarantine | null>(`${base}/variants/${variantId}/quarantine`);
  },

  listScrapOrders(params: { status?: ScrapStatus; skip?: number; take?: number } = {}) {
    return apiRequest<ScrapOrdersResponse>(`${base}/scrap-orders${query(params)}`);
  },

  getScrapOrder(id: string) {
    return apiRequest<ScrapOrderDetail>(`${base}/scrap-orders/${id}`);
  },

  /**
   * Creates the order and its evidence photos in one request. Photos cannot be added or removed afterward.
   * The cause, the disposal method and the disposal location are required: the tax dossier asks for
   * them, and the server refuses an order that leaves one of them out.
   */
  createScrapOrder(body: {
    /** The lot item the scrap is taken from. Omit it for a product that has no lot. */
    lotItemId?: string;
    /** The product the scrap is taken from, required when there is no lot item. */
    variantId?: string;
    scrapQty?: number;
    scrapSource?: ScrapSource;
    /** Why the goods are lost, as the disposal dossier states it. */
    causeCode: ScrapCauseCode;
    /** How the goods are destroyed. */
    disposalMethod: DisposalMethod;
    /** Where the goods are destroyed. */
    disposalLocation: string;
    images: File[];
  }) {
    const form = new FormData();
    if (body.lotItemId) form.append("lotItemId", body.lotItemId);
    if (body.variantId) form.append("variantId", body.variantId);
    if (body.scrapQty !== undefined) form.append("scrapQty", String(body.scrapQty));
    if (body.scrapSource) form.append("scrapSource", body.scrapSource);
    form.append("causeCode", body.causeCode);
    form.append("disposalMethod", body.disposalMethod);
    form.append("disposalLocation", body.disposalLocation);
    for (const image of body.images) form.append("files", image);
    return apiRequest<ScrapOrder>(`${base}/scrap-orders`, {
      method: "POST",
      body: form,
    });
  },

  updateScrapOrder(id: string, body: { scrapQty?: number; causeCode?: ScrapCauseCode }) {
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

  /** Owner only. Records the day the goods were physically destroyed. */
  confirmScrapDisposal(id: string, disposalDate?: string) {
    return apiRequest<{ scrapOrder: ScrapOrder; disposalDate: string }>(
      `${base}/scrap-orders/${id}/confirm-disposal`,
      {
        method: "PATCH",
        body: JSON.stringify(disposalDate ? { disposalDate } : {}),
      },
    );
  },

  /** The dossier as JSON. The frontend turns it into the printable PDF. */
  getScrapDossierReport(id: string) {
    return apiRequest<DisposalDossierReport>(`${base}/scrap-orders/${id}/dossier-report`);
  },

};
