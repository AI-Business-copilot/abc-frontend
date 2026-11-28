import { useMemo, useState } from "react";
import { BarChart3, Boxes, CircleDollarSign, Eye, Search, ShoppingBag } from "lucide-react";

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
  return `${direction(change.difference)} · ${change.percent === null ? "không tính tỷ lệ vì kỳ trước bằng 0 hoặc âm" : `${change.percent.replace(/^-/, "").replace(".", ",")}%`}`;
}

function ContributorGroup({ title, items, metric, onDetail }: {
  title: string; items: PerformanceProduct[]; metric: Metric; onDetail: (item: PerformanceProduct) => void;
}) {
  const remaining = items.slice(5);
  const rest = remaining.reduce((sum, item) => sum + cents(item.changes[metric].difference), 0n);
  const total = items.reduce((sum, item) => sum + cents(item.changes[metric].difference), 0n);
  return <section className="bm-group">
    <h3>{title}</h3>
    <p>{items.length ? `Tổng của nhóm: ${direction(fromCents(total))}` : "Không có sản phẩm trong nhóm này."}</p>
    {items.length > 0 && <>
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
      { label: "Giá vốn sau hàng trả đủ điều kiện", value: data.components.netCogs },
    ];
  return <details className="bm-components">
    <summary>Xem các khoản tạo nên thay đổi {metricLabels[metric].toLocaleLowerCase("vi")}</summary>
    <p>Đây là cách chia cùng một mức thay đổi theo công thức, không phải nguyên nhân kinh doanh. Không cộng các khoản này với phần thay đổi theo sản phẩm ở trên.</p>
    <div className="bd-table-wrap"><table className="bd-table bm-components-table">
      <thead><tr><th>Khoản mục</th><th>Kỳ trước</th><th>Kỳ này</th><th>Khoản mục thay đổi</th><th>Ảnh hưởng theo cách tính</th></tr></thead>
      <tbody>{rows.map(({ label, value }) => <tr key={label}>
        <td>{label}</td><td>{posMoney(value.previous)}</td><td>{posMoney(value.current)}</td>
        <td>{direction(value.difference)}</td><td>{cents(value.impact) === 0n ? "Không làm thay đổi" : `Góp phần ${direction(value.impact)}`}</td>
      </tr>)}</tbody>
    </table></div>
    <p>{metric === "netRevenue"
      ? "Doanh thu thuần = tiền hàng − giảm giá dòng − hoàn tiền."
      : "Lợi nhuận gộp = doanh thu thuần − giá vốn sau hàng trả đủ điều kiện. Đây không phải lợi nhuận ròng."}</p>
  </details>;
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
  const [variantSearch, setVariantSearch] = useState("");
  const [variantPage, setVariantPage] = useState(1);
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
  const visibleVariants = detail?.variants.filter((variant) => variant.sku.toLocaleLowerCase("vi").includes(variantSearch.trim().toLocaleLowerCase("vi"))) ?? [];
  const variantTotalPages = Math.max(1, Math.ceil(visibleVariants.length / 10));
  const safeVariantPage = Math.min(variantPage, variantTotalPages);
  const pageVariants = visibleVariants.slice((safeVariantPage - 1) * 10, safeVariantPage * 10);
  const snapshotDate = data ? new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(data.asOf)) : null;
  const openDetail = (item: PerformanceProduct) => { setVariantSearch(""); setVariantPage(1); setDetail(item); };

  return <main className="bd-page bm-page">
    <header className="bd-hero">
      <div className="bd-hero-copy">
        <h1>Giải thích biến động</h1>
        <p>Xem doanh thu hoặc lợi nhuận gộp thay đổi bao nhiêu và sản phẩm nào góp phần vào mức tăng hoặc giảm.</p>
        <p>Dựa trên số bán tại quầy đã ghi nhận, không phải dự báo hay kết luận nguyên nhân kinh doanh.</p>
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
        <small className="bd-range-caption">Tối đa 183 ngày. Kỳ trước là khoảng thời gian liền kề, có cùng số ngày.</small>
      </form>
    </header>
    {result.loading && <div role="status" className="bd-notice">Đang tải phân tích…</div>}
    <ErrorBox error={result.error} />
    {data && <>
      {(data.warnings.excludedSaleItems > 0 || data.warnings.excludedReturnItems > 0 || data.warnings.missingReturnCostLinks > 0) && <div role="status" className="bd-notice warning">
        <strong>Cần kiểm tra dữ liệu trong hai kỳ.</strong>
        {(data.warnings.excludedSaleItems > 0 || data.warnings.excludedReturnItems > 0) && <> Đã bỏ qua {data.warnings.excludedSaleItems} dòng bán và {data.warnings.excludedReturnItems} dòng trả có thông tin sản phẩm không hợp lệ; số lượng, doanh thu và lợi nhuận có thể chưa đầy đủ.</>}
        {data.warnings.missingReturnCostLinks > 0 && <> Có {data.warnings.missingReturnCostLinks} dòng hàng trả có thể nhập kho chưa liên kết được với đơn bán hợp lệ; giá vốn hoàn lại chưa được tính, lợi nhuận có thể chưa chính xác.</>}
      </div>}
      {snapshotDate && data.ranges.current.to >= snapshotDate && <div role="status" className="bd-notice warning">Kỳ này có ngày chưa kết thúc tại thời điểm tải dữ liệu, nên kết quả chưa đầy đủ. Hãy xem lại sau khi kỳ kết thúc.</div>}
      <section className="bd-data-workspace bm-workspace">
        <div className="bd-workspace-heading"><div><h2>Kết quả bán tại quầy</h2>
          <p><strong>Kỳ này: {displayDate(data.ranges.current.from)} – {displayDate(data.ranges.current.to)}</strong> · Kỳ trước: {displayDate(data.ranges.previous.from)} – {displayDate(data.ranges.previous.to)} ({data.ranges.current.dayCount} ngày mỗi kỳ).</p>
          <p>Bấm “Xem phân tích” để cập nhật dữ liệu. Các số dưới đây tính trên tất cả sản phẩm.</p>
        </div></div>
        <div className="bd-summary-grid">
          <SummaryCard icon={CircleDollarSign} label="Doanh thu thuần" value={posMoney(data.totals.current.netRevenue)} detail={`Kỳ trước: ${posMoney(data.totals.previous.netRevenue)} · ${comparisonText(data.totals, "netRevenue")}`} />
          <SummaryCard icon={BarChart3} label="Lợi nhuận gộp" value={posMoney(data.totals.current.grossProfit)} detail={`Kỳ trước: ${posMoney(data.totals.previous.grossProfit)} · ${comparisonText(data.totals, "grossProfit")}`} />
          <SummaryCard icon={ShoppingBag} label="Đã bán (chưa trừ trả)" value={data.totals.current.unitsSold.toLocaleString("vi-VN")} detail={`Kỳ trước: ${data.totals.previous.unitsSold.toLocaleString("vi-VN")}`} />
          <SummaryCard icon={Boxes} label="Hàng trả" value={data.totals.current.unitsReturned.toLocaleString("vi-VN")} detail={`Kỳ trước: ${data.totals.previous.unitsReturned.toLocaleString("vi-VN")}`} />
        </div>
        {data.items.length === 0 ? <div className="bd-empty-state compact"><h3>Không có phát sinh hợp lệ trong hai kỳ</h3><p>Kiểm tra kỳ phân tích và các cảnh báo dữ liệu nếu có.</p></div> : <>
          <FilterField label="Bạn muốn xem thay đổi của"><select aria-label="Giải thích chỉ số" value={metric} onChange={(event) => {
            const value = event.target.value;
            if (value !== "netRevenue" && value !== "grossProfit") throw new Error("Chỉ số phân tích không hợp lệ.");
            setMetric(value); setPage(1); setDetail(null);
          }}>
            <option value="netRevenue">Doanh thu thuần</option><option value="grossProfit">Lợi nhuận gộp</option>
          </select></FilterField>
          <div className="bm-lead"><strong>So với kỳ trước, {metricLabels[metric].toLocaleLowerCase("vi")} {comparisonText(data.totals, metric)}.</strong>
            <p>Các mức tăng và giảm có thể bù trừ nhau. Số liệu này chưa cho biết lý do kinh doanh thực tế.</p>
            <a href={`/app/assistant?${new URLSearchParams({ from: range.from, to: range.to, metric })}`}>Hỏi về mục này</a></div>
          <section className="bm-section"><h3>Sản phẩm góp phần vào thay đổi</h3>
            <p>Mức thay đổi của từng sản phẩm là kết quả kỳ này trừ kỳ trước. Hai nhóm tính trên tất cả sản phẩm, không phụ thuộc tìm kiếm.</p>
            <div className="bm-groups">
              <ContributorGroup title="Sản phẩm có mức tăng" items={increasing} metric={metric} onDetail={openDetail} />
              <ContributorGroup title="Sản phẩm có mức giảm" items={decreasing} metric={metric} onDetail={openDetail} />
            </div>
          </section>
          <Components data={data} metric={metric} />
          <section className="bm-section"><h3>Danh sách sản phẩm</h3>
            <p>Xếp theo mức thay đổi lớn nhất. Khi tìm theo mã hàng, bảng vẫn hiển thị tổng của sản phẩm chứa mã đó.</p>
            <form className="bd-filters" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput); setPage(1); setDetail(null); }}>
              <label className="bd-search"><Search size={17} /><input aria-label="Tìm sản phẩm hoặc SKU" maxLength={100} placeholder="Tìm sản phẩm hoặc SKU…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
              <Button type="submit" variant="outline">Tìm</Button>
              <PaginationSize value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} />
            </form>
            {pageItems.length ? <>
              <div className="bd-table-wrap"><table className="bd-table bm-product-table">
                <colgroup><col className="bm-col-product" /><col className="bm-col-period" /><col className="bm-col-period" /><col /><col className="bm-col-detail" /></colgroup>
                <thead><tr><th>Sản phẩm</th><th>Kỳ trước</th><th>Kỳ này</th><th>Thay đổi</th><th aria-label="Chi tiết"></th></tr></thead>
                <tbody>{pageItems.map((item) => <tr key={item.id}>
                  <td className="bd-primary-cell">{item.name}</td><td>{posMoney(item.previous[metric])}</td><td>{posMoney(item.current[metric])}</td><td>{direction(item.changes[metric].difference)}</td>
                  <td><button aria-label={`Xem chi tiết ${item.name}`} title="Xem chi tiết" className="ai-icon-btn" type="button" onClick={() => openDetail(item)}><Eye size={18} aria-hidden="true" /></button></td>
                </tr>)}</tbody>
              </table></div>
              <div className="bd-pagination"><Pagination page={safePage} total={filtered.length} totalPages={totalPages} onPageChange={setPage} /></div>
            </> : <div className="bd-empty-state compact"><h3>Không có sản phẩm phù hợp</h3><p>Thử tìm theo tên hoặc SKU khác.</p></div>}
          </section>
        </>}
        <p className="bd-modal-note">Số đã bán chưa trừ hàng trả; hàng trả và tiền hoàn được tính theo ngày tạo phiếu trả, có thể khác kỳ bán. Đơn bán cũng tính theo ngày tạo. Giá vốn hoàn lại chỉ tính cho hàng có thể nhập kho và có liên kết đơn bán hợp lệ. Lợi nhuận gộp chưa trừ chi phí vận hành, không phải lãi ròng. Tên và mã hàng là thông tin hiện tại; các kiểm tra không đảm bảo dữ liệu đầy đủ.</p>
      </section>
    </>}
    <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Chi tiết biến động sản phẩm">
      {detail && <div className="bd-modal-content"><h3>{detail.name}</h3>
        {data && <p className="bd-modal-note">Kỳ này: {displayDate(data.ranges.current.from)} – {displayDate(data.ranges.current.to)} · Kỳ trước: {displayDate(data.ranges.previous.from)} – {displayDate(data.ranges.previous.to)}.</p>}
        <div className="bm-lead"><strong>{metricLabels[metric]} {comparisonText(detail, metric)}.</strong>
          <p>Kỳ trước: {posMoney(detail.previous[metric])} · Kỳ này: {posMoney(detail.current[metric])}. Tỷ lệ (nếu có) so với kết quả kỳ trước của sản phẩm này.</p></div>
        <h3>Theo từng mã hàng</h3>
        <p className="bd-modal-note">Số bán chưa trừ hàng trả. Số trả được ghi nhận theo kỳ tạo phiếu trả, có thể khác kỳ bán. Tỷ lệ (nếu có) tính so với kết quả kỳ trước của từng mã hàng.</p>
        {detail.variants.length > 1 && <label className="bd-search"><Search size={17} /><input aria-label="Tìm mã hàng trong chi tiết" placeholder="Tìm mã hàng…" value={variantSearch} onChange={(event) => { setVariantSearch(event.target.value); setVariantPage(1); }} /></label>}
        {pageVariants.length ? <><div className="bd-table-wrap"><table className="bd-table bm-variant-table">
          <thead><tr><th>Mã hàng</th><th>Kỳ trước</th><th>Kỳ này</th><th>Thay đổi</th><th>Đã bán / trả kỳ này</th></tr></thead>
          <tbody>{pageVariants.map((variant) => <tr key={variant.id}><td>{variant.sku}</td><td>{posMoney(variant.previous[metric])}</td><td>{posMoney(variant.current[metric])}</td><td>{comparisonText(variant, metric)}</td><td>{variant.current.unitsSold.toLocaleString("vi-VN")} / {variant.current.unitsReturned.toLocaleString("vi-VN")}</td></tr>)}</tbody>
        </table></div><div className="bd-pagination"><Pagination page={safeVariantPage} total={visibleVariants.length} totalPages={variantTotalPages} onPageChange={setVariantPage} /></div></> :
          <p className="bd-modal-note">{detail.variants.length ? "Không tìm thấy mã hàng phù hợp." : "Không có mã hàng trong kết quả."}</p>}
      </div>}
    </Modal>
  </main>;
}

export function BusinessMovementPage() {
  const { can } = usePermissions();
  return <AppLayout contentClassName="ai-insights-content">{can("analytics.read") && can("finance.read")
    ? <MovementWorkspace />
    : <main className="bd-page"><div role="alert" className="bd-notice warning">Bạn cần quyền xem phân tích và tài chính để xem biến động kinh doanh.</div></main>}
  </AppLayout>;
}
