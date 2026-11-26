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
  expect(await screen.findByText(/dữ liệu giả lập phục vụ trình diễn/)).toBeInTheDocument();
  expect(screen.getByText(/thiếu liên kết đơn hợp lệ/)).toBeInTheDocument();
  expect(screen.getAllByText(/không có tỷ lệ so sánh/).length).toBeGreaterThan(0);
  const search = screen.getByRole("textbox", { name: "Tìm sản phẩm hoặc SKU" });
  fireEvent.change(search, { target: { value: "DEMO-1" } });
  expect(mocks.get).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
  expect(mocks.get).toHaveBeenCalledTimes(1);
  fireEvent.click(await screen.findByRole("button", { name: "Xem chi tiết Áo" }));
  expect(screen.getByText("SKU DEMO-1")).toBeInTheDocument();
  const tables = screen.getAllByRole("table");
  expect(within(tables[2]).getByText("Giá vốn thuần")).toBeInTheDocument();
  expect(within(tables[2]).getByText("Không khả dụng")).toBeInTheDocument();
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
