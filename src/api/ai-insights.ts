import { apiRequest } from "@/services/api.service";

export type InsightType = "STOCKOUT_RISK" | "LOW_STOCK" | "SLOW_MOVING" | "DECLINING_SALES" | "OVERSTOCK" | "EXPIRATION_RISK";
export type InsightSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type InsightStatus = "OPEN" | "ACKNOWLEDGED" | "DISMISSED" | "RESOLVED";

export type Insight = {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  status: InsightStatus;
  reasonCode: string;
  suggestedAction: string;
  metrics: Record<string, unknown>;
  valueAtRisk: number | null;
  priorityScore: number;
  snoozeUntil: string | null;
  firstDetectedAt: string;
  lastDetectedAt: string;
  variantId: string;
  sku: string;
  productName: string;
  category: string | null;
  lotItemId: string | null;
  lotNumber: string | null;
  expirationDate: string | null;
};

export type InsightPage = { page: number; pageSize: number; total: number; items: Insight[] };

export type InsightWarning = { code: string; message: string; count?: number };

type InventorySource = { dataAsOf: string | null; finishedAt: string | null };
export type InventorySignal = InventorySource & {
  id: string; type: InsightType; severity: InsightSeverity; status: "OPEN" | "ACKNOWLEDGED";
  reasonCode: string; suggestedAction: string; metrics: Record<string, string | number | boolean | null>;
  lotNumber: string | null; expirationDate: string | null; lastDetectedAt: string; current: boolean;
};
export type InventorySuggestion = InventorySource & {
  id: string; status: "PENDING" | "ORDERED"; urgency: InsightSeverity; confidence: string | null;
  suggestedQty: number; orderByDate: string | null; stockoutDate: string | null;
  supplierName: string | null; poCode: string | null; poStatus: string | null;
  details: Record<string, string | number | boolean | null>; updatedAt: string; current: boolean;
};
export type InventoryOutlookItem = {
  variantId: string; sku: string; productName: string; category: string | null;
  priority: InsightSeverity | null; signals: InventorySignal[]; replenishment: InventorySuggestion | null;
};
type InventoryRun = { status: string; dataAsOf: string | null; startedAt: string; finishedAt: string | null };
export type InventoryOutlook = {
  page: number; pageSize: number; latestRun: InventoryRun | null;
} & (
  | { state: "NOT_RUN" | "RUNNING" | "FAILED" | "INCOMPLETE"; total: null; summary: null; items: null }
  | { state: "READY"; total: number; summary: { totalSku: number; byPriority: Record<InsightSeverity, number>; withoutCurrentPriority: number };
      ruleFresh: boolean; forecastReady: boolean; warnings: InsightWarning[] | null; hasSyntheticSku: boolean | null; items: InventoryOutlookItem[] }
);

export type CapitalSummary = {
  totalCapital: number;
  slowMovingCapital: number;
  slowMovingSharePct: number;
  overstockCapital: number;
  overstockSharePct: number;
  byCategory: Array<{ category: string; capital: number; sharePct: number }>;
  byDaysOfCover: Array<{ bucket: string; capital: number; sharePct: number }>;
  topProducts: Array<{ variantId: string; sku: string; name: string; stockAvailable: number; capital: number }>;
  costBasis: string;
};

export type InsightSummary = {
  byType: Partial<Record<InsightType, number>>;
  bySeverity: Partial<Record<InsightSeverity, number>>;
  totalActive: number;
  valueAtRisk: number;
  stale: boolean;
  latestRun: {
    id: string;
    status: "RUNNING" | "SUCCEEDED" | "FAILED";
    triggerType: "MANUAL" | "SCHEDULED";
    dataAsOf: string;
    startedAt: string;
    finishedAt: string | null;
    error: string | null;
  } | null;
  capital: CapitalSummary | null;
  warnings: InsightWarning[];
};

export type InsightSettings = {
  minHistoryDays: number;
  slowMoving: { noSaleDays: number; maxUnitsInWindow: number };
  declining: { periodDays: number; minBaseUnits: number; mediumPct: number; highPct: number };
  overstock: { thresholdDays: number; targetDays: number };
  forecast: { minSeriesDays: number; serviceLevelPct: number };
  stockout: { highSlackDays: number; mediumSlackDays: number };
};

export type Urgency = InsightSeverity;
export type ReplenishmentStatus = "PENDING" | "ORDERED" | "DISMISSED" | "RESOLVED";

