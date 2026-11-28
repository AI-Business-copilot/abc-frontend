import { useMemo, useState } from "react";
import { BarChart3, Boxes, ChevronDown, CircleDollarSign, Eye, Search, ShoppingBag } from "lucide-react";

import { getProductPerformance, type PerformanceAmounts, type PerformanceComparison, type PerformanceProduct } from "@/api/product-performance";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/use-permissions";
import { FilterField, PaginationSize, SummaryCard, displayDate } from "@/pages/business-data/shared";
import { ErrorBox, today, useLoad } from "@/pages/purchases/shared";
import { dayOffset, posMoney as money } from "./pos-format";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";
import "./ai-insights.css";

function changeText(change: { difference: string; percent: string | null }, currency = true) {
  if (!/^-?\d+\.\d{2}$/.test(change.difference)) throw new Error("Giá trị thay đổi không hợp lệ.");
  const cents = BigInt(change.difference.replace(".", ""));
  const absolute = change.difference.startsWith("-") ? change.difference.slice(1) : change.difference;
  const amount = currency ? money(absolute) : (cents < 0n ? -cents / 100n : cents / 100n).toLocaleString("vi-VN");
  const direction = cents > 0n ? `Tăng ${amount}` : cents < 0n ? `Giảm ${amount}` : "Không đổi";
  return `${direction} · ${change.percent === null ? "Không tính tỷ lệ vì kỳ trước bằng 0 hoặc âm" : `${change.percent.replace(/^-/, "").replace(".", ",")}%`}`;
}

function AmountTable({ comparison }: { comparison: PerformanceComparison }) {
  const fields: { label: string; key: keyof PerformanceAmounts; currency?: boolean }[] = [
    { label: "Doanh thu thuần", key: "netRevenue", currency: true },
    { label: "Lợi nhuận gộp", key: "grossProfit", currency: true },
    { label: "Số lượng bán", key: "unitsSold" },
    { label: "Số lượng trả", key: "unitsReturned" },
    { label: "Biên lợi nhuận gộp", key: "marginPercent" },
    { label: "Tiền hàng trước giảm giá", key: "grossSales", currency: true },
    { label: "Giảm giá", key: "discountAmount", currency: true },
    { label: "Hoàn tiền", key: "refundAmount", currency: true },
    { label: "Giá vốn sau hàng trả đủ điều kiện", key: "netCogs", currency: true },
  ];
  const format = (amounts: PerformanceAmounts, field: typeof fields[number]) => {
    const value = amounts[field.key];
    if (value === null) return "Chưa tính được";
    if (field.key === "marginPercent") return `${String(value).replace(".", ",")}%`;
    return field.currency ? money(String(value)) : Number(value).toLocaleString("vi-VN");
  };
  return <div className="bd-table-wrap"><table className="bd-table">
    <thead><tr><th>Chỉ số</th><th>Kỳ này</th><th>Kỳ trước</th></tr></thead>
    <tbody>{fields.map((field) => <tr key={field.key}><td>{field.label}</td><td>{format(comparison.current, field)}</td><td>{format(comparison.previous, field)}</td></tr>)}</tbody>
  </table></div>;
}

function VariantDetails({ variant }: { variant: PerformanceProduct["variants"][number] }) {
  const [open, setOpen] = useState(false);
  return <section className="performance-variant">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span><strong>Mã hàng {variant.sku}</strong><small>Đã bán {variant.current.unitsSold.toLocaleString("vi-VN")} · Doanh thu {money(variant.current.netRevenue)}</small></span>
      <ChevronDown size={18} aria-hidden="true" />
    </button>
    {open && <AmountTable comparison={variant} />}
  </section>;
}

