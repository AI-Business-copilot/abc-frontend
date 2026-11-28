import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProductPerformancePage } from "@/pages/ai-insights/product-performance-page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), permissions: ["analytics.read", "finance.read"] }));
vi.mock("@/api/product-performance", () => ({ getProductPerformance: mocks.get }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div>{children}</div> : null }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: (permission: string) => mocks.permissions.includes(permission) }) }));

const current = { unitsSold: 1, unitsReturned: 1, grossSales: "100.00", discountAmount: "10.00", refundAmount: "20.00", netRevenue: "70.00", netCogs: "40.00", grossProfit: "30.00", marginPercent: "42.86" };
const previous = { ...current, unitsSold: 0, unitsReturned: 0, netRevenue: "0.00", grossProfit: "0.00", marginPercent: null };
const change = { difference: "70.00", percent: null };
const comparison = { current, previous, changes: { unitsSold: change, unitsReturned: change, netRevenue: change, grossProfit: change } };

it("shows warnings, unavailable comparisons and variant financial details", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  mocks.get.mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z", totals: comparison,
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 1 },
    hasSyntheticSku: true, pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    items: [{ id: "p1", name: "Áo", ...comparison, variants: [{ id: "v1", sku: "DEMO-1", ...comparison }] }],
  });
  render(<ProductPerformancePage />);
  expect(await screen.findByText(/chưa liên kết được với đơn bán hợp lệ/)).toBeInTheDocument();
  expect(screen.queryByText(/giả lập/)).not.toBeInTheDocument();
  expect(screen.getAllByText(/Không tính tỷ lệ vì kỳ trước bằng 0 hoặc âm/).length).toBeGreaterThan(0);
  const search = screen.getByRole("textbox", { name: "Tìm sản phẩm hoặc SKU" });
  fireEvent.change(search, { target: { value: "DEMO-1" } });
  expect(mocks.get).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
  expect(mocks.get).toHaveBeenCalledTimes(1);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Áo" }));
  fireEvent.click(screen.getByRole("button", { name: /Mã hàng DEMO-1/ }));
  const tables = screen.getAllByRole("table");
  expect(within(tables[2]).getByText("Giá vốn sau hàng trả đủ điều kiện")).toBeInTheDocument();
  expect(within(tables[2]).getByText("Chưa tính được")).toBeInTheDocument();
});

it("describes increases, decreases and missing percentages without hiding negative profit", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  mocks.get.mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z",
    totals: { ...comparison, changes: {
      ...comparison.changes, netRevenue: { difference: "-70.00", percent: "-10.00" },
      grossProfit: { difference: "30.00", percent: null }, unitsSold: { difference: "0.00", percent: "0.00" },
    } },
    warnings: { excludedSaleItems: 2, excludedReturnItems: 1, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, items: [{
      id: "p", name: "Áo", ...comparison, current: { ...current, grossProfit: "-30.00", marginPercent: null },
      changes: { ...comparison.changes, netRevenue: { difference: "-70.00", percent: "-10.00" } }, variants: [],
    }],
    pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
  });
  render(<ProductPerformancePage />);
  expect(await screen.findByText(/Đã bỏ qua 2 dòng bán và 1 dòng trả/)).toBeInTheDocument();
  const row = within(screen.getByRole("table")).getAllByRole("row")[1];
  expect(row).toHaveTextContent(/Giảm 70.*₫.*10,00%/);
  expect(row).not.toHaveTextContent(/Giảm -70/);
  expect(row).toHaveTextContent(/-30.*₫/);
  expect(row).toHaveTextContent("Chưa tính được biên lợi nhuận");
  expect(screen.getAllByText(/Tăng 30.*Không tính tỷ lệ vì kỳ trước bằng 0 hoặc âm/).length).toBeGreaterThan(0);
  expect(screen.getByText(/Không đổi · 0,00%/)).toBeInTheDocument();
});

