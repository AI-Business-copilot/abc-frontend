import { apiRequest } from "@/services/api.service";

export type InsightType = "LOW_STOCK" | "SLOW_MOVING" | "DECLINING_SALES" | "OVERSTOCK" | "EXPIRATION_RISK";
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
};