function PerformanceWorkspace() {
  const [initial] = useState(() => {
    const end = dayOffset(today(), -1);
    return { from: dayOffset(end, -6), to: end };
  });
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [range, setRange] = useState(initial);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("revenue");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState<PerformanceProduct | null>(null);
  const [variantSearch, setVariantSearch] = useState("");
  const result = useLoad(() => getProductPerformance(range), [range.from, range.to]);
  const data = result.data;
  const warnings = data?.warnings;
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("vi");
    const items = (data?.items ?? []).filter((item) => !needle || item.name.toLocaleLowerCase("vi").includes(needle) || item.variants.some((variant) => variant.sku.toLocaleLowerCase("vi").includes(needle)));
    items.sort((a, b) => {
      const value = (item: PerformanceProduct) => sort === "units"
        ? BigInt(item.current.unitsSold)
        : BigInt((sort === "profit" ? item.current.grossProfit : item.current.netRevenue).replace(".", ""));
      const aValue = value(a);
      const bValue = value(b);
      return (aValue === bValue ? 0 : aValue > bValue ? -1 : 1) || a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id);
    });
    return items;
  }, [data, search, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleVariants = detail?.variants.filter((variant) => variant.sku.toLocaleLowerCase("vi").includes(variantSearch.trim().toLocaleLowerCase("vi"))) ?? [];
  const snapshotDate = data ? new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(data.asOf)) : null;

  return <main className="bd-page performance-page">
    <header className="bd-hero">
      <div className="bd-hero-copy">
        <h1>Hiệu quả sản phẩm</h1>
        <p>Xem sản phẩm bán được bao nhiêu và tạo ra bao nhiêu lợi nhuận gộp, so với khoảng thời gian trước đó.</p>
        <p>Đây là kết quả bán tại quầy đã ghi nhận, không phải dự báo.</p>
      </div>
      <form className="bd-range-panel" onSubmit={(event) => {
        event.preventDefault();
        setDetail(null);
        if (from === range.from && to === range.to) { setPage(1); result.reload(); }
        else { setPage(1); setRange({ from, to }); }
      }}>
        <span className="bd-range-title">Khoảng thời gian phân tích</span>
        <div className="bd-range-fields">
          <FilterField label="Từ ngày"><input required type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></FilterField>
          <FilterField label="Đến ngày"><input required type="date" value={to} onChange={(event) => setTo(event.target.value)} /></FilterField>
        </div>
        <div className="bd-range-actions"><Button type="submit">Xem phân tích</Button></div>
        <small className="bd-range-caption">Tối đa 183 ngày. Kỳ trước là khoảng thời gian liền kề, có cùng số ngày.</small>
      </form>
    </header>
    {result.loading && <div role="status" className="bd-notice">Đang tải phân tích…</div>}
    <ErrorBox error={result.error} />
    {data && <>
      {warnings && (warnings.excludedSaleItems > 0 || warnings.excludedReturnItems > 0 || warnings.missingReturnCostLinks > 0) && <div className="bd-notice warning" role="status">
        <strong>Cần kiểm tra dữ liệu trong hai kỳ.</strong>
        {(warnings.excludedSaleItems > 0 || warnings.excludedReturnItems > 0) && <> Đã bỏ qua {warnings.excludedSaleItems} dòng bán và {warnings.excludedReturnItems} dòng trả có thông tin sản phẩm không hợp lệ; số lượng, doanh thu và lợi nhuận có thể chưa đầy đủ.</>}
        {warnings.missingReturnCostLinks > 0 && <> Có {warnings.missingReturnCostLinks} dòng hàng trả có thể nhập kho chưa liên kết được với đơn bán hợp lệ; giá vốn hoàn lại chưa được tính, lợi nhuận có thể chưa chính xác.</>}
      </div>}
      {snapshotDate && data.ranges.current.to >= snapshotDate && <div className="bd-notice warning" role="status">Kỳ này có ngày chưa kết thúc hoặc chưa tới tại thời điểm tải dữ liệu, nên kết quả chưa đầy đủ. Hãy xem lại sau khi kỳ kết thúc.</div>}
      <section className="bd-data-workspace">
        <div className="bd-workspace-heading"><div><h2>Kết quả bán tại quầy</h2>
          <p><strong>Kỳ này: {displayDate(data.ranges.current.from)} – {displayDate(data.ranges.current.to)}</strong> · Kỳ trước: {displayDate(data.ranges.previous.from)} – {displayDate(data.ranges.previous.to)} ({data.ranges.current.dayCount} ngày mỗi kỳ).</p>
          <p>Thay đổi bên dưới so với kỳ trước. Bấm “Xem phân tích” để cập nhật dữ liệu.</p>
        </div></div>
        <div className="bd-summary-grid">
          <SummaryCard icon={CircleDollarSign} label="Doanh thu thuần" value={money(data.totals.current.netRevenue)} detail={`So với kỳ trước: ${changeText(data.totals.changes.netRevenue)}`} />
          <SummaryCard icon={BarChart3} label="Lợi nhuận gộp" value={money(data.totals.current.grossProfit)} detail={`So với kỳ trước: ${changeText(data.totals.changes.grossProfit)}`} />
          <SummaryCard icon={ShoppingBag} label="Đã bán (chưa trừ trả)" value={data.totals.current.unitsSold.toLocaleString("vi-VN")} detail={`So với kỳ trước: ${changeText(data.totals.changes.unitsSold, false)}`} />
          <SummaryCard icon={Boxes} label="Hàng trả" value={data.totals.current.unitsReturned.toLocaleString("vi-VN")} detail={`So với kỳ trước: ${changeText(data.totals.changes.unitsReturned, false)}`} />
        </div>
        <p className="bd-range-caption">Tổng tính trên tất cả sản phẩm bán tại quầy, không phụ thuộc tìm kiếm. Lợi nhuận gộp chưa trừ chi phí vận hành, không phải lãi ròng; số âm là lỗ gộp.</p>
        <div className="performance-list-heading"><h3>Hiệu quả từng sản phẩm</h3><p>Xếp theo kết quả kỳ này; chọn biểu tượng con mắt để xem chi tiết và từng mã hàng. Khi tìm theo mã hàng, bảng vẫn hiển thị tổng của sản phẩm chứa mã đó.</p></div>
        <form className="bd-filters" onSubmit={(event) => {
          event.preventDefault();
          setDetail(null);
          setSearch(searchInput);
          setPage(1);
        }}>
          <label className="bd-search"><Search size={17} /><input aria-label="Tìm sản phẩm hoặc SKU" maxLength={100} placeholder="Tìm sản phẩm hoặc SKU…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
          <Button type="submit" variant="outline">Tìm</Button>
          <FilterField label="Xếp hạng theo"><select value={sort} onChange={(event) => { setDetail(null); setSort(event.target.value); setPage(1); }}><option value="revenue">Doanh thu thuần</option><option value="profit">Lợi nhuận gộp</option><option value="units">Số lượng bán</option></select></FilterField>
          <PaginationSize value={pageSize} onChange={(value) => { setDetail(null); setPageSize(value); setPage(1); }} />
        </form>
        {pageItems.length ? <>
          <div className="bd-table-wrap"><table className="bd-table performance-table">
            <colgroup><col className="performance-col-product" /><col className="performance-col-units" /><col className="performance-col-revenue" /><col /><col className="performance-col-detail" /></colgroup>
            <thead><tr><th>Sản phẩm</th><th>Đã bán / trả</th><th>Doanh thu thuần</th><th>Lợi nhuận gộp</th><th aria-label="Chi tiết"></th></tr></thead>
            <tbody>{pageItems.map((item) => <tr key={item.id}>
              <td className="bd-primary-cell">{item.name}</td>
              <td><strong>{item.current.unitsSold.toLocaleString("vi-VN")} đã bán</strong><small>{item.current.unitsReturned.toLocaleString("vi-VN")} đã trả</small></td>
              <td><strong>{money(item.current.netRevenue)}</strong><small>So với kỳ trước: {changeText(item.changes.netRevenue)}</small></td>
              <td><strong>{money(item.current.grossProfit)}</strong><small>{item.current.marginPercent === null ? "Chưa tính được biên lợi nhuận" : `Biên lợi nhuận: ${item.current.marginPercent.replace(".", ",")}%`}</small></td>
              <td><button aria-label={`Xem chi tiết ${item.name}`} title="Xem chi tiết" className="ai-icon-btn" type="button" onClick={() => { setVariantSearch(""); setDetail(item); }}><Eye size={18} aria-hidden="true" /></button></td>
            </tr>)}</tbody>
          </table></div>
          <div className="bd-pagination"><Pagination page={safePage} total={filtered.length} totalPages={totalPages} onPageChange={setPage} /></div>
        </> : <div className="bd-empty-state compact"><h3>{search ? "Không tìm thấy sản phẩm phù hợp" : "Chưa có sản phẩm trong kết quả"}</h3><p>{search ? "Thử tìm theo tên sản phẩm hoặc mã hàng khác." : "Không có sản phẩm trong kết quả của hai kỳ. Hãy xem các lưu ý dữ liệu nếu có."}</p></div>}
        <p className="bd-modal-note">Số đã bán chưa trừ hàng trả; hàng trả và tiền hoàn được tính theo ngày tạo phiếu trả, có thể khác kỳ bán. Đơn bán cũng được tính theo ngày tạo. Giá vốn hoàn lại chỉ tính cho hàng có thể nhập kho và có liên kết đơn bán hợp lệ. Biên lợi nhuận chỉ tính khi doanh thu thuần dương. Tên sản phẩm và mã hàng là thông tin hiện tại.</p>
      </section>
    </>}
    <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Chi tiết hiệu quả sản phẩm">
      {detail && <div className="bd-modal-content"><h3>{detail.name}</h3>
        {data && <p className="bd-modal-note">Kỳ này: {displayDate(data.ranges.current.from)} – {displayDate(data.ranges.current.to)} · Kỳ trước: {displayDate(data.ranges.previous.from)} – {displayDate(data.ranges.previous.to)}.</p>}
        <p className="bd-modal-note">Lợi nhuận gộp chưa trừ chi phí vận hành. Số bán chưa trừ hàng trả; hàng trả được tính theo kỳ tạo phiếu. Giá vốn hoàn lại chỉ tính cho hàng có thể nhập kho và có liên kết đơn bán hợp lệ.</p>
        <AmountTable comparison={detail} />
        <h3>Theo từng mã hàng</h3>
        {detail.variants.length > 1 && <label className="bd-search"><Search size={17} /><input aria-label="Tìm mã hàng trong chi tiết" placeholder="Tìm mã hàng…" value={variantSearch} onChange={(event) => setVariantSearch(event.target.value)} /></label>}
        {visibleVariants.length ? visibleVariants.map((variant) => <VariantDetails variant={variant} key={variant.id} />) : <p className="bd-modal-note">{detail.variants.length ? "Không tìm thấy mã hàng phù hợp." : "Không có mã hàng trong kết quả."}</p>}
      </div>}
    </Modal>
  </main>;
}

export function ProductPerformancePage() {
  const { can } = usePermissions();
  return <AppLayout contentClassName="ai-insights-content">{can("analytics.read") && can("finance.read")
    ? <PerformanceWorkspace />
    : <main className="bd-page"><div role="alert" className="bd-notice warning">Bạn cần quyền xem phân tích và tài chính để xem hiệu quả sản phẩm.</div></main>}
  </AppLayout>;
}