it("marks incomplete periods based on the data snapshot in the business timezone", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  mocks.get.mockResolvedValue({
    ranges: { current: { from: "2026-04-21", to: "2026-04-27", dayCount: 7 }, previous: { from: "2026-04-14", to: "2026-04-20", dayCount: 7 } },
    asOf: "2026-04-26T17:30:00Z", totals: comparison,
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, items: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 1 },
  });
  render(<ProductPerformancePage />);
  expect(await screen.findByText(/ngày chưa kết thúc hoặc chưa tới tại thời điểm tải dữ liệu/)).toBeInTheDocument();
  expect(screen.getByText(/không phải lãi ròng/)).toBeInTheDocument();
});

it("finds and expands an individual SKU without reloading the product snapshot", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  mocks.get.mockClear();
  mocks.get.mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z", totals: comparison,
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    items: [{ id: "p", name: "Áo", ...comparison, variants: [
      { id: "v1", sku: "A-001", ...comparison }, { id: "v2", sku: "A-002", ...comparison },
    ] }],
  });
  render(<ProductPerformancePage />);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Áo" }));
  expect(screen.getByRole("button", { name: /Mã hàng A-001/ })).toHaveAttribute("aria-expanded", "false");
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm mã hàng trong chi tiết" }), { target: { value: "002" } });
  expect(screen.queryByRole("button", { name: /Mã hàng A-001/ })).not.toBeInTheDocument();
  const variant = screen.getByRole("button", { name: /Mã hàng A-002/ });
  fireEvent.click(variant);
  expect(variant).toHaveAttribute("aria-expanded", "true");
  expect(within(variant.closest("section")!).getByRole("table")).toBeInTheDocument();
  expect(mocks.get).toHaveBeenCalledTimes(1);
});

it("filters, sorts and paginates the entire snapshot without loading POS again", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  const items = Array.from({ length: 60 }, (_, index) => {
    const name = `Sản phẩm ${String(index + 1).padStart(2, "0")}`;
    return {
      id: `p${index}`, name, ...comparison,
      current: { ...current, unitsSold: index, netRevenue: `${100 + index}.00`, grossProfit: `${200 - index}.00` },
      variants: [{ id: `v${index}`, sku: `SKU-${index + 1}`, ...comparison }],
    };
  });
  mocks.get.mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z", totals: comparison,
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, pagination: { page: 1, pageSize: 60, total: 60, totalPages: 1 }, items,
  });
  render(<ProductPerformancePage />);
  expect(await screen.findByText("Sản phẩm 60")).toBeInTheDocument();
  expect(screen.queryByText("Sản phẩm 01")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  expect(screen.getByText("Sản phẩm 50")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm sản phẩm hoặc SKU" }), { target: { value: "SKU-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
  expect(screen.getByText("Sản phẩm 10")).toBeInTheDocument();
  expect(screen.queryByText("Sản phẩm 60")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Xếp hạng theo" }), { target: { value: "profit" } });
  const rows = within(screen.getByRole("table")).getAllByRole("row");
  expect(rows[1]).toHaveTextContent("Sản phẩm 01");
  fireEvent.change(screen.getByRole("combobox", { name: "Số dòng mỗi trang" }), { target: { value: "20" } });
  expect(mocks.get).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Xem phân tích" }));
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
});

it("sorts financial amounts exactly even beyond JavaScript's safe integer range", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  mocks.get.mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z", totals: comparison,
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    items: [
      { id: "a", name: "A", ...comparison, current: { ...current, netRevenue: "9007199254740992.00" }, variants: [] },
      { id: "z", name: "Z", ...comparison, current: { ...current, netRevenue: "9007199254740993.00" }, variants: [] },
    ],
  });
  render(<ProductPerformancePage />);
  await screen.findByText("Z");
  const first = within(screen.getByRole("table")).getAllByRole("row")[1];
  expect(first).toHaveTextContent("Z");
  expect(first).toHaveTextContent("9.007.199.254.740.993");
});

it("does not fetch financial data without both permissions", () => {
  mocks.permissions = ["analytics.read"];
  mocks.get.mockClear();
  render(<ProductPerformancePage />);
  expect(screen.getByRole("alert")).toHaveTextContent("cần quyền");
  expect(mocks.get).not.toHaveBeenCalled();
});
