import { apiJson } from "@/lib/api-client";

export type AttributeValueOption = {
  id: string;
  value: string;
};

export type AttributeOption = {
  id: string;
  name: string;
  attributeValues: AttributeValueOption[];
};

export type AttributeValueRecord = {
  id: string;
  attributeId: string;
  value: string;
  createdAt: string;
};

export type AttributeRecord = {
  id: string;
  businessId: string;
  name: string;
  createdAt: string;
  attributeValues: AttributeValueRecord[];
};

export type TemplatePayload = {
  code?: string | null;
  name?: string;
  categoryId?: string | null;
  unitOfMeasure?: string;
  hasLotTracking?: boolean;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
};

export type TemplateRecord = {
  id: string;
  businessId: string;
  code: string | null;
  name: string;
  categoryId: string | null;
  unitOfMeasure: string | null;
  hasLotTracking: boolean | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean | null;
};

export type GeneratedVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  basePrice: string | number;
  costPrice: string | number;
  safetyStockQty: number;
  variantAttributeValues: {
    attribute: { id: string; name: string };
    attributeValue: { id: string; value: string };
  }[];
};

export type GeneratedVariantsResponse = {
  mode: "SINGLE" | "VARIANTS";
  count: number;
  variants: GeneratedVariant[];
};

export type TemplateDetail = TemplateRecord & {
  category: { id: string; name: string; parent: { id: string; name: string } | null } | null;
  productVariants: GeneratedVariant[];
};

export type OpeningStockPayload = {
  note?: string;
  apply?: boolean;
  items: {
    variantId: string;
    quantity: number;
    unitCost: number;
    lotNumber?: string;
    manufacturingDate?: string;
    expirationDate?: string;
  }[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return apiJson<T>(path, init);
}

export const productWizardApi = {
  attributes: () => request<AttributeRecord[]>("/products/attributes"),
  getAttribute: (id: string) => request<AttributeRecord>(`/products/attributes/${id}`),
  createAttribute: (name: string) =>
    request<AttributeRecord>("/products/attributes", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateAttribute: (id: string, name: string) =>
    request<AttributeRecord>(`/products/attributes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAttribute: (id: string) =>
    request<{ id: string }>(`/products/attributes/${id}`, { method: "DELETE" }),
  addAttributeValue: (attributeId: string, value: string) =>
    request<AttributeValueOption>("/products/attributes/values", {
      method: "POST",
      body: JSON.stringify({ attributeId, value }),
    }),
  updateAttributeValue: (id: string, value: string) =>
    request<AttributeValueRecord>(`/products/attributes/values/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    }),
  deleteAttributeValue: (id: string) =>
    request<{ id: string }>(`/products/attributes/values/${id}`, { method: "DELETE" }),
  createTemplate: (payload: TemplatePayload) =>
    request<TemplateRecord>("/products/templates", { method: "POST", body: JSON.stringify(payload) }),
  getTemplate: (id: string) => request<TemplateDetail>(`/products/templates/${id}`),
  updateTemplate: (id: string, payload: TemplatePayload) =>
    request<TemplateRecord>(`/products/templates/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  generateVariants: (
    templateId: string,
    attributes: { attributeId: string; attributeValueIds: string[] }[],
    defaults: { costPrice?: number; basePrice?: number },
  ) =>
    request<GeneratedVariantsResponse>(`/products/templates/${templateId}/variants/generate`, {
      method: "POST",
      body: JSON.stringify({ attributes, defaults }),
    }),
  bulkUpdateVariants: (
    templateId: string,
    variants: { id: string; costPrice: number; basePrice: number; safetyStockQty: number; sku?: string; barcode?: string; isActive?: boolean }[],
  ) =>
    request<{ updated: number }>(`/products/templates/${templateId}/variants/bulk`, {
      method: "PATCH",
      body: JSON.stringify({ variants }),
    }),
  createOpeningStock: (payload: OpeningStockPayload) =>
    request<{ id: string; code: string | null }>("/inventory/opening-sheets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createCategory: (payload: { name: string; parentId?: string | null; description?: string }) =>
    request<{ id: string; name: string }>("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
