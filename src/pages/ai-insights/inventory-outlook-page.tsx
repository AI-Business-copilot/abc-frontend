import { useState } from "react";
import { Boxes, Eye, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { aiInsightsApi, type InsightSeverity, type InsightType, type InventoryOutlookItem, type InventorySignal } from "@/api/ai-insights";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/use-permissions";
import { FilterField, PaginationSize, displayDate } from "@/pages/business-data/shared";
import { ErrorBox, useLoad } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";
import "./ai-insights.css";

const types: Record<InsightType, string> = {
  STOCKOUT_RISK: "Dự kiến hết hàng", LOW_STOCK: "Sắp hết hàng", SLOW_MOVING: "Bán chậm",
  DECLINING_SALES: "Số lượng bán giảm", OVERSTOCK: "Tồn kho dư", EXPIRATION_RISK: "Nguy cơ hết hạn",
};
const levels: Record<InsightSeverity, string> = { CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
const levelHints: Record<InsightSeverity, string> = {
  CRITICAL: "Cần xem xét trước", HIGH: "Cần chú ý sớm", MEDIUM: "Nên theo dõi", LOW: "Chưa cần ưu tiên cao",
};
const actions: Record<string, string> = {
  REORDER: "Cân nhắc nhập thêm", REORDER_NOW: "Cân nhắc đặt hàng sớm", EXPEDITE_PO: "Kiểm tra đơn hàng đang về",
  CLEARANCE: "Cân nhắc giảm giá", INVESTIGATE: "Kiểm tra nguyên nhân", STOP_REORDER: "Cân nhắc tạm dừng nhập",
  PREPARE_SCRAP: "Kiểm tra và chuẩn bị xử lý hàng", PROMOTE: "Cân nhắc khuyến mãi",
};
const metricLabels: Record<string, string> = {
  stockAvailable: "Hàng có thể bán lúc phân tích", avgDaily30: "Trung bình bán mỗi ngày", leadTimeDays: "Thời gian nhập hàng (ngày)",
  safetyStockQty: "Lượng hàng dự phòng", reorderPoint: "Mức tồn cần cân nhắc đặt thêm", shortfallToReorderPoint: "Còn thiếu để đạt mức cần đặt",
  daysOfCover: "Ước tính số ngày đủ bán", sold30: "Đã bán trong 30 ngày", sold60: "Đã bán trong 60 ngày",
  daysWithoutSale: "Số ngày chưa phát sinh bán", neverSold: "Chưa từng ghi nhận bán",
  periodDays: "Số ngày của mỗi kỳ", recentUnits: "Số lượng bán kỳ gần nhất", previousUnits: "Số lượng bán kỳ trước",
  dropPct: "Tỷ lệ giảm (%)", thresholdDays: "Ngưỡng cảnh báo (ngày)", targetDays: "Mức tồn mục tiêu (ngày)",
  excessQty: "Số lượng vượt mức mục tiêu", lotNumber: "Mã lô", expirationDate: "Hạn sử dụng", daysToExpiry: "Còn bao nhiêu ngày đến hạn",
  lotQuantity: "Số lượng trong lô", alertDaysBefore: "Báo trước hạn (ngày)", projectedSellableQty: "Ước tính bán được trước hạn",
  atRiskQty: "Số lượng có nguy cơ còn lại", lotStatus: "Tình trạng lô", possibleStockoutBias: "Kết quả có thể bị ảnh hưởng do hết hàng",
  rateSource: "Căn cứ tính tốc độ bán", stockoutInDays: "Ước tính còn bao nhiêu ngày đến khi hết hàng", stockoutDate: "Ngày có thể hết hàng",
  restockInDays: "Ước tính thời gian chờ hàng về (ngày)", gapDays: "Số ngày có thể thiếu hàng",
  onOrderQty: "Số lượng đã đặt, chưa về", dailyRate: "Nhu cầu ước tính mỗi ngày",
  restockSource: "Căn cứ ước tính ngày hàng về", lostUnits: "Số lượng bán có thể bị bỏ lỡ", forecast14: "Nhu cầu dự báo trong 14 ngày",
  safetyStock: "Lượng hàng dự phòng", unsellableLotUnits: "Số lượng có thể không bán kịp trước hạn",
  sellableStock: "Hàng còn có thể bán", onOrder: "Hàng đã đặt, chưa về", position: "Hàng có thể bán và hàng đang về",
  target: "Mức tồn mong muốn", minOrderQty: "Số lượng đặt tối thiểu",
  orderMultiple: "Bội số mỗi lần đặt", noSupplier: "Chưa có nhà cung cấp",
};

function metricValue(key: string, value: string | number | boolean | null) {
  if (value === null) return "Không rõ";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (key === "rateSource") return value === "FORECAST" ? "Dự báo" : value === "AVG_30" ? "Trung bình 30 ngày" : "Không rõ";
  if (key === "restockSource") return value === "OPEN_PO" ? "Đơn hàng đang về" : value === "LEAD_TIME" ? "Thời gian nhập ước tính, chưa xác nhận có đơn" : "Không rõ";
  if (key === "lotStatus" && value === "UNUSABLE") return "Không thể bán";
  if (typeof value === "number") return value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
  if (key === "expirationDate" || key === "stockoutDate") return displayDate(value);
  return value;
}

function Metrics({ values }: { values: Record<string, string | number | boolean | null> }) {
  const entries = Object.entries(values).filter(([key]) => metricLabels[key]);
  if (!entries.length) return null;
  return <details className="ai-details"><summary>Xem các số liệu làm căn cứ</summary><div className="bd-table-wrap"><table className="bd-table"><tbody>
    {entries.map(([key, value]) =>
      <tr key={key}><th scope="row">{key === "avgDaily30" && values.rateSource === "FORECAST" ? "Tốc độ bán theo dự báo/ngày" : metricLabels[key]}</th><td>{metricValue(key, value)}</td></tr>)}
  </tbody></table></div></details>;
}

function Source({ dataAsOf, finishedAt }: { dataAsOf: string | null; finishedAt: string | null }) {
  return <p className="bd-modal-note">Dữ liệu bán được tính đến hết {dataAsOf ? displayDate(dataAsOf) : "ngày không rõ"}. Phân tích hoàn tất ngày {finishedAt ? displayDate(finishedAt) : "không rõ"}.</p>;
}

function SeverityBadge({ level }: { level: InsightSeverity }) {
  return <span className={`ai-sev ai-sev-${level.toLowerCase()}`}>{levels[level]}</span>;
}

function signalTitle(signal: InventorySignal) {
  if (signal.type === "EXPIRATION_RISK" && signal.reasonCode === "EXPIRED_IN_STOCK") return "Đã hết hạn";
  if (signal.type === "EXPIRATION_RISK" && signal.reasonCode === "UNSELLABLE_NEAR_EXPIRY") return "Không thể bán";
  return types[signal.type] ?? signal.type;
}

function orderedSignals(signals: InventorySignal[]) {
  const priority: InsightSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  return [...signals].sort((a, b) => Number(b.current) - Number(a.current) || priority.indexOf(a.severity) - priority.indexOf(b.severity));
}

function describeSignal(signal: InventorySignal) {
  const m = signal.metrics;
  const number = (key: string) => typeof m[key] === "number" ? m[key].toLocaleString("vi-VN", { maximumFractionDigits: 3 }) : null;
  const stock = number("stockAvailable");
  const stockText = stock === null ? "" : ` Tồn có thể bán khi phân tích: ${stock} sản phẩm.`;
  switch (signal.type) {
    case "STOCKOUT_RISK": {
      const days = number("stockoutInDays");
      const restock = number("restockInDays");
      const estimate = days === null ? "Hệ thống dự báo sản phẩm có nguy cơ hết hàng." :
        days === "0" ? (m.stockAvailable === 0 ? "Tồn có thể bán đã hết tại thời điểm phân tích." : "Hệ thống dự báo sản phẩm có thể hết hàng trong ngày phân tích.") :
          `Hệ thống dự báo sản phẩm có thể hết hàng sau khoảng ${days} ngày kể từ lúc phân tích.`;
      const arrival = restock === null ? "" : m.restockSource === "OPEN_PO" ?
        ` Đơn đang đặt dự kiến bổ sung sau khoảng ${restock} ngày; cần xác nhận ngày giao.` :
        m.restockSource === "LEAD_TIME" ? ` Thời gian nhập ước tính khoảng ${restock} ngày; chưa có nghĩa là đã đặt hàng.` : "";
      return estimate + (days === "0" && m.stockAvailable === 0 ? "" : stockText) + arrival;
    }
    case "LOW_STOCK":
      return `Lượng hàng có thể bán và hàng đang đặt ở mức cần cân nhắc bổ sung.${stockText}`;
    case "SLOW_MOVING": {
      const days = number("daysWithoutSale");
      const sold = number("sold30");
      const sales = m.neverSold === true ? "Chưa ghi nhận lần bán nào." :
        days !== null ? `Đã ${days} ngày chưa bán được sản phẩm này.` : "Sản phẩm đang bán chậm.";
      return `${sales}${sold === null ? "" : ` Trong 30 ngày gần nhất bán được ${sold} sản phẩm sau khi trừ hàng trả.`}${stockText}`;
    }
    case "DECLINING_SALES": {
      const period = number("periodDays"), recent = number("recentUnits"), previous = number("previousUnits"), drop = number("dropPct");
      const sales = period !== null && recent !== null && previous !== null ?
        `Trong ${period} ngày gần nhất bán được ${recent} sản phẩm, so với ${previous} sản phẩm ở kỳ trước${drop === null ? "" : ` (giảm ${drop}%)`}; số bán đã trừ hàng trả.` :
        "Lượng bán gần đây giảm so với kỳ trước.";
      return `${sales}${signal.reasonCode === "DECLINE_POSSIBLY_STOCKOUT" ? " Việc hết hàng có thể ảnh hưởng đến kết quả này." : ""}`;
    }
    case "OVERSTOCK": {
      const days = number("daysOfCover"), excess = number("excessQty");
      return `Lượng tồn có thể bán đang cao so với tốc độ bán gần đây.${stockText}${days === null ? "" : ` Ước tính đủ bán khoảng ${days} ngày.`}${excess === null ? "" : ` So với mức tồn mục tiêu, ước tính dư ${excess} sản phẩm.`}`;
    }
    case "EXPIRATION_RISK": {
      const lot = signal.lotNumber ? `Lô ${signal.lotNumber}` : "Lô hàng";
      const qty = number("lotQuantity"), risk = number("atRiskQty");
      const quantity = qty === null ? "" : ` Số lượng trong lô khi phân tích: ${qty} sản phẩm.`;
      if (signal.reasonCode === "EXPIRED_IN_STOCK") return `${lot} đã hết hạn tại thời điểm phân tích.${quantity}`;
      if (signal.reasonCode === "UNSELLABLE_NEAR_EXPIRY") return `${lot} được ghi nhận không thể bán.${quantity}`;
      return `${lot} có thể không bán hết trước hạn.${quantity}${risk === null ? "" : ` Ước tính ${risk} sản phẩm có nguy cơ còn lại.`}`;
    }
    default:
      return "Hãy xem số liệu và kiểm tra cảnh báo để biết thêm chi tiết.";
  }
}

function InventoryWorkspace() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detail, setDetail] = useState<InventoryOutlookItem | null>(null);
  const result = useLoad(() => aiInsightsApi.inventoryOutlook({ search, type, priority, page, pageSize }), [search, type, priority, page, pageSize]);
  const data = result.data;
  const totalPages = data?.state === "READY" ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const dataWarnings = data?.state === "READY" ? data.warnings?.filter((warning) => warning.code !== "FORECAST_SYNTHETIC_MODEL" && warning.code !== "FORECAST_UNAVAILABLE") : null;

  return <main className="bd-page inventory-outlook-page">
    <header className="ai-header">
      <div className="ai-header-main"><h1>Nhận định tồn kho</h1><p>Xem mặt hàng nào cần chú ý, lý do và hướng xử lý để cân nhắc. Trang này không tự đặt hàng hay thay đổi trạng thái.</p></div>
      <div className="ai-header-side"><Button variant="outline" onClick={() => { setDetail(null); result.reload(); }}><RefreshCw size={16} /> Làm mới</Button></div>
    </header>
    {result.loading && <div role="status" className="bd-notice">Đang tải nhận định…</div>}
    <ErrorBox error={result.error} />
    {data && data.state !== "READY" && <div role="status" className="bd-notice warning">
      {data.state === "NOT_RUN" && "Chưa có lần phân tích. Chưa thể kết luận về rủi ro tồn kho."}
      {data.state === "RUNNING" && "Phân tích đang chạy; kết quả chưa hoàn chỉnh. Vui lòng làm mới sau khi chạy xong."}
      {data.state === "FAILED" && "Lần phân tích gần nhất thất bại; không thể kết luận về rủi ro tồn kho."}
      {data.state === "INCOMPLETE" && "Kết quả trước đây chưa đầy đủ. Hãy chạy lại phân tích ở trang Cảnh báo tồn kho."}
      {" "}<Link to="/app/insights">Đến cảnh báo tồn kho</Link>
    </div>}
    {data?.state === "READY" && <>
      {!data.ruleFresh && <div className="bd-notice warning" role="status">Thông tin đã cũ và chưa thể xếp mức ưu tiên mới. Hãy chạy lại phân tích trước khi ra quyết định.</div>}
      {!data.forecastReady && <div className="bd-notice warning" role="status">Dự báo chưa sẵn sàng hoặc đã cũ. Nhận định dựa trên dự báo và gợi ý nhập có thể chưa được cập nhật; hãy kiểm tra thực tế trước khi quyết định.</div>}
      {data.warnings === null && <div className="bd-notice warning" role="status">Chưa có thông tin về chất lượng dữ liệu của lần phân tích này. Hãy kiểm tra thực tế trước khi quyết định.</div>}
      {dataWarnings && dataWarnings.length > 0 && <details className="ai-data-warnings">
        <summary>Có {dataWarnings.length} lưu ý về dữ liệu có thể ảnh hưởng đến nhận định</summary>
        <ul>{dataWarnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.code === "NO_SALES_DATA" ? "Chưa có dữ liệu bán tại quầy trong 60 ngày gần nhất." : warning.message}</li>)}</ul>
      </details>}
      <section className="bd-data-workspace">
        <div className="bd-workspace-heading"><div><h2><Boxes size={19} /> Mặt hàng cần xem xét</h2>
          <p>Phân tích ngày {data.latestRun?.finishedAt ? displayDate(data.latestRun.finishedAt) : "không rõ"} · Dữ liệu bán đến hết {displayDate(data.latestRun?.dataAsOf)}.</p>
        </div></div>
        <div className="inventory-priority-heading"><h3>Mức độ ưu tiên</h3><p>Chọn một mức để lọc mặt hàng. Mỗi mã chỉ được tính một lần theo vấn đề mới có mức ưu tiên cao nhất.</p></div>
        <div className="ai-kpis">
          <div className="ai-kpi"><span>Mã hàng trong danh sách</span><strong>{data.summary.totalSku}</strong><small>Gồm cả thông tin cũ và đơn nháp</small></div>
          {(Object.keys(levels) as InsightSeverity[]).map((level) => <button type="button" className={`ai-sev-card inventory-priority-card ${level.toLowerCase()}${priority === level ? " active" : ""}`} key={level}
            aria-pressed={priority === level} onClick={() => { setDetail(null); setPage(1); setPriority(priority === level ? "" : level); }}>
            <span>{levels[level]}</span><strong>{data.summary.byPriority[level]}</strong><small>{levelHints[level]}</small></button>)}
          <div className="ai-kpi"><span>Chưa có mức mới</span><strong>{data.summary.withoutCurrentPriority}</strong><small>Chỉ có thông tin cũ hoặc đơn nháp</small></div>
        </div>
        <form className="bd-filters" onSubmit={(event) => { event.preventDefault(); setDetail(null); setPage(1); setSearch(searchInput); }}>
          <label className="bd-search"><Search size={17} /><input aria-label="Tìm sản phẩm hoặc SKU" maxLength={100} placeholder="Tìm sản phẩm hoặc SKU…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
          <Button type="submit" variant="outline">Tìm</Button>
          <FilterField label="Vấn đề cần xem"><select value={type} onChange={(event) => { setDetail(null); setPage(1); setType(event.target.value); }}>
            <option value="">Tất cả</option>{Object.entries(types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            <option value="REPLENISHMENT">Gợi ý nhập</option><option value="DRAFT_ORDER">Đơn nháp</option>
          </select></FilterField>
          <FilterField label="Mức ưu tiên mới nhất"><select value={priority} onChange={(event) => { setDetail(null); setPage(1); setPriority(event.target.value); }}>
            <option value="">Tất cả</option>{Object.entries(levels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></FilterField>
          <PaginationSize value={pageSize} onChange={(value) => { setDetail(null); setPageSize(value); setPage(1); }} />
        </form>
        {data.items.length ? <>
          <div className="bd-table-wrap"><table className="bd-table ai-table inventory-table">
            <colgroup><col className="inventory-col-product" /><col className="inventory-col-priority" /><col className="inventory-col-signals" /><col className="inventory-col-replenishment" /><col className="inventory-col-detail" /></colgroup>
            <thead><tr><th>Sản phẩm / mã hàng</th><th>Mức ưu tiên</th><th>Điều cần chú ý</th><th>Nhập hàng</th><th aria-label="Chi tiết"></th></tr></thead>
            <tbody>{data.items.map((item) => {
              const signals = orderedSignals(item.signals);
              return <tr key={item.variantId} className={item.priority ? `sev-${item.priority.toLowerCase()}` : ""}>
              <td className="bd-primary-cell">{item.productName}<br /><small>{item.sku}{item.category ? ` · ${item.category}` : ""}</small></td>
              <td>{item.priority ? <SeverityBadge level={item.priority} /> : "Chưa có mức mới"}</td>
              <td>{signals.length ? <><ul className="inventory-signals">{signals.slice(0, 2).map((signal) => <li key={signal.id}>
                {signalTitle(signal)}{signal.lotNumber ? ` · Lô ${signal.lotNumber}` : ""}{signal.current ? "" : " (thông tin cũ)"}
              </li>)}</ul>{signals.length > 2 && <small>+{signals.length - 2} vấn đề khác trong chi tiết</small>}</> : "Không có cảnh báo đang mở"}</td>
              <td>{!item.replenishment ? "Chưa có gợi ý" : item.replenishment.status === "ORDERED" ? "Đơn nháp chờ xác nhận" : `Gợi ý nhập ${item.replenishment.suggestedQty} sản phẩm${item.replenishment.current ? "" : " (thông tin cũ)"}`}</td>
              <td><button type="button" className="ai-icon-btn" title="Xem chi tiết" aria-label={`Xem chi tiết ${item.productName} ${item.sku}`} onClick={() => setDetail(item)}><Eye size={18} aria-hidden="true" /></button></td>
            </tr>; })}</tbody></table></div>
          <div className="bd-pagination"><Pagination page={data.page} total={data.total} totalPages={totalPages} onPageChange={(value) => { setDetail(null); setPage(value); }} /></div>
        </> : <div className="bd-empty-state compact"><h3>Không có mã hàng phù hợp</h3><p>Danh sách chỉ gồm cảnh báo đang mở, gợi ý nhập và đơn nháp. Dữ liệu thiếu hoặc cũ không chứng minh cửa hàng không có rủi ro.</p></div>}
        <p className="bd-modal-note">Mỗi mã hàng chỉ được đếm một lần theo mức cao nhất từ thông tin còn mới. Thông tin cũ và đơn nháp không dùng để xếp mức ưu tiên; đơn nháp chưa phải hàng đang về.</p>
      </section>
    </>}
    <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Chi tiết nhận định tồn kho">
      {detail && <div className="bd-modal-content"><h3>{detail.productName} · {detail.sku}</h3>
        <p>Dưới đây là những vấn đề được ghi nhận cho mặt hàng này. Hãy đối chiếu với tình hình thực tế trước khi quyết định nhập thêm hoặc xử lý hàng.</p>
        {orderedSignals(detail.signals).map((signal) => <section className="inventory-detail-card" key={signal.id}>
          <h3>{signalTitle(signal)}{signal.lotNumber ? ` · Lô ${signal.lotNumber}` : ""}</h3>
          <p className="inventory-detail-status">{signal.current ? <SeverityBadge level={signal.severity} /> : <span>Mức khi được ghi nhận: {levels[signal.severity]}</span>} <span>· {signal.status === "ACKNOWLEDGED" ? "Đang được xử lý" : "Chưa được xử lý"}</span></p>
          {!signal.current && <p className="inventory-stale">Thông tin này có thể đã thay đổi hoặc chưa được cập nhật trong lần phân tích mới nhất. Hãy phân tích lại và kiểm tra thực tế trước khi xử lý.</p>}
          <p><strong>Tình hình:</strong> {describeSignal(signal)}{signal.expirationDate ? ` Hạn sử dụng: ${displayDate(signal.expirationDate)}.` : ""}</p>
          <p><strong>Gợi ý xử lý:</strong> {actions[signal.suggestedAction] ?? "Kiểm tra tình trạng mặt hàng và cân nhắc cách xử lý phù hợp."}.</p>
          <Source dataAsOf={signal.dataAsOf} finishedAt={signal.finishedAt} />
          <Metrics values={signal.metrics} />
        </section>)}
        {detail.replenishment && <section className="inventory-detail-card">
          <h3>{detail.replenishment.status === "ORDERED" ? "Đơn nháp chưa xác nhận" : "Gợi ý nhập hàng"}</h3>
          <p>{detail.replenishment.status === "ORDERED" ? `${detail.replenishment.poCode ? `Đơn ${detail.replenishment.poCode}` : "Đơn nháp"} chưa được xác nhận. Vì vậy, hệ thống chưa tính số hàng này là hàng đang về và chưa tạo gợi ý nhập mới.` :
            `${detail.replenishment.current ? "Dựa trên lần phân tích mới nhất" : "Gợi ý này có thể đã cũ hoặc chưa có dự báo mới; hãy phân tích lại trước khi đặt hàng"}: hệ thống đề xuất cân nhắc nhập ${detail.replenishment.suggestedQty} sản phẩm.`}</p>
          <p>Nhà cung cấp tham khảo: {detail.replenishment.supplierName ?? "Chưa có nhà cung cấp phù hợp"}{detail.replenishment.status === "PENDING" && detail.replenishment.orderByDate ? ` · Nên cân nhắc đặt trước ${displayDate(detail.replenishment.orderByDate)}` : ""}{detail.replenishment.status === "PENDING" && detail.replenishment.stockoutDate ? ` · Có thể hết hàng vào ${displayDate(detail.replenishment.stockoutDate)}` : ""}</p>
          <Source dataAsOf={detail.replenishment.dataAsOf} finishedAt={detail.replenishment.finishedAt} />
          <Metrics values={detail.replenishment.details} />
        </section>}
        <p><Link to="/app/insights">Xem cảnh báo tồn kho</Link> · <Link to="/app/replenishment">Xem gợi ý nhập hàng</Link></p>
      </div>}
    </Modal>
  </main>;
}

export function InventoryOutlookPage() {
  const { can } = usePermissions();
  return <AppLayout>{can("analytics.read") ? <InventoryWorkspace /> :
    <main className="bd-page"><div role="alert" className="bd-notice warning">Bạn cần quyền xem phân tích để xem nhận định tồn kho.</div></main>}
  </AppLayout>;
}
