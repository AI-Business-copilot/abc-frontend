import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BusinessMovementPage } from "@/pages/ai-insights/business-movement-page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), permissions: ["analytics.read", "finance.read"] }));
vi.mock("@/api/business-movement", () => ({ getBusinessMovement: mocks.get }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div role="dialog">{children}</div> : null }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: (permission: string) => mocks.permissions.includes(permission) }) }));

const change = (difference: string) => ({ difference, percent: null });
const amounts = (revenue: string) => ({ unitsSold: 1, unitsReturned: 0, grossSales: revenue, discountAmount: "0.00", refundAmount: "0.00", netRevenue: revenue, netCogs: "0.00", grossProfit: revenue, marginPercent: null });
const comparison = (current: string, previous: string, difference: string) => ({
  current: amounts(current), previous: amounts(previous),
  changes: { unitsSold: change("0.00"), unitsReturned: change("0.00"), netRevenue: change(difference), grossProfit: change(difference) },
});
const component = { current: "0.00", previous: "0.00", difference: "0.00", impact: "0.00" };
const product = (id: string, name: string, current: string, previous: string, difference: string) => ({
  id, name, ...comparison(current, previous, difference),
  variants: [{ id: `${id}-v`, sku: `SKU-${id}`, ...comparison(current, previous, difference) }],
});

it("shows offsetting contributors, warnings, detail and local filtering from one snapshot", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  mocks.get.mockReset().mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z", totals: comparison("100.00", "100.00", "0.00"),
    components: { grossSales: component, discountAmount: component, refundAmount: component, netRevenue: component, netCogs: component },
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 1 },
    hasSyntheticSku: true, pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    items: [product("a", "Áo", "0.00", "50.00", "-50.00"), product("b", "Bánh", "100.00", "50.00", "50.00")],
  });
  render(<BusinessMovementPage />);
  expect(await screen.findByText(/chưa liên kết được với đơn bán hợp lệ/)).toBeInTheDocument();
  expect(screen.queryByText(/giả lập/)).not.toBeInTheDocument();
  expect(screen.getByText(/doanh thu thuần không đổi/)).toBeInTheDocument();
  expect(screen.getByText(/Các mức tăng và giảm có thể bù trừ/)).toBeInTheDocument();
  expect(within(screen.getByText("Sản phẩm có mức tăng").parentElement!).getByText("Bánh")).toBeInTheDocument();
  expect(within(screen.getByText("Sản phẩm có mức giảm").parentElement!).getByText("Áo")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm sản phẩm hoặc SKU" }), { target: { value: "SKU-a" } });
  fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
  expect(mocks.get).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getAllByRole("button", { name: "Xem chi tiết Áo" })[0]);
  expect(screen.getByText("SKU-a")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Giải thích chỉ số" }), { target: { value: "grossProfit" } });
  expect(screen.getByText(/Lợi nhuận gộp = doanh thu thuần/)).toBeInTheDocument();
  expect(mocks.get).toHaveBeenCalledTimes(1);
});

it("does not fetch without financial permission", () => {
  mocks.permissions = ["analytics.read"];
  mocks.get.mockClear();
  render(<BusinessMovementPage />);
  expect(screen.getByRole("alert")).toHaveTextContent("cần quyền");
  expect(mocks.get).not.toHaveBeenCalled();
});

it("ranks large amounts exactly and totals the contributors outside the top five", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  const items = [
    product("a", "A nhỏ", "9007199254740992.00", "0.00", "9007199254740992.00"),
    product("z", "Z lớn", "9007199254740993.00", "0.00", "9007199254740993.00"),
    ...Array.from({ length: 5 }, (_, i) => product(`${i}`, `SP ${i}`, "1.00", "0.00", "1.00")),
  ];
  mocks.get.mockReset().mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z", totals: comparison("18014398509481990.00", "0.00", "18014398509481990.00"),
    components: { grossSales: component, discountAmount: component, refundAmount: component, netRevenue: component, netCogs: component },
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, pagination: { page: 1, pageSize: items.length, total: items.length, totalPages: 1 }, items,
  });
  render(<BusinessMovementPage />);
  const group = (await screen.findByText("Sản phẩm có mức tăng")).parentElement!;
  expect(within(group).getAllByRole("listitem")[0]).toHaveTextContent("Z lớn");
  expect(within(group).getByText(/Tổng của nhóm/)).toHaveTextContent("18.014.398.509.481.990");
  expect(within(group).getByText(/Các sản phẩm còn lại \(2\)/)).toHaveTextContent("tăng 2");
});

