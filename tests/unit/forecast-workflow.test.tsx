import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { Insight } from "@/api/ai-insights";
import { AiInsightsPage } from "@/pages/ai-insights/ai-insights-page";
import { ReplenishmentPage } from "@/pages/ai-insights/replenishment-page";

const api = vi.hoisted(() => ({
  summary: vi.fn(), list: vi.fn(), run: vi.fn(), settings: vi.fn(), replenishment: vi.fn(),
  forecast: vi.fn(), forecastHistory: vi.fn(), createDraftOrders: vi.fn(),
}));
vi.mock("@/api/ai-insights", () => ({ aiInsightsApi: api }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div role="dialog">{children}</div> : null }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock("react-router-dom", () => ({ Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }));

const item = {
  id: "suggestion", variantId: "variant", productName: "Áo thử", sku: "TEST-A", urgency: "HIGH",
  status: "PENDING", suggestedQty: 6, amount: 60, unitCost: 10, confidence: null,
  supplierId: "supplier", supplierName: "Nhà cung cấp thử", details: {},
};
const summary = { stale: false, warnings: [], byType: {}, bySeverity: {}, totalActive: 0, capital: null, latestRun: null };
const latestRun = { id: "run", status: "SUCCEEDED", triggerType: "MANUAL", dataAsOf: "2026-04-23", startedAt: "2026-04-24T05:00:00Z", finishedAt: "2026-04-24T05:00:00Z", error: null };
const insight: Insight = {
  id: "alert", type: "STOCKOUT_RISK", severity: "HIGH", status: "OPEN", reasonCode: "RESTOCK_WINDOW_CLOSING",
  suggestedAction: "REORDER", metrics: { stockAvailable: 2, stockoutInDays: 0, restockInDays: 5, restockSource: "LEAD_TIME", gapDays: 2, model: "INTERNAL_MODEL", formula: "technical formula" },
  valueAtRisk: 1000, priorityScore: 70, snoozeUntil: null, firstDetectedAt: "2026-04-24T05:00:00Z",
  lastDetectedAt: "2026-04-24T05:00:00Z", variantId: "variant", sku: "DEMO-A", productName: "Áo thử",
  category: null, lotItemId: null, lotNumber: null, expirationDate: null,
};
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
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Áo thử TEST-A" }));
  expect(await screen.findByText("Chưa có lịch sử dự báo được lưu.")).toBeInTheDocument();
  expect(api.forecastHistory).toHaveBeenCalledWith("variant");
  fireEvent.click(screen.getByLabelText("Chọn Áo thử TEST-A"));
  fireEvent.change(screen.getByLabelText("Số lượng nhập Áo thử TEST-A"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Tạo đơn nháp" }));
  await waitFor(() => expect(api.createDraftOrders).toHaveBeenCalledWith([{ id: "suggestion", qty: 12 }]));
  expect(await screen.findByText(/Đã tạo 1 đơn nháp/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Mở đơn nhập hàng AI-TEST" })).toHaveAttribute("href", "/purchases/draft");
});

it("warns about a stale forecast and prevents draft creation during an outage", async () => {
  api.replenishment.mockResolvedValue({ ...replenishment, forecastReady: false });
  render(<ReplenishmentPage />);
  expect(await screen.findByText(/Dự báo chưa cập nhật hoặc dịch vụ dự báo không khả dụng/)).toBeInTheDocument();
  expect(screen.getByLabelText("Chọn Áo thử TEST-A")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Tạo đơn nháp" })).toBeDisabled();
  expect(api.createDraftOrders).not.toHaveBeenCalled();
});

it("keeps selections and edited quantities when searching or filtering the visible suggestions", async () => {
  api.replenishment.mockResolvedValue({
    ...replenishment,
    items: [item, { ...item, id: "other", variantId: "other", productName: "Quần thử", sku: "TEST-B", urgency: "LOW" }],
    summary: { ...replenishment.summary, pendingCount: 2, byUrgency: { HIGH: 1, LOW: 1 } },
  });
  render(<ReplenishmentPage />);
  fireEvent.click(await screen.findByLabelText("Chọn Áo thử TEST-A"));
  fireEvent.change(screen.getByLabelText("Số lượng nhập Áo thử TEST-A"), { target: { value: "12" } });
  fireEvent.change(screen.getByLabelText("Tìm sản phẩm hoặc mã hàng"), { target: { value: "Quần" } });
  expect(screen.getByText(/gồm 1 mã đang bị lọc/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Chọn tất cả mặt hàng đang hiển thị"));
  expect(screen.getByText(/Đã chọn 2 mã hàng/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Tìm sản phẩm hoặc mã hàng"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /Cao.*Cần chú ý sớm/ }));
  expect(screen.getByLabelText("Số lượng nhập Áo thử TEST-A")).toHaveValue(12);
  expect(screen.queryByLabelText("Chọn Quần thử TEST-B")).not.toBeInTheDocument();
  expect(api.replenishment).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Tạo đơn nháp" }));
  await waitFor(() => expect(api.createDraftOrders).toHaveBeenCalledWith([
    { id: "suggestion", qty: 12 }, { id: "other", qty: 6 },
  ]));
});

it("does not present an old suggestion as the quantity or cost of a draft order", async () => {
  api.replenishment.mockResolvedValue({
    ...replenishment,
    items: [{ ...item, status: "ORDERED", poId: "draft", poCode: "PO-1", poStatus: "DRAFT" }],
    summary: { pendingCount: 0, pendingAmount: 0, byUrgency: {}, noSupplierCount: 0 },
  });
  render(<ReplenishmentPage />);
  const detailButton = await screen.findByRole("button", { name: "Xem chi tiết Áo thử TEST-A" });
  const row = within(detailButton.closest("tr")!);
  expect(row.getByText(/Đơn nháp chưa xác nhận, chưa phải hàng đang về/)).toBeInTheDocument();
  expect(row.getByText("Xem trong đơn")).toBeInTheDocument();
  expect(row.queryByText("6 sản phẩm")).not.toBeInTheDocument();
  fireEvent.click(detailButton);
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/không nhất thiết phản ánh số lượng hoặc chi phí hiện tại/)).toBeInTheDocument();
  expect(dialog.queryByText(/Gợi ý nhập: 6 sản phẩm/)).not.toBeInTheDocument();
});

it("clears the previous success notice when a later draft creation fails", async () => {
  render(<ReplenishmentPage />);
  fireEvent.click(await screen.findByLabelText("Chọn Áo thử TEST-A"));
  fireEvent.click(screen.getByRole("button", { name: "Tạo đơn nháp" }));
  expect(await screen.findByText(/Đã tạo 1 đơn nháp/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText("Chọn Áo thử TEST-A")).toBeEnabled());
  api.createDraftOrders.mockRejectedValueOnce(new Error("Không tạo được đơn"));
  fireEvent.click(screen.getByLabelText("Chọn Áo thử TEST-A"));
  fireEvent.click(screen.getByRole("button", { name: "Tạo đơn nháp" }));
  expect(await screen.findByText("Không tạo được đơn")).toBeInTheDocument();
  expect(screen.queryByText(/Đã tạo 1 đơn nháp/)).not.toBeInTheDocument();
});

it("keeps actionable data warnings but hides model details and avoids false zero totals on error", async () => {
  api.replenishment.mockResolvedValue({
    ...replenishment,
    warnings: [
      { code: "FORECAST_SYNTHETIC_MODEL", message: "Mô hình giả lập" },
      { code: "FORECAST_OVERDUE_PO", message: "Có đơn đã quá hạn." },
    ],
    items: [{ ...item, unitCost: 0 }],
  });
  const page = render(<ReplenishmentPage />);
  expect(await screen.findByText(/Có 1 lưu ý về dữ liệu/)).toBeInTheDocument();
  expect(screen.getByText(/Có đơn hàng đang về đã quá hạn/)).toBeInTheDocument();
  expect(screen.getByText(/giá nhập bằng 0/)).toBeInTheDocument();
  expect(screen.queryByText(/giả lập/)).not.toBeInTheDocument();
  page.unmount();
  api.replenishment.mockRejectedValue(new Error("Không tải được gợi ý"));
  render(<ReplenishmentPage />);
  expect(await screen.findByText("Không tải được gợi ý")).toBeInTheDocument();
  expect(screen.queryByText("Gợi ý đang chờ")).not.toBeInTheDocument();
});

it("prioritizes alerts and distinguishes a projected stockout, lead time and missed revenue", async () => {
  api.summary.mockResolvedValue({
    ...summary, latestRun, totalActive: 1, bySeverity: { HIGH: 1 }, byType: { STOCKOUT_RISK: 1 }, valueAtRisk: 1000,
    warnings: [
      { code: "FORECAST_SYNTHETIC_MODEL", message: "mô hình giả lập" },
      { code: "FORECAST_UNAVAILABLE", message: "Dự báo chưa được cập nhật." },
      { code: "NO_SALES_DATA", message: "Chưa có POS" },
    ],
  });
  api.list.mockResolvedValue({ items: [insight], total: 1 });
  render(<AiInsightsPage />);
  const detailButton = await screen.findByRole("button", { name: "Xem chi tiết Áo thử DEMO-A" });
  const row = detailButton.closest("tr");
  expect(row).not.toBeNull();
  const alertRow = within(row!);
  expect(alertRow.getByText(/Có thể hết hàng trong ngày phân tích/)).toBeInTheDocument();
  expect(alertRow.queryByText(/chưa có nghĩa là đã đặt hàng/)).not.toBeInTheDocument();
  expect(alertRow.getByText("Doanh thu có thể bỏ lỡ")).toBeInTheDocument();
  expect(screen.getByText(/1 cảnh báo mới hoặc đang xử lý/)).toBeInTheDocument();
  expect(screen.getByText("Dự báo chưa được cập nhật.")).toBeInTheDocument();
  expect(screen.getByText(/Có 1 lưu ý về dữ liệu/)).toBeInTheDocument();
  expect(screen.queryByText(/giả lập/)).not.toBeInTheDocument();
  expect(screen.queryByText("Tiền hàng rủi ro")).not.toBeInTheDocument();
  fireEvent.click(detailButton);
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/chưa có nghĩa là đã đặt hàng/)).toBeInTheDocument();
  expect(dialog.getByText(/doanh thu ước tính có thể bỏ lỡ, không phải tiền đã mất/)).toBeInTheDocument();
  fireEvent.click(dialog.getByText("Xem số liệu liên quan"));
  expect(dialog.queryByText("INTERNAL_MODEL")).not.toBeInTheDocument();
  expect(dialog.queryByText("technical formula")).not.toBeInTheDocument();
});

it("does not imply an alert-free store before analysis or after a failed analysis", async () => {
  api.summary.mockResolvedValue({ ...summary, stale: true, latestRun: { ...latestRun, status: "FAILED", error: "internal error" } });
  render(<AiInsightsPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("không thành công");
  expect(screen.getByText(/Cảnh báo bên dưới có thể là kết quả cũ/)).toBeInTheDocument();
  expect(screen.queryByText("internal error")).not.toBeInTheDocument();
  expect(screen.queryByText(/tồn kho hiện đang ổn/)).not.toBeInTheDocument();
  expect(screen.getByText(/Không có cảnh báo không có nghĩa/)).toBeInTheDocument();
});

it("shows unknown alert counts when the store has not been analyzed", async () => {
  api.summary.mockResolvedValue(summary);
  render(<AiInsightsPage />);
  expect(await screen.findByText(/Chưa thể xác định số cảnh báo/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Khẩn cấp/ })).toHaveTextContent("—");
  expect(screen.getByText(/Chưa có dữ liệu phân tích/)).toBeInTheDocument();
});

it("does not suggest a fixed reorder quantity without considering incoming stock", async () => {
  api.summary.mockResolvedValue({ ...summary, latestRun, totalActive: 1, bySeverity: { HIGH: 1 } });
  api.list.mockResolvedValue({ items: [{
    ...insight, type: "LOW_STOCK", valueAtRisk: null,
    metrics: { stockAvailable: 2, avgDaily30: 1, leadTimeDays: 5, onOrderQty: 10, shortfallToReorderPoint: 8 },
  }], total: 1 });
  render(<AiInsightsPage />);
  const detailButton = await screen.findByRole("button", { name: "Xem chi tiết Áo thử DEMO-A" });
  const row = detailButton.closest("tr");
  expect(row).not.toBeNull();
  expect(within(row!).queryByText(/Đang đặt 10 sản phẩm, chưa về/)).not.toBeInTheDocument();
  expect(within(row!).getByText(/Kiểm tra tồn và hàng đang đặt/)).toBeInTheDocument();
  expect(within(row!).queryByText(/nhập thêm ít nhất/)).not.toBeInTheDocument();
  fireEvent.click(detailButton);
  expect(within(screen.getByRole("dialog")).getByText(/Đang đặt 10 sản phẩm, chưa về/)).toBeInTheDocument();
});

it("explains an unsellable lot without displaying missing forecasts as numbers", async () => {
  api.summary.mockResolvedValue({ ...summary, latestRun, totalActive: 1, bySeverity: { HIGH: 1 } });
  api.list.mockResolvedValue({ items: [{
    ...insight, type: "EXPIRATION_RISK", reasonCode: "UNSELLABLE_NEAR_EXPIRY", suggestedAction: "PREPARE_SCRAP",
    lotNumber: "L1", valueAtRisk: 1000, metrics: { lotQuantity: 2, lotStatus: "UNUSABLE" },
  }], total: 1 });
  render(<AiInsightsPage />);
  const button = await screen.findByRole("button", { name: "Xem chi tiết Áo thử DEMO-A lô L1" });
  const row = button.closest("tr");
  expect(row).not.toBeNull();
  expect(within(row!).getByText("Lô hàng không thể bán")).toBeInTheDocument();
  expect(within(row!).queryByText(/Số lượng trong lô khi phân tích: 2 sản phẩm/)).not.toBeInTheDocument();
  expect(within(row!).queryByText(/dự kiến chỉ bán/)).not.toBeInTheDocument();
  expect(within(row!).getByText("Giá vốn hàng có nguy cơ")).toBeInTheDocument();
  fireEvent.click(button);
  expect(within(screen.getByRole("dialog")).getByText(/Số lượng trong lô khi phân tích: 2 sản phẩm/)).toBeInTheDocument();
});

it("keeps the short stockout estimate in the table and full explanation in the detail", async () => {
  api.summary.mockResolvedValue({ ...summary, latestRun, totalActive: 1, bySeverity: { HIGH: 1 } });
  api.list.mockResolvedValue({ items: [{
    ...insight, metrics: { stockAvailable: 10, stockoutInDays: 3, restockInDays: 7, restockSource: "LEAD_TIME", gapDays: 4 },
  }], total: 1 });
  render(<AiInsightsPage />);
  const button = await screen.findByRole("button", { name: "Xem chi tiết Áo thử DEMO-A" });
  const row = button.closest("tr");
  expect(row).not.toBeNull();
  expect(within(row!).getByText(/Có thể hết hàng sau khoảng 3 ngày kể từ ngày phân tích/)).toBeInTheDocument();
  expect(within(row!).queryByText(/Có thể thiếu hàng khoảng 4 ngày/)).not.toBeInTheDocument();
  fireEvent.click(button);
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/Khi phân tích còn 10 sản phẩm có thể bán/)).toBeInTheDocument();
  expect(dialog.getByText(/Thời gian nhập ước tính khoảng 7 ngày/)).toBeInTheDocument();
  expect(dialog.getByText(/Có thể thiếu hàng khoảng 4 ngày/)).toBeInTheDocument();
});
