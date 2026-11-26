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
  stockAvailable: "Tồn có thể bán", avgDaily30: "Bán trung bình/ngày", leadTimeDays: "Thời gian nhập (ngày)",
  safetyStockQty: "Tồn an toàn", reorderPoint: "Điểm đặt hàng lại", shortfallToReorderPoint: "Thiếu so với điểm đặt hàng",
  daysOfCover: "Số ngày đủ bán", sold30: "Đã bán 30 ngày", sold60: "Đã bán 60 ngày",
  daysWithoutSale: "Số ngày chưa bán", neverSold: "Chưa từng bán", ageDays: "Tuổi sản phẩm (ngày)",
  periodDays: "Độ dài kỳ (ngày)", recentUnits: "Số lượng kỳ gần nhất", previousUnits: "Số lượng kỳ trước",
  dropPct: "Mức giảm (%)", thresholdDays: "Ngưỡng cảnh báo (ngày)", targetDays: "Mức tồn mục tiêu (ngày)",
  excessQty: "Số lượng dư", lotNumber: "Số lô", expirationDate: "Hạn sử dụng", daysToExpiry: "Số ngày đến hạn",
  lotQuantity: "Số lượng lô", alertDaysBefore: "Cảnh báo trước (ngày)", projectedSellableQty: "Dự kiến bán trước hạn",
  atRiskQty: "Số lượng có nguy cơ", lotStatus: "Trạng thái lô", possibleStockoutBias: "Có thể bị ảnh hưởng bởi hết hàng",
  rateSource: "Nguồn tốc độ bán", stockoutInDays: "Dự kiến hết hàng sau (ngày)", stockoutDate: "Ngày dự kiến hết hàng",
  restockInDays: "Bổ sung sau (ngày)", gapDays: "Số ngày thiếu hàng", slackDays: "Chênh lệch ngày",
  model: "Mô hình", confidence: "Độ tin cậy", onOrderQty: "Đang đặt chưa về", dailyRate: "Nhu cầu/ngày",
  restockSource: "Nguồn ngày bổ sung", leadTimeSource: "Nguồn thời gian nhập", lostUnits: "Số lượng có thể mất",
  worstCaseOnly: "Chỉ trong trường hợp xấu", forecast14: "Dự báo 14 ngày", modelVersion: "Phiên bản mô hình",
  datasetKind: "Loại dữ liệu mô hình", reviewPeriodDays: "Chu kỳ xem xét (ngày)", protectionDays: "Thời gian bảo vệ (ngày)",
  safetyStock: "Tồn an toàn", safetyStockSource: "Nguồn tồn an toàn", unsellableLotUnits: "Số lượng lô khó bán trước hạn",
  sellableStock: "Tồn dự kiến bán được", onOrder: "Hàng đang đặt chưa về", position: "Tồn có thể bán cộng hàng đang đặt",
  target: "Tồn mục tiêu", rawNeed: "Nhu cầu chưa làm tròn", minOrderQty: "Số lượng đặt tối thiểu",
  orderMultiple: "Bội số đặt hàng", noSupplier: "Chưa có nhà cung cấp",
};

function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Không rõ";
}

function metricValue(key: string, value: string | number | boolean | null) {
  if (value === null) return "Không rõ";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (key === "rateSource") return value === "FORECAST" ? "Dự báo" : value === "AVG_30" ? "Trung bình 30 ngày" : String(value);
  if (key === "restockSource") return value === "OPEN_PO" ? "Đơn hàng đang về" : value === "LEAD_TIME" ? "Thời gian nhập ước tính, chưa xác nhận có đơn" : String(value);
  if (key === "leadTimeSource") return ({ SUPPLIER: "Theo nhà cung cấp", HISTORY: "Theo các lần nhập trước", VARIANT: "Theo sản phẩm" } as Record<string, string>)[String(value)] ?? String(value);
  if (key === "confidence") return ({ HIGH: "Tương đối tốt", MEDIUM: "Còn hạn chế", LOW: "Thấp" } as Record<string, string>)[String(value)] ?? String(value);
  if (key === "lotStatus" && value === "UNUSABLE") return "Không thể bán";
  if (key === "datasetKind" && value === "synthetic") return "Dữ liệu giả lập";
  if (key === "safetyStockSource" && value === "PRODUCT_SETTING") return "Theo cấu hình sản phẩm";
  if (key === "safetyStockSource" && typeof value === "string" && /^AUTO_\d+PCT$/.test(value)) return `Tính tự động với mức phục vụ giả định ${value.slice(5, -3)}%`;
  if (typeof value === "number") return value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
  if (key === "expirationDate" || key === "stockoutDate") return displayDate(value);
  return value;
}

