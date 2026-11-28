import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { SimulationBasis } from "@/api/profit-simulation";
import { ProfitSimulationPage } from "@/pages/ai-insights/profit-simulation-page";

const mocks = vi.hoisted(() => ({ search: vi.fn(), categories: vi.fn(), basis: vi.fn(), calculate: vi.fn(), permissions: ["analytics.read", "finance.read"] }));
vi.mock("@/api/profit-simulation", () => ({ searchSimulationCategories: mocks.categories, searchSimulationVariants: mocks.search, getSimulationBasis: mocks.basis, calculateProfitSimulation: mocks.calculate }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: (permission: string) => mocks.permissions.includes(permission) }) }));

const variant = { id: "sku-1", sku: "DEMO-1", name: "Áo", isActive: true };
const basis: SimulationBasis = {
  variant: { ...variant, basePrice: "100000.00", costPrice: "60000.00" },
  today: "2026-04-24", asOf: "2026-04-24T05:00:00Z",
  forecast: { status: "READY", start: "2026-04-25", dataAsOf: "2026-04-23", finishedAt: "2026-04-24T02:00:00Z", model: "SES", modelVersion: "v1", confidence: "LOW", datasetKind: "synthetic", totals: { d7: "100.00", d14: "200.00", d28: "400.00" } },
};
const inputs = { quantity: "100.00", price: "100000.00", unitCost: "60000.00", discountPercent: "0.00", operatingExpense: null };
const amounts = { inputs, grossSales: "10000000.00", discountAmount: "0.00", revenue: "10000000.00", cogs: "6000000.00", grossProfit: "4000000.00", afterExpense: null };
const change = { difference: "0.00", percent: "0.00" };
const result = { variant, period: { start: "2026-04-25", end: "2026-05-01", days: 7 }, calculatedAt: "2026-04-24T05:00:00Z", baseline: amounts, scenario: amounts, changes: { revenue: change, cogs: change, grossProfit: change, afterExpense: null } };

function setup(data: SimulationBasis = basis, multiplePages = false) {
  mocks.permissions = ["analytics.read", "finance.read"];
  mocks.search.mockReset().mockImplementation(async (_search: string, page: number) => ({
    items: page === 1 ? [variant] : [{ id: "sku-2", sku: "SKU-2", name: "Kem", isActive: true }],
    page, pageSize: 8, hasMore: multiplePages && page === 1,
  }));
  mocks.categories.mockReset().mockImplementation(async (_search: string, page: number) => ({
    items: page === 1 ? [{ id: "cat-1", name: "Quần áo", parentName: null, isActive: true }] : [{ id: "cat-2", name: "Áo", parentName: "Quần áo", isActive: true }],
    page, pageSize: 8, hasMore: page === 1,
  }));
  mocks.basis.mockReset().mockResolvedValue(data);
  mocks.calculate.mockReset().mockResolvedValue(result);
  render(<ProfitSimulationPage />);
}

