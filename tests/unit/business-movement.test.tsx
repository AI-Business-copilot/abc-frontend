import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BusinessMovementPage } from "@/pages/ai-insights/business-movement-page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), permissions: ["analytics.read", "finance.read"] }));
vi.mock("@/api/business-movement", () => ({ getBusinessMovement: mocks.get }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div>{children}</div> : null }));
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
  expect(await screen.findByText(/dữ liệu giả lập phục vụ trình diễn/)).toBeInTheDocument();
  expect(screen.getByText(/thiếu liên kết đơn hợp lệ/)).toBeInTheDocument();
  expect(screen.getByText(/không đổi .*Các khoản tăng và giảm có thể bù trừ/)).toBeInTheDocument();
  expect(within(screen.getByText("Đóng góp tăng").parentElement!).getByText("Bánh")).toBeInTheDocument();
  expect(within(screen.getByText("Đóng góp giảm").parentElement!).getByText("Áo")).toBeInTheDocument();
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
  const group = (await screen.findByText("Đóng góp tăng")).parentElement!;
  expect(within(group).getAllByRole("listitem")[0]).toHaveTextContent("Z lớn");
  expect(within(group).getByText(/Các sản phẩm còn lại \(2\)/)).toHaveTextContent("tăng 2");
});
