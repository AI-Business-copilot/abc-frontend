import { apiRequest } from "@/services/api.service";
import type { ProductPerformance } from "@/api/product-performance";

export type ComparisonMetric = "netRevenue" | "grossProfit";
export type ComparisonEvidence = {
  source: string;
  ranges: ProductPerformance["ranges"];
  asOf: string;
  metric: ComparisonMetric;
  subject: { product: string; productId: string; sku?: string; variantId?: string } | null;
  current: string;
  previous: string;
  difference: string;
  percent?: string | null;
  warnings: ProductPerformance["warnings"];
  followUp?: { operation: "change_comparison_metric"; previousMessageId: string };
};
export type ComparisonBreakdownLevel = "product" | "sku";
export type ComparisonBreakdownEvidence = {
  type: "comparison_breakdown_v1"; source: "POS"; level: ComparisonBreakdownLevel; metric: ComparisonMetric;
  subject: { product: string; productId: string } | null; ranges: ProductPerformance["ranges"];
  asOf: string; warnings: ProductPerformance["warnings"]; total: number;
  items: Array<{ id: string; name: string; current: string; previous: string; difference: string; percent: string | null }>;
  followUp: { operation: "comparison_breakdown"; previousMessageId: string };
};
export type RankedSku = { variantId: string; sku: string; product: string; unitsSold: number };
export type SkuPeriodChange = "previous_period" | "last_week";
type PeriodFollowUp = { operation: "change_period"; periodChange: SkuPeriodChange; previousMessageId: string };
export type ExpiryLot = { id: string; lotNumber: string; expirationDate: string; status: string; quantity: number; damaged: number; alertDays: number };
export type SkuEvidence = {
  type: "top_sellers_v1" | "sku_stockout_v1";
  period: { from: string; to: string };
  salesAsOf: string;
  warnings: ProductPerformance["warnings"];
  items: Array<RankedSku & { severity?: "HIGH" | "CRITICAL"; stockoutDate?: string | null }>;
  rankingCount?: number;
  riskState?: "ready" | "unavailable";
  riskDataAsOf?: string | null;
  riskFinishedAt?: string | null;
  followUp?: PeriodFollowUp;
};
export type SkuSalesComparisonEvidence = {
  type: "sku_sales_comparison_v1";
  ranges: ProductPerformance["ranges"];
  sourceSalesAsOf: string; salesAsOf: string;
  sourceWarnings: ProductPerformance["warnings"]; warnings: ProductPerformance["warnings"];
  items: Array<{ variantId: string; product: string; sku: string; current: number | null; previous: number | null; difference: number | null }>;
  followUp: { operation: "compare_previous_sku_sales"; previousMessageId: string };
};
export type PreviousItemCoverEvidence = {
  type: "previous_item_cover_v1"; item: { variantId: string; sku: string; product: string }; position: number;
  state: "ready" | "partial" | "unavailable"; stockAvailable: number | null; daysOfCover: number | null;
  possibleStockoutBias: boolean | null; dataAsOf: string | null; finishedAt: string | null;
  sourcePartial: boolean; sourceTruncated: boolean; sourceInventoryCaution: boolean;
  warningCodes: string[] | null; followUp: { operation: "previous_item_cover"; previousMessageId: string };
};
export type PreviousActionsEvidence = {
  type: "previous_actions_v1";
  items: Array<{ variantId: string; sku: string; product: string }>;
  conditions: string[]; actions: string[]; sourceTimes: Array<{ label: string; at: string | null }>;
  sourcePartial: boolean; sourceTruncated: boolean; sourceInventoryCaution: boolean;
  overdueOrders: boolean; possibleStockoutBias: boolean;
  followUp: { operation: "previous_actions"; previousMessageId: string };
};
export type SlowExpiryEvidence = {
  type: "slow_expiry_v1";
  state: "ready" | "partial" | "unavailable";
  dataAsOf: string | null;
  finishedAt: string | null;
  warningCodes: string[] | null;
  totalSku: number | null;
  items: Array<{
    variantId: string; sku: string; product: string;
    sold30: number | null; daysWithoutSale: number | null; neverSold: boolean | null; stockAvailable: number | null;
    totalLots: number;
    lots: Array<{
      id: string; lotNumber: string | null; expirationDate: string | null;
      status: "expired" | "unsellable" | "at_risk"; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      lotQuantity: number | null; atRiskQty: number | null;
    }>;
  }>;
};
export type ProfitRestockEvidence = {
  type: "profit_restock_v1";
  state: "ready" | "partial" | "unavailable";
  period: { from: string; to: string };
  salesAsOf: string;
  warnings: ProductPerformance["warnings"];
  warningCodes: string[] | null;
  riskDataAsOf: string | null;
  riskFinishedAt: string | null;
  totalSku: number | null;
  items: Array<{
    variantId: string; product: string; sku: string; grossProfit: string;
    suggestedQty: number; urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; supplierName: string | null;
    orderByDate: string | null; stockoutDate: string | null;
  }>;
};
export type OverstockForecastEvidence = {
  type: "overstock_forecast_v1";
  state: "ready" | "partial" | "unavailable";
  dataAsOf: string | null; finishedAt: string | null; warningCodes: string[] | null;
  salesPeriod: { from: string; to: string } | null; forecastPeriod: { from: string; to: string } | null;
  skippedSku: number | null; totalSku: number | null;
  items: Array<{
    variantId: string; sku: string; product: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    stockAvailable: number; daysOfCover: number; thresholdDays: number;
    sold30: number; forecast7: number; dropPercent: number; possibleStockoutBias: boolean;
  }>;
};
export type PreviousRestockEvidence = {
  type: "previous_restock_v1"; state: "ready" | "partial" | "unavailable";
  sourceCount: number; sourcePartial: boolean; sourceTruncated: boolean; sourceInventoryCaution: boolean;
  dataAsOf: string | null; finishedAt: string | null; warningCodes: string[] | null; totalSku: number | null;
  items: Array<{
    variantId: string; sku: string; product: string; urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    suggestedQty: number; orderByDate: string | null; stockoutDate: string | null; supplierName: string | null;
    cautions: string[];
  }>;
};
export type TopSellersRestockEvidence = Omit<PreviousRestockEvidence, "type" | "items"> & {
  type: "top_sellers_restock_v1"; period: { from: string; to: string }; salesAsOf: string;
  warnings: ProductPerformance["warnings"]; followUp?: PeriodFollowUp;
  items: Array<PreviousRestockEvidence["items"][number] & { unitsSold: number }>;
};
export type TopSellersRestockExpiryEvidence = Omit<TopSellersRestockEvidence, "type" | "items"> & {
  type: "top_sellers_restock_near_expiry_v1"; inventoryAsOf: string | null; inventoryDay: string | null;
  items: Array<TopSellersRestockEvidence["items"][number] & { totalLots: number; lots: ExpiryLot[] }>;
};
export type TopSellersRestockOverstockEvidence = Omit<TopSellersRestockEvidence, "type" | "items"> & {
  type: "top_sellers_restock_overstock_v1"; skippedSku: number | null;
  items: Array<TopSellersRestockEvidence["items"][number] & {
    stockAvailable: number; daysOfCover: number; thresholdDays: number; possibleStockoutBias: boolean;
  }>;
};
export type PreviousNearExpiryEvidence = {
  type: "previous_near_expiry_v1"; state: "ready" | "partial"; sourceCount: number;
  sourcePartial: boolean; sourceTruncated: boolean; sourceInventoryCaution: boolean;
  inventoryAsOf: string; inventoryDay: string; totalSku: number;
  items: Array<{ variantId: string; sku: string; product: string; totalLots: number; lots: ExpiryLot[] }>;
};
export type PreviousOverstockEvidence = {
  type: "previous_overstock_v1"; state: "ready" | "partial" | "unavailable"; sourceCount: number;
  sourcePartial: boolean; sourceTruncated: boolean; sourceInventoryCaution: boolean;
  dataAsOf: string | null; finishedAt: string | null; warningCodes: string[] | null;
  skippedSku: number | null; totalSku: number | null;
  items: Array<{
    variantId: string; sku: string; product: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    stockAvailable: number; daysOfCover: number; thresholdDays: number; possibleStockoutBias: boolean;
  }>;
};
export type TopSellerInventoryEvidence = {
  type: "top_sellers_overstock_v1" | "top_sellers_near_expiry_v1" | "top_sellers_overstock_near_expiry_v1";
  state: "ready" | "partial" | "unavailable"; period: { from: string; to: string };
  salesAsOf: string; warnings: ProductPerformance["warnings"]; rankingCount: number; totalSku: number | null;
  dataAsOf?: string | null; finishedAt?: string | null; inventoryAsOf?: string | null; inventoryDay?: string | null;
  followUp?: PeriodFollowUp;
  items: Array<RankedSku & {
    stockAvailable?: number; daysOfCover?: number; thresholdDays?: number; possibleStockoutBias?: boolean;
    totalLots?: number; lots?: ExpiryLot[];
  }>;
};
export type QuestionKind = "top_sellers" | "top_sellers_stockout" | "top_sellers_overstock" | "top_sellers_near_expiry" | "top_sellers_restock" | "top_sellers_composed" | "change_sku_period" | "compare_previous_sku_sales" | "previous_item_cover" | "previous_actions" | "previous_stockout" | "previous_restock" | "previous_near_expiry" | "previous_overstock" | "slow_moving_expiry" | "profit_restock" | "overstock_forecast" | "unsupported";
export type ComposedSkuFilters = ["overstock", "near_expiry"] | ["pending_restock", "near_expiry" | "overstock"];
export type ComparisonRequest = { metric: ComparisonMetric; from: string; to: string; subjectType: "store" | "product" | "sku"; subject?: string };
export type QuestionInterpretation = { hasPreviousRanking: boolean; hasPreviousSkuList: boolean; previousMessageId?: string } &
  ({ kind: Exclude<QuestionKind, "top_sellers_composed" | "change_sku_period" | "compare_previous_sku_sales" | "previous_item_cover" | "previous_actions"> } | { kind: "top_sellers_composed"; filters: ComposedSkuFilters } | { kind: "change_sku_period"; periodChange: SkuPeriodChange; hasPreviousSkuQuery: boolean } | { kind: "compare_previous_sku_sales"; hasComparableRanking: boolean } | { kind: "previous_item_cover"; position: number } | { kind: "previous_actions"; hasPreviousActions: boolean } | { kind: "change_comparison_metric"; metric: ComparisonMetric; hasPreviousComparison: boolean } | { kind: "comparison_breakdown"; level: ComparisonBreakdownLevel; hasPreviousComparisonBreakdown: boolean } | { kind: "comparison"; comparison: ComparisonRequest } | { kind: "clarify_comparison"; clarification: string });
