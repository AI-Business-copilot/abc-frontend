import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Bot, MessageCircle, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { createConversation, deleteConversation, getConversation, getOpenAiConsent, interpretQuestion, listConversations, sendComparisonBreakdown, sendComparisonMetricChange, sendPreviousItemCover, sendQuestion, sendSkuQuestion, setOpenAiConsent, type AssistantEvidence, type ComparisonBreakdownEvidence, type ComparisonEvidence, type Conversation, type ExpiryLot, type QuestionKind, type SkuEvidence, type SkuSalesComparisonEvidence, type PreviousItemCoverEvidence, type PreviousActionsEvidence, type SlowExpiryEvidence, type ProfitRestockEvidence, type OverstockForecastEvidence, type PreviousRestockEvidence, type TopSellersRestockEvidence, type TopSellersRestockExpiryEvidence, type TopSellersRestockOverstockEvidence, type PreviousNearExpiryEvidence, type PreviousOverstockEvidence, type TopSellerInventoryEvidence } from "@/api/assistant";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { displayDate } from "@/pages/business-data/shared";
import { ErrorBox, useAction, useLoad } from "@/pages/purchases/shared";
import { posMoney } from "./pos-format";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";
import "./assistant.css";

function isSkuEvidence(evidence: AssistantEvidence): evidence is SkuEvidence {
  return "type" in evidence && (evidence.type === "top_sellers_v1" || evidence.type === "sku_stockout_v1");
}

function isSkuSalesComparisonEvidence(evidence: AssistantEvidence): evidence is SkuSalesComparisonEvidence {
  return "type" in evidence && evidence.type === "sku_sales_comparison_v1";
}

function isPreviousItemCoverEvidence(evidence: AssistantEvidence): evidence is PreviousItemCoverEvidence {
  return "type" in evidence && evidence.type === "previous_item_cover_v1";
}

function isPreviousActionsEvidence(evidence: AssistantEvidence): evidence is PreviousActionsEvidence {
  return "type" in evidence && evidence.type === "previous_actions_v1";
}

function isSlowExpiryEvidence(evidence: AssistantEvidence): evidence is SlowExpiryEvidence {
  return "type" in evidence && evidence.type === "slow_expiry_v1";
}

function isProfitRestockEvidence(evidence: AssistantEvidence): evidence is ProfitRestockEvidence {
  return "type" in evidence && evidence.type === "profit_restock_v1";
}

function isOverstockForecastEvidence(evidence: AssistantEvidence): evidence is OverstockForecastEvidence {
  return "type" in evidence && evidence.type === "overstock_forecast_v1";
}

function isPreviousRestockEvidence(evidence: AssistantEvidence): evidence is PreviousRestockEvidence | TopSellersRestockEvidence | TopSellersRestockExpiryEvidence | TopSellersRestockOverstockEvidence {
  return "type" in evidence && (evidence.type === "previous_restock_v1" || evidence.type === "top_sellers_restock_v1" || evidence.type === "top_sellers_restock_near_expiry_v1" || evidence.type === "top_sellers_restock_overstock_v1");
}

function isPreviousNearExpiryEvidence(evidence: AssistantEvidence): evidence is PreviousNearExpiryEvidence {
  return "type" in evidence && evidence.type === "previous_near_expiry_v1";
}

function isPreviousOverstockEvidence(evidence: AssistantEvidence): evidence is PreviousOverstockEvidence {
  return "type" in evidence && evidence.type === "previous_overstock_v1";
}

function isTopSellerInventoryEvidence(evidence: AssistantEvidence): evidence is TopSellerInventoryEvidence {
  return "type" in evidence && (evidence.type === "top_sellers_overstock_v1" || evidence.type === "top_sellers_near_expiry_v1" || evidence.type === "top_sellers_overstock_near_expiry_v1");
}

function isComparisonBreakdownEvidence(evidence: AssistantEvidence): evidence is ComparisonBreakdownEvidence {
  return "type" in evidence && evidence.type === "comparison_breakdown_v1";
}

function inventorySummary(evidence: TopSellerInventoryEvidence) {
  if (evidence.state === "unavailable") return "Chưa có dữ liệu tồn kho mới để kiểm tra các mã bán chạy.";
  if (evidence.rankingCount === 0) return "Chưa ghi nhận mặt hàng bán chạy trong khoảng thời gian này để kiểm tra.";
  if (evidence.totalSku === null) return "Chưa đủ thông tin để đưa ra kết luận.";
  const subject = evidence.type === "top_sellers_near_expiry_v1" ? "còn lô hàng sắp hết hạn"
    : evidence.type === "top_sellers_overstock_near_expiry_v1" ? "vừa còn nhiều hàng trong kho vừa có lô sắp hết hạn" : "đang có lượng hàng tồn cao";
  return evidence.totalSku > 0
    ? `Trong ${evidence.rankingCount} mã bán chạy, có ${evidence.totalSku} mã ${subject}.`
    : `Trong ${evidence.rankingCount} mã bán chạy, chưa thấy mã nào ${subject}.`;
}

function skuSummary(evidence: SkuEvidence, content: string) {
  if (evidence.type === "top_sellers_v1") return evidence.items.length
    ? "Đây là những mã hàng bán chạy nhất trong khoảng thời gian này."
    : "Chưa ghi nhận mã hàng nào được bán trong khoảng thời gian này.";
  if (evidence.rankingCount === 0) return "Chưa ghi nhận mã hàng bán chạy để kiểm tra nguy cơ hết hàng.";
  if (evidence.riskState === "unavailable") return "Chưa có dự báo tồn kho mới để xác định mã nào sắp hết hàng.";
  if (evidence.riskState !== "ready") return content;
  return evidence.items.length
    ? `Có ${evidence.items.length} mã bán chạy cần ưu tiên kiểm tra vì có nguy cơ sắp hết hàng.`
    : "Chưa phát hiện mã bán chạy nào có nguy cơ sắp hết hàng cao.";
}

function resultSummary(evidence: SlowExpiryEvidence | ProfitRestockEvidence | OverstockForecastEvidence | PreviousRestockEvidence | TopSellersRestockEvidence | TopSellersRestockExpiryEvidence | TopSellersRestockOverstockEvidence, content: string) {
  if (evidence.state === "unavailable") return "Thông tin tồn kho hoặc dự báo chưa sẵn sàng hoặc đã cũ. Hãy xem lại phần nhận định tồn kho rồi thử lại.";
  if (evidence.totalSku === null) return content;
  if (evidence.type === "slow_expiry_v1") return evidence.totalSku
    ? `Có ${evidence.totalSku} mã vừa bán chậm vừa có cảnh báo về hạn dùng.`
    : "Chưa tìm thấy mã nào vừa bán chậm vừa có cảnh báo về hạn dùng trong dữ liệu hiện có.";
  if (evidence.type === "profit_restock_v1") return evidence.totalSku
    ? `Có ${evidence.totalSku} mã có lãi gộp và đang có gợi ý nhập hàng.`
    : "Chưa tìm thấy mã có lãi gộp và đang có gợi ý nhập hàng trong dữ liệu hiện có.";
  if (evidence.type === "overstock_forecast_v1") return evidence.totalSku
    ? `Có ${evidence.totalSku} mã đang được cảnh báo tồn nhiều và dự kiến bán chậm hơn.`
    : "Chưa tìm thấy mã vừa được cảnh báo tồn nhiều vừa dự kiến bán chậm hơn trong dữ liệu có thể kiểm tra.";
  if (evidence.type === "top_sellers_restock_near_expiry_v1") return evidence.sourceCount === 0
    ? "Chưa ghi nhận mã hàng bán trong kỳ để đối chiếu."
    : evidence.totalSku ? `Trong ${evidence.sourceCount} mã bán chạy, có ${evidence.totalSku} mã vừa có gợi ý nhập vừa có lô sắp hết hạn.`
    : `Trong ${evidence.sourceCount} mã bán chạy, chưa tìm thấy mã vừa có gợi ý nhập vừa có lô sắp hết hạn.`;
  if (evidence.type === "top_sellers_restock_overstock_v1") return evidence.sourceCount === 0
    ? "Chưa ghi nhận mã hàng bán trong kỳ để đối chiếu."
    : evidence.totalSku ? `Trong ${evidence.sourceCount} mã bán chạy, có ${evidence.totalSku} mã vừa có gợi ý nhập vừa có cảnh báo tồn nhiều.`
    : `Trong ${evidence.sourceCount} mã bán chạy, chưa tìm thấy mã vừa có gợi ý nhập vừa có cảnh báo tồn nhiều.`;
  if (evidence.type === "top_sellers_restock_v1") return evidence.sourceCount === 0
    ? "Chưa ghi nhận mã hàng bán trong kỳ để kiểm tra gợi ý nhập."
    : evidence.totalSku ? `Trong ${evidence.sourceCount} mã bán chạy, có ${evidence.totalSku} mã có gợi ý nhập đang chờ.`
    : `Trong ${evidence.sourceCount} mã bán chạy, chưa tìm thấy gợi ý nhập đang chờ.`;
  return evidence.totalSku
    ? `Trong ${evidence.sourceCount} mã vừa xem, có ${evidence.totalSku} mã đang có gợi ý nhập hàng.`
    : `Trong ${evidence.sourceCount} mã vừa xem, chưa có gợi ý nhập hàng còn hiệu lực.`;
}

function ExpiryLots({ lots, totalLots }: { lots: ExpiryLot[]; totalLots: number }) {
  const lotStatus: Record<string, string> = { HEALTHY: "Bình thường", WARNING: "Cảnh báo", UNUSABLE: "Không thể bán", QUARANTINED: "Cách ly", SCRAPPED: "Đã xử lý" };
  const format = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  return <>
    {lots.map((lot) => <p key={lot.id}>Lô {lot.lotNumber} · Hạn {displayDate(lot.expirationDate)} · Còn {format(lot.quantity)} · Hư hỏng {format(lot.damaged)} · {lotStatus[lot.status] ?? "Trạng thái khác: cần kiểm tra"}</p>)}
    {totalLots > lots.length && <span>Còn {totalLots - lots.length} lô chưa hiển thị.</span>}
  </>;
}

