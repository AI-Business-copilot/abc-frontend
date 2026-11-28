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
  STOCKOUT_RISK: "Dự kiến hết hàng",
  LOW_STOCK: "Sắp hết hàng",
  SLOW_MOVING: "Bán chậm",
  DECLINING_SALES: "Số lượng bán giảm",
  OVERSTOCK: "Tồn kho dư",
  EXPIRATION_RISK: "Nguy cơ hết hạn",
};

const SEVERITY_LABELS: Record<InsightSeverity, string> = { CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" };

const SEVERITY_HINTS: Record<InsightSeverity, string> = {
  CRITICAL: "Cần xem xét trước",
  HIGH: "Cần chú ý sớm",
  MEDIUM: "Nên theo dõi",
  LOW: "Chưa cần ưu tiên cao",
};

const SEVERITY_ORDER: InsightSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const STATUS_LABELS: Record<InsightStatus, string> = {
  OPEN: "Mới",
  ACKNOWLEDGED: "Đang xử lý",
  DISMISSED: "Đã ẩn",
  RESOLVED: "Đã ổn",
};

const ACTION_LABELS: Record<string, string> = {
  REORDER: "Kiểm tra tồn và cân nhắc nhập thêm",
  CLEARANCE: "Cân nhắc giảm giá",
  INVESTIGATE: "Kiểm tra nguyên nhân",
  STOP_REORDER: "Cân nhắc tạm dừng nhập thêm",
  PREPARE_SCRAP: "Kiểm tra và chuẩn bị xử lý hàng",
  PROMOTE: "Cân nhắc khuyến mãi",
  REORDER_NOW: "Kiểm tra tồn và cân nhắc đặt hàng sớm",
  EXPEDITE_PO: "Kiểm tra đơn hàng đang đặt và ngày giao",
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
  rateSource: "Nguồn tốc độ bán",
  stockoutInDays: "Dự kiến hết hàng sau (ngày)",
  restockInDays: "Hàng bổ sung về sau (ngày)",
  gapDays: "Số ngày hết hàng chờ hàng về",
  slackDays: "Chênh lệch so với ngày hàng về (ngày)",
  onOrderQty: "Đang đặt, chưa về",
};

const BUCKET_LABELS: Record<string, string> = { "0-30": "Đủ bán 0–30 ngày", "31-60": "31–60 ngày", "61-90": "61–90 ngày", ">90": "Trên 90 ngày", "no-sales": "Chưa có tốc độ bán" };

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
    title: "Số lượng bán giảm",
    description: "So sánh số lượng bán của kỳ gần nhất với kỳ liền trước.",
    fields: [
      { label: "Độ dài mỗi kỳ so sánh", unit: "ngày", hint: "Ví dụ 14 ngày: so 14 ngày gần nhất với 14 ngày trước đó.", read: (s) => s.declining.periodDays, write: (s, v) => ({ ...s, declining: { ...s.declining, periodDays: v } }) },
      { label: "Kỳ trước phải bán ít nhất", unit: "sản phẩm", hint: "Bỏ qua hàng vốn bán rất ít để tránh báo nhầm.", read: (s) => s.declining.minBaseUnits, write: (s, v) => ({ ...s, declining: { ...s.declining, minBaseUnits: v } }) },
      { label: "Báo mức “Trung bình” khi giảm từ", unit: "%", hint: "Mức giảm thấp nhất bị cảnh báo.", read: (s) => s.declining.mediumPct, write: (s, v) => ({ ...s, declining: { ...s.declining, mediumPct: v } }) },
      { label: "Báo mức “Cao” khi giảm từ", unit: "%", hint: "Phải bằng hoặc lớn hơn mức Trung bình.", read: (s) => s.declining.highPct, write: (s, v) => ({ ...s, declining: { ...s.declining, highPct: v } }) },
    ],
  },
  {
    title: "Dự báo hết hàng",
    description: "Cách hệ thống dự báo nhu cầu và nhập hàng.",
    fields: [
      { label: "Cần ít nhất bao nhiêu ngày dữ liệu để dự báo", unit: "ngày", hint: "Tối thiểu 28 ngày; sản phẩm ít dữ liệu hơn sẽ chưa được dự báo.", read: (s) => s.forecast.minSeriesDays, write: (s, v) => ({ ...s, forecast: { ...s.forecast, minSeriesDays: v } }) },
      { label: "Mức phục vụ để tính tồn an toàn", unit: "%", hint: "Chỉ nhận 80, 85, 90, 95, 97 hoặc 99. Đây là giả định tính toán, không đảm bảo tỷ lệ thực tế.", read: (s) => s.forecast.serviceLevelPct, write: (s, v) => ({ ...s, forecast: { ...s.forecast, serviceLevelPct: v } }) },
      { label: "Báo “Cao” khi hết hàng sát ngày hàng về trong", unit: "ngày", hint: "Hết hàng trước hoặc sát ngày hàng về trong khoảng này là mức Cao.", read: (s) => s.stockout.highSlackDays, write: (s, v) => ({ ...s, stockout: { ...s.stockout, highSlackDays: v } }) },
      { label: "Báo “Trung bình” trong", unit: "ngày", hint: "Phải bằng hoặc lớn hơn mức Cao.", read: (s) => s.stockout.mediumSlackDays, write: (s, v) => ({ ...s, stockout: { ...s.stockout, mediumSlackDays: v } }) },
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
  if (key === "rateSource") return value === "FORECAST" ? "Dự báo" : value === "AVG_30" ? "Trung bình 30 ngày" : "Không rõ";
  if (key === "lotStatus" && value === "UNUSABLE") return "Không thể bán";
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
function describe(item: Insight): { title: string; summary: string; text: string; todo: string } {
  const m = item.metrics;
  const stock = num(m, "stockAvailable");
  const daily = num(m, "avgDaily30");
  const cover = num(m, "daysOfCover");
  const lot = item.lotNumber ? `Lô ${item.lotNumber}` : "Lô hàng";
  const qty = (value: number | null) => (value === null ? "—" : fmt(value));

  switch (item.type) {
    case "STOCKOUT_RISK": {
      const out = num(m, "stockoutInDays");
      const restock = num(m, "restockInDays");
      const gap = num(m, "gapDays");
      const high = item.reasonCode === "STOCKOUT_IF_DEMAND_HIGH";
      const estimate = stock === 0 ? "Tồn có thể bán đã hết khi phân tích." : out === 0
        ? "Có thể hết hàng trong ngày phân tích."
        : out !== null ? `Có thể hết hàng sau khoảng ${qty(out)} ngày kể từ ngày phân tích.` : "Sản phẩm có nguy cơ hết hàng.";
      const arrival = restock === null ? "" : m.restockSource === "OPEN_PO"
        ? ` Đơn đang đặt dự kiến bổ sung sau khoảng ${qty(restock)} ngày; hãy xác nhận ngày giao.`
        : m.restockSource === "LEAD_TIME" ? ` Thời gian nhập ước tính khoảng ${qty(restock)} ngày, chưa có nghĩa là đã đặt hàng.` : "";
      return {
        title: stock === 0 ? "Đã hết hàng khi phân tích" : high ? "Có thể hết hàng nếu bán tốt hơn dự kiến" : "Có nguy cơ hết hàng",
        summary: estimate,
        text: `${estimate}${stock === null || stock === 0 ? "" : ` Khi phân tích còn ${qty(stock)} sản phẩm có thể bán.`}${arrival}${gap !== null && gap > 0 ? ` Có thể thiếu hàng khoảng ${qty(gap)} ngày.` : ""}`,
        todo: ACTION_LABELS[item.suggestedAction] ?? "Kiểm tra tồn và cân nhắc nhập thêm",
      };
    }
    case "LOW_STOCK": {
      const lead = num(m, "leadTimeDays");
      const onOrder = num(m, "onOrderQty");
      const summary = stock === null ? "Lượng tồn cần được kiểm tra." : `Khi phân tích còn ${qty(stock)} sản phẩm có thể bán.`;
      return {
        title: stock === 0 ? "Đã hết hàng khi phân tích" : "Sắp hết hàng",
        summary,
        text: `${stock === null ? "Lượng tồn cần được kiểm tra" : `Khi phân tích còn ${qty(stock)} sản phẩm có thể bán`}${daily !== null && daily > 0 ? `, trung bình bán ${qty(daily)}/ngày` : ""}.${onOrder !== null && onOrder > 0 ? ` Đang đặt ${qty(onOrder)} sản phẩm, chưa về.` : ""}${lead !== null && lead > 0 ? ` Thời gian nhập ước tính ${qty(lead)} ngày.` : ""}`,
        todo: "Kiểm tra tồn và hàng đang đặt trước khi cân nhắc nhập thêm",
      };
    }
    case "SLOW_MOVING": {
      const days = num(m, "daysWithoutSale");
      const sold = num(m, "sold30");
      const summary = m.neverSold === true ? "Chưa ghi nhận lần bán nào." : days === null ? "Sản phẩm đang bán chậm." : `Đã ${qty(days)} ngày chưa bán.`;
      return {
        title: m.neverSold === true ? "Chưa ghi nhận lần bán" : "Bán chậm",
        summary,
        text: `${summary}${sold === null ? "" : ` Trong 30 ngày gần nhất bán được ${qty(sold)} sản phẩm sau khi trừ hàng trả.`}${stock === null ? "" : ` Khi phân tích còn ${qty(stock)} sản phẩm có thể bán.`}`,
        todo: ACTION_LABELS[item.suggestedAction] ?? "Giảm giá hoặc chạy khuyến mãi",
      };
    }
    case "DECLINING_SALES": {
      const period = num(m, "periodDays"), recent = num(m, "recentUnits"), previous = num(m, "previousUnits"), drop = num(m, "dropPct");
      const summary = period === null || recent === null || previous === null ? "Lượng bán gần đây giảm so với kỳ trước." : `${qty(period)} ngày gần đây bán ${qty(recent)} sản phẩm, so với ${qty(previous)} ở kỳ trước${drop === null ? "" : ` (giảm ${qty(drop)}%)`}.`;
      return {
        title: "Số lượng bán giảm",
        summary,
        text: `${period === null || recent === null || previous === null ? "Lượng bán gần đây giảm so với kỳ trước." : `${qty(period)} ngày gần đây bán ${qty(recent)} sản phẩm, so với ${qty(previous)} ở kỳ trước${drop === null ? "" : ` (giảm ${qty(drop)}%)`}; số bán đã trừ hàng trả.`}${item.reasonCode === "DECLINE_POSSIBLY_STOCKOUT" ? " Việc hết hàng có thể ảnh hưởng đến kết quả này." : ""}`,
        todo: ACTION_LABELS[item.suggestedAction] ?? "Tìm hiểu nguyên nhân",
      };
    }
    case "OVERSTOCK": {
      const excess = num(m, "excessQty");
      return {
        title: "Tồn kho quá nhiều",
        summary: cover === null ? "Lượng tồn cao so với tốc độ bán gần đây." : `Ước tính đủ bán khoảng ${qty(cover)} ngày.`,
        text: `Lượng tồn có thể bán cao so với tốc độ bán gần đây.${stock === null ? "" : ` Khi phân tích còn ${qty(stock)} sản phẩm.`}${cover === null ? "" : ` Ước tính đủ bán khoảng ${qty(cover)} ngày.`}${excess === null ? "" : ` So với mức tồn mục tiêu, ước tính dư ${qty(excess)} sản phẩm.`}`,
        todo: "Cân nhắc tạm dừng nhập thêm hoặc khuyến mãi",
      };
    }
    case "EXPIRATION_RISK": {
      const lotQty = num(m, "lotQuantity");
      const quantity = lotQty === null ? "" : ` Số lượng trong lô khi phân tích: ${qty(lotQty)} sản phẩm.`;
      if (item.reasonCode === "EXPIRED_IN_STOCK") {
        return { title: "Đã hết hạn nhưng còn tồn", summary: `${lot} đã hết hạn khi phân tích.`, text: `${lot} đã hết hạn khi phân tích.${quantity}`, todo: "Ngừng bán, kiểm tra và xử lý lô hàng" };
      }
      if (item.reasonCode === "UNSELLABLE_NEAR_EXPIRY") {
        return { title: "Lô hàng không thể bán", summary: `${lot} được ghi nhận không thể bán.`, text: `${lot} được ghi nhận không thể bán.${quantity}`, todo: "Kiểm tra và xử lý lô hàng" };
      }
      const days = num(m, "daysToExpiry");
      const risk = num(m, "atRiskQty");
      return {
        title: "Có thể không bán hết trước hạn",
        summary: days === null ? `${lot} có thể không bán hết trước hạn.` : `${lot} còn ${qty(days)} ngày đến hạn khi phân tích.`,
        text: `${lot} có thể không bán hết trước hạn.${days === null ? "" : ` Còn ${qty(days)} ngày đến hạn tại thời điểm phân tích.`}${quantity}${risk === null ? "" : ` Ước tính có thể còn ${qty(risk)} sản phẩm.`}`,
        todo: ACTION_LABELS[item.suggestedAction] ?? "Giảm giá để bán trước hạn",
      };
    }
  }
}

function valueDescription(item: Insight) {
  switch (item.type) {
    case "STOCKOUT_RISK": return "Doanh thu có thể bỏ lỡ";
    case "SLOW_MOVING": return "Giá vốn hàng bán chậm";
    case "OVERSTOCK": return "Giá vốn hàng ước tính dư";
    case "EXPIRATION_RISK": return "Giá vốn hàng có nguy cơ";
    default: return "Giá trị ước tính";
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
  const dataWarnings = data?.warnings.filter((warning) => warning.code !== "FORECAST_SYNTHETIC_MODEL" && warning.code !== "FORECAST_UNAVAILABLE") ?? [];
  const forecastUnavailable = data?.warnings.find((warning) => warning.code === "FORECAST_UNAVAILABLE");

  return (
    <AppLayout contentClassName="ai-insights-content">
      <main className="bd-page ai-alert-page">
        <header className="ai-header">
          <div className="ai-header-main">
            <h1>Cảnh báo tồn kho</h1>
            <p>Những việc cần chú ý để không hết hàng, không đọng vốn và không để hàng hết hạn. Dựa trên dữ liệu bán tại quầy, tự cập nhật lúc 02:00 mỗi ngày.</p>
          </div>
          <div className="ai-header-side">
            <span className="ai-updated">
              {summary.loading ? "Đang tải thông tin…" : !data ? "Chưa tải được thông tin" : !run ? "Chưa từng phân tích" :
                run.status === "SUCCEEDED" ? `${run.finishedAt ? `Phân tích ngày ${displayDate(run.finishedAt)} · ` : ""}Dữ liệu bán đến hết ${displayDate(run.dataAsOf)}` :
                  run.status === "RUNNING" ? "Đang phân tích" : "Lần phân tích gần nhất không thành công"}
            </span>
            {canManage && (
              <>
                <Button disabled={action.busy} onClick={() => void runAnalysis()} type="button"><RefreshCw size={15} /> {action.busy ? "Đang xử lý…" : "Phân tích lại"}</Button>
                <Button disabled={action.busy} onClick={() => void openSettings()} type="button" variant="outline"><Settings2 size={15} /> Cài đặt cảnh báo</Button>
              </>
            )}
          </div>
        </header>

        <ErrorBox error={action.error || summary.error || list.error} />
        {notice && <div role="status" className="bd-notice success">{notice}</div>}
        {data?.stale && <div role="status" className="bd-notice warning">Dữ liệu phân tích đã cũ hoặc chưa có. {canManage ? "Hãy bấm “Phân tích lại”." : "Liên hệ chủ cửa hàng để cập nhật."}</div>}
        {run?.status === "FAILED" && <div role="alert" className="bd-notice warning">Lần phân tích gần nhất không thành công. Cảnh báo bên dưới có thể là kết quả cũ. {canManage ? "Hãy thử phân tích lại." : "Hãy nhờ người quản lý kiểm tra."}</div>}
        {run?.status === "RUNNING" && <div role="status" className="bd-notice warning">Đang phân tích; cảnh báo bên dưới có thể chưa được cập nhật.</div>}
        {forecastUnavailable && <div className="bd-notice warning" role="status">{forecastUnavailable.message}</div>}
        {dataWarnings.length > 0 && <details className="ai-data-warnings">
          <summary>Có {dataWarnings.length} lưu ý về dữ liệu có thể ảnh hưởng đến cảnh báo</summary>
          <ul>{dataWarnings.map((warning) => <li key={warning.code}>{warning.code === "NO_SALES_DATA" ? "Chưa có dữ liệu bán tại quầy trong 60 ngày gần nhất." : warning.message}</li>)}</ul>
        </details>}

        <section className="ai-workspace">
          <div className="ai-priority-intro">
            <div><h2>Cảnh báo cần chú ý</h2><p>{data && run ? `${data.totalActive.toLocaleString("vi-VN")} cảnh báo mới hoặc đang xử lý. Một sản phẩm có thể có nhiều cảnh báo.` : "Chưa thể xác định số cảnh báo khi chưa có kết quả phân tích."}</p></div>
            <p>Chọn mức độ để xem những việc cần ưu tiên.</p>
          </div>
          <div className="ai-kpis">
            {SEVERITY_ORDER.map((key) => (
              <button
                className={`ai-sev-card ${sevClass(key)}${severity === key ? " active" : ""}`}
                key={key}
                onClick={() => changeFilter(setSeverity)(severity === key ? "" : key)}
                aria-pressed={severity === key}
                title={SEVERITY_HINTS[key]}
                type="button"
              >
                <span>{SEVERITY_LABELS[key]}</span>
                <strong>{data && run ? (data.bySeverity[key] ?? 0).toLocaleString("vi-VN") : "—"}</strong>
                <small>{SEVERITY_HINTS[key]}</small>
              </button>
            ))}
          </div>

          <div className="ai-list-panel">
            <div className="ai-list-heading"><h2>Danh sách cảnh báo</h2><p>Kiểm tra tình hình thực tế trước khi thực hiện gợi ý.</p></div>
            <div className="ai-toolbar">
              <div className="ai-chips">
                <button className={`ai-chip${type === "" ? " active" : ""}`} aria-pressed={type === ""} onClick={() => changeFilter(setType)("")} type="button">Tất cả<em>{data && run ? data.totalActive : "—"}</em></button>
                {(Object.keys(TYPE_LABELS) as InsightType[]).map((key) => (
                  <button className={`ai-chip${type === key ? " active" : ""}`} aria-pressed={type === key} key={key} onClick={() => changeFilter(setType)(type === key ? "" : key)} type="button">
                    {TYPE_LABELS[key]}<em>{data && run ? (data.byType[key] ?? 0) : "—"}</em>
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
                  <colgroup><col className="ai-col-severity" /><col className="ai-col-product" /><col className="ai-col-problem" /><col className="ai-col-value" /><col className="ai-col-action" /><col className="ai-col-detail" /></colgroup>
                  <thead><tr><th>Mức độ</th><th>Sản phẩm</th><th>Vấn đề</th><th>Giá trị tham khảo</th><th>Nên cân nhắc</th><th aria-label="Chi tiết"></th></tr></thead>
                  <tbody>{list.data.items.map((item) => {
                    const info = describe(item);
                    return (
                      <tr className={`sev-${sevClass(item.severity)}`} key={item.id} onClick={() => setDetail(item)}>
                        <td><SeverityBadge severity={item.severity} /></td>
                        <td className="ai-product"><strong>{item.productName}</strong><small>{item.sku}{item.lotNumber ? ` · Lô ${item.lotNumber}` : ""}</small><small>{STATUS_LABELS[item.status]}</small></td>
                        <td className="ai-problem"><strong>{info.title}</strong><p>{info.summary}{info.text !== info.summary && <span aria-hidden="true"> …</span>}</p></td>
                        <td className="ai-money">{item.valueAtRisk === null ? "—" : <>{money(item.valueAtRisk)}<small>{valueDescription(item)}</small></>}</td>
                        <td className="ai-action">{info.todo}</td>
                        <td><button aria-label={`Xem chi tiết ${item.productName} ${item.sku}${item.lotNumber ? ` lô ${item.lotNumber}` : ""}`} className="ai-icon-btn" onClick={(event) => { event.stopPropagation(); setDetail(item); }} title="Xem chi tiết" type="button"><Eye size={18} /></button></td>
                      </tr>
                    );
                  })}</tbody>
                </table></div>
                <div className="bd-pagination"><Pagination page={page} total={list.data.total} totalPages={totalPages} onPageChange={setPage} /></div>
              </>
            )}
            {list.data && list.data.items.length === 0 && (
              <div className="bd-empty-state compact"><h3>{!data ? "Chưa thể xác định tình trạng cảnh báo" : data.latestRun ? "Không có cảnh báo nào ở bộ lọc này" : "Chưa có dữ liệu phân tích"}</h3><p>{!data ? "Hãy tải lại trang để kiểm tra." : data.latestRun ? "Thử đổi bộ lọc. Không có cảnh báo không có nghĩa là đã kiểm tra được mọi rủi ro." : canManage ? "Bấm “Phân tích lại” để chạy lần đầu." : "Hãy nhờ chủ cửa hàng chạy phân tích lần đầu."}</p></div>
            )}
          </div>
          {capital && capital.totalCapital > 0 && (
            <details className="ai-capital">
              <summary>Xem vốn tồn kho của sản phẩm được phân tích · {money(capital.totalCapital)}</summary>
              <p>Giá trị theo giá vốn và hàng có thể bán tại lần phân tích gần nhất; không bao gồm sản phẩm mới chưa đủ thời gian theo ngưỡng cảnh báo hoặc sản phẩm ngừng hoạt động.</p>
              <div className="ai-capital-grid">
                {capital.byDaysOfCover.map((bucket) => (
                  <div className="ai-capital-tile" key={bucket.bucket}>
                    <span>{BUCKET_LABELS[bucket.bucket] ?? bucket.bucket}</span><strong>{money(bucket.capital)}</strong>
                    <em>{bucket.sharePct}% vốn được phân tích</em><i style={{ width: `${Math.min(100, bucket.sharePct)}%` }} />
                  </div>
                ))}
              </div>
              <p>Nhóm giữ nhiều vốn nhất: <strong>{capital.byCategory[0]?.category ?? "—"}</strong>; sản phẩm: <strong>{capital.topProducts[0]?.name ?? "—"}</strong>.</p>
            </details>
          )}
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
              <div className="ai-callout action"><strong>Nên cân nhắc:</strong> {info.todo}.</div>
              {detail.valueAtRisk !== null && <><DetailLine label={valueDescription(detail)} value={detail.valueAtRisk} amount />
                <p className="bd-modal-note">{detail.type === "STOCKOUT_RISK" ? "Đây là doanh thu ước tính có thể bỏ lỡ, không phải tiền đã mất." : "Giá trị theo giá vốn đang lưu, không phải khoản lỗ đã xảy ra."}</p></>}
              {detail.metrics.possibleStockoutBias === true && <p className="bd-modal-note">Sản phẩm từng hết hàng gần đây nên nhu cầu thực có thể cao hơn số liệu bán.</p>}
              <details className="ai-details">
                <summary>Xem số liệu liên quan</summary>
                <div className="bd-detail-grid">
                  {Object.entries(detail.metrics).filter(([key, value]) => key in METRIC_LABELS && (value === null || ["string", "number", "boolean"].includes(typeof value))).map(([key, value]) => (
                    <DetailLine key={key} label={METRIC_LABELS[key]} value={formatMetric(key, value)} />
                  ))}
                  <DetailLine label="Phát hiện lần đầu" value={displayDate(detail.firstDetectedAt)} />
                  {detail.snoozeUntil && <DetailLine label="Tạm ẩn đến" value={displayDate(detail.snoozeUntil)} />}
                </div>
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
            <p className="ai-howto">Các con số này quyết định khi nào hệ thống cảnh báo. Hãy điều chỉnh theo cách bán hàng của cửa hàng; thay đổi áp dụng từ lần phân tích tiếp theo.</p>
            <div className="ai-setting-grid">
              {SETTING_GROUPS.map((group) => (
                <section className="ai-setting-group" key={group.title}>
                  <h4>{group.title}</h4>
                  <p className="ai-setting-description">{group.description}</p>
                  {group.fields.map((field) => (
                    <label className="ai-setting-row" key={field.label}>
                      <span className="ai-setting-label">{field.label}<small>{field.hint}</small></span>
                      <span className="ai-setting-input">
                        <input min={0} onChange={(event) => setSettings(field.write(settings, Number(event.target.value)))} type="number" value={field.read(settings)} />
                        <em>{field.unit}</em>
                      </span>
                    </label>
                  ))}
                </section>
              ))}
            </div>
            <p className="bd-modal-note">Cảnh báo sắp hết hàng dùng thời gian nhập hàng và tồn an toàn của từng sản phẩm; cảnh báo hết hạn dùng hạn sử dụng của từng lô.</p>
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