it("keeps accounting effects distinct from changes to discounts and refunds", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  const discount = { previous: "50.00", current: "40.00", difference: "-10.00", impact: "10.00" };
  const refund = { previous: "150.00", current: "160.00", difference: "10.00", impact: "-10.00" };
  const baseItem = product("p", "Áo", "40.00", "50.00", "-10.00");
  const item = { ...baseItem, changes: { ...baseItem.changes, netRevenue: { difference: "-10.00", percent: "-20.00" } } };
  mocks.get.mockReset().mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z", totals: comparison("40.00", "50.00", "-10.00"),
    components: { grossSales: component, discountAmount: discount, refundAmount: refund, netRevenue: component, netCogs: component },
    warnings: { excludedSaleItems: 1, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, items: [item], pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
  });
  render(<BusinessMovementPage />);
  expect(await screen.findByText(/Đã bỏ qua 1 dòng bán và 0 dòng trả/)).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Xem các khoản tạo nên thay đổi doanh thu thuần/));
  const discountRow = screen.getByText("Giảm giá dòng").closest("tr")!;
  expect(within(discountRow).getByText(/giảm 10/)).toBeInTheDocument();
  expect(within(discountRow).getByText(/Góp phần tăng 10/)).toBeInTheDocument();
  const refundRow = screen.getByText("Hoàn tiền").closest("tr")!;
  expect(within(refundRow).getByText(/Góp phần giảm 10/)).toBeInTheDocument();
  const productRow = screen.getAllByRole("button", { name: "Xem chi tiết Áo" }).map((button) => button.closest("tr")).find((row) => row !== null)!;
  expect(productRow).toHaveTextContent(/giảm 10/);
  expect(productRow).not.toHaveTextContent(/20[,.]00%/);
  fireEvent.click(within(productRow).getByRole("button", { name: "Xem chi tiết Áo" }));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText(/giảm 10.*20,00%/)).toBeInTheDocument();
  expect(dialog.getByText(/Tỷ lệ \(nếu có\) so với kết quả kỳ trước của sản phẩm này/)).toBeInTheDocument();
});

it("keeps incomplete-period warning tied to the snapshot in the business timezone", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  mocks.get.mockReset().mockResolvedValue({
    ranges: { current: { from: "2026-04-21", to: "2026-04-27", dayCount: 7 }, previous: { from: "2026-04-14", to: "2026-04-20", dayCount: 7 } },
    asOf: "2026-04-26T17:30:00Z", totals: comparison("0.00", "0.00", "0.00"),
    components: { grossSales: component, discountAmount: component, refundAmount: component, netRevenue: component, netCogs: component },
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, items: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 1 },
  });
  render(<BusinessMovementPage />);
  expect(await screen.findByText(/ngày chưa kết thúc tại thời điểm tải dữ liệu/)).toBeInTheDocument();
});

it("searches and paginates many SKUs in product details without reloading", async () => {
  mocks.permissions = ["analytics.read", "finance.read"];
  const item = product("p", "Áo", "40.00", "50.00", "-10.00");
  item.variants = Array.from({ length: 25 }, (_, index) => ({
    id: `v${index}`, sku: `SKU-${String(index + 1).padStart(3, "0")}`, ...comparison("40.00", "50.00", "-10.00"),
  }));
  mocks.get.mockReset().mockResolvedValue({
    ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
    asOf: "2026-04-27T00:00:00Z", totals: comparison("40.00", "50.00", "-10.00"),
    components: { grossSales: component, discountAmount: component, refundAmount: component, netRevenue: component, netCogs: component },
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    hasSyntheticSku: false, items: [item], pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
  });
  render(<BusinessMovementPage />);
  fireEvent.click((await screen.findAllByRole("button", { name: "Xem chi tiết Áo" }))[0]);
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText("SKU-001")).toBeInTheDocument();
  expect(dialog.queryByText("SKU-011")).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Trang sau" }));
  expect(dialog.getByText("SKU-011")).toBeInTheDocument();
  fireEvent.change(dialog.getByRole("textbox", { name: "Tìm mã hàng trong chi tiết" }), { target: { value: "025" } });
  expect(dialog.getByText("SKU-025")).toBeInTheDocument();
  expect(dialog.queryByText("SKU-011")).not.toBeInTheDocument();
  expect(mocks.get).toHaveBeenCalledTimes(1);
});
