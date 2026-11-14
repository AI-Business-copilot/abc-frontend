import { useState } from "react";
import { Eye, RefreshCw, Settings2 } from "lucide-react";

import {
  aiInsightsApi,
  type Insight,
  type InsightSettings,
  type InsightSeverity,
  type InsightStatus,
  type InsightType,
} from "@/api/ai-insights";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/use-permissions";
import { DetailLine, PaginationSize, displayDate } from "@/pages/business-data/shared";
import { ErrorBox, money, useAction, useLoad } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";
import "./ai-insights.css";

const TYPE_LABELS: Record<InsightType, string> = {
  LOW_STOCK: "Sắp hết hàng",
  SLOW_MOVING: "Bán chậm",
  DECLINING_SALES: "Doanh số giảm",
  OVERSTOCK: "Tồn kho dư",
  EXPIRATION_RISK: "Nguy cơ hết hạn",
};

const SEVERITY_LABELS: Record<InsightSeverity, string> = { CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };

const SEVERITY_HINTS: Record<InsightSeverity, string> = {
  CRITICAL: "Xử lý ngay hôm nay",
  HIGH: "Nên xử lý trong vài ngày tới",
  MEDIUM: "Xử lý trong tuần này",
  LOW: "Theo dõi, chưa gấp",
};

const SEVERITY_ORDER: InsightSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const STATUS_LABELS: Record<InsightStatus, string> = {
  OPEN: "Mới",
  ACKNOWLEDGED: "Đang xử lý",
  DISMISSED: "Đã ẩn",
  RESOLVED: "Đã ổn",
};

const ACTION_LABELS: Record<string, string> = {
  REORDER: "Nhập thêm hàng",
  CLEARANCE: "Giảm giá để xả hàng",
  INVESTIGATE: "Tìm hiểu nguyên nhân",
  STOP_REORDER: "Tạm dừng nhập thêm",
  PREPARE_SCRAP: "Chuẩn bị xuất hủy",
  PROMOTE: "Chạy khuyến mãi để đẩy bán",
};

const METRIC_LABELS: Record<string, string> = {
  stockAvailable: "Tồn có thể bán",
  avgDaily30: "Bán trung bình/ngày (30 ngày)",
  leadTimeDays: "Thời gian nhập hàng (ngày)",
  safetyStockQty: "Tồn an toàn",
  reorderPoint: "Điểm đặt hàng lại",
  shortfallToReorderPoint: "Thiếu so với điểm đặt hàng",
  daysOfCover: "Số ngày tồn đủ bán",
  sold30: "Đã bán 30 ngày",
  sold60: "Đã bán 60 ngày",
  costPrice: "Giá vốn",
  daysWithoutSale: "Số ngày chưa bán",
  neverSold: "Chưa từng bán",
  ageDays: "Tuổi sản phẩm (ngày)",
  periodDays: "Độ dài mỗi kỳ (ngày)",
  recentUnits: "Số lượng kỳ gần nhất",
  previousUnits: "Số lượng kỳ trước",
  dropPct: "Mức giảm (%)",
  thresholdDays: "Ngưỡng cảnh báo (ngày)",
  targetDays: "Mức tồn mục tiêu (ngày)",
  excessQty: "Số lượng dư",
  lotNumber: "Số lô",
  expirationDate: "Hạn sử dụng",
  daysToExpiry: "Số ngày còn lại",
  lotQuantity: "Số lượng trong lô",
  alertDaysBefore: "Cảnh báo trước (ngày)",
  projectedSellableQty: "Dự kiến bán được trước hạn",
  atRiskQty: "Số lượng có nguy cơ",
  lotStatus: "Trạng thái lô",
  possibleStockoutBias: "Từng hết hàng gần đây",
};

const BUCKET_LABELS: Record<string, string> = { "0-30": "Đủ bán 0–30 ngày", "31-60": "31–60 ngày", "61-90": "61–90 ngày", ">90": "Trên 90 ngày", "no-sales": "Không có doanh số" };

type SettingField = { label: string; hint: string; unit: string; read: (s: InsightSettings) => number; write: (s: InsightSettings, v: number) => InsightSettings };

