import { useMemo, useState } from "react";
import { Eye, PackagePlus } from "lucide-react";
import { Link } from "react-router-dom";

import { aiInsightsApi, type ForecastDetail, type ReplenishmentItem, type Urgency } from "@/api/ai-insights";
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
  CRITICAL: "Sẽ hết hàng trước khi hàng về",
  HIGH: "Hết hàng sát ngày hàng về",
  MEDIUM: "Nên đặt trong tuần này",
  LOW: "Chưa gấp",
};
const CONFIDENCE_LABELS = { HIGH: "Tin cậy cao", MEDIUM: "Tin cậy vừa", LOW: "Tin cậy thấp" } as const;
const confidenceLabel = (value: ReplenishmentItem["confidence"]) => value ? CONFIDENCE_LABELS[value] : "Chưa đủ dữ liệu đánh giá độ tin cậy";
const LEAD_SOURCES: Record<string, string> = {
  SUPPLIER: "theo nhà cung cấp",
  OBSERVED: "theo các lần nhập thực tế",
  VARIANT: "theo cấu hình sản phẩm",
  DEFAULT: "giá trị mặc định",
};
const MODEL_LABELS: Record<string, string> = {
  MEAN_28: "Trung bình 28 ngày",
  MOVING_AVG_7: "Trung bình động 7 ngày",
  MOVING_AVG_14: "Trung bình động 14 ngày",
  SES: "Làm mượt hàm mũ",
  CROSTON_SBA: "Croston (hàng bán thưa)",
  LIGHTGBM: "LightGBM (nghiên cứu)",
};

const fmt = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: digits });
const detailNum = (item: ReplenishmentItem, key: string) => (typeof item.details[key] === "number" ? (item.details[key] as number) : null);