export type AssistantEvidence = (ComparisonEvidence | ComparisonBreakdownEvidence | SkuEvidence | SkuSalesComparisonEvidence | PreviousItemCoverEvidence | PreviousActionsEvidence | SlowExpiryEvidence | ProfitRestockEvidence | OverstockForecastEvidence | PreviousRestockEvidence | TopSellersRestockEvidence | TopSellersRestockExpiryEvidence | TopSellersRestockOverstockEvidence | PreviousNearExpiryEvidence | PreviousOverstockEvidence | TopSellerInventoryEvidence) & { analysis?: Exclude<QuestionKind, "unsupported"> };
export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence: AssistantEvidence | null;
  createdAt: string;
};
export type Conversation = { id: string; createdAt: string; updatedAt: string; messages: AssistantMessage[] };
export type ConversationSummary = Omit<Conversation, "messages">;

export const getOpenAiConsent = () => apiRequest<{ enabled: boolean }>("/assistant/openai-consent");
export const setOpenAiConsent = (enabled: boolean) =>
  apiRequest<{ enabled: boolean }>("/assistant/openai-consent", { method: "PUT", body: JSON.stringify({ enabled }) });
export const listConversations = (page: number) =>
  apiRequest<{ items: ConversationSummary[]; page: number; hasMore: boolean }>(`/assistant/conversations?page=${page}`);