function TopSellerInventoryAnswer({ evidence }: { evidence: TopSellerInventoryEvidence }) {
  const expiry = evidence.type !== "top_sellers_overstock_v1";
  const overstock = evidence.type !== "top_sellers_near_expiry_v1";
  const format = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  return <>
    <div className="assistant-result">
      <span className="assistant-overline">{expiry && overstock ? "BÁN CHẠY, TỒN NHIỀU VÀ LÔ SẮP HẾT HẠN" : expiry ? "BÁN CHẠY VÀ LÔ SẮP HẾT HẠN" : "BÁN CHẠY VÀ TỒN NHIỀU"}</span>
      <h3>Các mã hàng cần kiểm tra</h3>
      <p className="assistant-result-summary">{inventorySummary(evidence)}</p>
      <p className="assistant-result-note">Đã kiểm tra {evidence.rankingCount} mã bán chạy từ {displayDate(evidence.period.from)} đến {displayDate(evidence.period.to)}. Số bán chưa trừ hàng khách trả lại.</p>
      {evidence.followUp && <p className="assistant-result-note">Tình trạng tồn kho và lô hàng được kiểm tra theo dữ liệu mới nhất, không phải trong khoảng thời gian bán đã chọn.</p>}
      {evidence.state === "partial" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Dữ liệu bán hoặc tồn kho có thể chưa đầy đủ; danh sách có thể thiếu mã.</p>}
      {evidence.items.length > 0 && <div className="assistant-expiry-list">{evidence.items.map((item) => <section key={item.variantId} className="assistant-expiry-item">
        <strong>{item.product}</strong><span>Mã hàng: {item.sku}</span><p>Đã bán {format(item.unitsSold)} trong kỳ.</p>
        {overstock && <p>Tồn có thể bán khi phân tích: {item.stockAvailable == null ? "chưa rõ" : format(item.stockAvailable)} · Khoảng {item.daysOfCover == null ? "chưa rõ" : format(item.daysOfCover)} ngày bán (ngưỡng {item.thresholdDays == null ? "chưa rõ" : format(item.thresholdDays)} ngày).</p>}
        {item.possibleStockoutBias && <p>Các ngày từng hết hàng có thể ảnh hưởng tốc độ bán ước tính.</p>}
        {item.totalLots != null && item.lots && <ExpiryLots lots={item.lots} totalLots={item.totalLots} />}
      </section>)}</div>}
      {expiry && <p className="assistant-result-note">Chỉ tính các lô còn hàng, chưa hết hạn và đã đến ngưỡng cần chú ý. Các lô bị cách ly hoặc hư hỏng vẫn được tính; lô sắp hết hạn chưa chắc sẽ không bán kịp. Hãy kiểm tra thực tế.</p>}
      {overstock && <p className="assistant-result-note">Chỉ liệt kê các trường hợp còn cảnh báo tồn nhiều. Không thấy cảnh báo không đồng nghĩa lượng hàng trong kho đã phù hợp; hãy kiểm tra thực tế.</p>}
      <p className="assistant-result-note"><Link to={expiry ? "/app/products" : "/app/inventory-outlook"}>Xem thông tin hàng hóa</Link></p>
    </div>
    <details className="assistant-evidence"><summary>Nguồn và thời điểm dữ liệu</summary>
      <p>Số bán tại quầy được cập nhật lúc {new Date(evidence.salesAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}; số bán và thông tin kho được lấy tại các thời điểm khác nhau.</p>
      {expiry && <p>Tồn và hạn lô được đọc lúc {evidence.inventoryAsOf ? new Date(evidence.inventoryAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}; ngày xét hạn {evidence.inventoryDay ? displayDate(evidence.inventoryDay) : "chưa rõ"}. Ngưỡng lô chưa cấu hình dùng 30 ngày.</p>}
      {overstock && <p>Dữ liệu cảnh báo đến hết {evidence.dataAsOf ? displayDate(evidence.dataAsOf) : "ngày không rõ"}; hoàn tất {evidence.finishedAt ? new Date(evidence.finishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}. {evidence.state === "unavailable" ? "Phân tích chưa sẵn sàng hoặc đã cũ, không thể kết luận." : ""}</p>}
    </details>
  </>;
}

function PreviousNearExpiryAnswer({ evidence }: { evidence: PreviousNearExpiryEvidence }) {
  return <>
    <div className="assistant-result">
      <span className="assistant-overline">LÔ SẮP HẾT HẠN TRONG DANH SÁCH VỪA XEM</span>
      <h3>Các mã hàng cần kiểm tra</h3>
      <p className="assistant-result-summary">{evidence.totalSku
        ? `Trong ${evidence.sourceCount} mã vừa xem, có ${evidence.totalSku} mã có lô sắp hết hạn.`
        : `Trong ${evidence.sourceCount} mã vừa xem, chưa tìm thấy mã có lô sắp hết hạn.`}</p>
      {evidence.state === "partial" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách trước có thể chưa đầy đủ; kết quả có thể thiếu mã.</p>}
      {evidence.sourceTruncated && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách trước còn mã chưa hiển thị; chỉ kiểm tra những mã đã hiện.</p>}
      {evidence.items.length > 0 && <div className="assistant-expiry-list">{evidence.items.map((item) => <section key={item.variantId} className="assistant-expiry-item">
        <strong>{item.product}</strong><span>Mã hàng: {item.sku}</span>
        <ExpiryLots lots={item.lots} totalLots={item.totalLots} />
      </section>)}</div>}
      <p className="assistant-result-note">Chỉ tính các lô còn hàng, chưa hết hạn và đã đến ngưỡng cần chú ý. Các lô bị cách ly hoặc hư hỏng vẫn được tính; lô sắp hết hạn chưa chắc sẽ không bán kịp. Hãy kiểm tra thực tế.</p>
      <p className="assistant-result-note"><Link to="/app/products">Xem thông tin hàng hóa</Link></p>
    </div>
    <details className="assistant-evidence"><summary>Nguồn và thời điểm dữ liệu</summary>
      <p>Chỉ đối chiếu {evidence.sourceCount} mã đã hiển thị trong câu trả lời gần nhất. Tồn và hạn lô được đọc lúc {new Date(evidence.inventoryAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}; ngày xét hạn {displayDate(evidence.inventoryDay)}. Ngưỡng lô chưa cấu hình dùng 30 ngày.</p>
    </details>
  </>;
}

function PreviousOverstockAnswer({ content, evidence }: { content: string; evidence: PreviousOverstockEvidence }) {
  const severity: Record<PreviousOverstockEvidence["items"][number]["severity"], string> = {
    CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp",
  };
  const summary = evidence.state === "unavailable"
    ? "Phân tích tồn kho chưa sẵn sàng hoặc đã cũ; chưa thể kết luận."
    : evidence.totalSku === null ? content
      : evidence.totalSku > 0
        ? `Trong ${evidence.sourceCount} mã vừa hiển thị, có ${evidence.totalSku} mã có cảnh báo tồn nhiều.`
        : evidence.state === "partial"
          ? `Trong ${evidence.sourceCount} mã vừa hiển thị, chưa đủ dữ liệu để xác nhận đầy đủ mã nào có cảnh báo tồn nhiều.`
          : `Trong ${evidence.sourceCount} mã vừa hiển thị, chưa tìm thấy cảnh báo tồn nhiều hiện hành.`;
  const format = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  return <>
    <div className="assistant-result">
      <span className="assistant-overline">TỒN NHIỀU TRONG DANH SÁCH VỪA XEM</span>
      <h3>Các mã cần kiểm tra tồn</h3>
      <p className="assistant-result-summary">{summary}</p>
      {evidence.state === "partial" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách trước hoặc dữ liệu tồn kho chưa đầy đủ; kết quả có thể thiếu mã. {evidence.skippedSku ? `Chưa đối chiếu được ${evidence.skippedSku} mã.` : ""}</p>}
      {evidence.sourceTruncated && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách trước còn mã chưa hiển thị; chỉ kiểm tra những mã đã hiện, không mở rộng sang mã khác.</p>}
      {evidence.items.length > 0 && <div className="assistant-expiry-list">{evidence.items.map((item) => <section key={item.variantId} className="assistant-expiry-item">
        <strong>{item.product}</strong><span>Mã hàng: {item.sku}</span>
        <p><strong>Mức cảnh báo: {severity[item.severity]}</strong></p>
        <p>Tồn có thể bán khi phân tích: {format(item.stockAvailable)} · Khoảng {format(item.daysOfCover)} ngày bán (ngưỡng {format(item.thresholdDays)} ngày).</p>
        {item.possibleStockoutBias && <p>Đã có ngày có thể hết hàng; mức bán trước đây có thể chưa phản ánh đủ nhu cầu.</p>}
      </section>)}</div>}
      <p className="assistant-result-note">Cảnh báo tồn nhiều dựa trên tồn có thể bán và tốc độ bán; hãy kiểm tra tồn thực tế, hàng đang về và kế hoạch bán trước khi quyết định.</p>
      <p className="assistant-result-note"><Link to="/app/inventory-outlook">Xem cảnh báo tồn kho</Link></p>
    </div>
    <details className="assistant-evidence"><summary>Nguồn và giới hạn dữ liệu</summary>
      <p>Chỉ đối chiếu {evidence.sourceCount} mã đã hiển thị trong câu trả lời gần nhất. Phân tích tồn kho đến hết {evidence.dataAsOf ? displayDate(evidence.dataAsOf) : "ngày không rõ"}; hoàn tất {evidence.finishedAt ? new Date(evidence.finishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}. Tồn phản ánh thời điểm phân tích, không phải tồn tức thời.</p>
      {evidence.warningCodes?.length ? <p>Cảnh báo chất lượng dữ liệu: {evidence.warningCodes.join(", ")}.</p> : null}
      {evidence.state === "unavailable" && <p>Không thể kết luận có hay không có mã tồn nhiều cho đến khi phân tích mới sẵn sàng.</p>}
    </details>
  </>;
}

function Evidence({ evidence }: { evidence: Pick<ComparisonEvidence, "warnings" | "asOf"> }) {
  const warnings = evidence.warnings;
  return <details className="assistant-evidence"><summary>Chi tiết cách tính và chất lượng dữ liệu</summary>
    <p>Nguồn: dữ liệu bán tại quầy, cập nhật lúc {new Date(evidence.asOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p>
    <p>Hàng trả được tính theo ngày lập phiếu trả. Giá vốn hàng trả chỉ được hoàn lại khi đủ điều kiện và có liên kết hợp lệ.</p>
    <ul>
      <li>Dòng bán chưa hợp lệ không được tính: {warnings.excludedSaleItems}</li>
      <li>Dòng trả hàng chưa hợp lệ không được tính: {warnings.excludedReturnItems}</li>
      <li>Dòng trả hàng thiếu thông tin giá vốn liên kết: {warnings.missingReturnCostLinks}</li>
    </ul>
  </details>;
}

function ComparisonBreakdownAnswer({ evidence }: { evidence: ComparisonBreakdownEvidence }) {
  const warnings = evidence.warnings;
  const hasWarnings = warnings.excludedSaleItems > 0 || warnings.excludedReturnItems > 0 || warnings.missingReturnCostLinks > 0;
  const snapshotDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(evidence.asOf));
  const label = evidence.level === "product" ? "sản phẩm" : "mã hàng";
  return <>
    <div className="assistant-result">
      <h3>{evidence.metric === "netRevenue" ? "Doanh thu thuần" : "Lợi nhuận gộp"} theo từng {label}</h3>
      <p>{evidence.subject ? `Trong sản phẩm ${evidence.subject.product}` : "Toàn cửa hàng"} · {evidence.total} {label} có phát sinh trong hai kỳ.</p>
      <p>Kỳ này: {displayDate(evidence.ranges.current.from)} – {displayDate(evidence.ranges.current.to)}; kỳ trước: {displayDate(evidence.ranges.previous.from)} – {displayDate(evidence.ranges.previous.to)}.</p>
      {evidence.items.length > 0 ? <ol className="assistant-ranking">{evidence.items.map((item) => <li key={item.id}>
        <div><strong>{item.name}</strong><span>Kỳ này: {posMoney(item.current)} · Kỳ trước: {posMoney(item.previous)}</span>
          <span>Chênh lệch: {posMoney(item.difference)}</span></div>
      </li>)}</ol> : <p>Chưa ghi nhận {label} có phát sinh trong hai kỳ.</p>}
      <p className="assistant-result-note">Hiển thị {evidence.items.length} trên {evidence.total}, xếp theo kết quả kỳ này giảm dần. Số liệu được đọc lại và có thể khác câu trả lời trước; chênh lệch không cho biết nguyên nhân.</p>
      {evidence.total > evidence.items.length && <p className="assistant-result-note">Còn {evidence.total - evidence.items.length} {label} chưa hiển thị. <Link to="/app/product-performance">Xem Hiệu quả sản phẩm</Link> và chọn lại khoảng thời gian để tra cứu đầy đủ.</p>}
      {evidence.metric === "grossProfit" && <p className="assistant-result-note">Lợi nhuận gộp chưa trừ chi phí vận hành, không phải lợi nhuận ròng.</p>}
      {evidence.ranges.current.to >= snapshotDay && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Kỳ đang xem chưa kết thúc tại thời điểm cập nhật, số liệu có thể còn thay đổi.</p>}
      {hasWarnings && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Một số dữ liệu chưa đầy đủ hoặc không hợp lệ có thể ảnh hưởng đến kết quả. Xem chi tiết bên dưới.</p>}
    </div>
    <Evidence evidence={evidence} />
  </>;
}

function SkuSalesComparisonAnswer({ evidence }: { evidence: SkuSalesComparisonEvidence }) {
  const hasWarnings = (warnings: SkuSalesComparisonEvidence["warnings"]) =>
    warnings.excludedSaleItems > 0 || warnings.excludedReturnItems > 0 || warnings.missingReturnCostLinks > 0;
  const format = (value: number) => value.toLocaleString("vi-VN");
  return <>
    <div className="assistant-result">
      <h3>Số bán của các mã vừa xem so với kỳ trước</h3>
      <p>Kỳ đã xem: {displayDate(evidence.ranges.current.from)} – {displayDate(evidence.ranges.current.to)}; kỳ liền trước: {displayDate(evidence.ranges.previous.from)} – {displayDate(evidence.ranges.previous.to)}.</p>
      <ol className="assistant-ranking">{evidence.items.map((item) => <li key={item.variantId}>
        <div><strong>{item.product}</strong><span>Mã hàng: {item.sku}</span>
          {item.current === null || item.previous === null || item.difference === null
            ? <span>Không còn đủ dữ liệu đối chiếu cho mã này.</span>
            : <span>Đã bán {format(item.current)} so với {format(item.previous)} kỳ trước · {item.difference === 0 ? "Không đổi" : item.difference > 0 ? `Tăng ${format(item.difference)}` : `Giảm ${format(-item.difference)}`}</span>}
        </div>
      </li>)}</ol>
      <p className="assistant-result-note">Chỉ so sánh các mã đã hiển thị, không xếp hạng lại. Số bán chưa trừ hàng trả; dữ liệu được đọc lại và có thể khác câu trả lời trước. Chênh lệch không cho biết nguyên nhân.</p>
      {(hasWarnings(evidence.sourceWarnings) || hasWarnings(evidence.warnings)) && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Dữ liệu bán có cảnh báo, danh sách hoặc số liệu so sánh có thể chưa đầy đủ.</p>}
    </div>
    <details className="assistant-evidence"><summary>Nguồn và chất lượng dữ liệu</summary>
      <p>Danh sách ban đầu đọc lúc {new Date(evidence.sourceSalesAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}; số bán hai kỳ đọc lại lúc {new Date(evidence.salesAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p>
      <p>Dòng bán không hợp lệ bị bỏ qua: {evidence.sourceWarnings.excludedSaleItems} khi chọn danh sách, {evidence.warnings.excludedSaleItems} khi so sánh. Dòng trả không hợp lệ: {evidence.sourceWarnings.excludedReturnItems} và {evidence.warnings.excludedReturnItems}; dòng trả thiếu liên kết giá vốn: {evidence.sourceWarnings.missingReturnCostLinks} và {evidence.warnings.missingReturnCostLinks}.</p>
    </details>
  </>;
}

function PreviousActionsAnswer({ evidence }: { evidence: PreviousActionsEvidence }) {
  return <div className="assistant-result">
    <h3>Việc có thể làm tiếp</h3>
    <p>Dựa trên kết quả vừa xem: {evidence.conditions.join(" và ")}.</p>
    <p>Chỉ áp dụng cho {evidence.items.length} mã đã hiển thị: {evidence.items.map((item) => `${item.product} (${item.sku})`).join(", ")}.</p>
    <ul>{evidence.actions.map((action) => <li key={action}>{action}</li>)}</ul>
    <p className="assistant-result-note">Đây là gợi ý kiểm tra, không tự đặt hàng hay xử lý hàng. Tình trạng thực tế có thể đã thay đổi; hãy kiểm tra lại trước khi quyết định.</p>
    {evidence.sourcePartial && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Kết quả trước có thể chưa đầy đủ.</p>}
    {evidence.sourceTruncated && <p className="assistant-result-note">Danh sách trước chưa hiển thị toàn bộ; gợi ý chỉ áp dụng cho những mã đã hiện.</p>}
    {evidence.sourceInventoryCaution && <p className="assistant-result-note">Hãy kiểm tra lại các cảnh báo tồn nhiều hoặc hạn dùng trước khi nhập thêm.</p>}
    {evidence.overdueOrders && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Kết quả trước có đơn hàng đang về quá hạn; thời điểm giao chưa được xác nhận.</p>}
    {evidence.possibleStockoutBias && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Kết quả trước cho thấy việc từng hết hàng có thể làm mức bán thấp hơn nhu cầu thực.</p>}
    <p className="assistant-result-note">Thời điểm dữ liệu trong kết quả trước: {evidence.sourceTimes.map(({ label, at }) => `${label}: ${at ? new Date(at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}`).join("; ")}.</p>
  </div>;
}

function PreviousItemCoverAnswer({ evidence }: { evidence: PreviousItemCoverEvidence }) {
  const format = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  return <>
    <div className="assistant-result">
      <h3>Số ngày bán ước tính</h3>
      <p>{evidence.item.product} · Mã hàng: {evidence.item.sku} · Mục thứ {evidence.position} trong danh sách vừa xem.</p>
      {evidence.state === "unavailable" || evidence.daysOfCover === null || evidence.stockAvailable === null
        ? <p>Chưa có thông tin đủ mới và phù hợp để ước tính số ngày bán. Điều này không có nghĩa hàng đã hết hoặc còn đủ.</p>
        : <p>Có thể bán khoảng <strong>{format(evidence.daysOfCover)} ngày</strong> với {format(evidence.stockAvailable)} đơn vị có thể bán tại lần phân tích tồn kho.</p>}
      <p className="assistant-result-note">Đây là ước tính dựa trên tốc độ bán trung bình gần đây, không phải dự báo chắc chắn hay ngày hết hàng. Tồn kho thực tế có thể đã thay đổi.</p>
      {evidence.state === "partial" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách hoặc dữ liệu phân tích có thể chưa đầy đủ; hãy kiểm tra trước khi quyết định.</p>}
      {evidence.possibleStockoutBias && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Mã này có thể từng hết hàng, nên tốc độ bán ước tính có thể chưa phản ánh hết nhu cầu.</p>}
      {evidence.sourceTruncated && <p className="assistant-result-note">Danh sách trước chưa hiển thị toàn bộ; vị trí chỉ tính trong những mã đã hiện.</p>}
    </div>
    <details className="assistant-evidence"><summary>Nguồn và giới hạn</summary>
      <p>Dữ liệu bán dùng cho phân tích đến hết {evidence.dataAsOf ? displayDate(evidence.dataAsOf) : "ngày không rõ"}; lần phân tích hoàn tất {evidence.finishedAt ? new Date(evidence.finishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}. Tồn là tại lần phân tích, không phải tồn tức thời.</p>
      <p>Chỉ dùng số ngày đã tính trong cảnh báo tồn ít hoặc tồn nhiều còn hiệu lực và đủ mới. Không có cảnh báo phù hợp không chứng minh tồn kho an toàn.</p>
    </details>
  </>;
}

function SkuAnswer({ content, evidence }: { content: string; evidence: SkuEvidence }) {
  const stockout = evidence.type === "sku_stockout_v1";
  const warnings = evidence.warnings;
  return <>
    <div className="assistant-result">
      <span className="assistant-overline">{stockout ? "BÁN CHẠY VÀ NGUY CƠ HẾT HÀNG" : "CÁC MÃ HÀNG BÁN CHẠY"}</span>
      <h3>{stockout ? "Mã hàng cần chú ý" : "Bán nhiều nhất"}</h3>
      <p className="assistant-result-summary">{skuSummary(evidence, content)}</p>
      <p className="assistant-result-note">Số lượng bán từ {displayDate(evidence.period.from)} đến {displayDate(evidence.period.to)}; chưa trừ hàng khách trả lại. Danh sách có tối đa 5 mã.</p>
      {stockout && evidence.followUp && <p className="assistant-result-note">Đánh giá nguy cơ hết hàng dựa trên dự báo mới nhất, không phải số tồn trong khoảng thời gian bán đã chọn.</p>}
      {stockout && evidence.rankingCount !== 0 && <p className="assistant-result-note">{evidence.rankingCount != null ? `Trong ${evidence.rankingCount} mã bán chạy, chỉ liệt kê` : "Chỉ liệt kê"} những mã có nguy cơ sắp hết hàng cao hoặc cần xử lý gấp.</p>}
      {evidence.items.length > 0 && <ol className="assistant-ranking">{evidence.items.map((item) => <li key={item.variantId}>
        <div><strong>{item.product}</strong><span>Mã hàng: {item.sku}</span></div>
        <div><strong>{item.unitsSold.toLocaleString("vi-VN")} đã bán</strong>
          {stockout && <span>{item.severity === "CRITICAL" ? "Khẩn cấp" : "Nguy cơ cao"}{item.stockoutDate ? ` · Dự kiến hết ${displayDate(item.stockoutDate)}` : ""}</span>}</div>
      </li>)}</ol>}
      {(warnings.excludedSaleItems > 0 || warnings.excludedReturnItems > 0 || warnings.missingReturnCostLinks > 0) &&
        <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Một số dữ liệu chưa đầy đủ hoặc không hợp lệ có thể ảnh hưởng kết quả.</p>}
      {stockout && <p className="assistant-result-note">Ngày hết hàng chỉ là ước tính. Không thấy cảnh báo nguy cơ cao không đảm bảo hàng còn đủ; hãy kiểm tra thực tế trong kho.</p>}
    </div>
    <details className="assistant-evidence"><summary>Nguồn và thời điểm dữ liệu</summary>
      <p>Số bán tại quầy được đọc lúc {new Date(evidence.salesAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p>
      {stockout && <p>{evidence.riskState === "ready" ? `Dữ liệu cảnh báo đến ${evidence.riskDataAsOf ? displayDate(evidence.riskDataAsOf) : "chưa rõ"}; hoàn tất phân tích ${evidence.riskFinishedAt ? new Date(evidence.riskFinishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}.` : evidence.riskState === "unavailable" ? "Dự báo hoặc lần phân tích tồn kho chưa sẵn sàng hoặc đã cũ." : "Câu trả lời đã lưu không có thông tin trạng thái dự báo."}</p>}
      <p>Dòng bán chưa hợp lệ không được tính: {warnings.excludedSaleItems}; dòng trả chưa hợp lệ: {warnings.excludedReturnItems}; dòng trả thiếu liên kết giá vốn: {warnings.missingReturnCostLinks}.</p>
    </details>
  </>;
}

function SlowExpiryAnswer({ content, evidence }: { content: string; evidence: SlowExpiryEvidence }) {
  const formatNumber = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
  const severity = { CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
  return <>
    <div className="assistant-result">
      <span className="assistant-overline">BÁN CHẬM VÀ NGUY CƠ HẾT HẠN</span>
      <h3>Những mã hàng cần kiểm tra</h3>
      <p className="assistant-result-summary">{resultSummary(evidence, content)}</p>
      {evidence.state === "partial" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Kết quả có thể chưa đầy đủ do dự báo hoặc dữ liệu bán chưa sẵn sàng; hãy xem chi tiết bên dưới.</p>}
      {evidence.items.length > 0 && <div className="assistant-expiry-list">{evidence.items.map((item) => <section key={item.variantId} className="assistant-expiry-item">
        <strong>{item.product}</strong><span>Mã hàng: {item.sku}</span>
        <p>{item.neverSold === true ? "Chưa ghi nhận lần bán." : item.daysWithoutSale !== null ? `${formatNumber(item.daysWithoutSale)} ngày chưa bán.` : "Có cảnh báo bán chậm."}
          {item.sold30 !== null && ` Bán ${formatNumber(item.sold30)} trong 30 ngày sau khi trừ hàng trả.`}
          {item.stockAvailable !== null && ` Tồn có thể bán khi phân tích: ${formatNumber(item.stockAvailable)}.`}</p>
        {item.lots.map((lot) => <p className="assistant-expiry-lot" key={lot.id}>
          <strong>{lot.status === "expired" ? "Đã hết hạn" : lot.status === "unsellable" ? "Không thể bán" : "Nguy cơ không bán hết trước hạn"}</strong>
          {` · Mức ${severity[lot.severity]}`}
          {" · "}{lot.lotNumber ? `Lô ${lot.lotNumber}` : "Lô không rõ mã"}
          {lot.expirationDate ? ` · Hạn ${displayDate(lot.expirationDate)}` : " · Chưa rõ hạn"}
          {lot.lotQuantity !== null ? ` · Số lượng lô: ${formatNumber(lot.lotQuantity)}` : ""}
          {lot.atRiskQty !== null ? ` · Số lượng có nguy cơ: ${formatNumber(lot.atRiskQty)}` : ""}
        </p>)}
        {item.totalLots > item.lots.length && <span>Còn {item.totalLots - item.lots.length} lô có cảnh báo chưa hiển thị.</span>}
      </section>)}</div>}
      {evidence.totalSku !== null && evidence.totalSku > evidence.items.length && <p className="assistant-result-note">Đang hiển thị {evidence.items.length} trong {evidence.totalSku} mã có hai cảnh báo.</p>}
      <p className="assistant-result-note">Bao gồm cảnh báo ở mọi mức chưa được xử lý; lô đã hết hạn hoặc không thể bán được ghi riêng. Không thấy cả hai cảnh báo không có nghĩa là hàng chắc chắn an toàn. Hãy kiểm tra kho trước khi xử lý.</p>
      <p className="assistant-result-note"><Link to="/app/inventory-outlook">Xem cảnh báo tồn kho</Link></p>
    </div>
    <details className="assistant-evidence"><summary>Nguồn và giới hạn dữ liệu</summary>
      <p>Dữ liệu bán đến hết {evidence.dataAsOf ? displayDate(evidence.dataAsOf) : "ngày không rõ"}; phân tích hoàn tất {evidence.finishedAt ? new Date(evidence.finishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}. Các số liệu phản ánh thời điểm phân tích, không phải tồn kho tức thời.</p>
      <p>Trợ lý dựa trên cảnh báo của cửa hàng về hàng bán chậm và hàng có nguy cơ không bán hết trước hạn. Số lượng có nguy cơ chỉ là ước tính.</p>
      {evidence.warningCodes?.includes("INSUFFICIENT_HISTORY") && <p>Một số mã hàng chưa đủ lịch sử để đánh giá bán chậm.</p>}
      {evidence.warningCodes?.includes("NO_SALES_DATA") && <p>Chưa ghi nhận dữ liệu bán tại quầy trong 60 ngày gần nhất.</p>}
      {evidence.warningCodes?.includes("POSSIBLE_STOCKOUT_BIAS") && <p>Việc từng hết hàng có thể khiến nhu cầu của một số mã bị đánh giá thấp.</p>}
      {evidence.state === "partial" && <p>Thiếu dự báo, lịch sử bán hoặc thông tin chất lượng dữ liệu có thể khiến kết quả chưa đầy đủ.</p>}
      {evidence.state === "unavailable" && <p>Lần phân tích chưa sẵn sàng hoặc đã cũ; không thể kết luận có hay không có nguy cơ.</p>}
    </details>
  </>;
}

function ProfitRestockAnswer({ content, evidence }: { content: string; evidence: ProfitRestockEvidence }) {
  const urgency = { CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
  return <>
    <div className="assistant-result">
      <span className="assistant-overline">LỢI NHUẬN VÀ GỢI Ý NHẬP HÀNG</span>
      <h3>Mã hàng nên cân nhắc nhập</h3>
      <p className="assistant-result-summary">{resultSummary(evidence, content)}</p>
      <p className="assistant-result-note">Xem lợi nhuận từ {displayDate(evidence.period.from)} đến {displayDate(evidence.period.to)}. Trong các mã có lãi gộp và có gợi ý nhập đang chờ, mã có tổng lãi gộp cao hơn được xếp trước.</p>
      {evidence.state === "partial" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Dữ liệu bán hoặc dự báo chưa đầy đủ có thể ảnh hưởng danh sách và số liệu. Xem giới hạn bên dưới.</p>}
      {evidence.warningCodes?.includes("FORECAST_OVERDUE_PO") && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Có đơn hàng đang về đã quá hạn; thời điểm giao chưa được xác nhận.</p>}
      {evidence.items.length > 0 && <div className="assistant-expiry-list">{evidence.items.map((item) => <section key={item.variantId} className="assistant-expiry-item">
        <strong>{item.product}</strong><span>Mã hàng: {item.sku}</span>
        <p><strong>Lợi nhuận gộp: {posMoney(item.grossProfit)}</strong> trong kỳ</p>
        <p>Gợi ý nhập: <strong>{item.suggestedQty.toLocaleString("vi-VN")}</strong> · Mức ưu tiên: {urgency[item.urgency]}</p>
        <p>{item.supplierName ? `Nhà cung cấp gợi ý: ${item.supplierName}` : "Chưa có nhà cung cấp được gợi ý."}
          {item.orderByDate ? ` · Cân nhắc đặt trước ${displayDate(item.orderByDate)}` : ""}
          {item.stockoutDate ? ` · Dự kiến hết hàng ${displayDate(item.stockoutDate)}` : ""}</p>
      </section>)}</div>}
      {evidence.totalSku !== null && evidence.totalSku > evidence.items.length && <p className="assistant-result-note">Đang hiển thị {evidence.items.length} trong {evidence.totalSku} mã đủ điều kiện.</p>}
      <p className="assistant-result-note">Lợi nhuận gộp chưa trừ chi phí vận hành và không bảo đảm lợi nhuận tương lai. Số lượng chỉ là gợi ý, chưa tạo đơn; hãy kiểm tra tồn thực tế, hàng đang đặt, nhà cung cấp và kế hoạch bán trước khi quyết định.</p>
      <p className="assistant-result-note"><Link to="/app/replenishment">Xem gợi ý nhập hàng</Link></p>
    </div>
    <details className="assistant-evidence"><summary>Nguồn và giới hạn dữ liệu</summary>
      <p>Số bán tại quầy được cập nhật lúc {new Date(evidence.salesAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Dữ liệu gợi ý đến hết {evidence.riskDataAsOf ? displayDate(evidence.riskDataAsOf) : "ngày không rõ"}; phân tích hoàn tất {evidence.riskFinishedAt ? new Date(evidence.riskFinishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}. Hai nguồn được lấy ở các thời điểm khác nhau.</p>
      <p>Lợi nhuận gộp đã tính hàng trả và giá vốn theo số bán tại quầy. Dòng bán không hợp lệ: {evidence.warnings.excludedSaleItems}; dòng trả không hợp lệ: {evidence.warnings.excludedReturnItems}; dòng trả thiếu thông tin giá vốn: {evidence.warnings.missingReturnCostLinks}.</p>
      <p>Chỉ xét gợi ý đang chờ và còn hiệu lực; không xét gợi ý đã ẩn hoặc đã tạo đơn nháp. Không có gợi ý không chứng minh hàng không cần nhập.</p>
      {evidence.state === "partial" && <p>Một số dữ liệu chưa đủ để phân tích hoặc dự báo; danh sách có thể thiếu mã cần xem xét.</p>}
      {evidence.state === "unavailable" && <p>Gợi ý nhập hoặc dự báo chưa sẵn sàng hoặc đã cũ; không thể kết luận có hay không có mã cần nhập.</p>}
    </details>
  </>;
}

function OverstockForecastAnswer({ content, evidence }: { content: string; evidence: OverstockForecastEvidence }) {
  const format = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  return <>
    <div className="assistant-result">
      <span className="assistant-overline">TỒN NHIỀU VÀ DỰ BÁO BÁN GIẢM</span>
      <h3>Mã hàng nên kiểm tra tồn</h3>
      <p className="assistant-result-summary">{resultSummary(evidence, content)}</p>
      {evidence.state === "partial" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách có thể chưa đầy đủ do thiếu dữ liệu hoặc dự báo phù hợp. {evidence.skippedSku ? `Chưa đối chiếu được ${evidence.skippedSku} mã có cảnh báo tồn nhiều.` : ""}</p>}
      {evidence.items.length > 0 && <div className="assistant-expiry-list">{evidence.items.map((item) => <section key={item.variantId} className="assistant-expiry-item">
        <strong>{item.product}</strong><span>Mã hàng: {item.sku}</span>
        <p><strong>Dự báo giảm khoảng {format(item.dropPercent)}%</strong> so với mức bán bình quân 30 ngày trước.</p>
        <p>Đã bán {format(item.sold30)} trong 30 ngày · Dự báo bán {format(item.forecast7)} trong 7 ngày.</p>
        <p>Tồn có thể bán khi phân tích: {format(item.stockAvailable)} · Tương đương khoảng {format(item.daysOfCover)} ngày bán theo tốc độ dùng cho cảnh báo (ngưỡng {format(item.thresholdDays)} ngày).</p>
        {item.possibleStockoutBias && <p>Đã có ngày có thể hết hàng; mức bán trước đây có thể chưa phản ánh đủ nhu cầu.</p>}
      </section>)}</div>}
      {evidence.totalSku !== null && evidence.totalSku > evidence.items.length && <p className="assistant-result-note">Đang hiển thị {evidence.items.length} trong {evidence.totalSku} mã, ưu tiên số ngày tồn cao hơn.</p>}
      <p className="assistant-result-note">Dự báo chỉ là ước tính, không bảo đảm mức bán thực tế. Không có kết quả không chứng minh tồn kho phù hợp; kiểm tra tồn thực tế và kế hoạch bán trước khi quyết định.</p>
      <p className="assistant-result-note"><Link to="/app/inventory-outlook">Xem cảnh báo tồn kho</Link></p>
    </div>
    <details className="assistant-evidence"><summary>Nguồn và giới hạn dữ liệu</summary>
      {evidence.salesPeriod && <p>Số bán tại quầy từ {displayDate(evidence.salesPeriod.from)} đến {displayDate(evidence.salesPeriod.to)} chưa trừ hàng trả; được lấy khi trả lời và có thể đã thay đổi sau lần phân tích tồn kho.</p>}
      {evidence.forecastPeriod && <p>Dự báo cho {displayDate(evidence.forecastPeriod.from)} – {displayDate(evidence.forecastPeriod.to)}; chỉ dùng dự báo đã công bố trước khi kỳ bắt đầu.</p>}
      <p>Dữ liệu tồn và dự báo đến hết {evidence.dataAsOf ? displayDate(evidence.dataAsOf) : "ngày không rõ"}; phân tích hoàn tất {evidence.finishedAt ? new Date(evidence.finishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}. Tồn phản ánh thời điểm phân tích, không phải tồn tức thời.</p>
      <p>Cảnh báo tồn nhiều dùng ngưỡng cửa hàng và tốc độ bán riêng của hệ thống, có thể loại ngày hết hàng và tính sau hàng trả; khác với mốc bán trước trả hàng dùng để so sánh dự báo. Chỉ xét cảnh báo đang mở hoặc đã ghi nhận.</p>
      <p>Khi hết hàng, số bán tại quầy có thể không phản ánh hết nhu cầu; số liệu kho và dự báo cũng có thể chưa chính xác.</p>
      {evidence.state === "unavailable" && <p>Phân tích hoặc dự báo chưa sẵn sàng hoặc đã cũ; không thể kết luận có hay không có mã cần kiểm tra.</p>}
    </details>
  </>;
}

function PreviousRestockAnswer({ content, evidence }: { content: string; evidence: PreviousRestockEvidence | TopSellersRestockEvidence | TopSellersRestockExpiryEvidence | TopSellersRestockOverstockEvidence }) {
  const ranked = evidence.type !== "previous_restock_v1";
  const withExpiry = evidence.type === "top_sellers_restock_near_expiry_v1";
  const withOverstock = evidence.type === "top_sellers_restock_overstock_v1";
  const urgency = { CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
  const caution: Record<string, string> = { OVERSTOCK: "tồn nhiều", EXPIRATION_RISK: "nguy cơ hết hạn", SLOW_MOVING: "bán chậm" };
  return <>
    <div className="assistant-result">
      <span className="assistant-overline">{withExpiry ? "BÁN CHẠY, GỢI Ý NHẬP VÀ LÔ GẦN HẠN" : withOverstock ? "BÁN CHẠY, GỢI Ý NHẬP VÀ TỒN NHIỀU" : ranked ? "BÁN CHẠY VÀ GỢI Ý NHẬP" : "GỢI Ý NHẬP TRONG DANH SÁCH VỪA XEM"}</span>
      <h3>Các mã cần cân nhắc</h3>
      <p className="assistant-result-summary">{resultSummary(evidence, content)}</p>
      {ranked && <p className="assistant-result-note">Chỉ xét tối đa 5 mã bán chạy nhất từ {displayDate(evidence.period.from)} đến {displayDate(evidence.period.to)}; số bán chưa trừ hàng khách trả lại.</p>}
      {evidence.state === "partial" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách trước hoặc dữ liệu dự báo có thể chưa đầy đủ; kết quả có thể thiếu mã cần xem xét. {withOverstock && evidence.skippedSku ? `Chưa đối chiếu được ${evidence.skippedSku} mã do thiếu thông tin tồn.` : ""}</p>}
      {evidence.sourceTruncated && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách trước còn mã chưa hiển thị; ở đây chỉ kiểm tra những mã đã hiện trong câu trả lời gần nhất.</p>}
      {evidence.sourceInventoryCaution && !withExpiry && !withOverstock && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Danh sách trước đó có vấn đề tồn nhiều hoặc nguy cơ hết hạn; kiểm tra lại tồn và hạn dùng trước khi nhập thêm.</p>}
      {evidence.warningCodes?.includes("FORECAST_OVERDUE_PO") && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Có đơn hàng đang về đã quá hạn; thời điểm giao chưa được xác nhận.</p>}
      {evidence.items.length > 0 && <div className="assistant-expiry-list">{evidence.items.map((item) => <section key={item.variantId} className="assistant-expiry-item">
        <strong>{item.product}</strong><span>Mã hàng: {item.sku}</span>
        {"unitsSold" in item && <p>Đã bán: {item.unitsSold.toLocaleString("vi-VN")}</p>}
        <p><strong>Mức ưu tiên: {urgency[item.urgency]}</strong> · Gợi ý nhập: {item.suggestedQty.toLocaleString("vi-VN")}</p>
        <p>{item.orderByDate ? `Cân nhắc đặt trước ${displayDate(item.orderByDate)}` : "Chưa có ngày nên đặt"}
          {item.stockoutDate ? ` · Dự kiến hết hàng ${displayDate(item.stockoutDate)}` : ""}
          {item.supplierName ? ` · Nhà cung cấp: ${item.supplierName}` : " · Chưa có nhà cung cấp được gợi ý"}</p>
        {item.cautions.length > 0 && <p>Đang có cảnh báo: {item.cautions.map((code) => caution[code] ?? "cảnh báo khác").join(", ")}. Hãy kiểm tra trước khi nhập.</p>}
        {"stockAvailable" in item && <p>Tồn có thể bán khi phân tích: {item.stockAvailable.toLocaleString("vi-VN")} · Khoảng {item.daysOfCover.toLocaleString("vi-VN")} ngày bán (ngưỡng {item.thresholdDays.toLocaleString("vi-VN")} ngày).</p>}
        {"possibleStockoutBias" in item && item.possibleStockoutBias && <p>Các ngày từng hết hàng có thể ảnh hưởng tốc độ bán ước tính.</p>}
        {"lots" in item && <ExpiryLots lots={item.lots} totalLots={item.totalLots} />}
      </section>)}</div>}
      {withExpiry && evidence.state !== "unavailable" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Kiểm tra lô gần hạn và tồn thực tế trước khi quyết định nhập thêm. Lô gần hạn không đồng nghĩa không bán hết; có thể gồm hàng hư hoặc cách ly.</p>}
      {withOverstock && evidence.state !== "unavailable" && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Gợi ý nhập và cảnh báo tồn nhiều cần được đối chiếu với tồn thực tế, hàng đang về và kế hoạch bán trước khi quyết định.</p>}
      <p className="assistant-result-note">{ranked ? "Giữ thứ tự bán chạy, không xếp theo mức khẩn cấp." : "Xếp theo mức khẩn cấp, rồi ngày nên đặt sớm hơn."} Số lượng chỉ là gợi ý và chưa tạo đơn. Không có gợi ý không chứng minh không cần nhập; hãy kiểm tra tồn thực tế và hàng đang về.</p>
      <p className="assistant-result-note"><Link to="/app/replenishment">Xem gợi ý nhập hàng</Link></p>
    </div>
    <details className="assistant-evidence"><summary>Nguồn và giới hạn dữ liệu</summary>
      <p>{ranked ? `Đối chiếu ${evidence.sourceCount} mã bán chạy trong kỳ; chỉ xét tối đa 5 mã bán nhiều nhất.` : `Đối chiếu ${evidence.sourceCount} mã đã hiển thị trong câu trả lời gần nhất, không tự mở rộng sang mã khác.`} Gợi ý nhập là đề xuất mới nhất, vẫn đang chờ xử lý và chưa bị ẩn hoặc đưa vào đơn nháp.</p>
      {ranked && <p>Số bán tại quầy được đọc lúc {new Date(evidence.salesAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}; gợi ý nhập đọc riêng khi trả lời, không phản ánh tình trạng kho trong kỳ bán đã chọn.</p>}
      {withExpiry && <p>Tồn và hạn lô được đọc lúc {evidence.inventoryAsOf ? new Date(evidence.inventoryAsOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}; ngày xét hạn {evidence.inventoryDay ? displayDate(evidence.inventoryDay) : "chưa rõ"}. Ngưỡng lô chưa cấu hình dùng 30 ngày.</p>}
      <p>Dữ liệu phân tích đến hết {evidence.dataAsOf ? displayDate(evidence.dataAsOf) : "ngày không rõ"}; hoàn tất {evidence.finishedAt ? new Date(evidence.finishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa rõ"}. Tồn và dự báo có thể khác thực tế.</p>
      {evidence.state === "unavailable" && <p>Dự báo hoặc gợi ý nhập chưa sẵn sàng hoặc đã cũ; không thể kết luận có hay không có mã cần nhập.</p>}
    </details>
  </>;
}

function Answer({ content, evidence }: { content: string; evidence: ComparisonEvidence | null }) {
  const marker = "\n\nDiễn giải AI: ";
  const index = evidence ? content.indexOf(marker) : -1;
  const interpretation = index >= 0 ? content.slice(index + marker.length) : content;
  const warnings = evidence?.warnings;
  const hasWarnings = warnings && (warnings.excludedSaleItems > 0 || warnings.excludedReturnItems > 0 || warnings.missingReturnCostLinks > 0);
  const snapshotDay = evidence && new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(evidence.asOf));
  const incomplete = evidence && snapshotDay && evidence.ranges.current.to >= snapshotDay;
  const change = evidence?.difference;
  const unchanged = change && /^-?0+\.00$/.test(change);
  const direction = unchanged ? "Không đổi" : change?.startsWith("-") ? "Giảm" : "Tăng";
  return <>
    {evidence && <div className="assistant-result">
      <div className="assistant-result-heading">
        <div><span className="assistant-overline">BỨC TRANH KINH DOANH</span>
          <h3>{evidence.metric === "netRevenue" ? "Doanh thu thuần" : "Lợi nhuận gộp"}</h3>
          <p>{evidence.subject ? `${evidence.subject.product}${evidence.subject.sku ? ` · ${evidence.subject.sku}` : ""}` : "Toàn cửa hàng"}</p>
        </div>
        <span className={`assistant-change ${unchanged ? "is-neutral" : change?.startsWith("-") ? "is-down" : "is-up"}`}>
          {direction}{!unchanged && change ? ` ${posMoney(change.replace(/^-/, ""))}` : ""}
          {evidence.percent != null && !unchanged ? ` · khoảng ${evidence.percent.replace(/^-/, "").replace(".", ",")}%` : ""}
        </span>
      </div>
      <div className="assistant-metrics">
        <div><span>Khoảng thời gian bạn hỏi</span><strong>{posMoney(evidence.current)}</strong>
          <small>{displayDate(evidence.ranges.current.from)} – {displayDate(evidence.ranges.current.to)}</small></div>
        <div><span>Khoảng thời gian trước đó</span><strong>{posMoney(evidence.previous)}</strong>
          <small>{displayDate(evidence.ranges.previous.from)} – {displayDate(evidence.ranges.previous.to)}</small></div>
      </div>
      <p className="assistant-result-note">Đây là mức thay đổi được ghi nhận, chưa cho biết nguyên nhân.</p>
      {evidence.followUp?.operation === "change_comparison_metric" && <p className="assistant-result-note">Giữ nguyên phạm vi và khoảng thời gian trước; số liệu được tính lại và có thể đã thay đổi kể từ câu trả lời trước.</p>}
      {evidence.percent === null && <p className="assistant-result-note">Không thể tính tỷ lệ phần trăm vì số của khoảng thời gian trước bằng 0 hoặc âm.</p>}
      {evidence.metric === "grossProfit" && <p className="assistant-result-note">Lợi nhuận gộp chưa trừ chi phí vận hành, nên chưa phải lợi nhuận cuối cùng.</p>}
      {incomplete && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Kỳ đang xem chưa kết thúc tại thời điểm cập nhật, số liệu có thể còn thay đổi.</p>}
      {hasWarnings && <p className="assistant-result-warning"><AlertTriangle size={16} aria-hidden="true" /> Một số dữ liệu chưa đầy đủ hoặc không hợp lệ có thể ảnh hưởng đến kết quả. Xem chi tiết bên dưới.</p>}
    </div>}
    {(index >= 0 || !evidence) && <div className="assistant-interpretation">
      <div className="assistant-interpretation-title"><Sparkles size={16} aria-hidden="true" /> {index >= 0 ? "Góc nhìn của trợ lý" : "Nội dung trả lời"}</div>
      <div className="assistant-answer-text">{interpretation.split("\n").map((line, lineIndex) => {
        const cleaned = line.replace(/^#{1,6}\s+/, "").replace(/^\s*[-*]\s+/, "• ");
        return cleaned.trim() ? <p key={lineIndex}>{cleaned.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
          part.startsWith("**") && part.endsWith("**") ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}</p> : null;
      })}</div>
      {index >= 0 && <p className="assistant-ai-note">AI có thể nhầm lẫn. Hãy đối chiếu số liệu trước khi quyết định.</p>}
    </div>}
    {evidence && index < 0 && content && <details className="assistant-evidence"><summary>Xem nội dung đã lưu</summary><p>{content}</p></details>}
    {evidence && <Evidence evidence={evidence} />}
  </>;
}

const questionDescriptions: Record<Exclude<QuestionKind, "unsupported">, string> = {
  top_sellers: "5 mã hàng bán chạy nhất trong 7 ngày gần đây.",
  top_sellers_stockout: "Trong nhóm 5 mã bán chạy nhất 7 ngày gần đây, mã nào có nguy cơ sắp hết hàng cao?",
  top_sellers_overstock: "Trong nhóm 5 mã bán chạy nhất 7 ngày gần đây, mã nào đang có lượng hàng tồn cao?",
  top_sellers_near_expiry: "Trong nhóm 5 mã bán chạy nhất 7 ngày gần đây, mã nào còn lô hàng sắp hết hạn?",
  top_sellers_restock: "Trong nhóm 5 mã bán chạy nhất 7 ngày gần đây, mã nào đang được gợi ý nhập thêm?",
  top_sellers_composed: "Trong nhóm 5 mã bán chạy nhất 7 ngày gần đây, mã nào vừa còn nhiều hàng trong kho vừa có lô sắp hết hạn?",
  change_sku_period: "Xem lại danh sách mã bán chạy trong khoảng thời gian đã chọn.",
  compare_previous_sku_sales: "So sánh lượng bán của các mã vừa xem với khoảng thời gian ngay trước đó có cùng số ngày.",
  previous_item_cover: "Ước tính lượng hàng hiện có thể bán trong bao nhiêu ngày cho một mã vừa xem.",
  previous_actions: "Các việc nên kiểm tra dựa trên danh sách và cảnh báo vừa xem.",
  slow_moving_expiry: "Mã nào bán chậm và có hàng sắp hết hạn, đã hết hạn hoặc không thể bán? Bao gồm mọi mức cảnh báo.",
  profit_restock: "Trong các mã đang được đề xuất nhập và có lãi gộp trong 30 ngày qua, 5 mã nào lãi cao nhất?",
  overstock_forecast: "Mã nào đang tồn nhiều và dự kiến lượng bán tuần tới thấp hơn ít nhất 10% so với trung bình 30 ngày qua?",
  previous_restock: "Trong danh sách vừa xem, mã nào đang được gợi ý nhập thêm? Xếp theo mức ưu tiên và ngày nên đặt.",
  previous_stockout: "Trong danh sách bán chạy vừa xem, mã nào có nguy cơ sắp hết hàng cao?",
  previous_near_expiry: "Trong danh sách vừa xem, mã nào còn lô hàng sắp hết hạn?",
  previous_overstock: "Trong danh sách vừa xem, mã nào đang có lượng hàng tồn cao?",
};

function descriptionFor(evidence: Exclude<AssistantEvidence, ComparisonEvidence>) {
  if (evidence.type === "top_sellers_restock_near_expiry_v1") return "Trong nhóm 5 mã bán chạy nhất của khoảng thời gian đã chọn, mã nào vừa được gợi ý nhập thêm vừa còn lô sắp hết hạn?";
  if (evidence.type === "top_sellers_restock_overstock_v1") return "Trong nhóm 5 mã bán chạy nhất của khoảng thời gian đã chọn, mã nào vừa được gợi ý nhập thêm vừa đang có nhiều hàng trong kho?";
  if (evidence.type === "previous_actions_v1") return questionDescriptions.previous_actions;
  if (evidence.type === "previous_item_cover_v1") return `Số ngày bán ước tính của mã thứ ${evidence.position} (${evidence.item.sku}) trong danh sách vừa xem.`;
  if (evidence.type === "previous_overstock_v1") return questionDescriptions.previous_overstock;
  if (evidence.type === "sku_sales_comparison_v1") return questionDescriptions.compare_previous_sku_sales;
  if (evidence.type === "comparison_breakdown_v1") {
    return `Chi tiết ${evidence.metric === "netRevenue" ? "doanh thu thuần" : "lợi nhuận gộp"} theo từng ${evidence.level === "product" ? "sản phẩm của cửa hàng" : `mã hàng thuộc ${evidence.subject?.product ?? "sản phẩm đã xem"}`}, so với kỳ trước.`;
  }
  if ("followUp" in evidence && evidence.followUp?.operation === "change_period") {
    const descriptions: Partial<Record<QuestionKind, string>> = {
      top_sellers: "5 mã hàng bán chạy nhất trong khoảng thời gian đã chọn.",
      top_sellers_stockout: "Trong nhóm 5 mã bán chạy nhất của khoảng thời gian đã chọn, mã nào có nguy cơ sắp hết hàng cao?",
      top_sellers_overstock: "Trong nhóm 5 mã bán chạy nhất của khoảng thời gian đã chọn, mã nào đang có lượng hàng tồn cao?",
      top_sellers_near_expiry: "Trong nhóm 5 mã bán chạy nhất của khoảng thời gian đã chọn, mã nào còn lô hàng sắp hết hạn?",
      top_sellers_composed: "Trong nhóm 5 mã bán chạy nhất của khoảng thời gian đã chọn, mã nào vừa còn nhiều hàng trong kho vừa có lô sắp hết hạn?",
      top_sellers_restock: "Trong nhóm 5 mã bán chạy nhất của khoảng thời gian đã chọn, mã nào đang được gợi ý nhập thêm?",
    };
    if (evidence.analysis && descriptions[evidence.analysis]) return descriptions[evidence.analysis];
  }
  if (evidence.analysis) return questionDescriptions[evidence.analysis];
  if (evidence.type === "top_sellers_v1") return questionDescriptions.top_sellers;
  if (evidence.type === "sku_stockout_v1") return "Các mã bán chạy cần ưu tiên kiểm tra vì có thể sắp hết hàng.";
  if (evidence.type === "top_sellers_overstock_v1") return questionDescriptions.top_sellers_overstock;
  if (evidence.type === "top_sellers_near_expiry_v1") return questionDescriptions.top_sellers_near_expiry;
  if (evidence.type === "top_sellers_overstock_near_expiry_v1") return questionDescriptions.top_sellers_composed;
  if (evidence.type === "top_sellers_restock_v1") return questionDescriptions.top_sellers_restock;
  if (evidence.type === "slow_expiry_v1") return questionDescriptions.slow_moving_expiry;
  if (evidence.type === "profit_restock_v1") return questionDescriptions.profit_restock;
  if (evidence.type === "overstock_forecast_v1") return questionDescriptions.overstock_forecast;
  if (evidence.type === "previous_near_expiry_v1") return questionDescriptions.previous_near_expiry;
  return questionDescriptions.previous_restock;
}

export function Workspace({ isOwner, compact = false }: { isOwner: boolean; compact?: boolean }) {
  const location = useLocation();
  const [question, setQuestion] = useState(() => {
    const context = new URLSearchParams(compact ? "" : location.search);
    const fromParam = context.get("from");
    const toParam = context.get("to");
    const metric = context.get("metric");
    if ((metric === "netRevenue" || metric === "grossProfit") && fromParam && toParam &&
        /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
      return `${metric === "grossProfit" ? "Lợi nhuận gộp" : "Doanh thu thuần"} từ ${fromParam} đến ${toParam} so với kỳ trước thế nào?`;
    }
    return "";
  });
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const list = useLoad(() => listConversations(page), [page]);
  const consent = useLoad(getOpenAiConsent, []);
  const action = useAction();
  const consentAction = useAction();
  const historyVersion = useRef(0);
  const locallyCreatedId = useRef<string | null>(null);
  const [historyError, setHistoryError] = useState("");
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (compact && previousPath.current === "/app/assistant" && location.pathname !== "/app/assistant") consent.reload();
    previousPath.current = location.pathname;
  }, [compact, location.pathname]);
  useEffect(() => {
    if (compact && threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [compact, conversation?.messages.length, action.busy]);
  useEffect(() => {
    let active = true;
    const version = ++historyVersion.current;
    setHistoryError("");
    if (selected && locallyCreatedId.current === selected) return () => { active = false; };
    locallyCreatedId.current = null;
    setConversation(null);
    if (selected) getConversation(selected).then((value) => { if (active && historyVersion.current === version) setConversation(value); })
      .catch((error: unknown) => { if (active && historyVersion.current === version) setHistoryError(error instanceof Error ? error.message : "Không tải được cuộc trò chuyện."); });
    return () => { active = false; };
  }, [selected]);
  const invalidate = () => { action.setError(""); };
  const submit = () => void action.run(async () => {
    const interpretation = await interpretQuestion(question, selected ?? undefined);
    if (interpretation.kind === "unsupported") throw new Error("Chưa nhận diện được câu hỏi phù hợp. Hãy diễn đạt lại hoặc tham khảo các gợi ý.");
    if (interpretation.kind === "clarify_comparison") throw new Error(interpretation.clarification);
    if (interpretation.kind === "previous_stockout" && (!interpretation.hasPreviousRanking || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem danh sách bán chạy trong cuộc trò chuyện này trước khi hỏi 'trong số đó'.");
    }
    if (interpretation.kind === "previous_restock" && (!interpretation.hasPreviousSkuList || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem một danh sách mã hàng trong cuộc trò chuyện này trước khi hỏi tiếp.");
    }
    if (interpretation.kind === "previous_near_expiry" && (!interpretation.hasPreviousSkuList || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem một danh sách mã hàng trong cuộc trò chuyện này trước khi hỏi tiếp.");
    }
    if (interpretation.kind === "previous_overstock" && (!interpretation.hasPreviousSkuList || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem một danh sách mã hàng trong cuộc trò chuyện này trước khi hỏi tiếp.");
    }
    if (interpretation.kind === "change_sku_period" && (!interpretation.hasPreviousSkuQuery || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem lại câu hỏi bán chạy có thể đổi kỳ trong cuộc trò chuyện này trước khi hỏi tiếp.");
    }
    if (interpretation.kind === "change_comparison_metric" && (!interpretation.hasPreviousComparison || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem một câu so sánh doanh thu hoặc lợi nhuận gộp trong cuộc trò chuyện này trước khi hỏi tiếp.");
    }
    if (interpretation.kind === "comparison_breakdown" && (!interpretation.hasPreviousComparisonBreakdown || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem so sánh toàn cửa hàng trước khi xem theo sản phẩm, hoặc so sánh một sản phẩm trước khi xem theo mã hàng.");
    }
    if (interpretation.kind === "compare_previous_sku_sales" && (!interpretation.hasComparableRanking || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem danh sách bán chạy có dữ liệu trước khi so sánh số bán với kỳ liền trước.");
    }
    if (interpretation.kind === "previous_item_cover" && (!interpretation.hasPreviousSkuList || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem một danh sách mã hàng trong cuộc trò chuyện này trước khi hỏi tiếp.");
    }
    if (interpretation.kind === "previous_actions" && (!interpretation.hasPreviousActions || !interpretation.previousMessageId)) {
      throw new Error("Hãy xem lại danh sách có cảnh báo tồn kho hoặc gợi ý nhập trước khi hỏi nên làm gì.");
    }
    let id = selected;
    if (!id) {
      const created = await createConversation();
      id = created.id; locallyCreatedId.current = id;
      setConversation({ ...created, messages: [] }); setSelected(id); list.reload();
    }
    let result;
    if (interpretation.kind === "previous_item_cover") {
      if (!interpretation.previousMessageId) throw new Error("Hãy xem lại danh sách mã hàng trước khi hỏi tiếp.");
      result = await sendPreviousItemCover(id, question, interpretation.position, interpretation.previousMessageId);
    } else if (interpretation.kind === "comparison_breakdown") {
      if (!interpretation.previousMessageId) throw new Error("Hãy xem lại câu so sánh trước khi hỏi tiếp.");
      result = await sendComparisonBreakdown(id, question, interpretation.level, interpretation.previousMessageId);
    } else if (interpretation.kind === "change_comparison_metric") {
      if (!interpretation.previousMessageId) throw new Error("Hãy xem lại câu so sánh trước khi hỏi tiếp.");
      result = await sendComparisonMetricChange(id, question, interpretation.metric, interpretation.previousMessageId);
    } else {
      result = interpretation.kind === "comparison"
        ? await sendQuestion(id, { question, ...interpretation.comparison })
        : interpretation.kind === "top_sellers_composed"
        ? await sendSkuQuestion(id, question, interpretation.kind, undefined, interpretation.filters)
        : interpretation.kind === "change_sku_period"
        ? await sendSkuQuestion(id, question, interpretation.kind, interpretation.previousMessageId, undefined, interpretation.periodChange)
        : await sendSkuQuestion(id, question, interpretation.kind, interpretation.previousMessageId);
    }
    ++historyVersion.current;
    setConversation((current) => current && current.id === id
      ? { ...current, messages: [...current.messages, ...result.messages] }
      : { id: id!, createdAt: result.messages[0].createdAt, updatedAt: result.messages[1].createdAt, messages: result.messages });
    setHistoryError("");
    setQuestion(""); invalidate(); list.reload();
  });
  return <main className="bd-page assistant-page">
    <header className="assistant-hero">
      <div><span className="assistant-hero-eyebrow"><Sparkles size={15} aria-hidden="true" /> TRỢ LÝ KINH DOANH</span>
        <h1>Hiểu hơn về việc kinh doanh</h1>
        <p>Khám phá mã hàng bán chạy, nguy cơ hết hàng, hàng bán chậm có nguy cơ hết hạn hoặc so sánh kết quả kinh doanh.</p>
      </div>
      <div className="assistant-hero-tip"><Bot size={21} aria-hidden="true" /><p><strong>Một người bạn đồng hành</strong><br />Trợ lý dựa trên số liệu bán tại quầy, không thay thế quyết định của bạn.</p></div>
    </header>
    {compact ? <div className="assistant-compact-notice">
      <p>Câu hỏi bạn nhập được gửi tới OpenAI để nhận diện; kết quả kinh doanh không được gửi. Đừng nhập điều bạn không muốn chia sẻ.</p>
      <ErrorBox error={consent.error} />
      {consent.loading ? <span role="status">Đang kiểm tra quyền chia sẻ…</span> : !consent.data?.enabled && <>
        <p>Chủ cửa hàng cần cho phép chia sẻ trước khi dùng trợ lý. <Link to="/app/assistant">Quản lý chia sẻ</Link></p>
        <button type="button" onClick={consent.reload}>Kiểm tra lại</button>
      </>}
    </div> : <section className="bd-data-workspace assistant-consent">
      <div className="assistant-consent-heading"><div><ShieldCheck size={19} aria-hidden="true" /><h2>Chia sẻ dữ liệu với OpenAI</h2></div>
        {consent.data && <span className={`assistant-consent-status ${consent.data.enabled ? "is-enabled" : ""}`}>{consent.data.enabled ? "Đã cho phép" : "Chưa cho phép"}</span>}
      </div>
      <p>Để hiểu câu hỏi kết hợp, trợ lý gửi câu hỏi tới OpenAI. Đừng nhập thông tin bạn không muốn chia sẻ.</p>
      <details className="assistant-consent-details" open={!consent.data?.enabled}>
        <summary>Thông tin được chia sẻ và cách sử dụng</summary>
        <p>OpenAI nhận nội dung câu hỏi và thông tin có hay không có danh sách trước đó, không nhận kết quả truy vấn hoặc nội dung lịch sử. Câu hỏi vẫn có thể chứa thông tin người dùng tự nhập. OpenAI xử lý dữ liệu theo chính sách của họ; yêu cầu được gửi với tùy chọn không lưu phản hồi trên API. Ngừng chia sẻ không hủy yêu cầu đang xử lý hoặc thu hồi dữ liệu đã gửi.</p>
      </details>
      <ErrorBox error={consent.error} /><ErrorBox error={consentAction.error} />
      {consent.loading && <p role="status">Đang tải lựa chọn chia sẻ…</p>}
      {isOwner && consent.data && (consent.data.enabled
        ? <Button type="button" variant="outline" disabled={consentAction.busy} onClick={() => void consentAction.run(async () => {
          await setOpenAiConsent(false); setConsentAcknowledged(false); invalidate(); consent.reload();
        })}>Ngừng chia sẻ với OpenAI</Button>
        : <div className="assistant-consent-action"><label><input type="checkbox" checked={consentAcknowledged} onChange={(event) => setConsentAcknowledged(event.target.checked)} /> Tôi là chủ cửa hàng và đồng ý cho người dùng được cấp quyền gửi dữ liệu như mô tả tới OpenAI.</label>
          <Button type="button" disabled={!consentAcknowledged || consentAction.busy} onClick={() => void consentAction.run(async () => {
            await setOpenAiConsent(true); consent.reload();
          })}>Cho phép chia sẻ với OpenAI</Button></div>)}
      {!isOwner && consent.data && !consent.data.enabled && <p>Chủ cửa hàng cần cho phép trước khi sử dụng.</p>}
    </section>}
    <div className="assistant-layout">
      <details className={`assistant-history-details${compact ? " is-compact" : ""}`} open={!compact}>
      <summary>Lịch sử trò chuyện</summary>
      <aside className="bd-data-workspace assistant-sidebar"><div className="assistant-section-heading"><div><h2>Cuộc trò chuyện</h2><p>Xem lại những lần bạn đã hỏi</p></div></div>
        <Button type="button" variant="outline" disabled={action.busy} onClick={() => { setSelected(null); setConversation(null); invalidate(); }}><Plus size={16} aria-hidden="true" /> Cuộc trò chuyện mới</Button>
        <ErrorBox error={list.error} />
        {list.loading && <p role="status">Đang tải lịch sử…</p>}
        {!list.loading && !list.error && list.data?.items.length === 0 && <p className="assistant-history-empty">Các cuộc trò chuyện của bạn sẽ xuất hiện ở đây.</p>}
        <ul className="assistant-history">{list.data?.items.map((item) => <li key={item.id}>
          <button type="button" disabled={action.busy} aria-current={selected === item.id ? "true" : undefined} onClick={() => { setSelected(item.id); invalidate(); }}>
            <MessageCircle size={16} aria-hidden="true" /><span><small>Cập nhật</small>{new Date(item.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span>
          </button>
          <button type="button" disabled={action.busy} aria-label={`Xóa cuộc trò chuyện ${new Date(item.createdAt).toLocaleString("vi-VN")}`}
            onClick={() => { if (window.confirm("Xóa cuộc trò chuyện này?")) void action.run(async () => {
              await deleteConversation(item.id); if (selected === item.id) setSelected(null); list.reload();
            }); }}>Xóa</button>
        </li>)}</ul>
        <div className="assistant-pagination"><button type="button" disabled={page === 1 || action.busy} onClick={() => setPage(page - 1)}>Trang trước</button>
          {" · "}{page}{" · "}<button type="button" disabled={!list.data?.hasMore || action.busy} onClick={() => setPage(page + 1)}>Trang sau</button></div>
      </aside>
      </details>
      <section className="bd-data-workspace assistant-main"><div className="assistant-section-heading"><div><h2>Hỏi đáp kinh doanh</h2><p>Hỏi tự nhiên và kiểm tra cách hiểu cùng câu trả lời.</p></div></div>
        <div className="assistant-thread" ref={threadRef}>
        <ErrorBox error={historyError} /><ErrorBox error={action.error} />
        {selected && !conversation && !historyError && <p role="status">Đang tải cuộc trò chuyện…</p>}
        {!selected && !conversation && <div className="assistant-empty"><div><Sparkles size={20} aria-hidden="true" /></div>
          <strong>Bắt đầu từ một câu hỏi</strong><p>Ví dụ: “Mã hàng nào bán chạy và có nguy cơ hết hàng?”</p></div>}
        {conversation?.messages.map((message, index, messages) => <article className={`assistant-message ${message.role === "user" ? "is-user" : "is-assistant"}`} key={message.id}>
          <div className="assistant-message-label">{message.role === "user" ? <MessageCircle size={16} aria-hidden="true" /> : <Bot size={17} aria-hidden="true" />}
            <strong>{message.role === "user" ? "Câu hỏi của bạn" : "Trợ lý kinh doanh"}</strong></div>
          {message.role === "assistant" && message.evidence && <div className="assistant-understanding">
            <strong className="assistant-understanding-heading">Mình hiểu bạn muốn xem</strong>
            {"type" in message.evidence
              ? <dl>
                <div><dt>Nội dung</dt><dd>{descriptionFor(message.evidence)}</dd></div>
                {"period" in message.evidence && <div><dt>Thời gian bán</dt><dd>{displayDate(message.evidence.period.from)} – {displayDate(message.evidence.period.to)}</dd></div>}
                {isComparisonBreakdownEvidence(message.evidence) && <>
                  <div><dt>Khoảng bạn hỏi</dt><dd>{displayDate(message.evidence.ranges.current.from)} – {displayDate(message.evidence.ranges.current.to)}</dd></div>
                  <div><dt>So với</dt><dd>{displayDate(message.evidence.ranges.previous.from)} – {displayDate(message.evidence.ranges.previous.to)}</dd></div>
                </>}
              </dl>
              : <dl>
                <div><dt>Nội dung</dt><dd>{message.evidence.metric === "netRevenue" ? "Doanh thu thuần" : "Lợi nhuận gộp"} {message.evidence.subject ? message.evidence.subject.sku ? `của mã ${message.evidence.subject.sku} (${message.evidence.subject.product})` : `của tất cả mã hàng thuộc ${message.evidence.subject.product}` : "của toàn cửa hàng"}.</dd></div>
                <div><dt>Khoảng bạn hỏi</dt><dd>{displayDate(message.evidence.ranges.current.from)} – {displayDate(message.evidence.ranges.current.to)}</dd></div>
                <div><dt>So với</dt><dd>{displayDate(message.evidence.ranges.previous.from)} – {displayDate(message.evidence.ranges.previous.to)}</dd></div>
              </dl>}
            {messages[index - 1]?.role === "user" && <Button type="button" variant="outline" disabled={action.busy} onClick={() => {
              const evidence = message.evidence;
              if (!evidence) return;
              setQuestion(messages[index - 1].content);
              invalidate(); questionRef.current?.focus();
            }}>Sửa câu hỏi</Button>}
          </div>}
          {message.role === "user" ? <p className="assistant-user-text">{message.content}</p>
            : message.evidence && isSkuEvidence(message.evidence) ? <SkuAnswer content={message.content} evidence={message.evidence} />
              : message.evidence && isSlowExpiryEvidence(message.evidence) ? <SlowExpiryAnswer content={message.content} evidence={message.evidence} />
              : message.evidence && isProfitRestockEvidence(message.evidence) ? <ProfitRestockAnswer content={message.content} evidence={message.evidence} />
              : message.evidence && isOverstockForecastEvidence(message.evidence) ? <OverstockForecastAnswer content={message.content} evidence={message.evidence} />
              : message.evidence && isPreviousRestockEvidence(message.evidence) ? <PreviousRestockAnswer content={message.content} evidence={message.evidence} />
              : message.evidence && isTopSellerInventoryEvidence(message.evidence) ? <TopSellerInventoryAnswer evidence={message.evidence} />
              : message.evidence && isPreviousNearExpiryEvidence(message.evidence) ? <PreviousNearExpiryAnswer evidence={message.evidence} />
              : message.evidence && isPreviousOverstockEvidence(message.evidence) ? <PreviousOverstockAnswer content={message.content} evidence={message.evidence} />
              : message.evidence && isComparisonBreakdownEvidence(message.evidence) ? <ComparisonBreakdownAnswer evidence={message.evidence} />
              : message.evidence && isSkuSalesComparisonEvidence(message.evidence) ? <SkuSalesComparisonAnswer evidence={message.evidence} />
              : message.evidence && isPreviousItemCoverEvidence(message.evidence) ? <PreviousItemCoverAnswer evidence={message.evidence} />
              : message.evidence && isPreviousActionsEvidence(message.evidence) ? <PreviousActionsAnswer evidence={message.evidence} />
              : <Answer content={message.content} evidence={message.evidence} />}
        </article>)}
        {action.busy && <p className="assistant-working" role="status">Đang xử lý yêu cầu, vui lòng đợi…</p>}
        </div>
        <fieldset disabled={action.busy || consentAction.busy || consent.loading || !consent.data?.enabled || (!!selected && !conversation)} className="assistant-form">
          <div className="assistant-form-heading"><div><h3>Đặt câu hỏi</h3><p>Có thể hỏi tiếp về nguy cơ hết hàng hoặc ưu tiên nhập trong danh sách vừa xem.</p></div></div>
          <label>Câu hỏi<textarea ref={questionRef} maxLength={500} value={question} onChange={(event) => { setQuestion(event.target.value); invalidate(); }} onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (question.trim()) submit();
            }
          }} placeholder="Hỏi về hàng hóa, doanh thu hoặc lợi nhuận gộp…" /></label>
          {!compact && <details className="assistant-suggestion-details"><summary>Tham khảo câu hỏi được hỗ trợ</summary>
          <div className="assistant-options assistant-suggestions">
            <Button type="button" variant="outline" onClick={() => { setQuestion("5 mã hàng nào bán chạy nhất gần đây?"); invalidate(); }}>Mã bán chạy</Button>
            <Button type="button" variant="outline" onClick={() => { setQuestion("Trong 5 mã bán chạy gần đây, mã nào có nguy cơ sắp hết hàng cao?"); invalidate(); }}>Bán chạy, sắp hết hàng</Button>
            <Button type="button" variant="outline" onClick={() => { setQuestion("Trong các mã vừa xem, mã nào có thể sắp hết hàng?"); invalidate(); }}>Mã nào sắp hết?</Button>
            <Button type="button" variant="outline" onClick={() => { setQuestion("Trong các mã vừa xem, mã nào nên ưu tiên nhập thêm?"); invalidate(); }}>Ưu tiên nhập hàng</Button>
            <Button type="button" variant="outline" onClick={() => { setQuestion("Mã nào bán chậm và còn hàng sắp hết hạn?"); invalidate(); }}>Bán chậm, sắp hết hạn</Button>
            <Button type="button" variant="outline" onClick={() => { setQuestion("Mã hàng nào có lợi nhuận cao và cần nhập thêm?"); invalidate(); }}>Lợi nhuận cao, cần nhập</Button>
            <Button type="button" variant="outline" onClick={() => { setQuestion("Mã hàng nào tồn nhiều và nhu cầu dự báo giảm?"); invalidate(); }}>Tồn nhiều, dự báo bán giảm</Button>
            <Button type="button" variant="outline" onClick={() => { setQuestion("Doanh thu thuần 7 ngày gần nhất so với kỳ trước thế nào?"); invalidate(); }}>So sánh doanh thu</Button>
            <Button type="button" variant="outline" onClick={() => { setQuestion("Lợi nhuận gộp tháng trước so với kỳ trước thế nào?"); invalidate(); }}>So sánh lợi nhuận gộp</Button>
          </div></details>}
          {!compact && <p className="assistant-form-hint">Một số câu hỏi chưa được hỗ trợ. Với so sánh, hãy nêu chỉ số và khoảng thời gian.</p>}
          <div><Button type="button" disabled={!question.trim()} onClick={submit}>Gửi câu hỏi</Button></div>
        </fieldset>
      </section>
    </div>
  </main>;
}

export function AssistantPage() {
  const { can, isOwner } = usePermissions();
  return <AppLayout>{can("analytics.read") && can("finance.read") ? <Workspace isOwner={isOwner} /> :
    <main className="bd-page"><div role="alert" className="bd-notice warning">Bạn cần quyền xem phân tích và tài chính để hỏi đáp.</div></main>}</AppLayout>;
}
