import { apiRequest } from "@/services/api.service";

export type PromotionScope = "STORE" | "CATEGORY" | "PRODUCT";
export type PromotionDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type PromotionPayload = {
  name: string;
  description: string | null;
  discountType: PromotionDiscountType;
  discountValue: string;
  scope: PromotionScope;
  startsAt: string;
  endsAt: string;
  minOrderAmount: string | null;
  usageLimit: number | null;
  priority: number;
  targetIds: string[];
};

export type Promotion = PromotionPayload & {
  id: string;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
  updatedAt: string;
  usedCount: number;
  totalDiscountAmount: string;
  targets: {
    id: string;
    targetType: string;
    categoryId: string | null;
    productTemplateId: string | null;
    category: { id: string; name: string } | null;
    productTemplate: { id: string; name: string } | null;
  }[];
};

export type PromotionOptions = {
  categories: { id: string; name: string; parentId: string | null }[];
  products: { id: string; name: string; categoryId: string | null }[];
};

export type PromotionPreview = {
  totalGrossAmount: string;
  discountAmount: string;
  totalNetAmount: string;
  promotion: { id: string; name: string } | null;
  lineDiscounts: Record<string, string>;
};

const request = <T>(path: string, init?: RequestInit) => apiRequest<T>(`/promotions${path}`, init);
const json = (value: unknown) => JSON.stringify(value);

export const promotionsApi = {
  list: () => request<Promotion[]>("/"),
  options: () => request<PromotionOptions>("/options"),
  create: (payload: PromotionPayload) => request<Promotion>("/", { method: "POST", body: json(payload) }),
  update: (id: string, payload: PromotionPayload) => request<Promotion>(`/${id}`, { method: "PATCH", body: json(payload) }),
  setStatus: (id: string, status: Promotion["status"]) =>
    request<Promotion>(`/${id}/status`, { method: "PATCH", body: json({ status }) }),
  preview: (items: { variantId: string; quantity: number }[]) =>
    apiRequest<PromotionPreview>("/sales/orders/promotion-preview", {
      method: "POST",
      body: json({ items }),
    }),
};
