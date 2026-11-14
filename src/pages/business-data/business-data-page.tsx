import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";

import { businessDataApi, type AiReadyData } from "@/api/business-data";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/use-permissions";
import { DetailLine, FilterField, PaginationSize, SummaryCard, defaultFrom, displayDate, getAmount } from "@/pages/business-data/shared";
import { ErrorBox, money, useAction, today } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";

type PosMetric = AiReadyData["pos"]["metrics"][number];
type PosFilter = "ALL" | "SOLD" | "RETURNED" | "PROFIT" | "LOSS";

export function BusinessDataPage() {
  const { can } = usePermissions();
  const canManage = can("business_data.manage");
  const canRead = can("analytics.read") && can("finance.read");
  const action = useAction();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [readyData, setReadyData] = useState<AiReadyData | null>(null);
  const [message, setMessage] = useState("");
  const [hasDataWarning, setHasDataWarning] = useState(false);
  const [detail, setDetail] = useState<PosMetric | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PosFilter>("ALL");
  const [sort, setSort] = useState("date-newest");

  const refreshReadyData = async () => {
    setReadyData(await businessDataApi.aiReady(from, to));
    setPage(1);
  };

  const updateBusinessData = () => action.run(async () => {
    setMessage("");
    if (canManage) {
      const result = await businessDataApi.aggregatePos(from, to);
      const excludedSourceRows = result.excludedInvalidSaleItems + result.excludedInvalidReturnItems;
      const hasWarning = excludedSourceRows > 0 || result.excludedReturnCostLinks > 0;
      const dataWarning = hasWarning
        ? ` Đã loại trừ ${result.excludedInvalidSaleItems} dòng bán và ${result.excludedInvalidReturnItems} dòng trả có sản phẩm sai cửa hàng; ${result.excludedReturnCostLinks} dòng trả thiếu liên kết đơn hợp lệ không được tính hoàn giá vốn.`
        : "";
      setHasDataWarning(hasWarning);
      setMessage(`Đã tổng hợp ${result.ordersProcessed} đơn, ${result.returnsProcessed} phiếu trả hàng và ghi ${result.productDaysWritten} dòng sản phẩm/ngày.${dataWarning}`);
      if (canRead) {
        setReadyData(null);
        await refreshReadyData();
      }
      return;
    }

    await refreshReadyData();
    setHasDataWarning(false);
  });

  const filteredPos = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("vi");
    const values = (readyData?.pos.metrics ?? []).filter((row) => {
      const searchable = `${row.variant.template.name} ${row.variant.sku} ${row.metricDate}`.toLocaleLowerCase("vi");
      const netRevenue = getAmount(row.netRevenue);
      return (!needle || searchable.includes(needle))
        && (filter === "ALL"
          || (filter === "SOLD" && row.unitsSold > 0)
          || (filter === "RETURNED" && row.unitsReturned > 0)
          || (filter === "PROFIT" && netRevenue > 0)
          || (filter === "LOSS" && netRevenue < 0));
    });
    return values.sort((left, right) => {
      switch (sort) {
        case "date-oldest": return left.metricDate.localeCompare(right.metricDate) || left.variant.sku.localeCompare(right.variant.sku, "vi");
        case "revenue-high": return getAmount(right.netRevenue) - getAmount(left.netRevenue);
        case "revenue-low": return getAmount(left.netRevenue) - getAmount(right.netRevenue);
        case "units-high": return right.unitsSold - left.unitsSold;
        case "product": return left.variant.template.name.localeCompare(right.variant.template.name, "vi");
        case "date-newest":
        default: return right.metricDate.localeCompare(left.metricDate) || left.variant.sku.localeCompare(right.variant.sku, "vi");
      }
    });
  }, [readyData?.pos.metrics, filter, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredPos.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedPos = filteredPos.slice((safePage - 1) * pageSize, safePage * pageSize);

  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const changeDateRange = (kind: "from" | "to", value: string) => {
    if (kind === "from") setFrom(value);
    else setTo(value);
    setReadyData(null);
    setDetail(null);
  };

  return (
    <AppLayout>
      <main className="bd-page">
        <header className="bd-hero">
          <div className="bd-hero-copy">
            <span className="bd-eyebrow"><BarChart3 size={15} /> NỀN DỮ LIỆU CHO AI · BÁN HÀNG TẠI CỬA HÀNG</span>
            <h1>Dữ liệu kinh doanh</h1>
            <p>Tổng hợp và tra cứu dữ liệu bán hàng POS theo sản phẩm/ngày: doanh thu, giá vốn, số lượng bán và đổi trả. Đây là nguồn dữ liệu chính cho các chức năng AI.</p>
          </div>
          <div className="bd-range-panel">
            <span className="bd-range-title"><CalendarDays size={16} /> Khoảng thời gian phân tích</span>
            <div className="bd-range-fields">
              <FilterField label="Từ ngày"><input disabled={action.busy} onChange={(event) => changeDateRange("from", event.target.value)} type="date" value={from} /></FilterField>
              <FilterField label="Đến ngày"><input disabled={action.busy} onChange={(event) => changeDateRange("to", event.target.value)} type="date" value={to} /></FilterField>
            </div>
            <div className="bd-range-actions">
              {(canManage || canRead) && (
                <Button
                  disabled={action.busy}
                  onClick={() => void updateBusinessData()}
                  type="button"
                  variant={canManage ? "default" : "outline"}
                >
                  {canManage && <ArrowDownWideNarrow size={16} />}
                  {action.busy
                    ? canManage ? "Đang cập nhật dữ liệu…" : "Đang tải dữ liệu…"
                    : canManage && canRead
                      ? "Cập nhật & xem dữ liệu"
                      : canManage
                        ? "Tổng hợp POS"
                        : "Tải dữ liệu kinh doanh"}
                </Button>
              )}
            </div>
            {canManage && canRead && <small className="bd-range-caption">Thao tác sẽ tổng hợp lại dữ liệu POS trong kỳ rồi tải để xem.</small>}
            {readyData && <small className="bd-range-caption">Đang xem {readyData.range.from} – {readyData.range.to} ({readyData.range.dayCount} ngày)</small>}
          </div>
        </header>

        <ErrorBox error={action.error} />
        {message && <div role="status" className={`bd-notice ${hasDataWarning ? "warning" : "success"}`}>{message}</div>}

        <section className="bd-data-workspace">
          <div className="bd-workspace-heading">
            <div><span className="bd-eyebrow">KHÔNG GIAN PHÂN TÍCH</span><h2>Bán hàng tại cửa hàng (POS)</h2><p>Tìm kiếm, lọc và xem chi tiết dữ liệu đã tổng hợp.</p></div>
            {readyData && <span className="bd-badge neutral">{readyData.range.from} – {readyData.range.to}</span>}
          </div>

          {!readyData && (
            <div className="bd-empty-state"><span><Boxes size={22} /></span><h3>Chưa tải dữ liệu phân tích</h3><p>Chọn kỳ cần xem ở trên rồi bấm nút cập nhật hoặc tải dữ liệu.</p></div>
          )}

          {readyData && (
            <div className="bd-section-panel">
              <div className="bd-channel-heading">
                <div className="bd-channel-icon pos"><Store size={20} /></div>
                <div><h3>Bán hàng tại cửa hàng (POS)</h3><p>Doanh số được ghi theo ngày bán; hàng hoàn được ghi theo ngày trả. Số đơn trong mỗi dòng là số đơn có sản phẩm đó, không cộng các dòng để tính số đơn duy nhất.</p></div>
              </div>
              <div className="bd-summary-grid">
                <SummaryCard icon={Boxes} label="Dòng sản phẩm/ngày" value={readyData.pos.metrics.length.toLocaleString("vi-VN")} detail="Sau khi lọc theo kỳ đã chọn" />
                <SummaryCard icon={ShoppingBag} label="Tổng số lượng bán" value={readyData.pos.metrics.reduce((sum, row) => sum + row.unitsSold, 0).toLocaleString("vi-VN")} detail="Không trừ số lượng trả" />
                <SummaryCard icon={CircleDollarSign} label="Doanh thu thuần" value={money(readyData.pos.metrics.reduce((sum, row) => sum + getAmount(row.netRevenue), 0))} detail="Đã trừ giảm giá và hoàn tiền" />
                <SummaryCard icon={BarChart3} label="Giá vốn thuần" value={money(readyData.pos.metrics.reduce((sum, row) => sum + getAmount(row.netCogs), 0))} detail="Đã tính lại hàng hoàn hợp lệ" />
              </div>
              <div className="bd-filters">
                <label className="bd-search"><Search size={17} /><input onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm tên sản phẩm, SKU hoặc ngày…" value={search} /></label>
                <FilterField label="Tình trạng"><select onChange={(event) => { setFilter(event.target.value as PosFilter); setPage(1); }} value={filter}><option value="ALL">Tất cả dòng</option><option value="SOLD">Có phát sinh bán</option><option value="RETURNED">Có phát sinh trả</option><option value="PROFIT">Doanh thu thuần dương</option><option value="LOSS">Doanh thu thuần âm</option></select></FilterField>
                <FilterField label="Sắp xếp theo"><select onChange={(event) => { setSort(event.target.value); setPage(1); }} value={sort}><option value="date-newest">Ngày mới nhất</option><option value="date-oldest">Ngày cũ nhất</option><option value="revenue-high">Doanh thu cao nhất</option><option value="revenue-low">Doanh thu thấp nhất</option><option value="units-high">Số lượng bán nhiều nhất</option><option value="product">Tên sản phẩm A–Z</option></select></FilterField>
                <PaginationSize onChange={changePageSize} value={pageSize} />
              </div>
              {pagedPos.length ? (
                <>
                  <div className="bd-table-wrap"><table className="bd-table">
                    <thead><tr><th>Ngày ghi nhận</th><th>Sản phẩm</th><th>SKU</th><th>Đơn hàng</th><th>Đã bán</th><th>Đã trả</th><th>Doanh thu gộp</th><th>Giảm giá</th><th>Hoàn tiền</th><th>Doanh thu thuần</th><th>Giá vốn thuần</th><th></th></tr></thead>
                    <tbody>{pagedPos.map((row) => (
                      <tr key={`${row.metricDate}-${row.variant.id}`} onClick={() => setDetail(row)}>
                        <td>{displayDate(row.metricDate)}</td><td className="bd-primary-cell">{row.variant.template.name}</td><td>{row.variant.sku}</td><td>{row.orderCount}</td><td>{row.unitsSold}</td><td>{row.unitsReturned}</td><td>{money(row.grossSales)}</td><td>{money(row.discountAmount)}</td><td>{money(row.refundAmount)}</td><td className="bd-emphasis-cell">{money(row.netRevenue)}</td><td>{money(row.netCogs)}</td><td><button aria-label={`Chi tiết ${row.variant.template.name}`} className="bd-row-detail" onClick={(event) => { event.stopPropagation(); setDetail(row); }} type="button">Chi tiết</button></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                  <div className="bd-pagination"><Pagination page={safePage} total={filteredPos.length} totalPages={pageCount} onPageChange={setPage} /></div>
                </>
              ) : <div className="bd-empty-state compact"><h3>Không tìm thấy dữ liệu POS phù hợp</h3><p>{readyData.pos.metrics.length ? "Thử đổi từ khóa hoặc bộ lọc." : "Chưa có chỉ số trong khoảng ngày này. Nếu có giao dịch, hãy chạy “Tổng hợp POS”."}</p></div>}
            </div>
          )}
        </section>
      </main>

      <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title="Chi tiết chỉ số POS">
        {detail && (
          <div className="bd-modal-content">
            <div className="bd-modal-intro"><span className="bd-channel-icon pos"><Store size={20} /></span><div><h3>{detail.variant.template.name}</h3><p>SKU {detail.variant.sku} · Ngày ghi nhận {displayDate(detail.metricDate)}</p></div></div>
            <div className="bd-detail-grid">
              <DetailLine label="Số đơn hàng" value={detail.orderCount} />
              <DetailLine label="Số lượng bán" value={`${detail.unitsSold} ${detail.variant.template.unitOfMeasure}`} />
              <DetailLine label="Số lượng trả" value={`${detail.unitsReturned} ${detail.variant.template.unitOfMeasure}`} />
              <DetailLine label="Doanh thu gộp" value={getAmount(detail.grossSales)} amount />
              <DetailLine label="Giảm giá" value={getAmount(detail.discountAmount)} amount />
              <DetailLine label="Tiền hoàn trả" value={getAmount(detail.refundAmount)} amount />
              <DetailLine label="Doanh thu thuần" value={getAmount(detail.netRevenue)} amount />
              <DetailLine label="Giá vốn thuần" value={getAmount(detail.netCogs)} amount />
            </div>
            <p className="bd-modal-note">Ngày trả hàng được ghi nhận riêng với ngày bán. Giá vốn được hoàn lại khi sản phẩm trả về trạng thái có thể nhập kho và có liên kết hợp lệ với đơn gốc.</p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
