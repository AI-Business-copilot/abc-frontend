import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AiInsightsPage } from "@/pages/ai-insights/ai-insights-page";
import { ReplenishmentPage } from "@/pages/ai-insights/replenishment-page";

const api = vi.hoisted(() => ({
  summary: vi.fn(), list: vi.fn(), run: vi.fn(), replenishment: vi.fn(),
  forecast: vi.fn(), forecastHistory: vi.fn(), createDraftOrders: vi.fn(),
}));
vi.mock("@/api/ai-insights", () => ({ aiInsightsApi: api }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div>{children}</div> : null }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock("react-router-dom", () => ({ Link: ({ children }: { children: ReactNode }) => <>{children}</> }));

const item = {
  id: "suggestion", variantId: "variant", productName: "Áo thử", sku: "TEST-A", urgency: "HIGH",
  status: "PENDING", suggestedQty: 6, amount: 60, unitCost: 10, confidence: null,
  supplierId: "supplier", supplierName: "Nhà cung cấp thử", details: {},
};
const summary = { stale: false, warnings: [], byType: {}, bySeverity: {}, totalActive: 0, capital: null, latestRun: null };
const replenishment = {
  forecastReady: true, forecastAsOf: "2025-01-01", warnings: [], items: [item],
  summary: { pendingCount: 1, pendingAmount: 60, byUrgency: {}, noSupplierCount: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.summary.mockResolvedValue(summary);
  api.list.mockResolvedValue({ items: [], total: 0 });
  api.run.mockResolvedValue({ findings: 0, created: 0, resolved: 0 });
  api.replenishment.mockResolvedValue(replenishment);
  api.forecast.mockResolvedValue({ asOf: "2025-01-01", stale: false, status: "INSUFFICIENT_DATA", forecast: {}, history: [] });
  api.forecastHistory.mockResolvedValue({ items: [] });
  api.createDraftOrders.mockResolvedValue({ orders: [{ id: "draft", poCode: "AI-TEST", supplierId: "supplier", lines: 1 }] });
});

it("analyzes, opens forecast history and submits an edited draft quantity", async () => {
  const analysis = render(<AiInsightsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Phân tích lại" }));
  expect(await screen.findByText(/Đã phân tích xong/)).toBeInTheDocument();
  expect(api.run).toHaveBeenCalledOnce();
  analysis.unmount();

  render(<ReplenishmentPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết" }));
  expect(await screen.findByText("Chưa có lịch sử dự báo được lưu.")).toBeInTheDocument();
  expect(api.forecastHistory).toHaveBeenCalledWith("variant");
  fireEvent.click(screen.getByLabelText("Chọn Áo thử"));
  fireEvent.change(screen.getByLabelText("Số lượng nhập"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Tạo đơn nháp" }));
  await waitFor(() => expect(api.createDraftOrders).toHaveBeenCalledWith([{ id: "suggestion", qty: 12 }]));
  expect(await screen.findByText(/Đã tạo 1 đơn nháp: AI-TEST/)).toBeInTheDocument();
});

it("warns about a stale forecast and prevents draft creation during an outage", async () => {
  api.replenishment.mockResolvedValue({ ...replenishment, forecastReady: false });
  render(<ReplenishmentPage />);
  expect(await screen.findByText(/Dự báo chưa cập nhật hoặc dịch vụ dự báo không khả dụng/)).toBeInTheDocument();
  expect(screen.getByLabelText("Chọn Áo thử")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Tạo đơn nháp" })).toBeDisabled();
  expect(api.createDraftOrders).not.toHaveBeenCalled();
});