it("applies the forecast automatically, compares scenarios and updates quantities for a new period", async () => {
  setup();
  fireEvent.click(await screen.findByRole("button", { name: /DEMO-1/ }));
  expect(await screen.findByText("Đã điền vào kịch bản cơ sở. Bạn có thể điều chỉnh nếu cần.")).toBeInTheDocument();
  expect(screen.getByText("Kỳ mô phỏng · 7 ngày, bắt đầu từ ngày mai")).toBeInTheDocument();
  expect(screen.getByText("25/4/26 – 1/5/26")).toBeInTheDocument();
  expect(screen.getByText("100 sản phẩm")).toBeInTheDocument();
  expect(screen.queryByText(/giả lập|Phương pháp|phiên bản|Giá tham khảo hiện tại/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("100.00");
  fireEvent.click(screen.getByRole("button", { name: "Sao chép cơ sở sang kịch bản thay đổi" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Tính mô phỏng" }));
  await screen.findByRole("heading", { name: "Kết quả mô phỏng" });
  expect(mocks.calculate).toHaveBeenCalledWith(expect.objectContaining({
    variantId: "sku-1", start: "2026-04-25", days: 7,
    baseline: expect.objectContaining({ quantity: "100.00", operatingExpense: null }),
    scenario: expect.objectContaining({ quantity: "100.00", operatingExpense: null }),
  }));
  expect(screen.getAllByText("Chưa có giả định")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Kịch bản thay đổi: Giá bán/đơn vị (đ)"), { target: { value: "120000" } });
  expect(screen.queryByRole("heading", { name: "Kết quả mô phỏng" })).not.toBeInTheDocument();
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  fireEvent.change(screen.getByRole("combobox", { name: "Kỳ mô phỏng" }), { target: { value: "14" } });
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("200.00");
  expect(screen.getByLabelText("Kịch bản thay đổi: Số lượng bán giả định")).toHaveValue("");
  expect(screen.getByText("25/4/26 – 8/5/26")).toBeInTheDocument();
  expect(screen.getByText("200 sản phẩm")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định"), { target: { value: "175" } });
  expect(screen.getByText("Bạn đã điều chỉnh số lượng ở kịch bản cơ sở.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Dùng lại số dự báo" }));
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("200.00");
});

it("allows manual quantities when no forecast is available and validates input locally", async () => {
  setup({ ...basis, forecast: { status: "UNAVAILABLE", reason: "Dự báo chưa sẵn sàng" } });
  fireEvent.click(await screen.findByRole("button", { name: /DEMO-1/ }));
  expect(await screen.findByText("Chưa có dự báo phù hợp cho sản phẩm này")).toBeInTheDocument();
  expect(screen.getByText(/Hãy tự nhập số lượng dự kiến/)).toBeInTheDocument();
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("");
  expect(screen.queryByRole("button", { name: "Dùng lại số dự báo" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định"), { target: { value: "1000000.01" } });
  fireEvent.click(screen.getByRole("button", { name: "Sao chép cơ sở sang kịch bản thay đổi" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Tính mô phỏng" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("không được vượt");
  expect(mocks.calculate).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định"), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "Sao chép cơ sở sang kịch bản thay đổi" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Tính mô phỏng" }));
  await waitFor(() => expect(mocks.calculate).toHaveBeenCalledTimes(1));
});

it("does not fetch data without both permissions", () => {
  mocks.permissions = ["analytics.read"];
  mocks.search.mockClear();
  mocks.categories.mockClear();
  render(<ProfitSimulationPage />);
  expect(screen.getByRole("alert")).toHaveTextContent("cần quyền");
  expect(mocks.search).not.toHaveBeenCalled();
  expect(mocks.categories).not.toHaveBeenCalled();
});

it("blocks period changes while a calculation is in flight", async () => {
  setup();
  let resolve!: (value: typeof result) => void;
  mocks.calculate.mockReturnValue(new Promise((done) => { resolve = done; }));
  fireEvent.click(await screen.findByRole("button", { name: /DEMO-1/ }));
  await screen.findByText("100 sản phẩm");
  fireEvent.click(screen.getByRole("button", { name: "Sao chép cơ sở sang kịch bản thay đổi" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Tính mô phỏng" }));
  expect(screen.getByRole("combobox", { name: "Kỳ mô phỏng" })).toBeDisabled();
  expect(screen.getByLabelText("Kịch bản cơ sở: Giá bán/đơn vị (đ)")).toBeDisabled();
  resolve(result);
  await screen.findByRole("heading", { name: "Kết quả mô phỏng" });
  expect(screen.getByRole("combobox", { name: "Kỳ mô phỏng" })).toBeEnabled();
});

it("paginates SKU search and keeps the selected scenario when reopening the picker", async () => {
  setup(basis, true);
  fireEvent.click(await screen.findByRole("button", { name: /DEMO-1/ }));
  await screen.findByRole("heading", { name: /Áo · DEMO-1/ });
  expect(screen.queryByRole("navigation", { name: "Phân trang SKU" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Đổi SKU" }));
  fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
  expect(await screen.findByRole("button", { name: /SKU-2/ })).toBeInTheDocument();
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("12");
  expect(mocks.search).toHaveBeenLastCalledWith("", 2, "");
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm sản phẩm hoặc SKU" }), { target: { value: "Áo" } });
  fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
  await waitFor(() => expect(mocks.search).toHaveBeenLastCalledWith("Áo", 1, ""));
  fireEvent.click(await screen.findByRole("button", { name: "Tiếp" }));
  await screen.findByRole("button", { name: /SKU-2/ });
  fireEvent.click(screen.getByRole("button", { name: "Trước" }));
  expect(await screen.findByRole("button", { name: /DEMO-1/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Thu gọn" }));
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("12");
});

it("searches and paginates categories, filters SKUs and preserves an existing scenario", async () => {
  setup(basis, true);
  const sku = await screen.findByRole("button", { name: "Áo · DEMO-1" });
  expect(sku).not.toHaveTextContent("Chọn");
  fireEvent.click(sku);
  await screen.findByRole("heading", { name: /Áo · DEMO-1/ });
  fireEvent.change(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Đổi SKU" }));
  fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
  await screen.findByRole("button", { name: /SKU-2/ });
  fireEvent.click(screen.getByRole("button", { name: "Chọn danh mục" }));
  const categoryPager = await screen.findByRole("navigation", { name: "Phân trang danh mục" });
  fireEvent.click(within(categoryPager).getByRole("button", { name: "Tiếp" }));
  fireEvent.click(await screen.findByRole("button", { name: "Quần áo · Áo" }));
  await waitFor(() => expect(mocks.search).toHaveBeenLastCalledWith("", 1, "cat-2"));
  expect(screen.getByText("Danh mục: Quần áo · Áo")).toBeInTheDocument();
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("12");
  fireEvent.click(screen.getByRole("button", { name: "Chọn danh mục" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm danh mục" }), { target: { value: "Quần" } });
  fireEvent.click(screen.getByRole("button", { name: "Tìm danh mục" }));
  await waitFor(() => expect(mocks.categories).toHaveBeenLastCalledWith("Quần", 1));
  fireEvent.click(screen.getByRole("button", { name: "Chưa phân loại" }));
  await waitFor(() => expect(mocks.search).toHaveBeenLastCalledWith("", 1, "uncategorized"));
});

it("shows category loading errors and allows retry", async () => {
  setup();
  await screen.findByRole("button", { name: /DEMO-1/ });
  fireEvent.click(screen.getByRole("button", { name: "Chọn danh mục" }));
  await screen.findByRole("button", { name: "Quần áo" });
  mocks.categories.mockRejectedValueOnce(new Error("Không tải được danh mục"));
  fireEvent.click(screen.getByRole("button", { name: "Tìm danh mục" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được danh mục");
  fireEvent.click(screen.getByRole("button", { name: "Thử lại danh mục" }));
  expect(await screen.findByRole("button", { name: "Quần áo" })).toBeInTheDocument();
});

it("summarizes loss and a decrease without calling it a profit", async () => {
  setup();
  mocks.calculate.mockResolvedValue({
    ...result,
    scenario: { ...amounts, grossProfit: "-100.00" },
    changes: { ...result.changes, grossProfit: { difference: "-4000100.00", percent: "-100.00" } },
  });
  fireEvent.click(await screen.findByRole("button", { name: /DEMO-1/ }));
  await screen.findByText("100 sản phẩm");
  fireEvent.click(screen.getByRole("button", { name: "Sao chép cơ sở sang kịch bản thay đổi" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Tính mô phỏng" }));
  const heading = await screen.findByText(/Lợi nhuận gộp giảm 4.000.100/);
  expect(heading.closest(".ps-result-highlight")).toHaveClass("loss");
  expect(screen.getByText(/ước tính lỗ gộp 100/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Xem bảng so sánh và cách tính"));
  expect(screen.getByRole("table")).toBeVisible();
});

it("does not apply an excessive forecast and warns when unit cost is zero", async () => {
  if (basis.forecast.status !== "READY") throw new Error("Missing forecast fixture");
  setup({
    ...basis, variant: { ...basis.variant, costPrice: "0.00" },
    forecast: { ...basis.forecast, totals: { d7: "1000000.01", d14: "1000001.00", d28: "1000002.00" } },
  });
  fireEvent.click(await screen.findByRole("button", { name: /DEMO-1/ }));
  expect(await screen.findByText(/Số dự báo vượt mức cho phép/)).toBeInTheDocument();
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("");
  expect(screen.getAllByText(/Giá vốn đang là 0đ/)).toHaveLength(2);
  fireEvent.change(screen.getByRole("combobox", { name: "Kỳ mô phỏng" }), { target: { value: "14" } });
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("");
});

it("applies zero and the maximum forecast, but clears it when the next period exceeds the limit", async () => {
  if (basis.forecast.status !== "READY") throw new Error("Missing forecast fixture");
  setup({ ...basis, forecast: { ...basis.forecast, totals: { d7: "0.00", d14: "1000000.00", d28: "1000000.01" } } });
  fireEvent.click(await screen.findByRole("button", { name: /DEMO-1/ }));
  expect(await screen.findByText("0 sản phẩm")).toBeInTheDocument();
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("0.00");
  fireEvent.change(screen.getByRole("combobox", { name: "Kỳ mô phỏng" }), { target: { value: "14" } });
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("1000000.00");
  fireEvent.change(screen.getByRole("combobox", { name: "Kỳ mô phỏng" }), { target: { value: "28" } });
  expect(screen.getByLabelText("Kịch bản cơ sở: Số lượng bán giả định")).toHaveValue("");
  expect(screen.getByText(/Số dự báo vượt mức cho phép/)).toBeInTheDocument();
});