export const createConversation = () =>
  apiRequest<ConversationSummary>("/assistant/conversations", { method: "POST" });
export const getConversation = (id: string) => apiRequest<Conversation>(`/assistant/conversations/${id}`);
export const deleteConversation = (id: string) => apiRequest<void>(`/assistant/conversations/${id}`, { method: "DELETE" });
export const interpretQuestion = (question: string, conversationId?: string) =>
  apiRequest<QuestionInterpretation>("/assistant/interpret", {
    method: "POST", body: JSON.stringify({ question, ...(conversationId ? { conversationId } : {}) }),
  });
export const sendSkuQuestion = (id: string, question: string, analysis: Exclude<QuestionKind, "unsupported">, previousMessageId?: string, filters?: ComposedSkuFilters, periodChange?: SkuPeriodChange) =>
  apiRequest<{ messages: AssistantMessage[] }>(`/assistant/conversations/${id}/messages`, {
    method: "POST", body: JSON.stringify({ question, analysis, ...(previousMessageId ? { previousMessageId } : {}), ...(filters ? { filters } : {}), ...(periodChange ? { periodChange } : {}) }),
  });
export const sendQuestion = (id: string, input: {
  question: string; metric: ComparisonMetric; from: string; to: string; productId?: string; variantId?: string;
  subjectType?: "store" | "product" | "sku"; subject?: string;
}) => apiRequest<{ messages: AssistantMessage[] }>(`/assistant/conversations/${id}/messages`, {
  method: "POST", body: JSON.stringify(input),
});
export const sendComparisonMetricChange = (id: string, question: string, metric: ComparisonMetric, previousMessageId: string) =>
  apiRequest<{ messages: AssistantMessage[] }>(`/assistant/conversations/${id}/messages`, {
    method: "POST", body: JSON.stringify({ question, analysis: "change_comparison_metric", metric, previousMessageId }),
  });
export const sendComparisonBreakdown = (id: string, question: string, level: ComparisonBreakdownLevel, previousMessageId: string) =>
  apiRequest<{ messages: AssistantMessage[] }>(`/assistant/conversations/${id}/messages`, {
    method: "POST", body: JSON.stringify({ question, analysis: "comparison_breakdown", level, previousMessageId }),
  });
export const sendPreviousItemCover = (id: string, question: string, position: number, previousMessageId: string) =>
  apiRequest<{ messages: AssistantMessage[] }>(`/assistant/conversations/${id}/messages`, {
    method: "POST", body: JSON.stringify({ question, analysis: "previous_item_cover", position, previousMessageId }),
  });