const SETTING_GROUPS: Array<{ title: string; description: string; fields: SettingField[] }> = [
  {
    title: "Chung",
    description: "Áp dụng cho các cảnh báo bán chậm, doanh số giảm và tồn kho dư.",
    fields: [
      { label: "Số ngày bán tối thiểu để đánh giá", unit: "ngày", hint: "Sản phẩm mới bán dưới số ngày này sẽ chưa được đánh giá, tránh cảnh báo nhầm hàng mới về.", read: (s) => s.minHistoryDays, write: (s, v) => ({ ...s, minHistoryDays: v }) },
    ],
  },
  {
    title: "Hàng bán chậm",
    description: "Báo khi còn hàng trong kho nhưng gần như không bán được.",
    fields: [
      { label: "Báo khi không bán được trong", unit: "ngày", hint: "Còn tồn nhưng không có lần bán nào trong khoảng này.", read: (s) => s.slowMoving.noSaleDays, write: (s, v) => ({ ...s, slowMoving: { ...s.slowMoving, noSaleDays: v } }) },
      { label: "Hoặc 30 ngày qua chỉ bán tối đa", unit: "sản phẩm", hint: "Bán ít hơn hoặc bằng số này vẫn được coi là bán chậm.", read: (s) => s.slowMoving.maxUnitsInWindow, write: (s, v) => ({ ...s, slowMoving: { ...s.slowMoving, maxUnitsInWindow: v } }) },
    ],
  },
  {
    title: "Doanh số giảm",
    description: "So sánh số lượng bán của kỳ gần nhất với kỳ liền trước.",
    fields: [
      { label: "Độ dài mỗi kỳ so sánh", unit: "ngày", hint: "Ví dụ 14 ngày: so 14 ngày gần nhất với 14 ngày trước đó.", read: (s) => s.declining.periodDays, write: (s, v) => ({ ...s, declining: { ...s.declining, periodDays: v } }) },
      { label: "Kỳ trước phải bán ít nhất", unit: "sản phẩm", hint: "Bỏ qua hàng vốn bán rất ít để tránh báo nhầm.", read: (s) => s.declining.minBaseUnits, write: (s, v) => ({ ...s, declining: { ...s.declining, minBaseUnits: v } }) },
      { label: "Báo mức “Trung bình” khi giảm từ", unit: "%", hint: "Mức giảm thấp nhất bị cảnh báo.", read: (s) => s.declining.mediumPct, write: (s, v) => ({ ...s, declining: { ...s.declining, mediumPct: v } }) },
      { label: "Báo mức “Cao” khi giảm từ", unit: "%", hint: "Phải bằng hoặc lớn hơn mức Trung bình.", read: (s) => s.declining.highPct, write: (s, v) => ({ ...s, declining: { ...s.declining, highPct: v } }) },
    ],
  },
  {
    title: "Tồn kho quá nhiều",
    description: "Báo khi hàng trong kho đủ bán quá lâu, làm đọng vốn.",
    fields: [
      { label: "Báo khi tồn đủ bán hơn", unit: "ngày", hint: "Ví dụ 60 ngày: hàng còn đủ bán trên 60 ngày thì bị cảnh báo.", read: (s) => s.overstock.thresholdDays, write: (s, v) => ({ ...s, overstock: { ...s.overstock, thresholdDays: v } }) },
      { label: "Mức tồn hợp lý nên giữ", unit: "ngày bán", hint: "Dùng để tính số lượng dư; phải nhỏ hơn hoặc bằng ngưỡng ở trên.", read: (s) => s.overstock.targetDays, write: (s, v) => ({ ...s, overstock: { ...s.overstock, targetDays: v } }) },
    ],
  },
];

function formatMetric(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (key === "expirationDate" && typeof value === "string") return displayDate(value);
  if (key === "costPrice" && typeof value === "number") return money(value);
  if (key === "dropPct" && typeof value === "number") return `${fmt(value)}%`;
  if (typeof value === "number") return fmt(value);
  return String(value);
}

const fmt = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const num = (metrics: Record<string, unknown>, key: string) => (typeof metrics[key] === "number" ? (metrics[key] as number) : null);