export type ReplenishmentItem = {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  category: string | null;
  status: ReplenishmentStatus;
  urgency: Urgency;
  confidence: "HIGH" | "MEDIUM" | "LOW" | null;
  suggestedQty: number;
  unitCost: number;
  amount: number;
  orderByDate: string | null;
  stockoutDate: string | null;
  snoozeUntil: string | null;
  supplierId: string | null;
  supplierName: string | null;
  poId: string | null;
  poCode: string | null;
  poStatus: string | null;
  details: Record<string, unknown>;
};

export type ReplenishmentList = {
  items: ReplenishmentItem[];
  forecastReady: boolean;
  forecastAsOf: string | null;
  warnings: InsightWarning[];
  summary: { pendingCount: number; pendingAmount: number; byUrgency: Record<string, number>; noSupplierCount: number };
};

type ForecastTotals = { d7: number; d14: number; d28: number };
export type ForecastDetail = {
  asOf: string | null;
  stale: boolean;
  status: "OK" | "INSUFFICIENT_DATA";
  forecast: {
    model: string | null;
    dailyRate: number;
    totals: ForecastTotals;
    dailyRates?: number[];
    modelVersion?: string;
    datasetKind?: string;
    comparison?: Array<{
      model: string;
      totals: ForecastTotals;
      count: number;
      mae: number | null;
      wape: number | null;
      bias: number | null;
    }>;
    wape: number | null;
    confidence: "HIGH" | "MEDIUM" | "LOW" | null;
    seriesDays: number;
  };
  history: Array<{ day: string; units: number }>;
};

type ForecastEvaluation = {
  days: 7 | 14 | 28;
  start: string;
  end: string;
  predicted: number;
  actual: number | null;
  absoluteError: number | null;
  status: "PENDING" | "OUTSIDE_HISTORY" | "UNKNOWN_STOCK" | "STOCKOUT" | "PARTIAL_START" | "PUBLICATION_UNKNOWN" | "COMPARABLE";
  partialStart: boolean;
  stockoutDays: number | null;
  unknownDays: number | null;
};

export type ForecastHistory = {
  items: Array<{
    id: string;
    asOf: string;
    issuedAt: string;
    finishedAt: string | null;
    model: string | null;
    modelVersion: string | null;
    evaluations: ForecastEvaluation[];
    segmentEvaluations?: ForecastEvaluation[];
    nextDayEvaluation?:
      | { status: "OK"; evaluations: ForecastEvaluation[] }
      | { status: "UNAVAILABLE"; reason: "MODEL_NOT_CONFIGURED" | "SERVICE_NOT_SUPPORTED" | "NOT_RECORDED" };
  }>;
};

export type InsightListQuery = { type?: string; severity?: string; status?: string; page: number; pageSize: number };

const request = <T>(path: string, init?: RequestInit) => apiRequest<T>(`/ai-insights${path}`, init);
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const aiInsightsApi = {
  summary: () => request<InsightSummary>("/summary"),
  inventoryOutlook: (query: { search: string; type: string; priority: string; page: number; pageSize: number }) =>
    request<InventoryOutlook>(`/inventory-outlook?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)])).toString()}`),
  list: (query: InsightListQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
    return request<InsightPage>(`?${params.toString()}`);
  },
  run: () => request<{ created: number; updated: number; resolved: number; findings: number }>("/run", { method: "POST" }),
  update: (id: string, body: { status: "OPEN" | "ACKNOWLEDGED" | "DISMISSED"; snoozeDays?: number }) =>
    request<Insight>(`/${id}`, json("PATCH", body)),
  settings: () => request<InsightSettings>("/settings"),
  saveSettings: (settings: InsightSettings) => request<InsightSettings>("/settings", json("PUT", settings)),
  replenishment: (status?: string) => request<ReplenishmentList>(`/replenishment${status ? `?status=${status}` : ""}`),
  forecast: (variantId: string) => request<ForecastDetail>(`/forecasts/${variantId}`),
  forecastHistory: (variantId: string) => request<ForecastHistory>(`/forecasts/${variantId}/history`),
  setReplenishmentStatus: (id: string, body: { status: "PENDING" | "DISMISSED"; snoozeDays?: number }) =>
    request<ReplenishmentItem>(`/replenishment/${id}`, json("PATCH", body)),
  createDraftOrders: (items: Array<{ id: string; qty?: number; supplierId?: string }>) =>
    request<{ orders: Array<{ id: string; poCode: string; supplierId: string; lines: number }> }>(
      "/replenishment/draft-orders",
      json("POST", { items }),
    ),
};
