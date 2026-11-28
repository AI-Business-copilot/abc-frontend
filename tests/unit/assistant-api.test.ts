import { expect, it, vi } from "vitest";
import { sendComparisonBreakdown, sendComparisonMetricChange, sendPreviousItemCover, sendSkuQuestion } from "@/api/assistant";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/services/api.service", () => ({ apiRequest: request }));

it("sends the period transformation and previous message without submitting a query", async () => {
  await sendSkuQuestion("conversation", "Cùng câu đó tuần trước?", "change_sku_period", "previous", undefined, "last_week");
  expect(request).toHaveBeenLastCalledWith("/assistant/conversations/conversation/messages", {
    method: "POST",
    body: JSON.stringify({ question: "Cùng câu đó tuần trước?", analysis: "change_sku_period", previousMessageId: "previous", periodChange: "last_week" }),
  });

});

it("sends a breakdown request without the previous result or scope", async () => {
  await sendComparisonBreakdown("conversation", "Xem từng sản phẩm", "product", "previous");
  expect(request).toHaveBeenLastCalledWith("/assistant/conversations/conversation/messages", {
    method: "POST",
    body: JSON.stringify({ question: "Xem từng sản phẩm", analysis: "comparison_breakdown", level: "product", previousMessageId: "previous" }),
  });
});

it("sends a metric change without sending previous evidence or scope", async () => {
  await sendComparisonMetricChange("conversation", "Còn lợi nhuận gộp?", "grossProfit", "previous");
  expect(request).toHaveBeenLastCalledWith("/assistant/conversations/conversation/messages", {
    method: "POST",
    body: JSON.stringify({ question: "Còn lợi nhuận gộp?", analysis: "change_comparison_metric", metric: "grossProfit", previousMessageId: "previous" }),
  });
});

it("sends a sales comparison using only the previous message ID", async () => {
  await sendSkuQuestion("conversation", "So với kỳ trước?", "compare_previous_sku_sales", "previous");
  expect(request).toHaveBeenLastCalledWith("/assistant/conversations/conversation/messages", {
    method: "POST",
    body: JSON.stringify({ question: "So với kỳ trước?", analysis: "compare_previous_sku_sales", previousMessageId: "previous" }),
  });
});

it("sends an action follow-up without the previous result", async () => {
  await sendSkuQuestion("conversation", "Vậy nên làm gì?", "previous_actions", "previous");
  expect(request).toHaveBeenLastCalledWith("/assistant/conversations/conversation/messages", {
    method: "POST",
    body: JSON.stringify({ question: "Vậy nên làm gì?", analysis: "previous_actions", previousMessageId: "previous" }),
  });
});

it("sends the position without the displayed list or SKU identifier", async () => {
  await sendPreviousItemCover("conversation", "Mã đầu tiên còn bao nhiêu ngày bán?", 1, "previous");
  expect(request).toHaveBeenLastCalledWith("/assistant/conversations/conversation/messages", {
    method: "POST",
    body: JSON.stringify({ question: "Mã đầu tiên còn bao nhiêu ngày bán?", analysis: "previous_item_cover", position: 1, previousMessageId: "previous" }),
  });
});
