import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { InventoryOutlookPage } from "@/pages/ai-insights/inventory-outlook-page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), allowed: true }));
vi.mock("@/api/ai-insights", () => ({ aiInsightsApi: { inventoryOutlook: mocks.get } }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div role="dialog">{children}</div> : null }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: () => mocks.allowed }) }));

const source = { dataAsOf: "2026-01-28", finishedAt: "2026-01-29T04:00:00Z" };
const signal = { id: "1", type: "LOW_STOCK", severity: "HIGH", status: "OPEN", reasonCode: "R", suggestedAction: "REORDER",
  metrics: { stockAvailable: 4 }, lotNumber: null, expirationDate: null, lastDetectedAt: source.finishedAt, current: true, ...source };
const item = {
  variantId: "v", sku: "DEMO-1", productName: "Sản phẩm", category: null, priority: "HIGH",
  signals: [signal, { ...signal, id: "2", type: "EXPIRATION_RISK", status: "ACKNOWLEDGED", lotNumber: "L1", current: false, metrics: { rateSource: "AVG_30" } }],
  replenishment: { id: "p", status: "ORDERED", urgency: "HIGH", confidence: "HIGH", suggestedQty: 3, orderByDate: null,
    stockoutDate: null, supplierName: "NCC", poCode: "PO-1", poStatus: "DRAFT", details: { onOrder: 2 },
    updatedAt: source.finishedAt, current: false, ...source },
};

it("shows conflicting signals, source dates, and a draft as context, not incoming stock", async () => {
  mocks.allowed = true;
  mocks.get.mockResolvedValue({
    state: "READY", latestRun: { status: "SUCCEEDED", startedAt: source.finishedAt, ...source }, ruleFresh: true,
    forecastReady: false, warnings: [{ code: "FORECAST_INSUFFICIENT_DATA", message: "Thiếu lịch sử dự báo." }],
    hasSyntheticSku: true, summary: { totalSku: 1, byPriority: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 }, withoutCurrentPriority: 0 },
    page: 1, pageSize: 20, total: 1, items: [item],
  });
  render(<MemoryRouter><InventoryOutlookPage /></MemoryRouter>);
  expect(await screen.findByText(/dữ liệu giả lập/)).toBeInTheDocument();
  expect(screen.getByText(/Dự báo chưa sẵn sàng/)).toBeInTheDocument();
  expect(screen.getByText("Thiếu lịch sử dự báo.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết Sản phẩm DEMO-1" }));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/Nguy cơ hết hạn · Lô L1/)).toBeInTheDocument();
  expect(dialog.getByText(/Đang xử lý/)).toBeInTheDocument();
  expect(dialog.getByText(/Thông tin cũ hoặc dự báo chưa sẵn sàng/)).toBeInTheDocument();
  expect(dialog.getByText(/Tồn có thể bán khi phân tích: 4 sản phẩm/)).toBeInTheDocument();
  expect(dialog.getByText(/không tính là hàng đang về hoặc đề xuất mới/)).toBeInTheDocument();
  expect(dialog.getByText("Trung bình 30 ngày")).toBeInTheDocument();
  expect(dialog.getAllByText(/Số bán tại quầy tính đến hết ngày/)).toHaveLength(3);
  expect(dialog.queryByText(/Giá vốn|Thành tiền/)).not.toBeInTheDocument();
});

it("explains forecast and lot risks without confusing lead time with an order", async () => {
  mocks.allowed = true;
  mocks.get.mockResolvedValue({
    state: "READY", latestRun: { status: "SUCCEEDED", startedAt: source.finishedAt, ...source }, ruleFresh: true,
    forecastReady: true, warnings: [], hasSyntheticSku: false,
    summary: { totalSku: 1, byPriority: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 }, withoutCurrentPriority: 0 },
    page: 1, pageSize: 20, total: 1, items: [{ ...item, priority: "CRITICAL", replenishment: null, signals: [
      { ...signal, type: "STOCKOUT_RISK", severity: "CRITICAL", metrics: { stockAvailable: 0, stockoutInDays: 0, restockInDays: 5, restockSource: "LEAD_TIME" } },
      { ...signal, id: "2", type: "EXPIRATION_RISK", reasonCode: "EXPIRED_IN_STOCK", lotNumber: "L1", metrics: { lotQuantity: 2 } },
    ] }],
  });
  render(<MemoryRouter><InventoryOutlookPage /></MemoryRouter>);
  const row = (await screen.findByRole("button", { name: "Xem chi tiết Sản phẩm DEMO-1" })).closest("tr");
  expect(row).toHaveClass("sev-critical");
  expect(within(row!).getByText("Khẩn cấp")).toHaveClass("ai-sev-critical");
  expect(within(row!).getByText(/Đã hết hạn · Lô L1/)).toBeInTheDocument();
  fireEvent.click(within(row!).getByRole("button"));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/chưa có nghĩa là đã đặt hàng/)).toBeInTheDocument();
  expect(dialog.getByText(/Tồn có thể bán đã hết tại thời điểm phân tích/)).toBeInTheDocument();
  expect(dialog.getByText(/Lô L1 đã hết hạn tại thời điểm phân tích/)).toBeInTheDocument();
});

