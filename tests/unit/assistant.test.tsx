import { StrictMode, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AssistantPage } from "@/pages/ai-insights/assistant-page";
import { AssistantWidget } from "@/pages/ai-insights/assistant-widget";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), create: vi.fn(), get: vi.fn(), send: vi.fn(), changeMetric: vi.fn(), breakdown: vi.fn(), itemCover: vi.fn(), interpret: vi.fn(), sendSku: vi.fn(), movement: vi.fn(), consent: vi.fn(), setConsent: vi.fn(),
  permissions: ["analytics.read", "finance.read"],
  owner: false,
}));
vi.mock("@/api/assistant", () => ({
  listConversations: mocks.list, createConversation: mocks.create, getConversation: mocks.get,
  sendQuestion: mocks.send, sendComparisonMetricChange: mocks.changeMetric, sendComparisonBreakdown: mocks.breakdown, sendPreviousItemCover: mocks.itemCover, interpretQuestion: mocks.interpret, sendSkuQuestion: mocks.sendSku,
  deleteConversation: vi.fn(), getOpenAiConsent: mocks.consent, setOpenAiConsent: mocks.setConsent,
}));
vi.mock("@/api/business-movement", () => ({ getBusinessMovement: mocks.movement }));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: (permission: string) => mocks.permissions.includes(permission), isOwner: mocks.owner }) }));

beforeEach(() => {
  vi.clearAllMocks(); mocks.permissions = ["analytics.read", "finance.read"]; mocks.owner = false;
  mocks.consent.mockResolvedValue({ enabled: true });
  mocks.interpret.mockResolvedValue({ kind: "top_sellers", hasPreviousRanking: false });
  mocks.list.mockResolvedValue({ items: [], page: 1, hasMore: false });
  mocks.movement.mockResolvedValue({ items: [{ id: "p", name: "Áo", variants: [{ id: "v", sku: "SKU" }] }] });
  mocks.create.mockResolvedValue({ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" });
  mocks.get.mockResolvedValue({ id: "c", messages: [] });
  mocks.send.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Doanh thu biến động?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Số liệu gốc.\n\nDiễn giải AI: **Doanh thu tăng.**", createdAt: "2026-04-27T00:00:01Z", evidence: {
      source: "POS", metric: "netRevenue", asOf: "2026-04-27T00:00:00Z",
      ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
      subject: { product: "Áo", productId: "p", sku: "SKU", variantId: "v" },
      current: "9007199254740993.00", previous: "9007199254740994.00", difference: "-1.00", percent: "-0.00",
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 1 },
    } },
  ] });
});

it("routes a natural comparison to the backend and shows its scope", async () => {
  mocks.interpret.mockResolvedValue({ kind: "comparison", comparison: { metric: "netRevenue", from: "2026-04-20", to: "2026-04-26", subjectType: "sku", subject: "SKU" } });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Doanh thu mã SKU tuần trước so với kỳ trước?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Doanh thu tăng.");
  expect(screen.getByText(/Doanh thu thuần của mã SKU \(Áo\)/)).toBeInTheDocument();
  expect(screen.getByText("20/4/26 – 26/4/26", { selector: "dd" })).toBeInTheDocument();
  expect(screen.getByText("13/4/26 – 19/4/26", { selector: "dd" })).toBeInTheDocument();
  expect(mocks.send).toHaveBeenCalledWith("c", expect.objectContaining({ metric: "netRevenue", subjectType: "sku", subject: "SKU" }));
  expect(screen.queryByLabelText("Loại câu hỏi")).not.toBeInTheDocument();
  expect(screen.getByText(/9\.007\.199\.254\.740\.993\s₫/)).toBeInTheDocument();
  expect(screen.getByText(/Giảm 1\s₫/)).toBeInTheDocument();
  expect(screen.getByText(/khoảng 0,00%/)).toBeInTheDocument();
  expect(screen.getByText(/Một số dữ liệu chưa đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/Dòng trả hàng thiếu thông tin giá vốn liên kết: 1/)).toBeInTheDocument();
  expect(screen.queryByText("Số liệu gốc.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sửa câu hỏi" }));
  expect(screen.getByLabelText("Câu hỏi")).toHaveValue("Doanh thu biến động?");
});

