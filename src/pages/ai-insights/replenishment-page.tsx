import { useMemo, useState } from "react";
import { Eye, PackagePlus, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { aiInsightsApi, type ForecastDetail, type ForecastHistory, type ReplenishmentItem, type Urgency } from "@/api/ai-insights";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/hooks/use-permissions";
import { DetailLine, displayDate } from "@/pages/business-data/shared";
import { ErrorBox, money, useAction, useLoad } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";
import "./ai-insights.css";

const URGENCY_LABELS: Record<Urgency, string> = { CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };
const URGENCY_HINTS: Record<Urgency, string> = {
  CRITICAL: "Cần xem xét trước",
  HIGH: "Cần chú ý sớm",
  MEDIUM: "Nên theo dõi",
  LOW: "Chưa cần ưu tiên cao",
};
const EVIDENCE_LABELS = { HIGH: "khá tốt", MEDIUM: "vừa phải", LOW: "còn hạn chế" } as const;
const evidenceLabel = (value: ReplenishmentItem["confidence"]) =>
  value ? `Dữ liệu bán gần đây hỗ trợ dự báo ở mức ${EVIDENCE_LABELS[value]}` : "Chưa đủ dữ liệu để đánh giá mức độ tin cậy của dự báo";
const LEAD_SOURCES: Record<string, string> = {
  SUPPLIER: "theo thông tin nhà cung cấp",
  HISTORY: "dựa trên các lần nhập hàng trước",
  VARIANT: "theo thông tin của sản phẩm",
  DEFAULT: "theo giá trị mặc định",
};
const EVALUATION_LABELS = {
  PENDING: "Chưa đến thời điểm đánh giá",
  OUTSIDE_HISTORY: "Ngoài khoảng thời gian có dữ liệu",
  UNKNOWN_STOCK: "Chưa xác định được lượng hàng",
  STOCKOUT: "Có ngày hết hàng, số bán có thể chưa phản ánh đủ nhu cầu",
  PARTIAL_START: "Kỳ bán đã bắt đầu trước khi có dự báo",
  COMPARABLE: "Đủ điều kiện đối chiếu",
  PUBLICATION_UNKNOWN: "Chưa rõ thời điểm có dự báo",
} as const;

const fmt = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: digits });
const detailNum = (item: ReplenishmentItem, key: string) => (typeof item.details[key] === "number" ? (item.details[key] as number) : null);
const overdueOrders = (item: ReplenishmentItem) => Array.isArray(item.details.incoming)
  ? item.details.incoming.filter((entry): entry is { poCode: string; qty: number; arrivalDate: string; overdue: true } =>
    entry !== null && typeof entry === "object" && entry.overdue === true &&
    typeof entry.poCode === "string" && typeof entry.qty === "number" && typeof entry.arrivalDate === "string")
  : [];

function replenishmentReason(item: ReplenishmentItem): string {
  const position = detailNum(item, "position");
  const reorderPoint = detailNum(item, "reorderPoint");
  if (position === null || reorderPoint === null) {
    return "Hệ thống ước tính lượng cần nhập dựa trên nhu cầu dự kiến, hàng hiện có và hàng đã đặt. Chưa đủ dữ liệu để giải thích cụ thể hơn.";
  }
  if (position <= reorderPoint) {
    return "Tính cả hàng hiện có và hàng đã đặt, lượng hàng dự kiến còn lại đã chạm mức cần cân nhắc nhập thêm.";
  }
  if (item.stockoutDate) {
    return `Ngay cả khi tính cả hàng đang đặt, sản phẩm vẫn có thể hết hàng vào ${displayDate(item.stockoutDate)}. Hãy kiểm tra ngày giao dự kiến trước khi quyết định.`;
  }
  return "Hãy kiểm tra hàng hiện có, các đơn đã đặt và kế hoạch bán sắp tới trước khi quyết định.";
}