it("describes a projected day-zero stockout without claiming current stock is already gone", async () => {
  mocks.allowed = true;
  mocks.get.mockResolvedValue({
    state: "READY", latestRun: { status: "SUCCEEDED", startedAt: source.finishedAt, ...source }, ruleFresh: true,
    forecastReady: true, warnings: [], hasSyntheticSku: false,
    summary: { totalSku: 1, byPriority: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 }, withoutCurrentPriority: 0 },
    page: 1, pageSize: 20, total: 1, items: [{ ...item, replenishment: null, signals: [
      { ...signal, type: "STOCKOUT_RISK", metrics: { stockAvailable: 2, stockoutInDays: 0 } },
    ] }],
  });
  render(<MemoryRouter><InventoryOutlookPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Sản phẩm DEMO-1" }));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/có thể hết hàng trong ngày phân tích/)).toBeInTheDocument();
  expect(dialog.queryByText(/đã hết tại thời điểm phân tích/)).not.toBeInTheDocument();
});

it("explains changes in units sold and excess stock using available figures", async () => {
  mocks.allowed = true;
  mocks.get.mockResolvedValue({
    state: "READY", latestRun: { status: "SUCCEEDED", startedAt: source.finishedAt, ...source }, ruleFresh: true,
    forecastReady: true, warnings: [], hasSyntheticSku: false,
    summary: { totalSku: 1, byPriority: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 }, withoutCurrentPriority: 0 },
    page: 1, pageSize: 20, total: 1, items: [{ ...item, replenishment: null, signals: [
      { ...signal, type: "DECLINING_SALES", reasonCode: "DECLINE_POSSIBLY_STOCKOUT", metrics: { periodDays: 14, recentUnits: 0, previousUnits: 10, dropPct: 100 } },
      { ...signal, id: "2", type: "OVERSTOCK", metrics: { stockAvailable: 40, daysOfCover: 80, excessQty: 15 } },
    ] }],
  });
  render(<MemoryRouter><InventoryOutlookPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Sản phẩm DEMO-1" }));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/14 ngày gần nhất bán được 0 sản phẩm, so với 10 sản phẩm/)).toBeInTheDocument();
  expect(dialog.getByText(/Việc hết hàng có thể ảnh hưởng/)).toBeInTheDocument();
  expect(dialog.getByText(/Ước tính đủ bán khoảng 80 ngày/)).toBeInTheDocument();
  expect(dialog.getByText(/ước tính dư 15 sản phẩm/)).toBeInTheDocument();
});

it("does not claim no risks while analysis is running", async () => {
  mocks.allowed = true;
  mocks.get.mockResolvedValue({ state: "RUNNING", latestRun: null, page: 1, pageSize: 20, total: null, summary: null, items: null });
  render(<MemoryRouter><InventoryOutlookPage /></MemoryRouter>);
  expect(await screen.findByText(/Phân tích đang chạy/)).toBeInTheDocument();
  expect(screen.queryByText("Không có SKU phù hợp")).not.toBeInTheDocument();
});

it("does not load without analytics permission", () => {
  mocks.allowed = false;
  mocks.get.mockClear();
  render(<MemoryRouter><InventoryOutlookPage /></MemoryRouter>);
  expect(screen.getByRole("alert")).toHaveTextContent("cần quyền");
  expect(mocks.get).not.toHaveBeenCalled();
});
