import { useMemo, useState } from "react";
import { Activity, BarChart3, Boxes, CircleDollarSign, Eye, Search, ShoppingBag } from "lucide-react";

import { getBusinessMovement, type BusinessMovement } from "@/api/business-movement";
import type { PerformanceComparison, PerformanceProduct } from "@/api/product-performance";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/use-permissions";
import { FilterField, PaginationSize, SummaryCard, displayDate } from "@/pages/business-data/shared";
import { ErrorBox, today, useLoad } from "@/pages/purchases/shared";
import { dayOffset, posMoney } from "./pos-format";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";
import "./ai-insights.css";
import "./business-movement.css";

type Metric = "netRevenue" | "grossProfit";
const metricLabels: Record<Metric, string> = { netRevenue: "Doanh thu thuần", grossProfit: "Lợi nhuận gộp" };

function cents(value: string) {
  if (!/^-?\d+\.\d{2}$/.test(value)) throw new Error("Giá trị tiền không hợp lệ trong phân tích POS.");
  return BigInt(value.replace(".", ""));
}

function fromCents(value: bigint) {
  const sign = value < 0n ? "-" : "";
  const digits = (value < 0n ? -value : value).toString().padStart(3, "0");
  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

function direction(value: string) {
  const amount = cents(value);
  return amount > 0n ? `tăng ${posMoney(value)}` : amount < 0n ? `giảm ${posMoney(fromCents(-amount))}` : "không đổi";
}

function comparisonText(item: PerformanceComparison, metric: Metric) {
  const change = item.changes[metric];
  return `${direction(change.difference)} (${change.percent === null ? "không có tỷ lệ so sánh" : `${change.percent}%`})`;
}

function ContributorGroup({ title, items, metric, onDetail }: {
  title: string; items: PerformanceProduct[]; metric: Metric; onDetail: (item: PerformanceProduct) => void;
}) {
  const remaining = items.slice(5);
  const rest = remaining.reduce((sum, item) => sum + cents(item.changes[metric].difference), 0n);
  return <section className="bm-group">
    <h3>{title}</h3>
    {items.length === 0 ? <p>Không có sản phẩm trong nhóm này.</p> : <>
      <ul>{items.slice(0, 5).map((item) => <li key={item.id}>
        <span>{item.name}</span>
        <strong>{direction(item.changes[metric].difference)}</strong>
        <button aria-label={`Xem chi tiết ${item.name}`} title="Xem chi tiết" className="ai-icon-btn" type="button" onClick={() => onDetail(item)}><Eye size={18} aria-hidden="true" /></button>
      </li>)}</ul>
      {remaining.length > 0 && <p>Các sản phẩm còn lại ({remaining.length}): <strong>{direction(fromCents(rest))}</strong></p>}
    </>}
  </section>;
}

function Components({ data, metric }: { data: BusinessMovement; metric: Metric }) {
  const rows = metric === "netRevenue"
    ? [
      { label: "Tiền hàng trước giảm giá", value: data.components.grossSales },
      { label: "Giảm giá dòng", value: data.components.discountAmount },
      { label: "Hoàn tiền", value: data.components.refundAmount },
    ]
    : [
      { label: "Doanh thu thuần", value: data.components.netRevenue },
      { label: "Giá vốn thuần", value: data.components.netCogs },
    ];
  return <section className="bm-section">
    <h3>Các khoản tạo nên thay đổi {metricLabels[metric].toLocaleLowerCase("vi")}</h3>
    <p>Đóng góp là phép tính theo dấu, không khẳng định nguyên nhân kinh doanh.</p>
    <div className="bd-table-wrap"><table className="bd-table">
      <thead><tr><th>Khoản mục</th><th>Kỳ trước</th><th>Kỳ này</th><th>Khoản mục thay đổi</th><th>Đóng góp vào chỉ số</th></tr></thead>
      <tbody>{rows.map(({ label, value }) => <tr key={label}>
        <td>{label}</td><td>{posMoney(value.previous)}</td><td>{posMoney(value.current)}</td>
        <td>{direction(value.difference)}</td><td>{direction(value.impact)}</td>
      </tr>)}</tbody>
    </table></div>
    <p>{metric === "netRevenue"
      ? "Doanh thu thuần = tiền hàng − giảm giá dòng − hoàn tiền."
      : "Lợi nhuận gộp = doanh thu thuần − giá vốn thuần. Đây không phải lợi nhuận ròng."}</p>
  </section>;
}

function MovementWorkspace() {
  const [initial] = useState(() => {
    const to = dayOffset(today(), -1);
    return { from: dayOffset(to, -6), to };
  });
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [range, setRange] = useState(initial);
  const [metric, setMetric] = useState<Metric>("netRevenue");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState<PerformanceProduct | null>(null);
  const result = useLoad(() => getBusinessMovement(range), [range.from, range.to]);
  const data = result.data;
  const ranked = useMemo(() => [...(data?.items ?? [])].sort((a, b) => {
    const aValue = cents(a.changes[metric].difference);
    const bValue = cents(b.changes[metric].difference);
    const aAbs = aValue < 0n ? -aValue : aValue;
    const bAbs = bValue < 0n ? -bValue : bValue;
    return (aAbs === bAbs ? 0 : aAbs > bAbs ? -1 : 1) || a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id);
  }), [data, metric]);
  const increasing = ranked.filter((item) => cents(item.changes[metric].difference) > 0n);
  const decreasing = ranked.filter((item) => cents(item.changes[metric].difference) < 0n);
  const needle = search.trim().toLocaleLowerCase("vi");
  const filtered = ranked.filter((item) => !needle || item.name.toLocaleLowerCase("vi").includes(needle) || item.variants.some((variant) => variant.sku.toLocaleLowerCase("vi").includes(needle)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return <main className="bd-page">
    <header className="bd-hero">
      <div className="bd-hero-copy"><span className="bd-eyebrow"><Activity size={15} /> PHÂN TÍCH POS</span>
        <h1>Giải thích biến động</h1>
        <p>So sánh hai kỳ và xem sản phẩm, khoản mục nào đóng góp vào mức tăng hoặc giảm. Đây là số liệu quá khứ, không phải dự báo.</p>
      </div>
      <form className="bd-range-panel" onSubmit={(event) => {
        event.preventDefault(); setDetail(null); setPage(1);
        if (from === range.from && to === range.to) result.reload();
        else setRange({ from, to });
      }}>
        <span className="bd-range-title">Khoảng thời gian phân tích</span>
        <div className="bd-range-fields">
          <FilterField label="Từ ngày"><input required type="date" max={today()} value={from} onChange={(event) => setFrom(event.target.value)} /></FilterField>
          <FilterField label="Đến ngày"><input required type="date" max={today()} value={to} onChange={(event) => setTo(event.target.value)} /></FilterField>
        </div>
        <div className="bd-range-actions"><Button type="submit">Xem phân tích</Button></div>
        <small className="bd-range-caption">Tối đa 183 ngày; kỳ trước liền kề và có cùng số ngày.</small>
      </form>
    </header>
    {result.loading && <div role="status" className="bd-notice">Đang tải phân tích…</div>}
    <ErrorBox error={result.error} />
    {data && <>
      {data.hasSyntheticSku && <div role="status" className="bd-notice warning">Có SKU “DEMO-”: dữ liệu giả lập phục vụ trình diễn, không phản ánh hiệu quả cửa hàng thực tế.</div>}
      {(data.warnings.excludedSaleItems > 0 || data.warnings.excludedReturnItems > 0 || data.warnings.missingReturnCostLinks > 0) && <div role="status" className="bd-notice warning">
        Dữ liệu cần kiểm tra: loại {data.warnings.excludedSaleItems} dòng bán và {data.warnings.excludedReturnItems} dòng trả có sản phẩm không hợp lệ; {data.warnings.missingReturnCostLinks} dòng trả có thể nhập kho thiếu liên kết đơn hợp lệ nên không hoàn giá vốn. Lợi nhuận có thể chưa đầy đủ.
      </div>}
      {data.ranges.current.to === today() && <div role="status" className="bd-notice warning">Kỳ này gồm hôm nay nên số liệu có thể chưa hoàn chỉnh.</div>}
      <section className="bd-data-workspace bm-workspace">
        <div className="bd-workspace-heading"><div><h2>Kết quả hai kỳ</h2>
          <p>Kỳ này: {displayDate(data.ranges.current.from)} – {displayDate(data.ranges.current.to)} · Kỳ trước: {displayDate(data.ranges.previous.from)} – {displayDate(data.ranges.previous.to)}. Dữ liệu tại {new Date(data.asOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p>
          <p>Đơn và phiếu trả hoàn tất ghi theo ngày tạo; hoàn tiền ghi vào kỳ trả, có thể khác kỳ bán.</p>
        </div></div>
        <div className="bd-summary-grid">
          <SummaryCard icon={CircleDollarSign} label="Doanh thu thuần" value={posMoney(data.totals.current.netRevenue)} detail={`Kỳ trước: ${posMoney(data.totals.previous.netRevenue)} · ${comparisonText(data.totals, "netRevenue")}`} />
          <SummaryCard icon={BarChart3} label="Lợi nhuận gộp" value={posMoney(data.totals.current.grossProfit)} detail={`Kỳ trước: ${posMoney(data.totals.previous.grossProfit)} · ${comparisonText(data.totals, "grossProfit")}`} />
          <SummaryCard icon={ShoppingBag} label="Số lượng bán" value={data.totals.current.unitsSold.toLocaleString("vi-VN")} detail={`Kỳ trước: ${data.totals.previous.unitsSold.toLocaleString("vi-VN")}`} />
          <SummaryCard icon={Boxes} label="Số lượng trả" value={data.totals.current.unitsReturned.toLocaleString("vi-VN")} detail={`Kỳ trước: ${data.totals.previous.unitsReturned.toLocaleString("vi-VN")}`} />
        </div>
        {data.items.length === 0 ? <div className="bd-empty-state compact"><h3>Không có phát sinh hợp lệ trong hai kỳ</h3><p>Kiểm tra kỳ phân tích và các cảnh báo dữ liệu nếu có.</p></div> : <>
          <FilterField label="Giải thích chỉ số"><select value={metric} onChange={(event) => {
            const value = event.target.value;
            if (value !== "netRevenue" && value !== "grossProfit") throw new Error("Chỉ số phân tích không hợp lệ.");
            setMetric(value); setPage(1); setDetail(null);
          }}>
            <option value="netRevenue">Doanh thu thuần</option><option value="grossProfit">Lợi nhuận gộp</option>
          </select></FilterField>
          <p className="bm-lead">{metricLabels[metric]} {comparisonText(data.totals, metric)} so với kỳ trước. Các khoản tăng và giảm có thể bù trừ nhau.</p>
          <Components data={data} metric={metric} />
          <section className="bm-section"><h3>Sản phẩm đóng góp vào thay đổi</h3>
            <p>Mỗi đóng góp bằng số kỳ này trừ kỳ trước. Hai nhóm dưới đây tính trên toàn bộ sản phẩm, không phụ thuộc tìm kiếm.</p>
            <div className="bm-groups">
              <ContributorGroup title="Đóng góp tăng" items={increasing} metric={metric} onDetail={setDetail} />
              <ContributorGroup title="Đóng góp giảm" items={decreasing} metric={metric} onDetail={setDetail} />
            </div>
          </section>
          <section className="bm-section"><h3>Danh sách sản phẩm</h3>
            <form className="bd-filters" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput); setPage(1); setDetail(null); }}>
              <label className="bd-search"><Search size={17} /><input aria-label="Tìm sản phẩm hoặc SKU" maxLength={100} placeholder="Tìm sản phẩm hoặc SKU…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
              <Button type="submit" variant="outline">Tìm</Button>
              <PaginationSize value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
            </form>
            {pageItems.length ? <>
              <div className="bd-table-wrap"><table className="bd-table">
                <thead><tr><th>Sản phẩm</th><th>Kỳ trước</th><th>Kỳ này</th><th>Đóng góp</th><th></th></tr></thead>
                <tbody>{pageItems.map((item) => <tr key={item.id}>
                  <td className="bd-primary-cell">{item.name}</td><td>{posMoney(item.previous[metric])}</td><td>{posMoney(item.current[metric])}</td><td>{comparisonText(item, metric)}</td>
                  <td><button aria-label={`Xem chi tiết ${item.name}`} title="Xem chi tiết" className="ai-icon-btn" type="button" onClick={() => setDetail(item)}><Eye size={18} aria-hidden="true" /></button></td>
                </tr>)}</tbody>
              </table></div>
              <div className="bd-pagination"><Pagination page={safePage} total={filtered.length} totalPages={totalPages} onPageChange={setPage} /></div>
            </> : <div className="bd-empty-state compact"><h3>Không có sản phẩm phù hợp</h3><p>Thử tìm theo tên hoặc SKU khác.</p></div>}
          </section>
        </>}
        <p className="bd-modal-note">Giá vốn hoàn lại chỉ tính cho hàng có thể nhập kho và có liên kết đơn hợp lệ. Lợi nhuận gộp không gồm chi phí vận hành. Tên và SKU là thông tin hiện tại. Cảnh báo không chứng minh dữ liệu nguồn đầy đủ.</p>
      </section>
    </>}
    <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Chi tiết biến động sản phẩm">
      {detail && <div className="bd-modal-content"><h3>{detail.name}</h3>
        <p>{metricLabels[metric]}: kỳ trước {posMoney(detail.previous[metric])}, kỳ này {posMoney(detail.current[metric])}; {comparisonText(detail, metric)}.</p>
        <div className="bd-table-wrap"><table className="bd-table">
          <thead><tr><th>SKU</th><th>Kỳ trước</th><th>Kỳ này</th><th>Đóng góp</th><th>Bán kỳ này</th><th>Trả kỳ này</th></tr></thead>
          <tbody>{detail.variants.map((variant) => <tr key={variant.id}><td>{variant.sku}</td><td>{posMoney(variant.previous[metric])}</td><td>{posMoney(variant.current[metric])}</td><td>{comparisonText(variant, metric)}</td><td>{variant.current.unitsSold}</td><td>{variant.current.unitsReturned}</td></tr>)}</tbody>
        </table></div>
      </div>}
    </Modal>
  </main>;
}

export function BusinessMovementPage() {
  const { can } = usePermissions();
  return <AppLayout>{can("analytics.read") && can("finance.read")
    ? <MovementWorkspace />
    : <main className="bd-page"><div role="alert" className="bd-notice warning">Bạn cần quyền xem phân tích và tài chính để xem biến động kinh doanh.</div></main>}
  </AppLayout>;
}