function ForecastSummary({ detail }: { detail: ForecastDetail }) {
  const recentHistory = detail.history.slice(-14);
  const recentUnits = recentHistory.reduce((total, point) => total + point.units, 0);
  const averageRecentUnits = recentHistory.length ? recentUnits / recentHistory.length : null;
  const firstDay = recentHistory[0]?.day;
  const lastDay = recentHistory[recentHistory.length - 1]?.day;
  const dateRange = firstDay && lastDay ? ` (${displayDate(firstDay)} đến ${displayDate(lastDay)})` : "";
  const forecastUnits = detail.forecast.totals.d14;

  return <div className="ai-callout">
    {recentHistory.length ? <p><strong>Kết quả bán gần đây:</strong> Trong {recentHistory.length} ngày có dữ liệu gần nhất{dateRange}, cửa hàng bán được {fmt(recentUnits, 0)} sản phẩm, trung bình {fmt(averageRecentUnits)} sản phẩm mỗi ngày. Số liệu bán tại quầy chưa trừ hàng trả.</p> :
      <p>Chưa có dữ liệu bán gần đây để so sánh với dự báo.</p>}
    <p><strong>Dự báo 14 ngày:</strong> {detail.asOf ? `Trong 14 ngày sau ${displayDate(detail.asOf)}` : "Trong 14 ngày tới (chưa rõ ngày bắt đầu)"}, dự kiến bán khoảng {fmt(forecastUnits, 0)} sản phẩm, trung bình {fmt(forecastUnits / 14)} sản phẩm mỗi ngày.</p>
  </div>;
}