function Chart({ detail }: { detail: ForecastDetail }) {
  const { history, forecast } = detail;
  const width = 560;
  const height = 150;
  const futureDays = 14;
  const total = history.length + futureDays;
  const rates = forecast.dailyRates?.slice(0, futureDays) ?? Array(futureDays).fill(forecast.dailyRate) as number[];
  const peak = Math.max(1, ...rates, ...history.map((point) => point.units));
  const x = (index: number) => 8 + (index / Math.max(1, total - 1)) * (width - 16);
  const y = (value: number) => height - 8 - (value / peak) * (height - 20);
  const line = history.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.units).toFixed(1)}`).join(" ");
  const future = rates.map((rate, index) => `${index === 0 ? "M" : "L"}${x(history.length + index).toFixed(1)},${y(rate).toFixed(1)}`).join(" ");
  return (
    <svg aria-label="Biểu đồ bán hàng và dự báo" className="ai-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
      <path d={line} fill="none" stroke="#2563eb" strokeWidth="2" />
      <path d={future} fill="none" stroke="#f59e0b" strokeDasharray="5 4" strokeWidth="2" />
    </svg>
  );
}

export function ReplenishmentPage() {
  const { can } = usePermissions();
  const canManage = can("ai_insights.manage");
  const canOrder = canManage && can("inventory.receive");
  const action = useAction();
  const list = useLoad(() => aiInsightsApi.replenishment(), []);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<ReplenishmentItem | null>(null);
  const [forecast, setForecast] = useState<ForecastDetail | null>(null);
  const [notice, setNotice] = useState<{ code: string; id: string }[]>([]);

  const items = list.data?.items ?? [];
  const summary = list.data?.summary;
  const pending = useMemo(() => items.filter((item) => item.status === "PENDING"), [items]);
  const selected = pending.filter((item) => item.id in picked);
  const selectedAmount = selected.reduce((sum, item) => sum + picked[item.id] * item.unitCost, 0);
  const missingSupplier = selected.filter((item) => !item.supplierId).length;

  const toggle = (item: ReplenishmentItem) =>
    setPicked((current) => {
      const next = { ...current };
      if (item.id in next) delete next[item.id];
      else next[item.id] = item.suggestedQty;
      return next;
    });
  const toggleAll = () => {
    const orderable = pending.filter((item) => item.supplierId);
    setPicked(selected.length === orderable.length ? {} : Object.fromEntries(orderable.map((item) => [item.id, item.suggestedQty])));
  };

  const openDetail = (item: ReplenishmentItem) => action.run(async () => {
    setDetail(item);
    setForecast(null);
    setForecast(await aiInsightsApi.forecast(item.variantId));
  });

  const createDrafts = () => action.run(async () => {
    const result = await aiInsightsApi.createDraftOrders(selected.map((item) => ({ id: item.id, qty: picked[item.id] })));
    setNotice(result.orders.map((order) => ({ code: order.poCode, id: order.id })));
    setPicked({});
    list.reload();
  });

  const dismiss = (item: ReplenishmentItem, snoozeDays?: number) => action.run(async () => {
    await aiInsightsApi.setReplenishmentStatus(item.id, { status: "DISMISSED", snoozeDays });
    setDetail(null);
    list.reload();
  });

  return (
    <AppLayout>
      <main className="bd-page">
        <header className="ai-header">
          <div className="ai-header-main">
            <h1>Gợi ý nhập hàng</h1>
            <p>Hệ thống dự báo lượng bán 7–28 ngày tới, so với tồn kho, hàng đang về và thời gian nhà cung cấp giao để gợi ý nên nhập gì, bao nhiêu. Chọn các dòng rồi tạo đơn nháp để duyệt trong mục Nhập hàng.</p>
          </div>
        </header>

        <ErrorBox error={action.error || list.error} />
        {list.data && !list.data.forecastReady && (
          <div className="bd-notice warning" role="status">
            Dự báo chưa cập nhật hoặc dịch vụ dự báo không khả dụng. Các gợi ý bên dưới là dữ liệu cũ
            {list.data.forecastAsOf ? ` đến hết ${displayDate(list.data.forecastAsOf)}` : ""}; hãy phân tích lại trước khi tạo đơn nháp.
          </div>
        )}
        {list.data?.warnings.filter((warning) => warning.code !== "FORECAST_UNAVAILABLE").map((warning) => (
          <div className="bd-notice warning" key={warning.code} role="status">{warning.message}</div>
        ))}
        {notice.length > 0 && (
          <div className="bd-notice success" role="status">
            Đã tạo {notice.length} đơn nháp: {notice.map((order) => <Link key={order.id} to={`/purchases/${order.id}`}>{order.code} </Link>)}
            — vào đơn để kiểm tra và bấm “Xác nhận đặt hàng”.
          </div>
        )}
        {summary && summary.noSupplierCount > 0 && (
          <div className="bd-notice warning" role="status">{summary.noSupplierCount} sản phẩm chưa có nhà cung cấp nên chưa thể tạo đơn. Hãy gán sản phẩm vào danh mục của một nhà cung cấp.</div>
        )}

        <section className="ai-workspace">
          <div className="ai-kpis">
            <div className="ai-kpi"><span>Cần nhập</span><strong>{summary?.pendingCount ?? 0} sản phẩm</strong><small>Đang chờ bạn quyết định</small></div>
            <div className="ai-kpi"><span>Dự kiến chi</span><strong>{money(summary?.pendingAmount ?? 0)}</strong><small>Theo giá nhập của nhà cung cấp</small></div>
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Urgency[]).map((key) => (
              <div className={`ai-sev-card ${key.toLowerCase()}`} key={key} title={URGENCY_HINTS[key]}>
                <span>{URGENCY_LABELS[key]}</span>
                <strong>{summary?.byUrgency[key] ?? 0}</strong>
                <small>{URGENCY_HINTS[key]}</small>
              </div>
            ))}
          </div>

          <div className="ai-list-panel">
            {canOrder && (
              <div className="ai-toolbar">
                <span>{selected.length > 0 ? `Đã chọn ${selected.length} dòng · ${money(selectedAmount)}` : "Chọn các dòng cần nhập để tạo đơn nháp"}</span>
                <div className="ai-toolbar-side">
                  <Button disabled={!list.data?.forecastReady || action.busy || selected.length === 0 || missingSupplier > 0} onClick={() => void createDrafts()} type="button"><PackagePlus size={15} /> Tạo đơn nháp</Button>
                </div>
              </div>
            )}
            {list.loading && <p className="bd-range-caption">Đang tải…</p>}
            {items.length > 0 ? (
              <div className="bd-table-wrap"><table className="bd-table ai-table">
                <thead><tr>
                  {canOrder && <th><input aria-label="Chọn tất cả" disabled={!list.data?.forecastReady} checked={selected.length > 0 && selected.length === pending.filter((i) => i.supplierId).length} onChange={toggleAll} type="checkbox" /></th>}
                  <th>Mức độ</th><th>Sản phẩm</th><th>Tình hình</th><th>Số lượng nên nhập</th><th>Thành tiền</th><th>Nhà cung cấp</th><th></th>
                </tr></thead>
                <tbody>{items.map((item) => {
                  const isPending = item.status === "PENDING";
                  return (
                    <tr className={`sev-${item.urgency.toLowerCase()}`} key={item.id} onClick={() => void openDetail(item)}>
                      {canOrder && <td onClick={(event) => event.stopPropagation()}><input aria-label={`Chọn ${item.productName}`} checked={item.id in picked} disabled={!list.data?.forecastReady || !isPending || !item.supplierId} onChange={() => toggle(item)} type="checkbox" /></td>}
                      <td><span className={`ai-sev ai-sev-${item.urgency.toLowerCase()}`}>{URGENCY_LABELS[item.urgency]}</span></td>
                      <td className="ai-product"><strong>{item.productName}</strong><small>{item.sku}</small></td>
                      <td className="ai-problem">
                        <p>
                          Còn {fmt(detailNum(item, "stockAvailable"), 0)}{detailNum(item, "onOrder") ? ` (+${fmt(detailNum(item, "onOrder"), 0)} đang về)` : ""}, bán khoảng {fmt(detailNum(item, "dailyRate"))}/ngày.
                          {item.stockoutDate ? ` Dự kiến hết hàng ${displayDate(item.stockoutDate)}.` : ""}
                        </p>
                        <small>{confidenceLabel(item.confidence)}</small>
                      </td>
                      <td className="ai-money">
                        {isPending && canOrder && item.id in picked ? (
                          <input aria-label="Số lượng nhập" className="ai-qty" min={1} onChange={(event) => setPicked({ ...picked, [item.id]: Math.max(1, Math.floor(Number(event.target.value) || 1)) })} onClick={(event) => event.stopPropagation()} type="number" value={picked[item.id]} />
                        ) : fmt(item.suggestedQty, 0)}
                        {item.orderByDate && isPending && <small>Đặt trước {displayDate(item.orderByDate)}</small>}
                      </td>
                      <td className="ai-money">{money(item.id in picked ? picked[item.id] * item.unitCost : item.amount)}</td>
                      <td>{item.status === "ORDERED" ? <span>Đã tạo đơn {item.poCode}</span> : item.supplierName ?? <em>Chưa có</em>}</td>
                      <td><button aria-label="Xem chi tiết" className="ai-icon-btn" onClick={(event) => { event.stopPropagation(); void openDetail(item); }} title="Xem chi tiết" type="button"><Eye size={18} /></button></td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            ) : (
              !list.loading && <div className="bd-empty-state compact"><h3>Chưa có gợi ý nhập hàng</h3><p>Xem các thông báo về dữ liệu ở trên hoặc chạy phân tích tại trang Cảnh báo tồn kho.</p></div>
            )}
          </div>
        </section>
      </main>

      <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Vì sao nên nhập?">
        {detail && (
          <div className="bd-modal-content">
            <div className="bd-modal-intro">
              <div><h3>{detail.productName}</h3><p>{detail.sku} · {confidenceLabel(detail.confidence)}</p></div>
              <span className={`ai-sev ai-sev-${detail.urgency.toLowerCase()}`}>{URGENCY_LABELS[detail.urgency]}</span>
            </div>
            {forecast?.stale && <div className="bd-notice warning" role="status">Đây là kết quả cũ, chưa thể dùng để tạo đơn nháp. Hãy chạy lại phân tích khi dịch vụ dự báo hoạt động.</div>}
            <div className="ai-callout action"><strong>{forecast?.stale ? "Gợi ý cũ" : "Nên nhập"} {fmt(detail.suggestedQty, 0)} sản phẩm</strong> ({money(detail.amount)}){detail.orderByDate ? `, đặt trước ${displayDate(detail.orderByDate)}` : ""}.</div>
            {forecast?.status === "OK" && (
              <>
                <Chart detail={forecast} />
                <p className="bd-modal-note">Đường xanh: số bán POS trước trừ trả mỗi ngày. Đường cam: dự báo bình quân trong từng giai đoạn.
                  14 ngày tới dự báo bán {fmt(forecast.forecast.totals.d14)} sản phẩm. Chưa có khoảng dự báo được hiệu chuẩn; mức tin cậy chỉ là phân loại theo backtest.</p>
              </>
            )}
            {forecast?.status === "INSUFFICIENT_DATA" && <p className="bd-modal-note">Sản phẩm chưa đủ dữ liệu bán để dự báo đáng tin.</p>}
            <div className="bd-detail-grid">
              <DetailLine label="Tồn có thể bán" value={fmt(detailNum(detail, "sellableStock"), 0)} />
              <DetailLine label="Đang đặt, chưa về" value={fmt(detailNum(detail, "onOrder"), 0)} />
              <DetailLine label="Thời gian nhà cung cấp giao" value={`${fmt(detailNum(detail, "leadTimeDays"), 0)} ngày (${LEAD_SOURCES[String(detail.details.leadTimeSource)] ?? "—"})`} />
              <DetailLine label="Chu kỳ đặt hàng" value={`${fmt(detailNum(detail, "reviewPeriodDays"), 0)} ngày`} />
              <DetailLine label="Tồn an toàn" value={fmt(detailNum(detail, "safetyStock"))} />
              <DetailLine label="Mức tồn mục tiêu" value={fmt(detailNum(detail, "target"))} />
              <DetailLine label="Số lượng thiếu" value={fmt(detailNum(detail, "rawNeed"))} />
              <DetailLine label="Quy cách nhập" value={`Tối thiểu ${fmt(detailNum(detail, "minOrderQty"), 0)}, bội số ${fmt(detailNum(detail, "orderMultiple"), 0)}`} />
              <DetailLine label="Phương pháp dự báo" value={MODEL_LABELS[String(detail.details.model)] ?? "—"} />
              <DetailLine label="Sai số dự báo gần đây" value={detail.details.wape === null || detail.details.wape === undefined ? "Chưa đo được" : `${fmt(Number(detail.details.wape) * 100)}%`} />
            </div>
            <p className="bd-modal-note">Cách tính: {String(detail.details.formula ?? "")}</p>
            <details className="ai-details">
              <summary>So sánh các phương pháp dự báo</summary>
              <p className="bd-modal-note">So sánh cùng dữ liệu POS trước trừ trả và cùng các kỳ 7 ngày không hết hàng. WAPE dùng để chọn phương pháp, không phải đánh giá độc lập; chưa đo được khi không có doanh số. LightGBM huấn luyện bằng dữ liệu giả lập; kết quả không chứng minh độ chính xác tại cửa hàng thật.</p>
              {forecast?.forecast.comparison && (
                <div>
                  <p className="bd-modal-note">Đến hết {displayDate(forecast.asOf)} · {forecast.forecast.seriesDays} ngày lịch sử · {forecast.forecast.modelVersion}. Chỉ chọn phương pháp khác trung bình khi có ít nhất 2 kỳ và WAPE thấp hơn ít nhất 10%.</p>
                  <div className="bd-table-wrap"><table className="bd-table">
                    <thead><tr><th>Phương pháp</th><th>7 ngày</th><th>14 ngày</th><th>28 ngày</th><th>WAPE</th><th>Số kỳ</th></tr></thead>
                    <tbody>{forecast.forecast.comparison.map((row) => (
                      <tr key={row.model}><td>{MODEL_LABELS[row.model] ?? row.model}{row.model === forecast.forecast.model ? " (đã chọn)" : ""}</td><td>{fmt(row.totals.d7)}</td><td>{fmt(row.totals.d14)}</td><td>{fmt(row.totals.d28)}</td><td>{row.wape === null ? "Chưa đo" : `${fmt(row.wape * 100)}%`}</td><td>{row.count}</td></tr>
                    ))}</tbody>
                  </table></div>
                </div>
              )}
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
