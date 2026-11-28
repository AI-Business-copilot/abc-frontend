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
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Áo A" }));
  const first = await screen.findByText(/9\/1\/25.*15\/1\/25/);
  expect(within(first.closest("tr")!).getByText("Đủ điều kiện đối chiếu")).toBeInTheDocument();
  const second = screen.getByText(/16\/1\/25.*29\/1\/25/);
  expect(within(second.closest("tr")!).getByText("Chưa đến thời điểm đánh giá")).toBeInTheDocument();
  expect(screen.getByText("Kỳ bán đã bắt đầu trước khi có dự báo")).toBeInTheDocument();
  expect(screen.getByText(/không phải các kỳ bắt đầu ngay/)).toBeInTheDocument();
  const next = screen.getByText(/3\/1\/25.*30\/1\/25/);
  expect(within(next.closest("tr")!).getByText("64")).toBeInTheDocument();
  expect(within(next.closest("tr")!).getByText("Đủ điều kiện đối chiếu")).toBeInTheDocument();
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
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Áo A" }));
  expect(await screen.findByText(/Chưa có dữ liệu đối chiếu cho các ngày sau/)).toBeInTheDocument();
  expect(screen.getByText(/Chưa có dữ liệu đối chiếu cho các kỳ này/)).toBeInTheDocument();
});

it("explains the replenishment basis as an estimate and leaves the decision to the store owner", async () => {
  mocks.replenishment.mockResolvedValue({
    forecastReady: true, warnings: [], summary: { pendingCount: 1, pendingAmount: 80, byUrgency: {}, noSupplierCount: 0 },
    items: [{ id: "i", variantId: "v", productName: "Áo", sku: "A", urgency: "HIGH", status: "PENDING",
      suggestedQty: 8, amount: 80, unitCost: 10, confidence: "LOW", stockoutDate: null,
      details: {
        position: 10, reorderPoint: 10, stockAvailable: 5, sellableStock: 5, onOrder: 3, leadTimeDays: 4, leadTimeSource: "HISTORY", reviewPeriodDays: 7,
        safetyStock: 2, target: 17, rawNeed: 9, minOrderQty: 4, orderMultiple: 2, wape: null, model: "INTERNAL_MODEL", modelVersion: "internal-version",
      } }],
  });
  mocks.forecast.mockResolvedValue({ asOf: "2025-01-01", stale: false, status: "INSUFFICIENT_DATA", forecast: {}, history: [] });
  mocks.forecastHistory.mockResolvedValue({ items: [] });

  render(<ReplenishmentPage />);
  expect(await screen.findByText(/có thể điều chỉnh số lượng trước khi tạo đơn nháp/)).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Áo A" }));

  expect(await screen.findByText("Số lượng đề xuất: 8 sản phẩm")).toBeInTheDocument();
  expect(screen.getByText(/đã chạm mức cần cân nhắc nhập thêm/)).toBeInTheDocument();
  expect(screen.getByText(/Dữ liệu bán gần đây hỗ trợ dự báo ở mức còn hạn chế/)).toBeInTheDocument();
  expect(screen.getByText(/dựa trên các lần nhập hàng trước/)).toBeInTheDocument();
  expect(screen.getByText(/Đơn nháp chưa phải đơn đặt hàng đã xác nhận/)).toBeInTheDocument();
  expect(screen.queryByText(/INTERNAL_MODEL|internal-version|giả lập|WAPE/)).not.toBeInTheDocument();
});

it("labels the forecast period and dates an overdue-order assumption to the analysis", async () => {
  mocks.replenishment.mockResolvedValue({
    forecastReady: true, forecastAsOf: "2025-01-01", warnings: [],
    summary: { pendingCount: 1, pendingAmount: 10, byUrgency: {}, noSupplierCount: 0 },
    items: [{ id: "i", variantId: "v", productName: "Áo", sku: "A", urgency: "HIGH", status: "PENDING",
      suggestedQty: 1, amount: 10, unitCost: 10, confidence: null,
      details: { incoming: [{ poCode: "PO-1", qty: 3, arrivalDate: "2024-12-30", overdue: true }] } }],
  });
  mocks.forecast.mockResolvedValue({
    asOf: "2025-01-01", stale: false, status: "OK",
    forecast: { dailyRate: 1, dailyRates: [1], totals: { d14: 14 } },
    history: [{ day: "2024-12-31", units: 2 }, { day: "2025-01-01", units: 4 }],
  });
  mocks.forecastHistory.mockResolvedValue({ items: [] });
  render(<ReplenishmentPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Áo A" }));
  expect(await screen.findByText(/Trong 2 ngày có dữ liệu gần nhất \(31\/12\/24 đến 1\/1\/25\), cửa hàng bán được 6 sản phẩm, trung bình 3 sản phẩm mỗi ngày/)).toBeInTheDocument();
  expect(screen.getByText(/Trong 14 ngày sau 1\/1\/25, dự kiến bán khoảng 14 sản phẩm, trung bình 1 sản phẩm mỗi ngày/)).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: "Biểu đồ bán hàng và dự báo" })).not.toBeInTheDocument();
  expect(screen.getByText(/ngày sau lần phân tích; nhà cung cấp chưa xác nhận ngày này/)).toBeInTheDocument();
});