// Plain-language explanation of a finding for the store owner
function describe(item: Insight): { title: string; text: string; todo: string } {
  const m = item.metrics;
  const stock = num(m, "stockAvailable");
  const daily = num(m, "avgDaily30");
  const cover = num(m, "daysOfCover");
  const lot = item.lotNumber ? `Lô ${item.lotNumber}` : "Lô hàng";
  const qty = (value: number | null) => (value === null ? "—" : fmt(value));

  switch (item.type) {
    case "LOW_STOCK": {
      const short = num(m, "shortfallToReorderPoint");
      const lead = num(m, "leadTimeDays");
      return {
        title: stock === 0 ? "Đã hết hàng" : "Sắp hết hàng",
        text: `${stock === 0 ? "Hiện không còn hàng" : `Còn ${qty(stock)} sản phẩm`}${daily ? `, trung bình bán ${qty(daily)}/ngày` : ""}.${lead ? ` Hàng về mất khoảng ${qty(lead)} ngày.` : ""}`,
        todo: short && short > 0 ? `Nên nhập thêm ít nhất ${fmt(Math.ceil(short))} sản phẩm` : ACTION_LABELS[item.suggestedAction] ?? "Nhập thêm hàng",
      };
    }
    case "SLOW_MOVING":
      return {
        title: m.neverSold === true ? "Chưa bán được cái nào" : "Bán rất chậm",
        text: `${m.neverSold === true ? "Từ lúc có hàng chưa phát sinh lần bán nào" : `Đã ${qty(num(m, "daysWithoutSale"))} ngày chưa bán, 30 ngày qua chỉ bán ${qty(num(m, "sold30"))}`}. Đang tồn ${qty(stock)} sản phẩm.`,
        todo: ACTION_LABELS[item.suggestedAction] ?? "Giảm giá hoặc chạy khuyến mãi",
      };
    case "DECLINING_SALES":
      return {
        title: "Doanh số đang giảm",
        text: `${qty(num(m, "periodDays"))} ngày gần đây bán ${qty(num(m, "recentUnits"))}, so với ${qty(num(m, "previousUnits"))} ở kỳ trước (giảm ${qty(num(m, "dropPct"))}%).${item.reasonCode === "DECLINE_POSSIBLY_STOCKOUT" ? " Có thể do hết hàng." : ""}`,
        todo: ACTION_LABELS[item.suggestedAction] ?? "Tìm hiểu nguyên nhân",
      };
    case "OVERSTOCK":
      return {
        title: "Tồn kho quá nhiều",
        text: `Còn ${qty(stock)} sản phẩm, đủ bán khoảng ${qty(cover)} ngày (hợp lý nên dưới ${qty(num(m, "thresholdDays"))} ngày). Dư khoảng ${qty(num(m, "excessQty"))} sản phẩm.`,
        todo: "Tạm dừng nhập thêm, cân nhắc khuyến mãi",
      };
    case "EXPIRATION_RISK": {
      if (item.reasonCode === "EXPIRED_IN_STOCK") {
        return { title: "Đã hết hạn nhưng còn tồn", text: `${lot} đã quá hạn, còn ${qty(num(m, "lotQuantity"))} sản phẩm trong kho.`, todo: "Ngừng bán và làm phiếu xuất hủy" };
      }
      const days = num(m, "daysToExpiry");
      return {
        title: item.reasonCode === "UNSELLABLE_NEAR_EXPIRY" ? "Sát hạn, không còn bán được" : "Có thể không bán hết trước hạn",
        text: `${lot} còn ${qty(days)} ngày đến hạn, còn ${qty(num(m, "lotQuantity"))} sản phẩm; dự kiến chỉ bán được ${qty(num(m, "projectedSellableQty"))}, có thể dư ${qty(num(m, "atRiskQty"))}.`,
        todo: ACTION_LABELS[item.suggestedAction] ?? "Giảm giá để bán trước hạn",
      };
    }
  }
}

const sevClass = (severity: InsightSeverity) => severity.toLowerCase();

function SeverityBadge({ severity }: { severity: InsightSeverity }) {
  return <span className={`ai-sev ai-sev-${sevClass(severity)}`}>{SEVERITY_LABELS[severity]}</span>;
}

