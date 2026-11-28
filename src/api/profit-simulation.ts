import { apiRequest } from "@/services/api.service";

export type SimulationVariant = { id: string; sku: string; name: string; isActive: boolean | null };
export type SimulationCategory = { id: string; name: string; parentName: string | null; isActive: boolean | null };
export type SimulationForecast =
  | { status: "UNAVAILABLE"; reason: string }
  | { status: "READY"; start: string; dataAsOf: string; finishedAt: string; model: string | null; confidence: string | null;
      modelVersion: string | null; datasetKind: string | null; totals: { d7: string; d14: string; d28: string } };
export type SimulationBasis = {
  variant: SimulationVariant & { basePrice: string; costPrice: string };
  today: string;
  asOf: string;
  forecast: SimulationForecast;
};
export type SimulationInputs = { quantity: string; price: string; unitCost: string; discountPercent: string; operatingExpense: string | null };
type SimulationAmounts = {
  inputs: SimulationInputs; grossSales: string; discountAmount: string; revenue: string; cogs: string; grossProfit: string; afterExpense: string | null;
};
type Change = { difference: string; percent: string | null };
export type SimulationResult = {
  variant: { id: string; name: string; sku: string };
  period: { start: string; end: string; days: number };
  calculatedAt: string;
  baseline: SimulationAmounts;
  scenario: SimulationAmounts;
  changes: { revenue: Change; cogs: Change; grossProfit: Change; afterExpense: Change | null };
};

export function searchSimulationCategories(search: string, page: number) {
  return apiRequest<{ items: SimulationCategory[]; page: number; pageSize: number; hasMore: boolean }>(
    `/business-data/profit-simulation/categories?${new URLSearchParams({ search, page: String(page), pageSize: "8" })}`,
  );
}

export function searchSimulationVariants(search: string, page: number, categoryId: string) {
  const params = new URLSearchParams({ search, page: String(page), pageSize: "8" });
  if (categoryId) params.set("categoryId", categoryId);
  return apiRequest<{ items: SimulationVariant[]; page: number; pageSize: number; hasMore: boolean }>(
    `/business-data/profit-simulation/variants?${params}`,
  );
}

export function getSimulationBasis(variantId: string) {
  return apiRequest<SimulationBasis>(`/business-data/profit-simulation/basis?${new URLSearchParams({ variantId })}`);
}

export function calculateProfitSimulation(body: { variantId: string; days: number; start: string; baseline: SimulationInputs; scenario: SimulationInputs }) {
  return apiRequest<SimulationResult>("/business-data/profit-simulation/calculate", { method: "POST", body: JSON.stringify(body) });
}
