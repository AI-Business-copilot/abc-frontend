import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ReplenishmentPage } from "@/pages/ai-insights/replenishment-page";
import type { ForecastHistory } from "@/api/ai-insights";

const mocks = vi.hoisted(() => ({ replenishment: vi.fn(), forecast: vi.fn(), forecastHistory: vi.fn() }));
vi.mock("@/api/ai-insights", () => ({ aiInsightsApi: mocks }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div>{children}</div> : null }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: () => false }) }));
vi.mock("react-router-dom", () => ({ Link: ({ children }: { children: ReactNode }) => <>{children}</> }));

it("shows exact later forecast segments separately from the original cumulative horizons", async () => {
  mocks.replenishment.mockResolvedValue({
    forecastReady: true, warnings: [], summary: { pendingCount: 1, pendingAmount: 10, byUrgency: {}, noSupplierCount: 0 },
    items: [{ id: "i", variantId: "v", productName: "Áo", sku: "A", urgency: "HIGH", status: "PENDING",
      suggestedQty: 1, amount: 10, unitCost: 10, confidence: null, details: {} }],
  });
  mocks.forecast.mockResolvedValue({ asOf: "2025-01-01", stale: false, status: "INSUFFICIENT_DATA", forecast: {}, history: [] });
  const history: ForecastHistory = { items: [{
    id: "h", asOf: "2025-01-01", issuedAt: "2025-01-02T03:00:00Z", finishedAt: "2025-01-02T03:01:00Z",
    model: "MEAN_28", modelVersion: "test",
    evaluations: [{ days: 7, start: "2025-01-02", end: "2025-01-08", predicted: 7, actual: 8, absoluteError: 1,
      status: "PARTIAL_START", partialStart: true, stockoutDays: 0, unknownDays: 0 }],
    segmentEvaluations: [
      { days: 7, start: "2025-01-09", end: "2025-01-15", predicted: 14, actual: 14, absoluteError: 0,
        status: "COMPARABLE", partialStart: false, stockoutDays: 0, unknownDays: 0 },
      { days: 14, start: "2025-01-16", end: "2025-01-29", predicted: 42, actual: null, absoluteError: null,
        status: "PENDING", partialStart: false, stockoutDays: null, unknownDays: null },
    ],
    nextDayEvaluation: { status: "OK", evaluations: [
      { days: 28, start: "2025-01-03", end: "2025-01-30", predicted: 64, actual: 60, absoluteError: 4,
        status: "COMPARABLE", partialStart: false, stockoutDays: 0, unknownDays: 0 },
    ] },
  }] };
  mocks.forecastHistory.mockResolvedValue(history);
  render(<ReplenishmentPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết" }));
  const first = await screen.findByText(/9\/1\/25.*15\/1\/25/);
  expect(within(first.closest("tr")!).getByText("Có thể so sánh")).toBeInTheDocument();
  const second = screen.getByText(/16\/1\/25.*29\/1\/25/);
  expect(within(second.closest("tr")!).getByText("Chưa đủ thời gian")).toBeInTheDocument();
  expect(screen.getByText("Ngày đầu đã trôi qua một phần")).toBeInTheDocument();
  expect(screen.getByText(/không phải kỳ 7\/14 ngày bắt đầu ngay/)).toBeInTheDocument();
  const next = screen.getByText(/3\/1\/25.*30\/1\/25/);
  expect(within(next.closest("tr")!).getByText("64")).toBeInTheDocument();
  expect(within(next.closest("tr")!).getByText("Có thể so sánh")).toBeInTheDocument();
});

it("reports when an older backend does not provide segment evaluations", async () => {
  mocks.replenishment.mockResolvedValue({
    forecastReady: true, warnings: [], summary: { pendingCount: 1, pendingAmount: 10, byUrgency: {}, noSupplierCount: 0 },
    items: [{ id: "i", variantId: "v", productName: "Áo", sku: "A", urgency: "HIGH", status: "PENDING",
      suggestedQty: 1, amount: 10, unitCost: 10, confidence: null, details: {} }],
  });
  mocks.forecast.mockResolvedValue({ asOf: "2025-01-01", stale: false, status: "INSUFFICIENT_DATA", forecast: {}, history: [] });
  mocks.forecastHistory.mockResolvedValue({ items: [{
    id: "h", asOf: "2025-01-01", model: "MEAN_28", modelVersion: "test", evaluations: [],
  }] });
  render(<ReplenishmentPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết" }));
  expect(await screen.findByText(/Chưa có đối chiếu các đoạn sau ngày đầu; hãy cập nhật backend/)).toBeInTheDocument();
  expect(screen.getByText(/Chưa có đối chiếu ngày đầy đủ; hãy cập nhật backend/)).toBeInTheDocument();
});

it("explains the replenishment basis as an estimate and leaves the decision to the store owner", async () => {
  mocks.replenishment.mockResolvedValue({
    forecastReady: true, warnings: [], summary: { pendingCount: 1, pendingAmount: 80, byUrgency: {}, noSupplierCount: 0 },
    items: [{ id: "i", variantId: "v", productName: "Áo", sku: "A", urgency: "HIGH", status: "PENDING",
      suggestedQty: 8, amount: 80, unitCost: 10, confidence: "LOW", stockoutDate: null,
      details: {
        position: 8, reorderPoint: 10, sellableStock: 5, onOrder: 3, leadTimeDays: 4, reviewPeriodDays: 7,
        safetyStock: 2, target: 17, rawNeed: 9, minOrderQty: 4, orderMultiple: 2, wape: null,
      } }],
  });
  mocks.forecast.mockResolvedValue({ asOf: "2025-01-01", stale: false, status: "INSUFFICIENT_DATA", forecast: {}, history: [] });
  mocks.forecastHistory.mockResolvedValue({ items: [] });

  render(<ReplenishmentPage />);
  expect(await screen.findByText(/Chủ cửa hàng quyết định có nhập hay không và có thể chỉnh số lượng/)).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết" }));

  expect(await screen.findByText("AI gợi ý tham khảo: 8 sản phẩm")).toBeInTheDocument();
  expect(screen.getByText(/Vị thế tồn hiện tại \(8\) thấp hơn điểm đặt lại \(10\)/)).toBeInTheDocument();
  expect(screen.getByText("Mức hỗ trợ từ dữ liệu gần đây: thấp")).toBeInTheDocument();
  expect(screen.getByText(/Tạo đơn nháp chưa xác nhận đặt hàng/)).toBeInTheDocument();
  expect(screen.queryByText("Tin cậy thấp")).not.toBeInTheDocument();
});