it("changes the comparison metric while showing the original scope and fresh-data warning", async () => {
  mocks.interpret.mockResolvedValueOnce({ kind: "comparison", comparison: { metric: "netRevenue", from: "2026-04-20", to: "2026-04-26", subjectType: "sku", subject: "SKU" } })
    .mockResolvedValueOnce({ kind: "change_comparison_metric", metric: "grossProfit", hasPreviousComparison: true, previousMessageId: "a" });
  mocks.changeMetric.mockResolvedValue({ messages: [
    { id: "u2", role: "user", content: "Còn lợi nhuận gộp thì sao?", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "Lợi nhuận gộp.", createdAt: "2026-04-27T00:00:03Z", evidence: {
      source: "POS", metric: "grossProfit", asOf: "2026-04-27T00:01:00Z",
      ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
      subject: { product: "Áo", productId: "p", sku: "SKU", variantId: "v" },
      current: "20.00", previous: "40.00", difference: "-20.00", percent: "-50.00",
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 1 },
      followUp: { operation: "change_comparison_metric", previousMessageId: "a" },
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Doanh thu mã SKU tuần trước so với kỳ trước?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Doanh thu tăng.");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Còn lợi nhuận gộp thì sao?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText(/Lợi nhuận gộp của mã SKU \(Áo\)/)).toBeInTheDocument();
  expect(mocks.changeMetric).toHaveBeenCalledWith("c", "Còn lợi nhuận gộp thì sao?", "grossProfit", "a");
  expect(screen.getByText(/Giữ nguyên phạm vi và khoảng thời gian trước/)).toBeInTheDocument();
  expect(screen.getByText(/chưa trừ chi phí vận hành/)).toBeInTheDocument();
  expect(screen.getAllByText("20/4/26 – 26/4/26", { selector: "dd" })).toHaveLength(2);
});

it("requests a compatible comparison before switching metrics", async () => {
  mocks.interpret.mockResolvedValue({ kind: "change_comparison_metric", metric: "grossProfit", hasPreviousComparison: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Còn lợi nhuận gộp thì sao?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("một câu so sánh doanh thu hoặc lợi nhuận gộp");
  expect(mocks.changeMetric).not.toHaveBeenCalled();
});

it("shows a breakdown with periods, limit, warnings and exact amounts", async () => {
  mocks.interpret.mockResolvedValueOnce({ kind: "comparison", comparison: { metric: "netRevenue", from: "2026-04-20", to: "2026-04-26", subjectType: "store" } })
    .mockResolvedValueOnce({ kind: "comparison_breakdown", level: "product", hasPreviousComparisonBreakdown: true, previousMessageId: "a" });
  mocks.breakdown.mockResolvedValue({ messages: [
    { id: "u2", role: "user", content: "Xem từng sản phẩm", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "Chi tiết", createdAt: "2026-04-27T00:00:03Z", evidence: {
      type: "comparison_breakdown_v1", source: "POS", metric: "netRevenue", level: "product", asOf: "2026-04-27T00:01:00Z",
      ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
      subject: null, total: 21, items: [{ id: "p", name: "Áo", current: "9007199254740993.00", previous: "20.00", difference: "9007199254740973.00", percent: null }],
      warnings: { excludedSaleItems: 1, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      followUp: { operation: "comparison_breakdown", previousMessageId: "a" },
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "So sánh doanh thu cửa hàng" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Doanh thu tăng.");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Xem từng sản phẩm" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("heading", { name: "Doanh thu thuần theo từng sản phẩm" })).toBeInTheDocument();
  expect(mocks.breakdown).toHaveBeenCalledWith("c", "Xem từng sản phẩm", "product", "a");
  expect(screen.getByText(/Hiển thị 1 trên 21/)).toBeInTheDocument();
  expect(screen.getByText(/Còn 20 sản phẩm chưa hiển thị/)).toBeInTheDocument();
  expect(screen.getByText(/Chênh lệch: 9\.007\.199\.254\.740\.973/)).toBeInTheDocument();
  expect(screen.getAllByText(/Một số dữ liệu chưa đầy đủ/)).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Xem Hiệu quả sản phẩm" })).toHaveAttribute("href", "/app/product-performance");
});

it("asks for an appropriate previous comparison before a breakdown", async () => {
  mocks.interpret.mockResolvedValue({ kind: "comparison_breakdown", level: "sku", hasPreviousComparisonBreakdown: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Xem từng mã hàng" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("so sánh một sản phẩm");
  expect(mocks.breakdown).not.toHaveBeenCalled();
});

it("reopens an empty SKU breakdown and shows incomplete-data cautions", async () => {
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [{
    id: "a", role: "assistant", content: "Chi tiết đã lưu.", evidence: {
      type: "comparison_breakdown_v1", source: "POS", metric: "grossProfit", level: "sku", asOf: "2026-04-27T00:00:00Z",
      ranges: { current: { from: "2026-04-21", to: "2026-04-27", dayCount: 7 }, previous: { from: "2026-04-14", to: "2026-04-20", dayCount: 7 } },
      subject: { product: "Áo", productId: "p" }, total: 0, items: [],
      warnings: { excludedSaleItems: 1, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      followUp: { operation: "comparison_breakdown", previousMessageId: "old" },
    },
  }] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText("Chưa ghi nhận mã hàng có phát sinh trong hai kỳ.")).toBeInTheDocument();
  expect(screen.getByText(/Kỳ đang xem chưa kết thúc/)).toBeInTheDocument();
  expect(screen.getByText(/Một số dữ liệu chưa đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/không phải lợi nhuận ròng/)).toBeInTheDocument();
});

it("keeps earlier answers readable and highlights incomplete periods and gross profit limits", async () => {
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [{
    id: "a", role: "assistant", content: "Câu trả lời trước đây.", evidence: {
      metric: "grossProfit", subject: null, asOf: "2026-04-27T00:00:00Z",
      ranges: { current: { from: "2026-04-21", to: "2026-04-27" }, previous: { from: "2026-04-14", to: "2026-04-20" } },
      current: "0.00", previous: "0.00", difference: "0.00", percent: null,
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    },
  }] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  await screen.findByText("Câu trả lời trước đây.");
  expect(screen.getByText("Không đổi")).toBeInTheDocument();
  expect(screen.getByText(/chưa trừ chi phí vận hành/)).toBeInTheDocument();
  expect(screen.getByText(/Kỳ đang xem chưa kết thúc/)).toBeInTheDocument();
  expect(screen.getByText(/Không thể tính tỷ lệ phần trăm/)).toBeInTheDocument();
  expect(screen.getByText("Câu trả lời trước đây.")).not.toBeVisible();
  fireEvent.click(screen.getByText("Xem nội dung đã lưu"));
  expect(screen.getByText("Câu trả lời trước đây.")).toBeVisible();
  expect(screen.queryByText(/Một số dữ liệu chưa đầy đủ/)).not.toBeInTheDocument();
});

it("distinguishes unavailable, empty and incomplete results in saved conversations", async () => {
  const period = { from: "2026-04-20", to: "2026-04-26" };
  const warnings = { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 };
  const ranking = { type: "sku_stockout_v1", period, salesAsOf: "2026-04-27T00:00:00Z", warnings, rankingCount: 5, items: [] };
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [
    { id: "a1", role: "assistant", content: "Kết quả cũ", evidence: { ...ranking, riskState: "unavailable" } },
    { id: "a2", role: "assistant", content: "Kết quả cũ", evidence: { ...ranking, riskState: "ready" } },
    { id: "a3", role: "assistant", content: "Kết quả cũ", evidence: {
      type: "top_sellers_overstock_v1", state: "partial", period, salesAsOf: "2026-04-27T00:00:00Z", warnings,
      rankingCount: 5, totalSku: 0, items: [], dataAsOf: "2026-04-26", finishedAt: "2026-04-27T00:00:00Z",
    } },
    { id: "a4", role: "assistant", content: "Kết quả cũ", evidence: {
      type: "slow_expiry_v1", state: "unavailable", dataAsOf: null, finishedAt: null, warningCodes: null, totalSku: null, items: [],
    } },
    { id: "a5", role: "assistant", content: "Kết quả cũ chưa rõ nguồn.", evidence: { ...ranking, rankingCount: undefined } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText("Chưa có dự báo tồn kho mới để xác định mã nào sắp hết hàng.")).toBeInTheDocument();
  expect(screen.getByText("Chưa phát hiện mã bán chạy nào có nguy cơ sắp hết hàng cao.")).toBeInTheDocument();
  expect(screen.getByText("Trong 5 mã bán chạy, chưa thấy mã nào đang có lượng hàng tồn cao.")).toBeInTheDocument();
  expect(screen.getByText(/Dữ liệu bán hoặc tồn kho có thể chưa đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/Thông tin tồn kho hoặc dự báo chưa sẵn sàng hoặc đã cũ/)).toBeInTheDocument();
  expect(screen.getByText("Kết quả cũ chưa rõ nguồn.")).toBeInTheDocument();
  expect(screen.getByText("Câu trả lời đã lưu không có thông tin trạng thái dự báo.")).toBeInTheDocument();
  expect(screen.getAllByText(/Các mã bán chạy cần ưu tiên kiểm tra/)).toHaveLength(3);
});

it("asks the user to clarify an incomplete comparison without querying business data", async () => {
  mocks.interpret.mockResolvedValue({ kind: "clarify_comparison", clarification: "Hãy hỏi lại và cho biết khoảng thời gian muốn xem." });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Doanh thu thay đổi thế nào?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("khoảng thời gian");
  expect(screen.getByLabelText("Câu hỏi")).toHaveValue("Doanh thu thay đổi thế nào?");
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});

it("requires a displayed list before asking which of its SKUs have overstock alerts", async () => {
  mocks.interpret.mockResolvedValue({ kind: "previous_overstock", hasPreviousRanking: false, hasPreviousSkuList: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Trong số đó mã nào tồn nhiều?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Hãy xem một danh sách mã hàng");
  expect(mocks.sendSku).not.toHaveBeenCalled();
});

it("sends only the previous message ID and displays partial previous-overstock results", async () => {
  const question = "Trong số đó mã nào tồn nhiều?";
  mocks.interpret.mockResolvedValue({ kind: "previous_overstock", hasPreviousRanking: false, hasPreviousSkuList: true, previousMessageId: "previous" });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: question, createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Kết quả chưa đầy đủ.", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "previous_overstock_v1", state: "partial", sourceCount: 3, sourcePartial: true,
      sourceTruncated: true, sourceInventoryCaution: true, dataAsOf: "2026-04-26",
      finishedAt: "2026-04-27T00:00:00Z", warningCodes: [], skippedSku: 1, totalSku: 0,
      items: [], analysis: "previous_overstock",
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText(/chưa đủ dữ liệu để xác nhận đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/Chưa đối chiếu được 1 mã/)).toBeInTheDocument();
  expect(screen.getByText(/không mở rộng sang mã khác/)).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenCalledWith("c", question, "previous_overstock", "previous");
});

it("displays ranked restock and overstock together with incomplete-data cautions", async () => {
  const question = "Mã bán chạy nào cần nhập nhưng tồn nhiều?";
  mocks.interpret.mockResolvedValue({ kind: "top_sellers_composed", filters: ["pending_restock", "overstock"], hasPreviousRanking: false });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: question, createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Kết quả", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_restock_overstock_v1", state: "partial", sourceCount: 5, sourcePartial: false,
      sourceTruncated: false, sourceInventoryCaution: true, dataAsOf: "2026-04-26",
      finishedAt: "2026-04-27T00:00:00Z", warningCodes: [], totalSku: 1, skippedSku: 1,
      period: { from: "2026-04-20", to: "2026-04-26" }, salesAsOf: "2026-04-27T00:00:00Z",
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      items: [{ variantId: "v", product: "Áo", sku: "SKU", unitsSold: 20, urgency: "HIGH", suggestedQty: 4,
        orderByDate: null, stockoutDate: null, supplierName: null, cautions: ["OVERSTOCK"],
        stockAvailable: 100, daysOfCover: 80, thresholdDays: 60, possibleStockoutBias: true }],
      analysis: "top_sellers_composed",
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText(/vừa có gợi ý nhập vừa có cảnh báo tồn nhiều/)).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenCalledWith("c", question, "top_sellers_composed", undefined, ["pending_restock", "overstock"]);
  expect(screen.getByText(/Gợi ý nhập: 4/)).toBeInTheDocument();
  expect(screen.getByText(/Tồn có thể bán khi phân tích: 100/)).toBeInTheDocument();
  expect(screen.getByText(/Chưa đối chiếu được 1 mã/)).toBeInTheDocument();
  expect(screen.getByText(/Gợi ý nhập và cảnh báo tồn nhiều cần được đối chiếu/)).toBeInTheDocument();
});

it("reopens unavailable restock and overstock without concluding there are no matches", async () => {
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [{
    id: "a", role: "assistant", content: "Chưa thể đối chiếu.", evidence: {
      type: "top_sellers_restock_overstock_v1", state: "unavailable", sourceCount: 5, sourcePartial: false,
      sourceTruncated: false, sourceInventoryCaution: true, dataAsOf: null, finishedAt: null, warningCodes: null,
      skippedSku: null, totalSku: null, items: [], period: { from: "2026-04-20", to: "2026-04-26" },
      salesAsOf: "2026-04-27T00:00:00Z", warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      analysis: "top_sellers_composed",
    },
  }] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText(/Thông tin tồn kho hoặc dự báo chưa sẵn sàng hoặc đã cũ/)).toBeInTheDocument();
  expect(screen.queryByText(/chưa tìm thấy mã vừa có gợi ý nhập/)).not.toBeInTheDocument();
});

it("combines restock and near-expiry data and warns before importing", async () => {
  const question = "Mã bán chạy nào cần nhập thêm nhưng có lô sắp hết hạn?";
  mocks.interpret.mockResolvedValue({ kind: "top_sellers_composed", filters: ["pending_restock", "near_expiry"], hasPreviousRanking: false });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: question, createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Kết quả", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_restock_near_expiry_v1", state: "partial", sourceCount: 5, sourcePartial: true,
      sourceTruncated: false, sourceInventoryCaution: true, dataAsOf: "2026-04-26",
      finishedAt: "2026-04-27T00:00:00Z", warningCodes: [], totalSku: 1,
      period: { from: "2026-04-20", to: "2026-04-26" }, salesAsOf: "2026-04-27T00:00:00Z",
      inventoryAsOf: "2026-04-27T01:00:00Z", inventoryDay: "2026-04-27",
      warnings: { excludedSaleItems: 1, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      items: [{ variantId: "v", product: "Áo", sku: "SKU", unitsSold: 20, urgency: "HIGH", suggestedQty: 4,
        orderByDate: null, stockoutDate: null, supplierName: null, cautions: [], totalLots: 6,
        lots: [{ id: "l", lotNumber: "L1", expirationDate: "2026-04-30", status: "QUARANTINED", quantity: 8, damaged: 2, alertDays: 30 }] }],
      analysis: "top_sellers_composed",
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText(/vừa có gợi ý nhập vừa có lô sắp hết hạn/)).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenCalledWith("c", question, "top_sellers_composed", undefined, ["pending_restock", "near_expiry"]);
  expect(screen.getByText(/Gợi ý nhập: 4/)).toBeInTheDocument();
  expect(screen.getByText(/Lô L1.*Cách ly/)).toBeInTheDocument();
  expect(screen.getByText(/Còn 5 lô chưa hiển thị/)).toBeInTheDocument();
  expect(screen.getByText(/Kiểm tra lô gần hạn và tồn thực tế trước khi quyết định nhập thêm/)).toBeInTheDocument();
  expect(screen.getByText(/Tồn và hạn lô được đọc lúc/)).toBeInTheDocument();
});

it("reopens unavailable combined results without claiming a match or empty result", async () => {
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [{
    id: "a", role: "assistant", content: "Chưa thể đối chiếu.", evidence: {
      type: "top_sellers_restock_near_expiry_v1", state: "unavailable", sourceCount: 5, sourcePartial: false,
      sourceTruncated: false, sourceInventoryCaution: true, dataAsOf: null, finishedAt: null, warningCodes: null,
      totalSku: null, items: [], period: { from: "2026-04-20", to: "2026-04-26" },
      inventoryAsOf: null, inventoryDay: null, salesAsOf: "2026-04-27T00:00:00Z",
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      analysis: "top_sellers_composed",
    },
  }] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText(/Thông tin tồn kho hoặc dự báo chưa sẵn sàng hoặc đã cũ/)).toBeInTheDocument();
  expect(screen.getByText(/Tồn và hạn lô được đọc lúc chưa rõ/)).toBeInTheDocument();
  expect(screen.queryByText(/chưa tìm thấy mã vừa có gợi ý nhập/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Kiểm tra lô gần hạn và tồn thực tế trước/)).not.toBeInTheDocument();
});

it("shows ranked restock suggestions with sales scope and stock cautions", async () => {
  mocks.interpret.mockResolvedValue({ kind: "top_sellers_restock", hasPreviousRanking: false });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Mã bán chạy nào có gợi ý nhập?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Gợi ý nhập", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_restock_v1", state: "partial", sourceCount: 5, sourcePartial: true,
      sourceTruncated: false, sourceInventoryCaution: false, dataAsOf: "2026-04-26",
      finishedAt: "2026-04-27T00:00:00Z", warningCodes: ["FORECAST_OVERDUE_PO"], totalSku: 1,
      period: { from: "2026-04-20", to: "2026-04-26" }, salesAsOf: "2026-04-27T00:00:00Z",
      warnings: { excludedSaleItems: 1, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      items: [{ variantId: "v", product: "Áo", sku: "SKU", unitsSold: 20, urgency: "HIGH", suggestedQty: 4,
        orderByDate: null, stockoutDate: null, supplierName: null, cautions: ["EXPIRATION_RISK"] }],
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mã bán chạy nào có gợi ý nhập?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText(/Trong 5 mã bán chạy, có 1 mã/)).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenCalledWith("c", "Mã bán chạy nào có gợi ý nhập?", "top_sellers_restock", undefined);
  expect(screen.getByText(/Chỉ xét tối đa 5 mã bán chạy nhất/)).toBeInTheDocument();
  expect(screen.getByText(/Đã bán: 20/)).toBeInTheDocument();
  expect(screen.getByText(/Giữ thứ tự bán chạy, không xếp theo mức khẩn cấp/)).toBeInTheDocument();
  expect(screen.getByText(/Danh sách trước hoặc dữ liệu dự báo có thể chưa đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/đơn hàng đang về đã quá hạn/)).toBeInTheDocument();
  expect(screen.getByText(/Đang có cảnh báo: nguy cơ hết hạn/)).toBeInTheDocument();
});

it("reopens unavailable ranked restock without claiming there are no suggestions", async () => {
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [{
    id: "a", role: "assistant", content: "Chưa thể đối chiếu.", evidence: {
      type: "top_sellers_restock_v1", state: "unavailable", sourceCount: 5, sourcePartial: false,
      sourceTruncated: false, sourceInventoryCaution: false, dataAsOf: null, finishedAt: null, warningCodes: null,
      totalSku: null, items: [], period: { from: "2026-04-20", to: "2026-04-26" },
      salesAsOf: "2026-04-27T00:00:00Z", warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      analysis: "top_sellers_restock",
    },
  }] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText(/Thông tin tồn kho hoặc dự báo chưa sẵn sàng hoặc đã cũ/)).toBeInTheDocument();
  expect(screen.getByText(/không thể kết luận có hay không có mã cần nhập/)).toBeInTheDocument();
  expect(screen.queryByText(/chưa tìm thấy gợi ý nhập đang chờ/)).not.toBeInTheDocument();
});

it("shows action guidance with its displayed scope and historical-data cautions", async () => {
  mocks.interpret.mockResolvedValueOnce({ kind: "top_sellers", hasPreviousRanking: false })
    .mockResolvedValueOnce({ kind: "previous_actions", hasPreviousActions: true, previousMessageId: "a" });
  mocks.sendSku.mockResolvedValueOnce({ messages: [
    { id: "u", role: "user", content: "Mặt hàng nào bán chạy?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Danh sách", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_v1", period: { from: "2026-04-20", to: "2026-04-26" }, salesAsOf: "2026-04-27T00:00:00Z",
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      items: [{ variantId: "v", product: "Áo", sku: "SKU", unitsSold: 1 }],
    } },
  ] }).mockResolvedValueOnce({ messages: [
    { id: "u2", role: "user", content: "Vậy nên làm gì?", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "Gợi ý", createdAt: "2026-04-27T00:00:03Z", evidence: {
      type: "previous_actions_v1", items: [{ variantId: "v", product: "Áo", sku: "SKU" }],
      conditions: ["Cảnh báo tồn nhiều"], actions: ["Kiểm tra tồn thực tế."],
      sourceTimes: [{ label: "Phân tích tồn kho hoàn tất", at: null }], sourcePartial: true, sourceTruncated: true,
      sourceInventoryCaution: true, overdueOrders: true, possibleStockoutBias: true,
      followUp: { operation: "previous_actions", previousMessageId: "a" },
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mặt hàng nào bán chạy?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Bán nhiều nhất");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Vậy nên làm gì?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText("Kiểm tra tồn thực tế.")).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenLastCalledWith("c", "Vậy nên làm gì?", "previous_actions", "a");
  expect(screen.getByText(/Chỉ áp dụng cho 1 mã đã hiển thị: Áo \(SKU\)/)).toBeInTheDocument();
  expect(screen.getByText(/Tình trạng thực tế có thể đã thay đổi/)).toBeInTheDocument();
  expect(screen.getByText(/Kết quả trước có thể chưa đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/Danh sách trước chưa hiển thị toàn bộ/)).toBeInTheDocument();
  expect(screen.getByText(/Phân tích tồn kho hoàn tất: chưa rõ/)).toBeInTheDocument();
  expect(screen.getByText(/đơn hàng đang về quá hạn/)).toBeInTheDocument();
  expect(screen.getByText(/mức bán thấp hơn nhu cầu thực/)).toBeInTheDocument();
});

it("requires a compatible previous result for action guidance", async () => {
  mocks.interpret.mockResolvedValue({ kind: "previous_actions", hasPreviousActions: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Vậy nên làm gì?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("danh sách có cảnh báo tồn kho hoặc gợi ý nhập");
  expect(mocks.sendSku).not.toHaveBeenCalled();
});

it("reopens saved action guidance with separate source times", async () => {
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [{
    id: "a", role: "assistant", content: "Gợi ý đã lưu.", evidence: {
      type: "previous_actions_v1", items: [{ variantId: "v", product: "Áo", sku: "SKU" }],
      conditions: ["Cảnh báo tồn nhiều", "Có lô sắp hết hạn"], actions: ["Kiểm tra tồn.", "Kiểm tra lô."],
      sourceTimes: [{ label: "Phân tích tồn kho hoàn tất", at: "2026-04-27T00:00:00Z" },
        { label: "Tồn lô được đọc", at: "2026-04-27T01:00:00Z" }],
      sourcePartial: false, sourceTruncated: false,
      sourceInventoryCaution: true, overdueOrders: false, possibleStockoutBias: false,
      followUp: { operation: "previous_actions", previousMessageId: "old" },
    },
  }] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText("Kiểm tra lô.")).toBeInTheDocument();
  expect(screen.getByText(/Phân tích tồn kho hoàn tất:.*Tồn lô được đọc:/)).toBeInTheDocument();
  expect(screen.getByText(/không tự đặt hàng hay xử lý hàng/)).toBeInTheDocument();
});

it("answers a question about a displayed item and shows estimate cautions", async () => {
  const warnings = { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 };
  mocks.interpret.mockResolvedValueOnce({ kind: "top_sellers", hasPreviousRanking: false })
    .mockResolvedValueOnce({ kind: "previous_item_cover", position: 1, hasPreviousSkuList: true, previousMessageId: "a" });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Mặt hàng nào bán chạy?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Danh sách", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_v1", analysis: "top_sellers", period: { from: "2026-04-20", to: "2026-04-26" },
      salesAsOf: "2026-04-27T00:00:00Z", warnings, items: [{ variantId: "v", product: "Áo", sku: "SKU", unitsSold: 20 }],
    } },
  ] });
  mocks.itemCover.mockResolvedValue({ messages: [
    { id: "u2", role: "user", content: "Mã đầu tiên còn bao nhiêu ngày bán?", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "Ước tính", createdAt: "2026-04-27T00:00:03Z", evidence: {
      type: "previous_item_cover_v1", state: "partial", item: { variantId: "v", product: "Áo", sku: "SKU" }, position: 1,
      stockAvailable: 100, daysOfCover: 2.5, possibleStockoutBias: true, dataAsOf: "2026-04-26",
      finishedAt: "2026-04-27T00:00:00Z", sourcePartial: true, sourceTruncated: true, sourceInventoryCaution: false,
      warningCodes: [], followUp: { operation: "previous_item_cover", previousMessageId: "a" },
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mặt hàng nào bán chạy?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("20 đã bán");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mã đầu tiên còn bao nhiêu ngày bán?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText("2,5 ngày")).toBeInTheDocument();
  expect(screen.getByText(/có thể từng hết hàng/)).toBeInTheDocument();
  expect(screen.getByText(/Danh sách trước chưa hiển thị toàn bộ/)).toBeInTheDocument();
  expect(mocks.itemCover).toHaveBeenCalledWith("c", "Mã đầu tiên còn bao nhiêu ngày bán?", 1, "a");
});

it("requires a previous list before asking about its item", async () => {
  mocks.interpret.mockResolvedValue({ kind: "previous_item_cover", position: 1, hasPreviousSkuList: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mã đầu tiên còn bao nhiêu ngày bán?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("danh sách mã hàng");
  expect(mocks.itemCover).not.toHaveBeenCalled();
});

it("reopens unavailable coverage without treating it as zero", async () => {
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [{
    id: "a", role: "assistant", content: "Chưa đủ dữ liệu.", evidence: {
      type: "previous_item_cover_v1", state: "unavailable", item: { variantId: "v", product: "Áo", sku: "SKU" }, position: 1,
      stockAvailable: null, daysOfCover: null, possibleStockoutBias: null, dataAsOf: null, finishedAt: null,
      sourcePartial: false, sourceTruncated: false, sourceInventoryCaution: false, warningCodes: null,
      followUp: { operation: "previous_item_cover", previousMessageId: "old" },
    },
  }] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText(/Chưa có thông tin đủ mới và phù hợp để ước tính/)).toBeInTheDocument();
  expect(screen.queryByText("0 ngày")).not.toBeInTheDocument();
});

it("compares the displayed SKUs and distinguishes missing data from zero", async () => {
  const warnings = { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 };
  mocks.interpret.mockResolvedValueOnce({ kind: "top_sellers", hasPreviousRanking: false })
    .mockResolvedValueOnce({ kind: "compare_previous_sku_sales", hasComparableRanking: true, previousMessageId: "a" });
  mocks.sendSku.mockResolvedValueOnce({ messages: [
    { id: "u", role: "user", content: "Mặt hàng nào bán chạy?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Danh sách", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_v1", analysis: "top_sellers", period: { from: "2026-04-20", to: "2026-04-26" },
      salesAsOf: "2026-04-27T00:00:00Z", warnings, items: [{ variantId: "v", product: "Áo", sku: "SKU", unitsSold: 20 }],
    } },
  ] }).mockResolvedValueOnce({ messages: [
    { id: "u2", role: "user", content: "Số bán các mã đó so với kỳ liền trước?", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "So sánh", createdAt: "2026-04-27T00:00:03Z", evidence: {
      type: "sku_sales_comparison_v1", sourceSalesAsOf: "2026-04-27T00:00:00Z", salesAsOf: "2026-04-27T01:00:00Z",
      ranges: { current: { from: "2026-04-20", to: "2026-04-26", dayCount: 7 }, previous: { from: "2026-04-13", to: "2026-04-19", dayCount: 7 } },
      sourceWarnings: { ...warnings, excludedSaleItems: 1 }, warnings,
      items: [{ variantId: "v", product: "Áo", sku: "SKU", current: 1, previous: 0, difference: 1 },
        { variantId: "v2", product: "Quần", sku: "SKU2", current: null, previous: null, difference: null }],
      followUp: { operation: "compare_previous_sku_sales", previousMessageId: "a" },
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mặt hàng nào bán chạy?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("20 đã bán");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Số bán các mã đó so với kỳ liền trước?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText(/Đã bán 1 so với 0 kỳ trước.*Tăng 1/)).toBeInTheDocument();
  expect(screen.getByText("Không còn đủ dữ liệu đối chiếu cho mã này.")).toBeInTheDocument();
  expect(screen.getByText(/danh sách hoặc số liệu so sánh có thể chưa đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/Chỉ so sánh các mã đã hiển thị, không xếp hạng lại/)).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenLastCalledWith("c", "Số bán các mã đó so với kỳ liền trước?", "compare_previous_sku_sales", "a");
});

it("requires a compatible ranking before comparing SKU sales", async () => {
  mocks.interpret.mockResolvedValue({ kind: "compare_previous_sku_sales", hasComparableRanking: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Số bán các mã đó so với kỳ trước?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("danh sách bán chạy có dữ liệu");
  expect(mocks.sendSku).not.toHaveBeenCalled();
});

it("answers immediately and supports a follow-up without sending result data", async () => {
  const ranking = {
    type: "top_sellers_v1", analysis: "top_sellers", period: { from: "2026-04-20", to: "2026-04-26" }, salesAsOf: "2026-04-27T00:00:00Z",
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    items: [{ variantId: "v", product: "Áo", sku: "SKU", unitsSold: 20 }],
  };
  mocks.sendSku.mockResolvedValueOnce({ messages: [
    { id: "u", role: "user", content: "Mặt hàng nào bán chạy?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Các mã bán nhiều nhất.", evidence: ranking, createdAt: "2026-04-27T00:00:01Z" },
  ] }).mockResolvedValueOnce({ messages: [
    { id: "u2", role: "user", content: "Trong số đó có mã nào sắp hết?", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "Có cảnh báo.", evidence: {
      ...ranking, type: "sku_stockout_v1", analysis: "previous_stockout", rankingCount: 1, riskState: "ready",
      items: [{ ...ranking.items[0], severity: "HIGH", stockoutDate: null }],
    }, createdAt: "2026-04-27T00:00:03Z" },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mặt hàng nào bán chạy?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("20 đã bán");
  expect(screen.getByText(/5 mã hàng bán chạy nhất/)).toBeInTheDocument();
  expect(screen.getByText("20/4/26 – 26/4/26")).toBeInTheDocument();
  expect(mocks.interpret).toHaveBeenCalledWith("Mặt hàng nào bán chạy?", undefined);
  expect(mocks.sendSku).toHaveBeenCalledWith("c", "Mặt hàng nào bán chạy?", "top_sellers", undefined);
  mocks.interpret.mockResolvedValue({ kind: "previous_stockout", hasPreviousRanking: true, previousMessageId: "a" });
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Trong số đó có mã nào sắp hết?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Nguy cơ cao");
  expect(screen.getByText(/danh sách bán chạy vừa xem/)).toBeInTheDocument();
  expect(mocks.interpret).toHaveBeenLastCalledWith("Trong số đó có mã nào sắp hết?", "c");
  expect(mocks.sendSku).toHaveBeenLastCalledWith("c", "Trong số đó có mã nào sắp hết?", "previous_stockout", "a");
  fireEvent.click(screen.getAllByRole("button", { name: "Sửa câu hỏi" })[0]);
  expect(screen.getByLabelText("Câu hỏi")).toHaveValue("Mặt hàng nào bán chạy?");
  expect(screen.getByLabelText("Câu hỏi")).toHaveFocus();
});

it("submits and displays the composed answer with both sources and incomplete-data warnings", async () => {
  mocks.interpret.mockResolvedValue({ kind: "top_sellers_composed", filters: ["overstock", "near_expiry"], hasPreviousRanking: false });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Mã bán chạy nào tồn nhiều và sắp hết hạn?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Kết quả", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_overstock_near_expiry_v1", state: "partial", rankingCount: 5, totalSku: 1,
      period: { from: "2026-04-20", to: "2026-04-26" }, salesAsOf: "2026-04-27T00:00:00Z",
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
      dataAsOf: "2026-04-26", finishedAt: "2026-04-27T00:00:00Z", inventoryAsOf: "2026-04-27T01:00:00Z", inventoryDay: "2026-04-27",
      items: [{ variantId: "v", product: "Sản phẩm mẫu", sku: "SKU", unitsSold: 20, stockAvailable: 100, daysOfCover: 80, thresholdDays: 60, totalLots: 2,
        lots: [{ id: "l", lotNumber: "L1", expirationDate: "2026-04-30", status: "QUARANTINED", quantity: 8, damaged: 2, alertDays: 30 }] }],
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mã bán chạy nào tồn nhiều và sắp hết hạn?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText("Sản phẩm mẫu")).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenCalledWith("c", "Mã bán chạy nào tồn nhiều và sắp hết hạn?", "top_sellers_composed", undefined, ["overstock", "near_expiry"]);
  expect(screen.getByText("Trong 5 mã bán chạy, có 1 mã vừa còn nhiều hàng trong kho vừa có lô sắp hết hạn.")).toBeInTheDocument();
  expect(screen.getByText(/Tồn có thể bán khi phân tích: 100/)).toBeInTheDocument();
  expect(screen.getByText(/Lô L1.*Cách ly/)).toBeInTheDocument();
  expect(screen.getByText(/Còn 1 lô chưa hiển thị/)).toBeInTheDocument();
  expect(screen.getByText(/Dữ liệu bán hoặc tồn kho có thể chưa đầy đủ/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Nguồn và thời điểm dữ liệu"));
  expect(screen.getByText(/Tồn và hạn lô được đọc lúc/)).toBeInTheDocument();
  expect(screen.getByText(/Dữ liệu cảnh báo đến hết/)).toBeInTheDocument();
});

it("keeps unavailable and empty composed answers distinct in saved conversations", async () => {
  const common = {
    type: "top_sellers_overstock_near_expiry_v1", rankingCount: 5, items: [],
    period: { from: "2026-04-20", to: "2026-04-26" }, salesAsOf: "2026-04-27T00:00:00Z",
    warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
  };
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [
    { id: "a1", role: "assistant", content: "Kết quả", evidence: { ...common, state: "unavailable", totalSku: null } },
    { id: "a2", role: "assistant", content: "Kết quả", evidence: { ...common, state: "ready", totalSku: 0 } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText("Chưa có dữ liệu tồn kho mới để kiểm tra các mã bán chạy.")).toBeInTheDocument();
  expect(screen.getByText("Trong 5 mã bán chạy, chưa thấy mã nào vừa còn nhiều hàng trong kho vừa có lô sắp hết hạn.")).toBeInTheDocument();
  expect(screen.getAllByText(/Trong nhóm 5 mã bán chạy nhất/)).toHaveLength(2);
});

it("repeats a previous sales query for another period and distinguishes current stock warnings", async () => {
  const common = {
    type: "top_sellers_overstock_v1", analysis: "top_sellers_overstock", state: "ready", rankingCount: 1, totalSku: 1,
    salesAsOf: "2026-04-27T00:00:00Z", warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 },
    dataAsOf: "2026-04-26", finishedAt: "2026-04-27T00:00:00Z",
    items: [{ variantId: "v", product: "Áo", sku: "SKU", unitsSold: 20, stockAvailable: 100, daysOfCover: 80, thresholdDays: 60 }],
  };
  mocks.interpret.mockResolvedValueOnce({ kind: "top_sellers_overstock" }).mockResolvedValueOnce({
    kind: "change_sku_period", periodChange: "last_week", hasPreviousSkuQuery: true, previousMessageId: "a1",
  });
  mocks.sendSku.mockResolvedValueOnce({ messages: [
    { id: "u1", role: "user", content: "Mã nào bán chạy và tồn nhiều?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a1", role: "assistant", content: "Kết quả", createdAt: "2026-04-27T00:00:01Z", evidence: { ...common, period: { from: "2026-04-20", to: "2026-04-26" } } },
  ] }).mockResolvedValueOnce({ messages: [
    { id: "u2", role: "user", content: "Cùng câu đó tuần trước?", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "Kết quả", createdAt: "2026-04-27T00:00:03Z", evidence: {
      ...common, period: { from: "2026-04-13", to: "2026-04-19" },
      followUp: { operation: "change_period", periodChange: "last_week", previousMessageId: "a1" },
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mã nào bán chạy và tồn nhiều?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("20/4/26 – 26/4/26");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Cùng câu đó tuần trước?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("13/4/26 – 19/4/26");
  expect(mocks.sendSku).toHaveBeenLastCalledWith("c", "Cùng câu đó tuần trước?", "change_sku_period", "a1", undefined, "last_week");
  expect(screen.getByText(/khoảng thời gian đã chọn, mã nào đang có lượng hàng tồn cao/)).toBeInTheDocument();
  expect(screen.getByText(/không phải trong khoảng thời gian bán đã chọn/)).toBeInTheDocument();
});

it("filters only previously displayed items for near-expiry lots and shows list limits", async () => {
  mocks.interpret.mockResolvedValue({ kind: "previous_near_expiry", hasPreviousSkuList: true, previousMessageId: "a1" });
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:00Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages: [] });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Trong số đó có mã nào sắp hết hạn?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Kết quả", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "previous_near_expiry_v1", analysis: "previous_near_expiry", state: "partial", sourceCount: 2, sourcePartial: true, sourceTruncated: true, sourceInventoryCaution: true,
      inventoryAsOf: "2026-04-27T00:00:00Z", inventoryDay: "2026-04-27", totalSku: 1,
      items: [{ variantId: "v", product: "Sản phẩm mẫu", sku: "SKU", totalLots: 2,
        lots: [{ id: "l", lotNumber: "L1", expirationDate: "2026-04-30", status: "QUARANTINED", quantity: 8, damaged: 2, alertDays: 30 }] }],
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Trong số đó có mã nào sắp hết hạn?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByText("Sản phẩm mẫu")).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenCalledWith("c", "Trong số đó có mã nào sắp hết hạn?", "previous_near_expiry", "a1");
  expect(screen.getByText("Trong 2 mã vừa xem, có 1 mã có lô sắp hết hạn.")).toBeInTheDocument();
  expect(screen.getByText(/Danh sách trước còn mã chưa hiển thị/)).toBeInTheDocument();
  expect(screen.getByText(/Danh sách trước có thể chưa đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/Lô L1.*Cách ly/)).toBeInTheDocument();
  expect(screen.getByText(/Còn 1 lô chưa hiển thị/)).toBeInTheDocument();
});

it("asks to view a compatible previous query before changing its period", async () => {
  mocks.interpret.mockResolvedValue({ kind: "change_sku_period", periodChange: "previous_period", hasPreviousSkuQuery: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Cùng câu đó cho kỳ liền trước?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("câu hỏi bán chạy có thể đổi kỳ");
  expect(mocks.sendSku).not.toHaveBeenCalled();
});

it("does not submit unsupported questions or follow-ups without a previous ranking", async () => {
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  mocks.interpret.mockResolvedValueOnce({ kind: "unsupported", hasPreviousRanking: false })
    .mockResolvedValueOnce({ kind: "previous_stockout", hasPreviousRanking: false });
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Lãi ròng thế nào?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Chưa nhận diện");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Trong số đó sắp hết?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Hãy xem danh sách bán chạy");
  expect(mocks.sendSku).not.toHaveBeenCalled();
});

it("confirms and displays partial slow-moving and expiry results by lot", async () => {
  mocks.interpret.mockResolvedValue({ kind: "slow_moving_expiry", hasPreviousRanking: false });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Hàng nào bán chậm và có nguy cơ hết hạn?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Có 11 mã hàng cần kiểm tra.", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "slow_expiry_v1", analysis: "slow_moving_expiry", state: "partial", dataAsOf: "2026-04-26", finishedAt: "2026-04-27T00:00:00Z",
      warningCodes: ["INSUFFICIENT_HISTORY"], totalSku: 11,
      items: [{ variantId: "v", sku: "TEST-SKU", product: "Sản phẩm mẫu", sold30: 2, daysWithoutSale: 40,
        neverSold: false, stockAvailable: 8, totalLots: 3, lots: [
          { id: "1", status: "expired", severity: "CRITICAL", lotNumber: "L1", expirationDate: "2026-04-01", lotQuantity: 4, atRiskQty: 4 },
          { id: "2", status: "unsellable", severity: "HIGH", lotNumber: "L2", expirationDate: "2026-05-01", lotQuantity: 3, atRiskQty: 3 },
        ] }],
    } },
  ] });
  render(<StrictMode><MemoryRouter><AssistantPage /></MemoryRouter></StrictMode>);
  await screen.findByText("Đã cho phép");
  fireEvent.click(screen.getByText("Tham khảo câu hỏi được hỗ trợ"));
  fireEvent.click(screen.getByRole("button", { name: "Bán chậm, sắp hết hạn" }));
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Sản phẩm mẫu");
  expect(screen.getByText(/Mã nào bán chậm/)).toHaveTextContent("mọi mức cảnh báo");
  expect(screen.getByText("Có 11 mã vừa bán chậm vừa có cảnh báo về hạn dùng.")).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenCalledWith("c", "Mã nào bán chậm và còn hàng sắp hết hạn?", "slow_moving_expiry", undefined);
  expect(mocks.get).not.toHaveBeenCalled();
  expect(screen.getByText("Đã hết hạn")).toBeInTheDocument();
  expect(screen.getByText("Không thể bán")).toBeInTheDocument();
  expect(screen.getByText(/Mức Khẩn cấp/)).toBeInTheDocument();
  expect(screen.getByText(/Kết quả có thể chưa đầy đủ/)).toBeInTheDocument();
  expect(screen.getByText(/Còn 1 lô có cảnh báo chưa hiển thị/)).toBeInTheDocument();
  expect(screen.getByText(/Đang hiển thị 1 trong 11 mã/)).toBeInTheDocument();
  expect(screen.getByText(/Một số mã hàng chưa đủ lịch sử/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "So với kỳ trước" })).not.toBeInTheDocument();
});

it("requires owner acknowledgement to enable sharing and blocks staff when disabled", async () => {
  mocks.consent.mockResolvedValue({ enabled: false }); mocks.owner = true;
  mocks.setConsent.mockImplementation(async () => { mocks.consent.mockResolvedValue({ enabled: true }); return { enabled: true }; });
  const { unmount } = render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  const enable = await screen.findByRole("button", { name: "Cho phép chia sẻ với OpenAI" });
  expect(enable).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(enable);
  await screen.findByText("Đã cho phép");
  expect(mocks.setConsent).toHaveBeenCalledWith(true);
  unmount();
  mocks.owner = false; mocks.consent.mockResolvedValue({ enabled: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Chủ cửa hàng cần cho phép trước khi sử dụng.");
  expect(screen.getByLabelText("Câu hỏi")).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Cho phép chia sẻ với OpenAI" })).not.toBeInTheDocument();
});

it("confirms profit ranking of pending restock suggestions and displays exact values", async () => {
  mocks.interpret.mockResolvedValue({ kind: "profit_restock", hasPreviousRanking: false });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Mã hàng nào có lợi nhuận cao và cần nhập thêm?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Có 6 mã đủ điều kiện.", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "profit_restock_v1", analysis: "profit_restock", state: "partial", period: { from: "2026-03-28", to: "2026-04-26" },
      salesAsOf: "2026-04-27T00:00:00Z", riskDataAsOf: "2026-04-26", riskFinishedAt: "2026-04-27T00:00:00Z",
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 1 },
      warningCodes: ["FORECAST_OVERDUE_PO"], totalSku: 6,
      items: [{ variantId: "v", product: "Sản phẩm mẫu", sku: "SKU", grossProfit: "9007199254740993.00",
        suggestedQty: 4, urgency: "HIGH", supplierName: null, orderByDate: null, stockoutDate: null }],
    } },
  ] });
  render(<StrictMode><MemoryRouter><AssistantPage /></MemoryRouter></StrictMode>);
  await screen.findByText("Đã cho phép");
  fireEvent.click(screen.getByText("Tham khảo câu hỏi được hỗ trợ"));
  fireEvent.click(screen.getByRole("button", { name: "Lợi nhuận cao, cần nhập" }));
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Sản phẩm mẫu");
  expect(screen.getByText(/Trong các mã đang được đề xuất nhập/)).toHaveTextContent("30 ngày");
  expect(mocks.sendSku).toHaveBeenCalledWith("c", "Mã hàng nào có lợi nhuận cao và cần nhập thêm?", "profit_restock", undefined);
  expect(screen.getByText(/9\.007\.199\.254\.740\.993\s₫/)).toBeInTheDocument();
  expect(screen.getByText(/Gợi ý nhập:/)).toHaveTextContent("4");
  expect(screen.getByText(/Chưa có nhà cung cấp/)).toBeInTheDocument();
  expect(screen.getByText(/đơn hàng đang về đã quá hạn/)).toBeInTheDocument();
  expect(screen.getByText(/Đang hiển thị 1 trong 6 mã/)).toBeInTheDocument();
  expect(screen.getByText(/chưa tạo đơn/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "So với kỳ trước" })).not.toBeInTheDocument();
});

it("confirms overstock and forecast comparison and explains partial results", async () => {
  mocks.interpret.mockResolvedValue({ kind: "overstock_forecast", hasPreviousRanking: false });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Mã hàng nào tồn nhiều và nhu cầu dự báo giảm?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Có 1 mã cần kiểm tra.", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "overstock_forecast_v1", analysis: "overstock_forecast", state: "partial", dataAsOf: "2026-04-26", finishedAt: "2026-04-27T00:00:00Z",
      warningCodes: [], salesPeriod: { from: "2026-03-28", to: "2026-04-26" },
      forecastPeriod: { from: "2026-04-28", to: "2026-05-04" }, skippedSku: 2, totalSku: 1,
      items: [{ variantId: "v", product: "Sản phẩm mẫu", sku: "SKU", severity: "HIGH", stockAvailable: 100,
        daysOfCover: 90, thresholdDays: 60, sold30: 30, forecast7: 3, dropPercent: 57.1, possibleStockoutBias: true }],
    } },
  ] });
  render(<StrictMode><MemoryRouter><AssistantPage /></MemoryRouter></StrictMode>);
  await screen.findByText("Đã cho phép");
  fireEvent.click(screen.getByText("Tham khảo câu hỏi được hỗ trợ"));
  fireEvent.click(screen.getByRole("button", { name: "Tồn nhiều, dự báo bán giảm" }));
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Sản phẩm mẫu");
  expect(screen.getByText(/Mã nào đang tồn nhiều/)).toHaveTextContent("ít nhất 10%");
  expect(mocks.sendSku).toHaveBeenCalledWith("c", "Mã hàng nào tồn nhiều và nhu cầu dự báo giảm?", "overstock_forecast", undefined);
  expect(screen.getByText(/Dự báo giảm khoảng/)).toHaveTextContent("57,1%");
  expect(screen.getByText(/Chưa đối chiếu được 2 mã/)).toBeInTheDocument();
  expect(screen.getByText(/Đã có ngày có thể hết hàng/)).toBeInTheDocument();
  expect(screen.getByText(/được lấy khi trả lời/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "So với kỳ trước" })).not.toBeInTheDocument();
});

it("follows a displayed inventory list with a confirmed restock comparison", async () => {
  mocks.interpret.mockResolvedValueOnce({ kind: "slow_moving_expiry", hasPreviousRanking: false, hasPreviousSkuList: false })
    .mockResolvedValueOnce({ kind: "previous_restock", hasPreviousRanking: false, hasPreviousSkuList: true, previousMessageId: "a" });
  mocks.sendSku.mockResolvedValueOnce({ messages: [
    { id: "u", role: "user", content: "Hàng nào bán chậm và có nguy cơ hết hạn?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Có mã cần kiểm tra.", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "slow_expiry_v1", analysis: "slow_moving_expiry", state: "partial", dataAsOf: "2026-04-26", finishedAt: "2026-04-27T00:00:00Z",
      warningCodes: [], totalSku: 11,
      items: [{ variantId: "v", product: "Sản phẩm mẫu", sku: "SKU", sold30: 2, daysWithoutSale: 40,
        neverSold: false, stockAvailable: 8, totalLots: 0, lots: [] }],
    } },
  ] }).mockResolvedValueOnce({ messages: [
    { id: "u2", role: "user", content: "Trong các mã vừa xem, mã nào cần ưu tiên nhập?", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "Trong 1 mã vừa hiển thị, có 1 mã có gợi ý nhập đang chờ.", createdAt: "2026-04-27T00:00:03Z", evidence: {
      type: "previous_restock_v1", analysis: "previous_restock", state: "partial", sourceCount: 1, sourcePartial: true, sourceTruncated: true, sourceInventoryCaution: true,
      dataAsOf: "2026-04-26", finishedAt: "2026-04-27T00:00:00Z", warningCodes: ["FORECAST_OVERDUE_PO"], totalSku: 1,
      items: [{ variantId: "v", product: "Sản phẩm mẫu", sku: "SKU", urgency: "HIGH", suggestedQty: 4,
        orderByDate: "2026-04-30", stockoutDate: null, supplierName: null, cautions: ["EXPIRATION_RISK"] }],
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.click(screen.getByText("Tham khảo câu hỏi được hỗ trợ"));
  fireEvent.click(screen.getByRole("button", { name: "Bán chậm, sắp hết hạn" }));
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Có 11 mã vừa bán chậm vừa có cảnh báo về hạn dùng.");
  fireEvent.click(screen.getByRole("button", { name: "Ưu tiên nhập hàng" }));
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText(/Trong 1 mã vừa xem, có 1 mã/);
  expect(screen.getByText(/Trong danh sách vừa xem/)).toHaveTextContent("mức ưu tiên");
  expect(mocks.sendSku).toHaveBeenLastCalledWith("c", "Trong các mã vừa xem, mã nào nên ưu tiên nhập thêm?", "previous_restock", "a");
  expect(screen.getByText(/Danh sách trước còn mã chưa hiển thị/)).toBeInTheDocument();
  expect(screen.getByText(/kiểm tra lại tồn và hạn dùng/)).toBeInTheDocument();
  expect(screen.getByText(/Đang có cảnh báo: nguy cơ hết hạn/)).toBeInTheDocument();
  expect(screen.getByText(/Có đơn hàng đang về đã quá hạn/)).toBeInTheDocument();
  expect(screen.getByText(/chưa tạo đơn/)).toBeInTheDocument();
});

it("does not submit a restock follow-up without a displayed list", async () => {
  mocks.interpret.mockResolvedValue({ kind: "previous_restock", hasPreviousRanking: false, hasPreviousSkuList: false });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.click(screen.getByText("Tham khảo câu hỏi được hỗ trợ"));
  fireEvent.click(screen.getByRole("button", { name: "Ưu tiên nhập hàng" }));
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Hãy xem một danh sách mã hàng");
  expect(mocks.sendSku).not.toHaveBeenCalled();
});

it("understands and presents top sellers with near-expiry lots", async () => {
  mocks.interpret.mockResolvedValue({ kind: "top_sellers_near_expiry", hasPreviousRanking: false, hasPreviousSkuList: false });
  mocks.sendSku.mockResolvedValue({ messages: [
    { id: "u", role: "user", content: "Món bán chạy nào sắp hết hạn?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Có 1 mã có lô gần hạn.", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_near_expiry_v1", analysis: "top_sellers_near_expiry", state: "ready", period: { from: "2026-04-20", to: "2026-04-26" },
      salesAsOf: "2026-04-27T00:00:00Z", inventoryAsOf: "2026-04-27T01:00:00Z", inventoryDay: "2026-04-27",
      warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 }, rankingCount: 5, totalSku: 1,
      items: [{ variantId: "v", product: "Sản phẩm mẫu", sku: "SKU", unitsSold: 20, totalLots: 6,
        lots: [{ id: "lot", lotNumber: "L1", expirationDate: "2026-04-30", status: "QUARANTINED", quantity: 8, damaged: 2, alertDays: 30 }] }],
    } },
  ] });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  await screen.findByText("Đã cho phép");
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Món bán chạy nào sắp hết hạn?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await screen.findByText("Trong 5 mã bán chạy, có 1 mã còn lô hàng sắp hết hạn.");
  expect(screen.getByText(/Trong nhóm 5 mã bán chạy nhất.*còn lô hàng sắp hết hạn/)).toBeInTheDocument();
  expect(screen.getByText(/Lô L1/)).toHaveTextContent("Cách ly");
  expect(screen.getByText(/Còn 5 lô chưa hiển thị/)).toBeInTheDocument();
  expect(screen.getByText(/lô sắp hết hạn chưa chắc sẽ không bán kịp/)).toBeInTheDocument();
  expect(mocks.sendSku).toHaveBeenCalledWith("c", "Món bán chạy nào sắp hết hạn?", "top_sellers_near_expiry", undefined);
});

it("does not request financial data without permission", async () => {
  mocks.permissions = ["analytics.read"];
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  expect(screen.getByRole("alert")).toHaveTextContent("cần quyền");
  await waitFor(() => expect(mocks.movement).not.toHaveBeenCalled());
});

it("keeps a draft while navigating and closing the assistant; a different account starts clean", async () => {
  const { rerender } = render(<MemoryRouter initialEntries={["/products"]}>
    <Link to="/inventory">Kho</Link><AssistantWidget key="user-a:store-a" isOwner={false} />
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Hỏi trợ lý" }));
  await waitFor(() => expect(screen.getByLabelText("Câu hỏi")).toBeEnabled());
  expect(screen.queryByLabelText("Loại câu hỏi")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /chia sẻ với OpenAI/i })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Tôi muốn xem hàng bán chạy" } });
  fireEvent.click(screen.getByRole("link", { name: "Kho" }));
  expect(screen.getByLabelText("Câu hỏi")).toHaveValue("Tôi muốn xem hàng bán chạy");
  fireEvent.click(screen.getByRole("button", { name: "Đóng trợ lý" }));
  fireEvent.click(screen.getByRole("button", { name: "Hỏi trợ lý" }));
  expect(screen.getByLabelText("Câu hỏi")).toHaveValue("Tôi muốn xem hàng bán chạy");
  rerender(<MemoryRouter initialEntries={["/products"]}>
    <Link to="/inventory">Kho</Link><AssistantWidget key="user-b:store-b" isOwner={false} />
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Hỏi trợ lý" }));
  await waitFor(() => expect(screen.getByLabelText("Câu hỏi")).toBeEnabled());
  expect(screen.getByLabelText("Câu hỏi")).toHaveValue("");
});

it("keeps an in-flight answer when navigating and restores its saved interpretation from history", async () => {
  let resolveAnswer!: (value: unknown) => void;
  mocks.sendSku.mockReturnValue(new Promise((resolve) => { resolveAnswer = resolve; }));
  const messages = [
    { id: "u", role: "user", content: "Mặt hàng nào bán chạy?", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Các mã bán nhiều nhất.", createdAt: "2026-04-27T00:00:01Z", evidence: {
      type: "top_sellers_v1", analysis: "top_sellers", period: { from: "2026-04-20", to: "2026-04-26" },
      salesAsOf: "2026-04-27T00:00:00Z", warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 }, items: [],
    } },
  ];
  const { unmount } = render(<MemoryRouter initialEntries={["/products"]}>
    <Link to="/inventory">Kho</Link><AssistantWidget isOwner={false} />
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Hỏi trợ lý" }));
  await waitFor(() => expect(screen.getByLabelText("Câu hỏi")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Mặt hàng nào bán chạy?" } });
  fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await waitFor(() => expect(mocks.sendSku).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("link", { name: "Kho" }));
  resolveAnswer({ messages });
  expect(await screen.findByText(/5 mã hàng bán chạy nhất/)).toBeInTheDocument();
  unmount();
  mocks.list.mockResolvedValue({ items: [{ id: "c", createdAt: "2026-04-27T00:00:00Z", updatedAt: "2026-04-27T00:00:01Z" }], page: 1, hasMore: false });
  mocks.get.mockResolvedValue({ id: "c", messages });
  render(<MemoryRouter><AssistantPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Cập nhật/ }));
  expect(await screen.findByText(/5 mã hàng bán chạy nhất/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sửa câu hỏi" }));
  expect(screen.getByLabelText("Câu hỏi")).toHaveValue("Mặt hàng nào bán chạy?");
});

it("keeps the chat disabled without consent and links to the owner's settings", async () => {
  mocks.consent.mockResolvedValue({ enabled: false });
  render(<MemoryRouter><AssistantWidget isOwner /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Hỏi trợ lý" }));
  expect(await screen.findByRole("link", { name: "Quản lý chia sẻ" })).toHaveAttribute("href", "/app/assistant");
  expect(screen.getByLabelText("Câu hỏi")).toBeDisabled();
  expect(screen.queryByRole("button", { name: /chia sẻ với OpenAI/i })).not.toBeInTheDocument();
  expect(mocks.setConsent).not.toHaveBeenCalled();
});

it("refreshes sharing status after returning from the settings page", async () => {
  mocks.consent.mockResolvedValue({ enabled: false });
  render(<MemoryRouter initialEntries={["/products"]}>
    <Link to="/inventory">Quay lại kho</Link><AssistantWidget isOwner />
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Hỏi trợ lý" }));
  fireEvent.click(await screen.findByRole("link", { name: "Quản lý chia sẻ" }));
  mocks.consent.mockResolvedValue({ enabled: true });
  fireEvent.click(screen.getByRole("link", { name: "Quay lại kho" }));
  await waitFor(() => expect(screen.getByLabelText("Câu hỏi")).toBeEnabled());
});

it("sends multiple questions in one chat using Enter", async () => {
  const ranking = { type: "top_sellers_v1", analysis: "top_sellers", period: { from: "2026-04-20", to: "2026-04-26" },
    salesAsOf: "2026-04-27T00:00:00Z", warnings: { excludedSaleItems: 0, excludedReturnItems: 0, missingReturnCostLinks: 0 }, items: [] };
  mocks.sendSku.mockResolvedValueOnce({ messages: [
    { id: "u", role: "user", content: "Câu thứ nhất", createdAt: "2026-04-27T00:00:00Z" },
    { id: "a", role: "assistant", content: "Trả lời thứ nhất", evidence: ranking, createdAt: "2026-04-27T00:00:01Z" },
  ] }).mockResolvedValueOnce({ messages: [
    { id: "u2", role: "user", content: "Câu thứ hai", createdAt: "2026-04-27T00:00:02Z" },
    { id: "a2", role: "assistant", content: "Trả lời thứ hai", evidence: ranking, createdAt: "2026-04-27T00:00:03Z" },
  ] });
  render(<MemoryRouter><AssistantWidget isOwner={false} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Hỏi trợ lý" }));
  await waitFor(() => expect(screen.getByLabelText("Câu hỏi")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Câu thứ nhất" } });
  fireEvent.keyDown(screen.getByLabelText("Câu hỏi"), { key: "Enter" });
  await screen.findByText("Chưa ghi nhận mã hàng nào được bán trong khoảng thời gian này.");
  await waitFor(() => expect(screen.getByLabelText("Câu hỏi")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Câu hỏi"), { target: { value: "Câu thứ hai" } });
  fireEvent.keyDown(screen.getByLabelText("Câu hỏi"), { key: "Enter" });
  await waitFor(() => expect(screen.getAllByText("Chưa ghi nhận mã hàng nào được bán trong khoảng thời gian này.")).toHaveLength(2));
  expect(screen.getByText("Câu thứ nhất")).toBeInTheDocument();
  expect(mocks.interpret).toHaveBeenLastCalledWith("Câu thứ hai", "c");
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
