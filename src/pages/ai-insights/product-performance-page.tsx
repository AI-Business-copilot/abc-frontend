import { useMemo, useState } from "react";
import { BarChart3, Boxes, CircleDollarSign, Eye, Search, ShoppingBag } from "lucide-react";

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
  const difference = currency ? money(change.difference) : Number(change.difference).toLocaleString("vi-VN");
  return `${difference} (${change.percent === null ? "không có tỷ lệ so sánh" : `${change.percent}%`})`;
}

function AmountTable({ comparison }: { comparison: PerformanceComparison }) {
  const fields: { label: string; key: keyof PerformanceAmounts; currency?: boolean }[] = [
    { label: "Số lượng bán", key: "unitsSold" },
    { label: "Số lượng trả", key: "unitsReturned" },
    { label: "Doanh thu gộp", key: "grossSales", currency: true },
    { label: "Giảm giá", key: "discountAmount", currency: true },
    { label: "Hoàn tiền", key: "refundAmount", currency: true },
    { label: "Doanh thu thuần", key: "netRevenue", currency: true },
    { label: "Giá vốn thuần", key: "netCogs", currency: true },
    { label: "Lợi nhuận gộp", key: "grossProfit", currency: true },
    { label: "Biên lợi nhuận gộp", key: "marginPercent" },
  ];
  const format = (amounts: PerformanceAmounts, field: typeof fields[number]) => {
    const value = amounts[field.key];
    if (value === null) return "Không khả dụng";
    if (field.key === "marginPercent") return `${value}%`;
    return field.currency ? money(String(value)) : Number(value).toLocaleString("vi-VN");
  };
  return <div className="bd-table-wrap"><table className="bd-table">
    <thead><tr><th>Chỉ số</th><th>Kỳ này</th><th>Kỳ trước</th></tr></thead>
    <tbody>{fields.map((field) => <tr key={field.key}><td>{field.label}</td><td>{format(comparison.current, field)}</td><td>{format(comparison.previous, field)}</td></tr>)}</tbody>
  </table></div>;
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

  return <main className="bd-page">
    <header className="bd-hero">
      <div className="bd-hero-copy">
        <span className="bd-eyebrow"><BarChart3 size={15} /> PHÂN TÍCH POS</span>
        <h1>Hiệu quả sản phẩm</h1>
        <p>So sánh số liệu bán hàng POS và lợi nhuận gộp đã ghi nhận với kỳ trước; không bao gồm dự báo.</p>
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
        <small className="bd-range-caption">Tối đa 183 ngày; kỳ trước có cùng số ngày và liền kề.</small>
      </form>
    </header>
    {result.loading && <div role="status" className="bd-notice">Đang tải phân tích…</div>}
    <ErrorBox error={result.error} />
    {data && <>
      {data.hasSyntheticSku && <div className="bd-notice warning" role="status">Có SKU bắt đầu bằng “DEMO-”: dữ liệu giả lập phục vụ trình diễn, không phản ánh hiệu quả cửa hàng thực tế.</div>}
      {warnings && (warnings.excludedSaleItems > 0 || warnings.excludedReturnItems > 0 || warnings.missingReturnCostLinks > 0) && <div className="bd-notice warning" role="status">
        Dữ liệu cần kiểm tra: loại {warnings.excludedSaleItems} dòng bán và {warnings.excludedReturnItems} dòng trả có sản phẩm không hợp lệ; {warnings.missingReturnCostLinks} dòng trả có thể nhập kho thiếu liên kết đơn hợp lệ nên không hoàn giá vốn. Lợi nhuận có thể chưa đầy đủ.
      </div>}
      <section className="bd-data-workspace">
        <div className="bd-workspace-heading"><div><h2>Kết quả POS</h2>
          <p>Kỳ này: {displayDate(data.ranges.current.from)} – {displayDate(data.ranges.current.to)} · Kỳ trước: {displayDate(data.ranges.previous.from)} – {displayDate(data.ranges.previous.to)}. Dữ liệu tại {new Date(data.asOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p>
          <p>Đơn và phiếu trả hoàn tất được ghi theo ngày tạo; hoàn tiền ghi vào kỳ trả. Ngày hiện tại, nếu chọn, có thể chưa hoàn chỉnh.</p>
        </div></div>
        <div className="bd-summary-grid">
          <SummaryCard icon={CircleDollarSign} label="Doanh thu thuần" value={money(data.totals.current.netRevenue)} detail={`So với kỳ trước: ${changeText(data.totals.changes.netRevenue)}`} />
          <SummaryCard icon={BarChart3} label="Lợi nhuận gộp" value={money(data.totals.current.grossProfit)} detail={`So với kỳ trước: ${changeText(data.totals.changes.grossProfit)}`} />
          <SummaryCard icon={ShoppingBag} label="Số lượng bán" value={data.totals.current.unitsSold.toLocaleString("vi-VN")} detail={`So với kỳ trước: ${changeText(data.totals.changes.unitsSold, false)}`} />
          <SummaryCard icon={Boxes} label="Số lượng trả" value={data.totals.current.unitsReturned.toLocaleString("vi-VN")} detail={`So với kỳ trước: ${changeText(data.totals.changes.unitsReturned, false)}`} />
        </div>
        <p className="bd-range-caption">Tổng kỳ tính trên tất cả sản phẩm, không phụ thuộc tìm kiếm.</p>
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
          <div className="bd-table-wrap"><table className="bd-table">
            <thead><tr><th>Sản phẩm</th><th>Đã bán</th><th>Đã trả</th><th>Doanh thu thuần</th><th>Thay đổi doanh thu</th><th>Lợi nhuận gộp</th><th>Biên lợi nhuận</th><th></th></tr></thead>
            <tbody>{pageItems.map((item) => <tr key={item.id}>
              <td className="bd-primary-cell">{item.name}</td><td>{item.current.unitsSold}</td><td>{item.current.unitsReturned}</td><td>{money(item.current.netRevenue)}</td><td>{changeText(item.changes.netRevenue)}</td><td>{money(item.current.grossProfit)}</td><td>{item.current.marginPercent === null ? "Không khả dụng" : `${item.current.marginPercent}%`}</td>
              <td><button aria-label={`Xem chi tiết ${item.name}`} title="Xem chi tiết" className="ai-icon-btn" type="button" onClick={() => setDetail(item)}><Eye size={18} aria-hidden="true" /></button></td>
            </tr>)}</tbody>
          </table></div>
          <div className="bd-pagination"><Pagination page={safePage} total={filtered.length} totalPages={totalPages} onPageChange={setPage} /></div>
        </> : <div className="bd-empty-state compact"><h3>Không có sản phẩm phù hợp</h3><p>Không có phát sinh trong hai kỳ hoặc không có kết quả phù hợp tìm kiếm.</p></div>}
        <p className="bd-modal-note">Giá vốn hoàn lại chỉ tính cho hàng có thể nhập kho và có liên kết đơn hợp lệ. Lợi nhuận gộp không bao gồm chi phí vận hành; không phải lợi nhuận ròng. Tên và SKU là thông tin hiện tại.</p>
      </section>
    </>}
    <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Chi tiết hiệu quả sản phẩm">
      {detail && <div className="bd-modal-content"><h3>{detail.name}</h3><AmountTable comparison={detail} />
        {detail.variants.map((variant) => <section key={variant.id}><h3>SKU {variant.sku}</h3><AmountTable comparison={variant} /></section>)}
      </div>}
    </Modal>
  </main>;
}

export function ProductPerformancePage() {
  const { can } = usePermissions();
  return <AppLayout>{can("analytics.read") && can("finance.read")
    ? <PerformanceWorkspace />
    : <main className="bd-page"><div role="alert" className="bd-notice warning">Bạn cần quyền xem phân tích và tài chính để xem hiệu quả sản phẩm.</div></main>}
  </AppLayout>;
}