export function AiInsightsPage() {
  const { can } = usePermissions();
  const canManage = can("ai_insights.manage");
  const action = useAction();
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detail, setDetail] = useState<Insight | null>(null);
  const [settings, setSettings] = useState<InsightSettings | null>(null);
  const [notice, setNotice] = useState("");

  const summary = useLoad(() => aiInsightsApi.summary(), []);
  const list = useLoad(() => aiInsightsApi.list({ type, severity, status, page, pageSize }), [type, severity, status, page, pageSize]);
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));

  const refresh = () => { summary.reload(); list.reload(); };
  const changeFilter = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };

  const runAnalysis = () => action.run(async () => {
    setNotice("");
    const result = await aiInsightsApi.run();
    setNotice(`Đã phân tích xong: ${result.findings} cảnh báo (${result.created} mới, ${result.resolved} đã hết).`);
    refresh();
  });

  const updateStatus = (insight: Insight, next: "ACKNOWLEDGED" | "DISMISSED" | "OPEN", snoozeDays?: number) => action.run(async () => {
    const updated = await aiInsightsApi.update(insight.id, { status: next, snoozeDays });
    setDetail(updated);
    refresh();
  });

  const openSettings = () => action.run(async () => setSettings(await aiInsightsApi.settings()));
  const saveSettings = () => action.run(async () => {
    if (!settings) return;
    await aiInsightsApi.saveSettings(settings);
    setSettings(null);
    setNotice("Đã lưu ngưỡng cảnh báo. Ngưỡng mới được áp dụng ở lần phân tích tiếp theo.");
  });

  const data = summary.data;
  const capital = data?.capital;
  const run = data?.latestRun;

  return (
    <AppLayout>
      <main className="bd-page">
        <header className="ai-header">
          <div className="ai-header-main">
            <h1>Cảnh báo tồn kho</h1>
            <p>Những việc cần chú ý để không hết hàng, không đọng vốn và không để hàng hết hạn. Dựa trên dữ liệu bán tại quầy, tự cập nhật lúc 02:00 mỗi ngày.</p>
          </div>
          <div className="ai-header-side">
            <span className="ai-updated">
              {run ? `Số liệu đến hết ${displayDate(run.dataAsOf)}${run.status === "RUNNING" ? " · đang chạy" : run.status === "FAILED" ? " · lần chạy gần nhất thất bại" : ""}` : "Chưa từng phân tích"}
            </span>
            {canManage && (
              <>
                <Button disabled={action.busy} onClick={() => void runAnalysis()} type="button"><RefreshCw size={15} /> {action.busy ? "Đang xử lý…" : "Phân tích lại"}</Button>
                <Button disabled={action.busy} onClick={() => void openSettings()} type="button" variant="outline"><Settings2 size={15} /> Ngưỡng</Button>
              </>
            )}
          </div>
        </header>

        <ErrorBox error={action.error || summary.error || list.error} />
        {notice && <div role="status" className="bd-notice success">{notice}</div>}
        {data?.stale && <div role="status" className="bd-notice warning">Dữ liệu phân tích đã cũ hoặc chưa có. {canManage ? "Hãy bấm “Phân tích lại”." : "Liên hệ chủ cửa hàng để cập nhật."}</div>}
        {run?.status === "FAILED" && <div role="alert" className="bd-notice warning">Lần phân tích gần nhất thất bại: {run.error ?? "không rõ nguyên nhân"}</div>}
        {data?.warnings.map((warning) => <div className="bd-notice warning" key={warning.code} role="status">{warning.message}</div>)}

        <section className="ai-workspace">
          <div className="ai-kpis">
            <div className="ai-kpi">
              <span>Tiền hàng rủi ro</span>
              <strong>{money(data?.valueAtRisk ?? 0)}</strong>
              <small>Theo giá vốn</small>
            </div>
            <div className="ai-kpi">
              <span>Vốn trong kho</span>
              <strong>{money(capital?.totalCapital ?? 0)}</strong>
              <small>{capital ? `${capital.slowMovingSharePct}% bán chậm · ${capital.overstockSharePct}% tồn dư` : "Chưa có dữ liệu"}</small>
            </div>
            {SEVERITY_ORDER.map((key) => (
              <button
                className={`ai-sev-card ${sevClass(key)}${severity === key ? " active" : ""}`}
                key={key}
                onClick={() => changeFilter(setSeverity)(severity === key ? "" : key)}
                title={SEVERITY_HINTS[key]}
                type="button"
              >
                <span>{SEVERITY_LABELS[key]}</span>
                <strong>{(data?.bySeverity[key] ?? 0).toLocaleString("vi-VN")}</strong>
                <small>{SEVERITY_HINTS[key]}</small>
              </button>
            ))}
          </div>

          {capital && capital.totalCapital > 0 && (
            <details className="ai-capital">
              <summary>Vốn trong kho đủ bán bao lâu? <small>(bấm để ẩn/hiện)</small></summary>
              <div className="ai-capital-grid">
                {capital.byDaysOfCover.map((bucket) => (
                  <div className="ai-capital-tile" key={bucket.bucket}>
                    <span>{BUCKET_LABELS[bucket.bucket] ?? bucket.bucket}</span>
                    <strong>{money(bucket.capital)}</strong>
                    <em>{bucket.sharePct}% vốn tồn kho</em>
                    <i style={{ width: `${Math.min(100, bucket.sharePct)}%` }} />
                  </div>
                ))}
              </div>
              <p>Giữ nhiều vốn nhất: nhóm <strong>{capital.byCategory[0]?.category ?? "—"}</strong>; sản phẩm <strong>{capital.topProducts[0]?.name ?? "—"}</strong>.</p>
            </details>
          )}

          <div className="ai-list-panel">
            <div className="ai-toolbar">
              <div className="ai-chips">
                <button className={`ai-chip${type === "" ? " active" : ""}`} onClick={() => changeFilter(setType)("")} type="button">Tất cả<em>{data?.totalActive ?? 0}</em></button>
                {(Object.keys(TYPE_LABELS) as InsightType[]).map((key) => (
                  <button className={`ai-chip${type === key ? " active" : ""}`} key={key} onClick={() => changeFilter(setType)(type === key ? "" : key)} type="button">
                    {TYPE_LABELS[key]}<em>{data?.byType[key] ?? 0}</em>
                  </button>
                ))}
              </div>
              <div className="ai-toolbar-side">
                <select aria-label="Trạng thái" onChange={(e) => changeFilter(setStatus)(e.target.value)} value={status}><option value="">Cần xử lý</option>{(Object.keys(STATUS_LABELS) as InsightStatus[]).map((key) => <option key={key} value={key}>{STATUS_LABELS[key]}</option>)}</select>
                <PaginationSize onChange={(size) => { setPageSize(size); setPage(1); }} value={pageSize} />
              </div>
            </div>

            {list.loading && <p className="bd-range-caption">Đang tải…</p>}
            {list.data && list.data.items.length > 0 && (
              <>
                <div className="bd-table-wrap"><table className="bd-table ai-table">
                  <thead><tr><th>Mức độ</th><th>Sản phẩm</th><th>Vấn đề</th><th>Tiền hàng rủi ro</th><th>Nên làm</th><th></th></tr></thead>
                  <tbody>{list.data.items.map((item) => {
                    const info = describe(item);
                    return (
                      <tr className={`sev-${sevClass(item.severity)}`} key={item.id} onClick={() => setDetail(item)}>
                        <td><SeverityBadge severity={item.severity} /></td>
                        <td className="ai-product"><strong>{item.productName}</strong><small>{item.sku}{item.lotNumber ? ` · Lô ${item.lotNumber}` : ""}</small></td>
                        <td className="ai-problem"><strong>{info.title}</strong><p>{info.text}</p></td>
                        <td className="ai-money">{item.valueAtRisk === null ? "—" : money(item.valueAtRisk)}</td>
                        <td className="ai-action">{info.todo}</td>
                        <td><button aria-label="Xem chi tiết" className="ai-icon-btn" onClick={(event) => { event.stopPropagation(); setDetail(item); }} title="Xem chi tiết" type="button"><Eye size={18} /></button></td>
                      </tr>
                    );
                  })}</tbody>
                </table></div>
                <div className="bd-pagination"><Pagination page={page} total={list.data.total} totalPages={totalPages} onPageChange={setPage} /></div>
              </>
            )}
            {list.data && list.data.items.length === 0 && (
              <div className="bd-empty-state compact"><h3>{data?.latestRun ? "Không có cảnh báo nào ở bộ lọc này" : "Chưa có dữ liệu phân tích"}</h3><p>{data?.latestRun ? "Thử đổi bộ lọc, hoặc tồn kho hiện đang ổn." : canManage ? "Bấm “Phân tích lại” để chạy lần đầu." : "Hãy nhờ chủ cửa hàng chạy phân tích lần đầu."}</p></div>
            )}
          </div>
        </section>
      </main>

      <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Chi tiết cảnh báo">
        {detail && (() => {
          const info = describe(detail);
          return (
            <div className="bd-modal-content">
              <div className="bd-modal-intro">
                <div>
                  <h3>{detail.productName}</h3>
                  <p>{detail.sku}{detail.lotNumber ? ` · Lô ${detail.lotNumber}` : ""} · {TYPE_LABELS[detail.type]} · {STATUS_LABELS[detail.status]}</p>
                </div>
                <SeverityBadge severity={detail.severity} />
              </div>
              <div className="ai-callout"><strong>{info.title}.</strong> {info.text}</div>
              <div className="ai-callout action"><strong>Nên làm:</strong> {info.todo}.</div>
              {detail.valueAtRisk !== null && <DetailLine label="Tiền hàng đang rủi ro (theo giá vốn)" value={detail.valueAtRisk} amount />}
              {detail.metrics.possibleStockoutBias === true && <p className="bd-modal-note">Sản phẩm từng hết hàng gần đây nên nhu cầu thực có thể cao hơn số liệu bán.</p>}
              <details className="ai-details">
                <summary>Xem số liệu và cách tính</summary>
                <div className="bd-detail-grid">
                  {Object.entries(detail.metrics).filter(([key]) => key !== "formula").map(([key, value]) => (
                    <DetailLine key={key} label={METRIC_LABELS[key] ?? key} value={formatMetric(key, value)} />
                  ))}
                  <DetailLine label="Phát hiện lần đầu" value={displayDate(detail.firstDetectedAt)} />
                  {detail.snoozeUntil && <DetailLine label="Tạm ẩn đến" value={displayDate(detail.snoozeUntil)} />}
                </div>
                {typeof detail.metrics.formula === "string" && <p className="bd-modal-note">Cách tính: {detail.metrics.formula}</p>}
              </details>
              {canManage && detail.status !== "RESOLVED" && (
                <div className="bd-range-actions">
                  {detail.status !== "ACKNOWLEDGED" && <Button disabled={action.busy} onClick={() => void updateStatus(detail, "ACKNOWLEDGED")} type="button">Đã xem, đang xử lý</Button>}
                  <Button disabled={action.busy} onClick={() => void updateStatus(detail, "DISMISSED", 7)} type="button" variant="outline">Nhắc lại sau 7 ngày</Button>
                  <Button disabled={action.busy} onClick={() => void updateStatus(detail, "DISMISSED", 30)} type="button" variant="outline">Nhắc lại sau 30 ngày</Button>
                  <Button disabled={action.busy} onClick={() => void updateStatus(detail, "DISMISSED")} type="button" variant="outline">Không cần nhắc nữa</Button>
                  {detail.status !== "OPEN" && <Button disabled={action.busy} onClick={() => void updateStatus(detail, "OPEN")} type="button" variant="outline">Mở lại</Button>}
                </div>
              )}
              <ErrorBox error={action.error} />
            </div>
          );
        })()}
      </Modal>

      <Modal open={settings !== null} onClose={() => setSettings(null)} size="wide" title="Điều chỉnh ngưỡng cảnh báo">
        {settings && (
          <div className="bd-modal-content">
            <p className="ai-howto">Các con số này quyết định khi nào hệ thống báo cho bạn. Giá trị mặc định phù hợp với hầu hết cửa hàng; thay đổi áp dụng từ lần cập nhật sau.</p>
            <div className="ai-setting-grid">
              {SETTING_GROUPS.map((group) => (
                <section className="ai-setting-group" key={group.title}>
                  <h4>{group.title}</h4>
                  {group.fields.map((field) => (
                    <label className="ai-setting-row" key={field.label} title={field.hint}>
                      <span className="ai-setting-label">{field.label}</span>
                      <span className="ai-setting-input">
                        <input min={0} onChange={(event) => setSettings(field.write(settings, Number(event.target.value)))} type="number" value={field.read(settings)} />
                        <em>{field.unit}</em>
                      </span>
                    </label>
                  ))}
                </section>
              ))}
            </div>
            <p className="bd-modal-note">Rê chuột vào từng dòng để xem giải thích. Cảnh báo sắp hết hàng dùng thời gian nhập hàng và tồn an toàn của từng sản phẩm; cảnh báo hết hạn dùng hạn sử dụng của từng lô.</p>
            <ErrorBox error={action.error} />
            <div className="bd-range-actions">
              <Button disabled={action.busy} onClick={() => void saveSettings()} type="button">Lưu ngưỡng</Button>
              <Button disabled={action.busy} onClick={() => setSettings(null)} type="button" variant="outline">Hủy</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