function Metrics({ values }: { values: Record<string, string | number | boolean | null> }) {
  return <details className="ai-details"><summary>Xem số liệu dùng để tính</summary><div className="bd-table-wrap"><table className="bd-table"><tbody>
    {Object.entries(values).filter(([key]) => metricLabels[key]).map(([key, value]) =>
      <tr key={key}><th scope="row">{key === "avgDaily30" && values.rateSource === "FORECAST" ? "Tốc độ bán theo dự báo/ngày" : metricLabels[key]}</th><td>{metricValue(key, value)}</td></tr>)}
  </tbody></table></div></details>;
}

function Source({ dataAsOf, finishedAt }: { dataAsOf: string | null; finishedAt: string | null }) {
  return <p className="bd-modal-note">Số bán tại quầy tính đến hết ngày {dataAsOf ? displayDate(dataAsOf) : "không rõ"} · Phân tích hoàn tất: {timestamp(finishedAt)}.</p>;
}

function SeverityBadge({ level }: { level: InsightSeverity }) {
  return <span className={`ai-sev ai-sev-${level.toLowerCase()}`}>{levels[level]}</span>;
}

function signalTitle(signal: InventorySignal) {
  if (signal.type === "EXPIRATION_RISK" && signal.reasonCode === "EXPIRED_IN_STOCK") return "Đã hết hạn";
  if (signal.type === "EXPIRATION_RISK" && signal.reasonCode === "UNSELLABLE_NEAR_EXPIRY") return "Không thể bán";
  return types[signal.type] ?? signal.type;
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
      {data.state === "INCOMPLETE" && "Kết quả trước đây chưa đủ điều kiện để hiển thị an toàn. Hãy chạy lại phân tích ở trang Cảnh báo tồn kho."}
      {" "}<Link to="/app/insights">Đến cảnh báo tồn kho</Link>
    </div>}
    {data?.state === "READY" && <>
      {data.hasSyntheticSku && <div className="bd-notice warning" role="status">Có SKU DEMO- dùng dữ liệu giả lập, không chứng minh độ chính xác hoặc hiệu quả thực tế.</div>}
      {data.hasSyntheticSku === null && <div className="bd-notice warning" role="status">Không có thông tin đầy đủ về SKU dữ liệu giả lập trong lần phân tích này.</div>}
      {!data.ruleFresh && <div className="bd-notice warning" role="status">Kết quả đã quá 36 giờ, không còn được dùng để xếp mức ưu tiên. Hãy chạy lại phân tích trước khi ra quyết định.</div>}
      {!data.forecastReady && <div className="bd-notice warning" role="status">Dự báo chưa sẵn sàng hoặc đã cũ. Các nhận định dựa trên dự báo và gợi ý nhập hàng có thể không còn phù hợp.</div>}
      {data.warnings === null && <div className="bd-notice warning" role="status">Không có thông tin cảnh báo chất lượng dữ liệu của lần phân tích này.</div>}
      {data.warnings?.map((warning, index) => <div className="bd-notice warning" role="status" key={`${warning.code}-${index}`}>{warning.message}</div>)}
      <section className="bd-data-workspace">
        <div className="bd-workspace-heading"><div><h2><Boxes size={19} /> Mặt hàng cần xem xét</h2>
          <p>Số bán tại quầy tính đến hết ngày {displayDate(data.latestRun?.dataAsOf)} · Phân tích hoàn tất: {timestamp(data.latestRun?.finishedAt ?? null)}.</p>
          <p>Tồn kho và lô là số liệu tại lần phân tích, không phải tồn thời gian thực. Mỗi mã hàng có thể có nhiều vấn đề cần xem riêng.</p>
        </div></div>
        <div className="ai-kpis">
          <div className="ai-kpi"><span>Mã hàng cần xem</span><strong>{data.summary.totalSku}</strong><small>Trước khi lọc</small></div>
          {(Object.keys(levels) as InsightSeverity[]).map((level) => <div className={`ai-sev-card inventory-priority-card ${level.toLowerCase()}`} key={level}><span>{levels[level]}</span><strong>{data.summary.byPriority[level]}</strong><small>{levelHints[level]}</small></div>)}
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
          <div className="bd-table-wrap"><table className="bd-table ai-table"><thead><tr><th>Sản phẩm / mã hàng</th><th>Mức ưu tiên</th><th>Điều cần chú ý</th><th>Nhập hàng</th><th></th></tr></thead>
            <tbody>{data.items.map((item) => <tr key={item.variantId} className={item.priority ? `sev-${item.priority.toLowerCase()}` : ""}>
              <td className="bd-primary-cell">{item.productName}<br /><small>{item.sku}{item.category ? ` · ${item.category}` : ""}</small></td>
              <td>{item.priority ? <SeverityBadge level={item.priority} /> : "Chưa có mức mới"}</td>
              <td>{item.signals.length ? <ul className="inventory-signals">{item.signals.map((signal) => <li key={signal.id}>
                {signalTitle(signal)}{signal.lotNumber ? ` · Lô ${signal.lotNumber}` : ""}{signal.current ? "" : " (thông tin cũ)"}
              </li>)}</ul> : "Không có cảnh báo đang mở"}</td>
              <td>{!item.replenishment ? "Chưa có gợi ý" : item.replenishment.status === "ORDERED" ? "Đơn nháp chờ xác nhận" : `Gợi ý nhập ${item.replenishment.suggestedQty} sản phẩm${item.replenishment.current ? "" : " (thông tin cũ)"}`}</td>
              <td><button type="button" className="ai-icon-btn" title="Xem chi tiết" aria-label={`Xem chi tiết ${item.productName} ${item.sku}`} onClick={() => setDetail(item)}><Eye size={18} aria-hidden="true" /></button></td>
            </tr>)}</tbody></table></div>
          <div className="bd-pagination"><Pagination page={data.page} total={data.total} totalPages={totalPages} onPageChange={(value) => { setDetail(null); setPage(value); }} /></div>
        </> : <div className="bd-empty-state compact"><h3>Không có mã hàng phù hợp</h3><p>Danh sách chỉ gồm cảnh báo đang mở, gợi ý nhập và đơn nháp. Dữ liệu thiếu hoặc cũ không chứng minh cửa hàng không có rủi ro.</p></div>}
        <p className="bd-modal-note">Mỗi mã hàng chỉ được đếm một lần theo mức cao nhất từ thông tin còn mới. Thông tin cũ và đơn nháp không dùng để xếp mức ưu tiên; đơn nháp chưa phải hàng đang về.</p>
      </section>
    </>}
    <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Chi tiết nhận định tồn kho">
      {detail && <div className="bd-modal-content"><h3>{detail.productName} · {detail.sku}</h3>
        <p>Mỗi vấn đề và mỗi lô được trình bày riêng. Nếu các hướng xử lý khác nhau, hãy kiểm tra thực tế trước khi quyết định.</p>
        {detail.signals.map((signal) => <section className="inventory-detail-card" key={signal.id}>
          <h3>{signalTitle(signal)}{signal.lotNumber ? ` · Lô ${signal.lotNumber}` : ""}</h3>
          <p className="inventory-detail-status">{signal.current ? <SeverityBadge level={signal.severity} /> : <span>Mức lúc phát hiện: {levels[signal.severity]}</span>} <span>· {signal.status === "ACKNOWLEDGED" ? "Đang xử lý" : "Mới"}</span></p>
          {!signal.current && <p className="inventory-stale">Thông tin cũ hoặc dự báo chưa sẵn sàng; không dùng để xếp mức ưu tiên mới nhất. Hãy phân tích lại và kiểm tra thực tế.</p>}
          <p><strong>Vì sao cần chú ý:</strong> {describeSignal(signal)}{signal.expirationDate ? ` Hạn sử dụng: ${displayDate(signal.expirationDate)}.` : ""}</p>
          <p><strong>Gợi ý xem xét:</strong> {actions[signal.suggestedAction] ?? "Kiểm tra tình trạng và cân nhắc cách xử lý."}.</p>
          <Source dataAsOf={signal.dataAsOf} finishedAt={signal.finishedAt} />
          <Metrics values={signal.metrics} />
        </section>)}
        {detail.replenishment && <section className="inventory-detail-card">
          <h3>{detail.replenishment.status === "ORDERED" ? "Đơn nháp chờ xác nhận" : "Đề xuất nhập hàng"}</h3>
          <p>{detail.replenishment.status === "ORDERED" ? `Đơn ${detail.replenishment.poCode ?? "không rõ"} chưa xác nhận; không tính là hàng đang về hoặc đề xuất mới.` :
            `${detail.replenishment.current ? "Theo lần phân tích mới nhất" : "Thông tin cũ hoặc dự báo chưa sẵn sàng; hãy phân tích lại trước khi đặt hàng"}: hệ thống gợi ý xem xét nhập ${detail.replenishment.suggestedQty} sản phẩm.`}</p>
          <p>Nhà cung cấp được gợi ý: {detail.replenishment.supplierName ?? "Chưa xác định"}{detail.replenishment.status === "PENDING" && detail.replenishment.orderByDate ? ` · Ngày nên đặt theo ước tính: ${displayDate(detail.replenishment.orderByDate)}` : ""}{detail.replenishment.status === "PENDING" && detail.replenishment.stockoutDate ? ` · Ngày có thể hết hàng: ${displayDate(detail.replenishment.stockoutDate)}` : ""}</p>
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