export function ReplenishmentPage() {
  const { can } = usePermissions();
  const canManage = can("ai_insights.manage");
  const canOrder = canManage && can("inventory.receive");
  const action = useAction();
  const list = useLoad(() => aiInsightsApi.replenishment(), []);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [urgency, setUrgency] = useState<Urgency | "">("");
  const [detail, setDetail] = useState<ReplenishmentItem | null>(null);
  const [forecast, setForecast] = useState<ForecastDetail | null>(null);
  const [forecastHistory, setForecastHistory] = useState<ForecastHistory | null>(null);
  const [notice, setNotice] = useState<{ code: string; id: string }[]>([]);

  const items = list.data?.items ?? [];
  const summary = list.data?.summary;
  const pending = useMemo(() => items.filter((item) => item.status === "PENDING"), [items]);
  const visibleItems = items.filter((item) => {
    const needle = search.trim().toLocaleLowerCase("vi");
    return (!urgency || (item.status === "PENDING" && item.urgency === urgency)) &&
      (!needle || item.productName.toLocaleLowerCase("vi").includes(needle) || item.sku.toLocaleLowerCase("vi").includes(needle));
  }).sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));
  const visibleOrderable = visibleItems.filter((item) => item.status === "PENDING" && item.supplierId);
  const allVisibleSelected = visibleOrderable.length > 0 && visibleOrderable.every((item) => item.id in picked);
  const selected = pending.filter((item) => item.id in picked);
  const selectedAmount = selected.reduce((sum, item) => sum + picked[item.id] * item.unitCost, 0);
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const hiddenSelected = selected.filter((item) => !visibleIds.has(item.id)).length;
  const missingSupplier = selected.filter((item) => !item.supplierId).length;
  const dataWarnings = list.data?.warnings.filter((warning) => warning.code !== "FORECAST_UNAVAILABLE" && warning.code !== "FORECAST_SYNTHETIC_MODEL") ?? [];

  const toggle = (item: ReplenishmentItem) =>
    setPicked((current) => {
      const next = { ...current };
      if (item.id in next) delete next[item.id];
      else next[item.id] = item.suggestedQty;
      return next;
    });
  const toggleAll = () => {
    setPicked((current) => {
      const next = { ...current };
      for (const item of visibleOrderable) {
        if (allVisibleSelected) delete next[item.id];
        else if (!(item.id in next)) next[item.id] = item.suggestedQty;
      }
      return next;
    });
  };

  const openDetail = (item: ReplenishmentItem) => action.run(async () => {
    setDetail(item);
    setForecast(null);
    setForecastHistory(null);
    const [current, history] = await Promise.all([
      aiInsightsApi.forecast(item.variantId), aiInsightsApi.forecastHistory(item.variantId),
    ]);
    setForecast(current);
    setForecastHistory(history);
  });

  const createDrafts = () => action.run(async () => {
    setNotice([]);
    const result = await aiInsightsApi.createDraftOrders(selected.map((item) => ({ id: item.id, qty: picked[item.id] })));
    setNotice(result.orders.map((order) => ({ code: order.poCode, id: order.id })));
    setPicked({});
    list.reload();
  });

  const dismiss = (item: ReplenishmentItem, snoozeDays?: number) => action.run(async () => {
    await aiInsightsApi.setReplenishmentStatus(item.id, { status: "DISMISSED", snoozeDays });
    setPicked((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setDetail(null);
    list.reload();
  });

  return (
    <AppLayout contentClassName="ai-insights-content">
      <main className="bd-page replenishment-page">
        <header className="ai-header">
          <div className="ai-header-main">
            <h1>Gợi ý nhập hàng</h1>
            <p>Xem mặt hàng nên cân nhắc nhập thêm, số lượng và chi phí dự kiến. Bạn có thể điều chỉnh số lượng trước khi tạo đơn nháp.</p>
            <p className="bd-range-caption">Gợi ý chỉ để tham khảo; hãy kiểm tra tồn kho, đơn đang đặt và kế hoạch bán trước khi quyết định.</p>
          </div>
        </header>

        <ErrorBox error={action.error || list.error} />
        {list.data && !list.data.forecastReady && (
          <div className="bd-notice warning" role="status">
            Dự báo chưa cập nhật hoặc dịch vụ dự báo không khả dụng. Các gợi ý bên dưới có thể đã cũ; hãy phân tích lại trước khi tạo đơn nháp.
            {list.data.forecastAsOf ? ` Dữ liệu dự báo gần nhất đến hết ${displayDate(list.data.forecastAsOf)}.` : ""}
          </div>
        )}
        {dataWarnings.length > 0 && <details className="ai-data-warnings">
          <summary>Có {dataWarnings.length} lưu ý về dữ liệu có thể ảnh hưởng đến gợi ý</summary>
          <ul>{dataWarnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.code === "FORECAST_OVERDUE_PO" ?
            `${warning.count ? `${warning.count} đơn hàng đang về đã quá hạn` : "Có đơn hàng đang về đã quá hạn"}. Khi tính gợi ý, hệ thống giả định hàng về sớm nhất vào ngày sau lần phân tích, chưa được nhà cung cấp xác nhận.` :
            warning.message}</li>)}</ul>
        </details>}
        {notice.length > 0 && (
          <div className="bd-notice success" role="status">
            Đã tạo {notice.length} đơn nháp: {notice.map((order, index) => <span key={order.id}>{index > 0 ? ", " : ""}
              <Link to={`/purchases/${order.id}`}>Mở đơn nhập hàng {order.code}</Link></span>)}.
            Mở đơn để kiểm tra và bấm “Xác nhận đặt hàng”.
          </div>
        )}
        {summary && summary.noSupplierCount > 0 && (
          <div className="bd-notice warning" role="status">{summary.noSupplierCount} mã hàng chưa có nhà cung cấp nên chưa thể tạo đơn. Hãy thêm sản phẩm vào danh sách của nhà cung cấp rồi phân tích lại.</div>
        )}
        {pending.some((item) => item.unitCost === 0) && <div className="bd-notice warning" role="status">Có sản phẩm có giá nhập bằng 0. Hãy kiểm tra giá trước khi quyết định; chi phí dự kiến có thể chưa đầy đủ.</div>}

        {list.loading && <div className="bd-notice" role="status">Đang tải gợi ý nhập hàng…</div>}
        {summary && <section className="ai-workspace">
          <div className="ai-priority-intro">
            <div><h2>Những mặt hàng cần cân nhắc</h2><p>{list.data?.forecastAsOf ? `Dữ liệu của dự báo gần nhất đến hết ${displayDate(list.data.forecastAsOf)}. ` : ""}Tồn kho là số liệu tại lần phân tích, không phải tồn hiện tại.</p></div>
            <p>{list.data?.forecastReady ? "Chọn mức ưu tiên để xem các gợi ý đang chờ." : "Các mức ưu tiên có thể đã cũ; chọn một mức để xem gợi ý đang chờ."}</p>
          </div>
          <div className="ai-kpis">
            <div className="ai-kpi"><span>Gợi ý đang chờ</span><strong>{summary.pendingCount} mã hàng</strong><small>Chưa tạo đơn nháp</small></div>
            <div className="ai-kpi"><span>Tạm tính nếu nhập tất cả</span><strong>{money(summary.pendingAmount)}</strong><small>Theo giá nhà cung cấp hoặc giá vốn nếu chưa có; chưa gồm phí khác</small></div>
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Urgency[]).map((key) => (
              <button type="button" className={`ai-sev-card ${key.toLowerCase()}${urgency === key ? " active" : ""}`} key={key}
                aria-pressed={urgency === key} onClick={() => setUrgency(urgency === key ? "" : key)}>
                <span>{URGENCY_LABELS[key]}</span>
                <strong>{summary.byUrgency[key] ?? 0}</strong>
                <small>{URGENCY_HINTS[key]}</small>
              </button>
            ))}
          </div>

          <div className="ai-list-panel">
            <div className="ai-list-heading"><h2>Danh sách gợi ý</h2><p>Đơn nháp cần được xác nhận mới trở thành đơn đặt hàng.</p></div>
            <div className="bd-filters">
              <label className="bd-search"><Search size={17} /><input aria-label="Tìm sản phẩm hoặc mã hàng" placeholder="Tìm sản phẩm hoặc mã hàng…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              {urgency && <button className="ai-chip" type="button" onClick={() => setUrgency("")}>Xem tất cả mức ưu tiên</button>}
            </div>
            {canOrder && (
              <div className="ai-toolbar">
                <span>{selected.length > 0 ? `Đã chọn ${selected.length} mã hàng · Tạm tính ${money(selectedAmount)}${hiddenSelected ? ` (gồm ${hiddenSelected} mã đang bị lọc)` : ""}` : "Chọn các mặt hàng muốn nhập để tạo đơn nháp"}</span>
                <div className="ai-toolbar-side">
                  <Button disabled={!list.data?.forecastReady || action.busy || selected.length === 0 || selected.length > 200 || missingSupplier > 0} onClick={() => void createDrafts()} type="button"><PackagePlus size={15} /> Tạo đơn nháp</Button>
                </div>
              </div>
            )}
            {selected.length > 200 && <p className="inventory-stale">Chọn tối đa 200 mã hàng mỗi lần tạo đơn nháp.</p>}
            {missingSupplier > 0 && <p className="inventory-stale">Một số mặt hàng đã chọn chưa có nhà cung cấp. Bỏ chọn các mặt hàng này trước khi tạo đơn nháp.</p>}
            {visibleItems.length > 0 ? (
              <div className="bd-table-wrap"><table className="bd-table ai-table replenishment-table">
                <colgroup>{canOrder && <col className="replenishment-col-check" />}<col className="replenishment-col-priority" /><col className="replenishment-col-product" /><col className="replenishment-col-situation" /><col className="replenishment-col-quantity" /><col /><col className="replenishment-col-detail" /></colgroup>
                <thead><tr>
                  {canOrder && <th><input aria-label="Chọn tất cả mặt hàng đang hiển thị" disabled={!list.data?.forecastReady || action.busy || visibleOrderable.length === 0} checked={allVisibleSelected} onChange={toggleAll} type="checkbox" /></th>}
                  <th>Mức ưu tiên</th><th>Sản phẩm</th><th>Tình hình</th><th>Số lượng nhập</th><th>Nhà cung cấp / Chi phí</th><th aria-label="Chi tiết"></th>
                </tr></thead>
                <tbody>{visibleItems.map((item) => {
                  const isPending = item.status === "PENDING";
                  return (
                    <tr className={isPending ? `sev-${item.urgency.toLowerCase()}` : ""} key={item.id} onClick={() => void openDetail(item)}>
                      {canOrder && <td onClick={(event) => event.stopPropagation()}><input aria-label={`Chọn ${item.productName} ${item.sku}`} checked={item.id in picked} disabled={action.busy || !isPending || (!(item.id in picked) && (!list.data?.forecastReady || !item.supplierId))} onChange={() => toggle(item)} type="checkbox" /></td>}
                      <td>{isPending ? <span className={`ai-sev ai-sev-${item.urgency.toLowerCase()}`}>{URGENCY_LABELS[item.urgency]}</span> : "Đã tạo đơn"}</td>
                      <td className="ai-product"><strong>{item.productName}</strong><small>{item.sku}</small></td>
                      <td className="ai-problem">
                        {isPending ? <p>{item.stockoutDate ? `Có thể hết hàng ${displayDate(item.stockoutDate)}.` : "Cần xem xét lượng hàng còn lại."}</p> :
                          <p>{item.poStatus === "DRAFT" ? "Đơn nháp chưa xác nhận, chưa phải hàng đang về." : "Đã tạo đơn; xem đơn để kiểm tra trạng thái."}</p>}
                      </td>
                      <td className="ai-money">
                        {!isPending ? "Xem trong đơn" : canOrder && item.id in picked ? (
                          <input aria-label={`Số lượng nhập ${item.productName} ${item.sku}`} className="ai-qty" min={1} disabled={action.busy} onChange={(event) => setPicked({ ...picked, [item.id]: Math.max(1, Math.floor(Number(event.target.value) || 1)) })} onClick={(event) => event.stopPropagation()} type="number" value={picked[item.id]} />
                        ) : <>{fmt(item.suggestedQty, 0)} sản phẩm<small>Gợi ý tham khảo</small></>}
                        {item.orderByDate && isPending && <small>Ngày cân nhắc đặt: {displayDate(item.orderByDate)}</small>}
                      </td>
                      <td>{isPending ? <>{item.supplierName ?? <em>Chưa có nhà cung cấp</em>}<small className="replenishment-amount">{money(item.id in picked ? picked[item.id] * item.unitCost : item.amount)} · tạm tính</small></> :
                        item.poId ? <Link onClick={(event) => event.stopPropagation()} to={`/purchases/${item.poId}`}>{item.poCode ?? "Xem đơn"}</Link> : "Không rõ đơn"}</td>
                      <td><button aria-label={`Xem chi tiết ${item.productName} ${item.sku}`} className="ai-icon-btn" onClick={(event) => { event.stopPropagation(); void openDetail(item); }} title="Xem chi tiết" type="button"><Eye size={18} aria-hidden="true" /></button></td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            ) : (
              <div className="bd-empty-state compact"><h3>{items.length ? "Không có mặt hàng phù hợp" : "Chưa có gợi ý nhập hàng"}</h3><p>{items.length ? "Thử đổi từ khóa hoặc mức ưu tiên." : "Điều này không đảm bảo cửa hàng không có rủi ro. Hãy xem lưu ý dữ liệu hoặc chạy lại phân tích ở trang Cảnh báo tồn kho."}</p></div>
            )}
          </div>
        </section>}
      </main>

      <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Căn cứ gợi ý nhập">
        {detail && (
          <div className="bd-modal-content">
            <div className="bd-modal-intro">
              <div><h3>{detail.productName}</h3><p>{detail.sku}</p></div>
              {detail.status === "PENDING" ? <span className={`ai-sev ai-sev-${detail.urgency.toLowerCase()}`}>{URGENCY_LABELS[detail.urgency]}</span> : <span>Đã tạo đơn</span>}
            </div>
            {detail.status === "PENDING" ? <>
              {(!list.data?.forecastReady || forecast?.stale) && <div className="bd-notice warning" role="status">Gợi ý có thể đã cũ. Hãy chạy lại phân tích trước khi tạo đơn nháp và kiểm tra thực tế.</div>}
              <div className="ai-callout action">
                <strong>Số lượng đề xuất: {fmt(detail.suggestedQty, 0)} sản phẩm</strong> · Chi phí dự kiến {money(detail.amount)}{detail.orderByDate ? ` · Nên cân nhắc đặt trước ${displayDate(detail.orderByDate)}` : ""}.
                <p>Đây chỉ là đề xuất. Bạn quyết định có nhập hay không và có thể chỉnh số lượng trước khi tạo đơn nháp. Đơn nháp chưa phải đơn đặt hàng đã xác nhận.</p>
              </div>
              <p>{replenishmentReason(detail)}</p>
            </> : <div className="ai-callout">
              <strong>{detail.poStatus === "DRAFT" ? "Đơn nháp chưa xác nhận" : "Đã tạo đơn từ gợi ý này"}</strong>
              <p>Các thông tin bên dưới là căn cứ của gợi ý tại thời điểm tạo đơn. Chúng có thể đã thay đổi và không nhất thiết phản ánh số lượng hoặc chi phí hiện tại.
                {detail.poStatus === "DRAFT" ? " Đơn nháp chưa phải hàng đang về." : ""}</p>
              {detail.poId && <Link to={`/purchases/${detail.poId}`}>Xem {detail.poCode ?? "đơn mua hàng"}</Link>}
            </div>}
            <p className="bd-modal-note">{evidenceLabel(detail.confidence)}. Dự báo chỉ để tham khảo; lượng bán thực tế có thể khác.</p>
            <h4>Những thông tin ảnh hưởng đến đề xuất</h4>
            <div className="bd-detail-grid">
              <DetailLine label="Hàng hiện có thể bán (theo lần phân tích)" value={fmt(detailNum(detail, "stockAvailable"), 0)} />
              <DetailLine label="Hàng đã đặt nhưng chưa nhận" value={fmt(detailNum(detail, "onOrder"), 0)} />
              <DetailLine label="Ngày dự kiến có thể hết hàng" value={detail.stockoutDate ? displayDate(detail.stockoutDate) : "Chưa xác định"} />
              <DetailLine label="Thời gian giao hàng ước tính" value={detailNum(detail, "leadTimeDays") === null ? "Chưa rõ" : `Khoảng ${fmt(detailNum(detail, "leadTimeDays"), 0)} ngày (${LEAD_SOURCES[String(detail.details.leadTimeSource)] ?? "theo thông tin sản phẩm"})`} />
              <DetailLine label="Nhà cung cấp tham khảo" value={detail.supplierName ?? "Chưa có nhà cung cấp"} />
              <DetailLine label="Điều kiện đặt hàng" value={`Tối thiểu ${fmt(detailNum(detail, "minOrderQty"), 0)} sản phẩm; theo bội số ${fmt(detailNum(detail, "orderMultiple"), 0)}`} />
            </div>
            <p className="bd-modal-note">Thời gian giao hàng chỉ là ước tính, chưa có nghĩa là bạn đã đặt hàng. Các đơn đang chờ cũng có thể giao trễ.
              {detailNum(detail, "unsellableLotUnits") ? ` Hệ thống cũng đã tính đến ${fmt(detailNum(detail, "unsellableLotUnits"), 0)} sản phẩm có thể không bán kịp trước hạn.` : ""}</p>
            {overdueOrders(detail).map((po) => (
              <div className="bd-notice warning" key={`${po.poCode}-${po.arrivalDate}`} role="status">
                Đơn {po.poCode} còn {fmt(po.qty, 0)} sản phẩm và đã quá ngày giao dự kiến {displayDate(po.arrivalDate)}.
                Khi tính gợi ý, hệ thống tạm giả định hàng về sớm nhất vào ngày sau lần phân tích; nhà cung cấp chưa xác nhận ngày này.
              </div>
            ))}
            {action.busy && !forecast && <p role="status" className="bd-modal-note">Đang tải dự báo và lịch sử…</p>}
            <h4>Bán gần đây và dự báo</h4>
            {detail.status !== "PENDING" && <p className="bd-modal-note">Đây là dự báo gần nhất; có thể khác dự báo dùng khi tạo đơn.</p>}
            {forecast?.status === "OK" && (
              <>
                <ForecastSummary detail={forecast} />
                {forecast.stale && <p className="inventory-stale">Dự báo này đã cũ hoặc chưa được cập nhật; không nên dùng riêng để quyết định nhập hàng.</p>}
              </>
            )}
            {forecast?.status === "INSUFFICIENT_DATA" && <p className="bd-modal-note">Chưa có đủ dữ liệu bán để dự báo mặt hàng này.</p>}
            <p className="bd-modal-note">Số lượng đề xuất được tính từ nhu cầu dự kiến, hàng có thể bán, hàng đã đặt và thời gian giao hàng; sau đó được làm tròn theo điều kiện đặt hàng. Khuyến mãi hoặc thay đổi nhu cầu có thể khiến lượng bán thực tế khác dự báo.</p>
            <details className="ai-details">
              <summary>Xem các lần dự báo trước và kết quả đối chiếu</summary>
              <p className="bd-modal-note">Phần này so sánh dự báo với số bán tại quầy trước khi trừ hàng trả. Nếu kỳ bán đã bắt đầu trước khi có dự báo, kết quả chỉ để tham khảo. Ngày hết hàng hoặc thiếu thông tin tồn kho có thể khiến số bán ghi nhận thấp hơn nhu cầu thực tế.</p>
              {forecastHistory && forecastHistory.items.length === 0 && <p className="bd-modal-note">Chưa có lịch sử dự báo được lưu.</p>}
              {forecastHistory?.items.map((entry) => (
                <div key={entry.id}>
                  <p className="bd-modal-note"><strong>Dữ liệu bán được tính đến hết {displayDate(entry.asOf)}</strong></p>
                  <div className="bd-table-wrap"><table className="bd-table">
                    <thead><tr><th>Thời gian</th><th>Dự báo</th><th>Đã bán tại quầy</th><th>Mức chênh lệch</th><th>Kết quả đối chiếu</th></tr></thead>
                    <tbody>{entry.evaluations.map((evaluation) => (
                      <tr key={evaluation.days}><td>{displayDate(evaluation.start)} – {displayDate(evaluation.end)} ({evaluation.days} ngày)</td><td>{fmt(evaluation.predicted)}</td><td>{fmt(evaluation.actual)}</td><td>{fmt(evaluation.absoluteError)}</td><td>{EVALUATION_LABELS[evaluation.status]}{evaluation.partialStart && evaluation.status !== "PARTIAL_START" ? "; kỳ này đã bắt đầu trước khi có dự báo" : ""}</td></tr>
                    ))}</tbody>
                  </table></div>
                  {entry.segmentEvaluations ? <>
                  <p className="bd-modal-note">Đối chiếu riêng số bán dự kiến trong khoảng ngày 8–14 và ngày 15–28 tính từ mốc dữ liệu trên. Đây không phải các kỳ bắt đầu ngay ngày hôm sau.</p>
                  <div className="bd-table-wrap"><table className="bd-table">
                    <thead><tr><th>Khoảng ngày dự báo</th><th>Dự báo</th><th>Đã bán tại quầy</th><th>Mức chênh lệch</th><th>Kết quả đối chiếu</th></tr></thead>
                    <tbody>{entry.segmentEvaluations.map((evaluation) => (
                      <tr key={evaluation.start}><td>{displayDate(evaluation.start)} – {displayDate(evaluation.end)} ({evaluation.days} ngày)</td><td>{fmt(evaluation.predicted)}</td><td>{fmt(evaluation.actual)}</td><td>{fmt(evaluation.absoluteError)}</td><td>{EVALUATION_LABELS[evaluation.status]}{evaluation.partialStart && evaluation.status !== "PARTIAL_START" ? "; kỳ này đã bắt đầu trước khi có dự báo" : ""}</td></tr>
                    ))}</tbody>
                  </table></div>
                  </> : <p className="bd-modal-note">Chưa có dữ liệu đối chiếu cho các ngày sau.</p>}
                  <p className="bd-modal-note">Đối chiếu thêm các kỳ bắt đầu từ ngày thứ hai sau mốc dữ liệu trên. Đây là dự báo riêng, không thay thế gợi ý nhập hàng. Chỉ nên so sánh khi dự báo hoàn tất trước kỳ và có đủ thông tin tồn kho.</p>
                  {entry.nextDayEvaluation?.status === "OK" ? (
                    <div className="bd-table-wrap"><table className="bd-table">
                      <thead><tr><th>Thời gian</th><th>Dự báo</th><th>Đã bán tại quầy</th><th>Mức chênh lệch</th><th>Kết quả đối chiếu</th></tr></thead>
                      <tbody>{entry.nextDayEvaluation.evaluations.map((evaluation) => (
                        <tr key={evaluation.days}><td>{displayDate(evaluation.start)} – {displayDate(evaluation.end)} ({evaluation.days} ngày)</td><td>{fmt(evaluation.predicted)}</td><td>{fmt(evaluation.actual)}</td><td>{fmt(evaluation.absoluteError)}</td><td>{EVALUATION_LABELS[evaluation.status]}{evaluation.partialStart && evaluation.status !== "PARTIAL_START" ? "; kỳ này đã bắt đầu trước khi có dự báo" : ""}</td></tr>
                      ))}</tbody>
                    </table></div>
                  ) : <p className="bd-modal-note">Chưa có dữ liệu đối chiếu cho các kỳ này.</p>}
                </div>
              ))}
            </details>
            <ErrorBox error={action.error} />
            {canManage && detail.status === "PENDING" && (
              <div className="bd-range-actions">
                <Button disabled={action.busy} onClick={() => void dismiss(detail, 7)} type="button" variant="outline">Nhắc lại sau 7 ngày</Button>
                <Button disabled={action.busy} onClick={() => void dismiss(detail)} type="button" variant="outline">Không cần nhập</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
