import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FileSpreadsheet,
  History,
  Info,
  Search,
  ShoppingBag,
} from "lucide-react";

import {
  shopeeReportsApi,
  type ShopeeFinancialRecords,
  type ShopeeImportBatch,
  type ShopeePreview,
} from "@/api/shopee-reports";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/use-permissions";
import { DetailLine, FilterField, PaginationSize, SummaryCard, defaultFrom, displayDate } from "@/pages/business-data/shared";
import { date, ErrorBox, money, useAction, useLoad, today } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";
import "@/pages/online-reports/shopee-reports.css";

type ShopeeRecord = ShopeeFinancialRecords["financialRecords"][number];
type Section = "RECORDS" | "IMPORTS";
type Detail = { kind: "RECORD"; value: ShopeeRecord } | { kind: "IMPORT"; value: ShopeeImportBatch };
type ShopeeRecordType = "ALL" | "ORDER" | "SKU" | "ADJUSTMENT" | "SERVICE_FEE" | "SHIPPING_DISCREPANCY";
type ShopeeSort = "date-newest" | "date-oldest" | "order" | "type";

const REPORT_LABELS: Record<keyof ShopeePreview["counts"], string> = {
  ORDER: "Đơn hàng có dữ liệu tài chính",
  SKU: "Dòng sản phẩm/SKU",
  ADJUSTMENT: "Khoản điều chỉnh",
  SERVICE_FEE: "Chi tiết phí dịch vụ",
  SHIPPING_DISCREPANCY: "Khoản đối soát vận chuyển",
};

const FINANCE_LABELS: Record<string, string> = {
  totalGoodsAmount: "Tổng hàng hóa",
  originalPrice: "Giá gốc",
  sellerProductSubsidy: "Shop trợ giá sản phẩm",
  totalShipping: "Tổng vận chuyển",
  totalSurcharge: "Phụ phí",
  totalRevenue: "Tổng doanh thu",
  totalExpenses: "Tổng chi phí",
  totalAmount: "Tổng số tiền",
  sellerReceivedAmount: "Tổng tiền quyết toán cho người bán",
  productGrossAmount: "Tổng tiền sản phẩm",
  productPrice: "Giá sản phẩm",
  refundAmount: "Số tiền hoàn lại",
  buyerShippingPaid: "Phí vận chuyển người mua trả",
  actualShippingFee: "Phí vận chuyển thực tế",
  platformShippingSubsidy: "Trợ giá vận chuyển từ Shopee",
  returnShippingFee: "Phí vận chuyển trả hàng",
  pishipShippingRefund: "Phí vận chuyển được PiShip hoàn",
  failedDeliveryReturnShippingFee: "Phí vận chuyển đơn giao không thành công",
  platformProductSubsidy: "Trợ giá sản phẩm từ Shopee",
  sellerVoucherDiscount: "Mã ưu đãi do người bán chịu",
  sellerCoFundedVoucherDiscount: "Mã ưu đãi đồng tài trợ do người bán chịu",
  sellerCoinDiscount: "Mã hoàn xu do người bán chịu",
  sellerCoFundedCoinDiscount: "Mã hoàn xu đồng tài trợ do người bán chịu",
  fixedPlatformFee: "Phí cố định của sàn",
  serviceFee: "Phí dịch vụ",
  transactionFee: "Phí xử lý giao dịch",
  affiliateFee: "Phí hoa hồng tiếp thị liên kết",
  pishipServiceFee: "Phí dịch vụ PiShip",
  automaticTopUp: "Khoản nạp tự động từ doanh thu",
  vat: "Thuế giá trị gia tăng",
  personalIncomeTax: "Thuế thu nhập cá nhân",
  buyerInstallationFee: "Phí lắp đặt người mua trả",
  actualInstallationFee: "Phí lắp đặt thực tế",
  sellerTradeInBonus: "Thưởng đổi cũ do người bán tài trợ",
  sellerShippingSupport: "Phí vận chuyển người bán hỗ trợ",
  lostParcelCompensation: "Tiền bồi thường thất lạc hàng",
  adjustmentAmount: "Số tiền điều chỉnh",
  voucherPackageFee: "Phí gói Voucher Xtra",
  livePackageFee: "Phí gói dịch vụ Livestream",
  experiencePackageFee: "Phí gói trải nghiệm",
  shippingPromotionPackageFee: "Phí gói ưu đãi vận chuyển",
  productPaidAfterPromotion: "Giá sản phẩm sau khuyến mãi",
  shopeeCoinDiscount: "Giảm giá bằng Shopee Xu",
  shopeeVoucherDiscount: "Ưu đãi do Shopee tài trợ",
  bankPromotionDiscount: "Ưu đãi ngân hàng",
  shopeeBankPromotionDiscount: "Ưu đãi thanh toán thẻ do Shopee tài trợ",
};

const RECORD_LABELS: Record<ShopeeRecordType, string> = {
  ALL: "Tất cả loại dữ liệu",
  ORDER: "Đơn hàng (tài chính)",
  SKU: "Sản phẩm/SKU",
  ADJUSTMENT: "Điều chỉnh",
  SERVICE_FEE: "Phí dịch vụ bổ sung",
  SHIPPING_DISCREPANCY: "Đối soát vận chuyển",
};

const financeLabel = (key: string) => FINANCE_LABELS[key] ?? key;
const recordLabel = (type: string) => RECORD_LABELS[type as ShopeeRecordType] ?? type;

export function ShopeeReportsPage() {
  const { can } = usePermissions();
  const canRead = can("analytics.read") && can("finance.read");
  const canImport = can("business_data.manage") && can("finance.read");
  const imports = useLoad<ShopeeImportBatch[]>(() => canRead ? shopeeReportsApi.listImports() : Promise.resolve([]), [canRead]);
  const action = useAction();
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [preview, setPreview] = useState<ShopeePreview | null>(null);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [records, setRecords] = useState<ShopeeFinancialRecords | null>(null);
  const [message, setMessage] = useState("");
  const [section, setSection] = useState<Section>("RECORDS");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [recordsPage, setRecordsPage] = useState(1);
  const [importsPage, setImportsPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ShopeeRecordType>("ALL");
  const [quality, setQuality] = useState<"ALL" | "QUARANTINED" | "OLDER">("ALL");
  const [sort, setSort] = useState<ShopeeSort>("date-newest");
  const [importsSearch, setImportsSearch] = useState("");
  const [importsFilter, setImportsFilter] = useState<"ALL" | "IMPORTED" | "DUPLICATES">("ALL");
  const [importsSort, setImportsSort] = useState<"newest" | "oldest" | "period">("newest");

  const loadRecords = async () => {
    setRecords(await shopeeReportsApi.records(from, to));
    setRecordsPage(1);
  };

  const runPreview = () => action.run(async () => {
    if (!file) throw new Error("Vui lòng chọn file báo cáo .xlsx.");
    setMessage("");
    setPreview(null);
    setPreview(await shopeeReportsApi.preview(file));
  });

  const importReport = () => action.run(async () => {
    if (!file || !preview || preview.alreadyImported) return;
    const result = await shopeeReportsApi.import(file);
    const summary = `Đã nhập ${result.importedRowCount} dòng mới; bỏ qua ${result.skippedDuplicateRows} dòng trùng.`;
    setPreview(null);
    setFile(null);
    setFileInputKey((key) => key + 1);
    setDetail(null);
    imports.reload();
    if (records && canRead) {
      setRecords(null);
      await loadRecords();
      setMessage(`${summary} Dữ liệu đã được tải lại.`);
    } else {
      setMessage(summary);
    }
  });

  const viewRecords = () => action.run(async () => {
    setMessage("");
    await loadRecords();
  });

  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("vi");
    const values = (records?.financialRecords ?? []).filter((row) => {
      const searchable = `${row.externalOrderId ?? ""} ${row.externalProductId ?? ""} ${row.productName ?? ""} ${row.sourceSheet} ${row.recordType} ${row.batch.id}`.toLocaleLowerCase("vi");
      return (!needle || searchable.includes(needle))
        && (typeFilter === "ALL" || row.recordType === typeFilter)
        && (quality === "ALL"
          || (quality === "QUARANTINED" && !!row.unmappedFinancialData && Object.keys(row.unmappedFinancialData).length > 0)
          || (quality === "OLDER" && (row.batch.mappingVersion === null || row.batch.mappingVersion < (records?.currentMappingVersion ?? 0))));
    });
    return values.sort((left, right) => {
      const leftDate = left.transactionDate ?? left.settlementDate ?? "";
      const rightDate = right.transactionDate ?? right.settlementDate ?? "";
      switch (sort) {
        case "date-oldest": return leftDate.localeCompare(rightDate);
        case "order": return (left.externalOrderId ?? "").localeCompare(right.externalOrderId ?? "");
        case "type": return left.recordType.localeCompare(right.recordType);
        case "date-newest":
        default: return rightDate.localeCompare(leftDate);
      }
    });
  }, [records, typeFilter, quality, search, sort]);

  const filteredImports = useMemo(() => {
    const needle = importsSearch.trim().toLocaleLowerCase("vi");
    const values = (imports.data ?? []).filter((batch) => {
      const period = `${batch.reportFrom ?? ""} ${batch.reportTo ?? ""} ${batch.createdAt} ${date(batch.createdAt)} ${batch.id}`.toLocaleLowerCase("vi");
      const hasNewRows = batch.importedRowCount > 0;
      return (!needle || period.includes(needle))
        && (importsFilter === "ALL" || (importsFilter === "IMPORTED" && hasNewRows) || (importsFilter === "DUPLICATES" && !hasNewRows));
    });
    return values.sort((left, right) => {
      if (importsSort === "oldest") return left.createdAt.localeCompare(right.createdAt);
      if (importsSort === "period") return (right.reportFrom ?? "").localeCompare(left.reportFrom ?? "");
      return right.createdAt.localeCompare(left.createdAt);
    });
  }, [imports.data, importsFilter, importsSearch, importsSort]);

  const recordsPageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safeRecordsPage = Math.min(recordsPage, recordsPageCount);
  const importsPageCount = Math.max(1, Math.ceil(filteredImports.length / pageSize));
  const safeImportsPage = Math.min(importsPage, importsPageCount);
  const pagedRecords = filteredRecords.slice((safeRecordsPage - 1) * pageSize, safeRecordsPage * pageSize);
  const pagedImports = filteredImports.slice((safeImportsPage - 1) * pageSize, safeImportsPage * pageSize);

  const changePageSize = (value: number) => {
    setPageSize(value);
    setRecordsPage(1);
    setImportsPage(1);
  };

  const changeDateRange = (kind: "from" | "to", value: string) => {
    if (kind === "from") setFrom(value);
    else setTo(value);
    setRecords(null);
    setDetail(null);
  };

  const sectionTabs: Array<{ id: Section; label: string; description: string; icon: typeof ShoppingBag; count: number | null }> = [
    { id: "RECORDS", label: "Dữ liệu tài chính", description: "Dòng đã nhập trong kỳ", icon: ShoppingBag, count: records?.financialRecords.length ?? null },
    { id: "IMPORTS", label: "Lịch sử nhập", description: "Các báo cáo đã nạp", icon: History, count: imports.data?.length ?? null },
  ];

  const hasOlderMapping = records?.financialRecords.some((row) => row.batch.mappingVersion === null || row.batch.mappingVersion < records.currentMappingVersion);

  return (
    <AppLayout>
      <main className="bd-page">
        <header className="bd-hero">
          <div className="bd-hero-copy">
            <span className="bd-eyebrow"><FileSpreadsheet size={15} /> BÁO CÁO BỔ SUNG · CHỨC NĂNG PHỤ</span>
            <h1>Báo cáo doanh thu Shopee</h1>
            <p>Nhập báo cáo doanh thu Shopee để xem và đối soát tài chính. Đây không phải chức năng cốt lõi của hệ thống quản lý cửa hàng.</p>
          </div>
          <div className="bd-range-panel">
            <span className="bd-range-title"><CalendarDays size={16} /> Khoảng thời gian xem</span>
            <div className="bd-range-fields">
              <FilterField label="Từ ngày"><input disabled={action.busy} onChange={(event) => changeDateRange("from", event.target.value)} type="date" value={from} /></FilterField>
              <FilterField label="Đến ngày"><input disabled={action.busy} onChange={(event) => changeDateRange("to", event.target.value)} type="date" value={to} /></FilterField>
            </div>
            {canRead && (
              <div className="bd-range-actions">
                <Button disabled={action.busy} onClick={() => void viewRecords()} type="button" variant="outline">
                  {action.busy ? "Đang tải dữ liệu…" : "Xem dữ liệu Shopee"}
                </Button>
              </div>
            )}
            {records && <small className="bd-range-caption">Đang xem {records.range.from} – {records.range.to} ({records.range.dayCount} ngày)</small>}
          </div>
        </header>

        <div className="bd-callout">
          <Info size={15} /> <strong>Phạm vi:</strong> chức năng này chỉ lưu và hiển thị số liệu tài chính từ báo cáo Shopee. Hệ thống <strong>không</strong> đồng bộ đơn hàng, không trừ tồn kho, không có số lượng bán theo SKU đáng tin cậy và không dùng cho dự báo nhu cầu. Nếu cửa hàng dùng chung kho cho POS và Shopee, tồn kho trong hệ thống có thể chưa phản ánh hàng đã bán trên Shopee; cần kiểm kê và điều chỉnh thủ công.
        </div>

        <ErrorBox error={action.error || imports.error} />
        {message && <div role="status" className="bd-notice success">{message}</div>}

        {canImport && (
          <section className="bd-import-card">
            <div className="bd-import-heading">
              <span className="bd-import-icon"><FileSpreadsheet size={20} /></span>
              <div><h2>Nhập báo cáo doanh thu Shopee</h2><p>Tải file XLSX, kiểm tra cách hệ thống phân loại dữ liệu rồi xác nhận nhập.</p></div>
            </div>
            <div className="bd-upload-row">
              <FilterField label="Chọn file báo cáo .xlsx">
                <input
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={action.busy}
                  key={fileInputKey}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setPreview(null);
                  }}
                  type="file"
                />
              </FilterField>
              {file && <span className="bd-file-name">{file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB</span>}
              <Button disabled={!file || action.busy} onClick={() => void runPreview()} type="button" variant="outline">
                {action.busy ? "Đang phân tích…" : "Xem trước báo cáo"}
              </Button>
            </div>
            {preview && (
              <div className="bd-preview">
                <div className="bd-preview-top">
                  <div><span className="bd-eyebrow">BÁO CÁO SHOPEE</span><h3>Xem trước dữ liệu sẽ nhập</h3><p>Kỳ báo cáo {preview.reportFrom ?? "—"} – {preview.reportTo ?? "—"} · {preview.sourceRowCount} dòng nguồn</p></div>
                  {preview.alreadyImported && <span className="bd-badge warning">File này đã được nhập</span>}
                </div>
                <div className="bd-preview-counts">
                  {(Object.keys(REPORT_LABELS) as Array<keyof ShopeePreview["counts"]>).map((type) => (
                    <div className="bd-preview-count" key={type}><span>{REPORT_LABELS[type]}</span><strong>{preview.counts[type].toLocaleString("vi-VN")}</strong></div>
                  ))}
                </div>
                {Object.keys(preview.summaryFinancialData).length > 0 && (
                  <div className="bd-finance-preview">
                    <div className="bd-section-heading"><div><h3>Thống kê thu nhập từ trang Tổng quát</h3><p>Các khoản này được đọc riêng từ Summary, không trộn với tổng dòng Order.</p></div><span className="bd-badge neutral">{Object.keys(preview.summaryFinancialData).length} khoản</span></div>
                    <div className="bd-finance-grid">
                      {Object.entries(preview.summaryFinancialData).map(([key, value]) => (
                        <div className="bd-finance-item" key={key}><span>{financeLabel(key)}</span><strong className={value < 0 ? "bd-negative" : ""}>{money(value)}</strong></div>
                      ))}
                    </div>
                    {preview.reconciliations.length > 0 && (
                      <div className="bd-table-wrap">
                        <table className="bd-table">
                          <thead><tr><th>Khoản đối chiếu</th><th>Summary</th><th>Tổng dòng Order</th><th>Kết quả</th></tr></thead>
                          <tbody>{preview.reconciliations.map((check) => (
                            <tr key={check.summaryField}>
                              <td className="bd-primary-cell">{financeLabel(check.summaryField)}</td>
                              <td>{money(check.summaryAmount)}</td>
                              <td>{money(check.incomeAmount)}</td>
                              <td><span className={`bd-badge ${check.matches ? "success" : "warning"}`}>{check.matches ? "Khớp" : `Lệch ${money(check.difference)}`}</span></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                <div className="bd-finance-preview">
                  <div className="bd-section-heading"><div><h3>Tổng hợp tài chính đã ánh xạ từ dòng đơn hàng</h3><p>Chỉ dòng Order được cộng vào tổng này; dòng SKU không cộng lại.</p></div><span className="bd-badge neutral">{Object.keys(preview.financeTotals).length} chỉ số · mapping v{preview.mappingVersion}</span></div>
                  {Object.keys(preview.financeTotals).length ? (
                    <div className="bd-finance-grid">
                      {Object.entries(preview.financeTotals).map(([key, value]) => (
                        <div className="bd-finance-item" key={key}><span>{financeLabel(key)}</span><strong className={value < 0 ? "bd-negative" : ""}>{money(value)}</strong></div>
                      ))}
                    </div>
                  ) : <p className="bd-empty-inline">Không có số liệu tài chính dạng số trong báo cáo này.</p>}
                </div>
                {preview.unmappedFields.length > 0 && (
                  <div className="bd-quarantine">
                    <div className="bd-section-heading">
                      <div><h3>Các trường số chưa ánh xạ — đang cách ly</h3><p>Các giá trị này được giữ riêng theo tên cột nguồn; chưa cộng vào tổng chuẩn.</p></div>
                      <span className="bd-badge warning">{preview.unmappedFields.length} nhãn cần xem</span>
                    </div>
                    <div className="bd-table-wrap">
                      <table className="bd-table">
                        <thead><tr><th>Tên cột trong file</th><th>Sheet nguồn</th><th>Số dòng có dữ liệu</th><th>Trạng thái</th></tr></thead>
                        <tbody>{preview.unmappedFields.map((field) => (
                          <tr key={`${field.sourceSheet}-${field.header}`}>
                            <td className="bd-primary-cell">{field.header}</td><td>{field.sourceSheet}</td><td>{field.occurrences}</td><td><span className="bd-badge warning">Chưa ánh xạ</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="bd-preview-foot">
                  <ul>{preview.notes.map((note) => <li key={note}>{note}</li>)}</ul>
                  <Button disabled={action.busy || preview.alreadyImported} onClick={() => void importReport()} type="button">
                    {action.busy ? "Đang nhập…" : "Xác nhận nhập báo cáo"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="bd-data-workspace">
          <div className="bd-workspace-heading">
            <div><span className="bd-eyebrow">BÁO CÁO ĐÃ NHẬP</span><h2>Dữ liệu Shopee</h2><p>Tìm kiếm, lọc và xem chi tiết các dòng đã nhập từ báo cáo Shopee.</p></div>
            {records && <span className="bd-badge neutral">{records.range.from} – {records.range.to}</span>}
          </div>
          <nav aria-label="Phân loại dữ liệu Shopee" className="bd-tabs bd-tabs-two">
            {sectionTabs.map(({ id, label, description, icon: Icon, count }) => (
              <button aria-current={section === id ? "page" : undefined} className={`bd-tab${section === id ? " active" : ""}`} key={id} onClick={() => setSection(id)} type="button">
                <span className="bd-tab-icon"><Icon size={18} /></span>
                <span className="bd-tab-copy"><strong>{label}</strong><small>{description}</small></span>
                {count !== null && <span className="bd-tab-count">{count.toLocaleString("vi-VN")}</span>}
                <ChevronRight className="bd-tab-arrow" size={16} />
              </button>
            ))}
          </nav>

          {!canRead && <div className="bd-empty-state compact"><h3>Bạn chưa có quyền xem dữ liệu tài chính</h3><p>Cần quyền xem phân tích và tài chính của doanh nghiệp.</p></div>}

          {canRead && section === "RECORDS" && !records && (
            <div className="bd-empty-state"><span><Boxes size={22} /></span><h3>Chưa tải dữ liệu Shopee</h3><p>Chọn kỳ cần xem ở trên rồi bấm “Xem dữ liệu Shopee”.</p></div>
          )}

          {canRead && section === "RECORDS" && records && (
            <div className="bd-section-panel">
              <div className="bd-channel-heading">
                <div className="bd-channel-icon shopee"><ShoppingBag size={20} /></div>
                <div><h3>Báo cáo tài chính Shopee</h3><p>Dòng đơn hàng được dùng cho tài chính; các dòng SKU, phí và điều chỉnh được giữ riêng để đối soát.</p></div>
              </div>
              <div className="bd-callout">Dòng được chọn khi ngày giao dịch hoặc ngày thanh toán thuộc kỳ. Dòng thiếu cả hai ngày được chọn theo kỳ của báo cáo; vì vậy dữ liệu này không phải tổng quyết toán theo ngày thanh toán.</div>
              {records.recordsTruncated && <div className="bd-callout"><strong>Dữ liệu chưa đầy đủ:</strong> chỉ tải {records.recordLimit.toLocaleString("vi-VN")} dòng đầu tiên. Thẻ thống kê, tìm kiếm và bộ lọc chỉ áp dụng cho các dòng đã tải; hãy thu hẹp khoảng ngày.</div>}
              {hasOlderMapping && (
                <div className="bd-callout"><strong>Có dữ liệu từ danh mục ánh xạ cũ hoặc không rõ phiên bản.</strong> Các lần nhập trước không tự cập nhật theo danh mục v{records.currentMappingVersion}; xem chi tiết dòng và lịch sử nhập để kiểm tra nguồn.</div>
              )}
              {records.quarantinedFinancialRecords > 0 && (
                <div className="bd-callout"><strong>Dữ liệu chưa ánh xạ đang được cách ly:</strong> {records.quarantinedFinancialRecords.toLocaleString("vi-VN")} dòng có trường số chưa thuộc danh mục chuẩn. Chúng không được tính vào tài chính đã ánh xạ.</div>
              )}
              <div className="bd-summary-grid">
                <SummaryCard icon={CircleDollarSign} label="Dòng đơn hàng" value={records.financialRecords.filter((row) => row.recordType === "ORDER").length.toLocaleString("vi-VN")} detail="Nguồn số liệu tài chính" />
                <SummaryCard icon={Boxes} label="Dòng sản phẩm/SKU" value={records.financialRecords.filter((row) => row.recordType === "SKU").length.toLocaleString("vi-VN")} detail="Không cộng vào tổng doanh thu" />
                <SummaryCard icon={ArrowUpDown} label="Điều chỉnh" value={records.financialRecords.filter((row) => row.recordType === "ADJUSTMENT").length.toLocaleString("vi-VN")} detail="Theo ngày hoàn thành điều chỉnh" />
                <SummaryCard icon={History} label="Lần nhập báo cáo" value={records.batches.length.toLocaleString("vi-VN")} detail="Kỳ giao với ngày đã chọn, tối đa 50" />
              </div>
              <div className="bd-filters">
                <label className="bd-search"><Search size={17} /><input onChange={(event) => { setSearch(event.target.value); setRecordsPage(1); }} placeholder="Tìm mã đơn, sản phẩm, sheet hoặc lần nhập…" value={search} /></label>
                <FilterField label="Loại dữ liệu"><select onChange={(event) => { setTypeFilter(event.target.value as ShopeeRecordType); setRecordsPage(1); }} value={typeFilter}>{Object.entries(RECORD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FilterField>
                <FilterField label="Chất lượng dữ liệu"><select onChange={(event) => { setQuality(event.target.value as typeof quality); setRecordsPage(1); }} value={quality}><option value="ALL">Tất cả</option><option value="QUARANTINED">Có trường cách ly</option><option value="OLDER">Ánh xạ cũ hoặc không rõ</option></select></FilterField>
                <FilterField label="Sắp xếp theo"><select onChange={(event) => { setSort(event.target.value as ShopeeSort); setRecordsPage(1); }} value={sort}><option value="date-newest">Ngày mới nhất</option><option value="date-oldest">Ngày cũ nhất</option><option value="order">Mã đơn A–Z</option><option value="type">Loại dữ liệu</option></select></FilterField>
                <PaginationSize onChange={changePageSize} value={pageSize} />
              </div>
              {pagedRecords.length ? (
                <>
                  <div className="bd-table-wrap"><table className="bd-table">
                    <thead><tr><th>Loại dữ liệu</th><th>Mã đơn hàng</th><th>Mã sản phẩm</th><th>Tên sản phẩm</th><th>Ngày giao dịch</th><th>Ngày thanh toán</th><th>Khoản tài chính chính</th><th>Sheet nguồn</th><th></th></tr></thead>
                    <tbody>{pagedRecords.map((row) => {
                      const mainAmount = row.financialData
                        ? row.financialData.sellerReceivedAmount ?? row.financialData.adjustmentAmount ?? row.financialData.actualShippingFee ?? row.financialData.voucherPackageFee
                        : undefined;
                      return (
                        <tr key={row.id} onClick={() => setDetail({ kind: "RECORD", value: row })}>
                          <td><span className={`bd-badge ${row.recordType.toLocaleLowerCase("en-US")}`}>{recordLabel(row.recordType)}</span>{row.unmappedFinancialData && Object.keys(row.unmappedFinancialData).length > 0 && <span className="bd-badge warning">Chưa ánh xạ</span>}</td>
                          <td className="bd-primary-cell">{row.externalOrderId ?? "—"}</td><td>{row.externalProductId ?? "—"}</td><td className="bd-product-name">{row.productName ?? "—"}</td>
                          <td>{displayDate(row.transactionDate)}</td><td>{displayDate(row.settlementDate)}</td>
                          <td className="bd-emphasis-cell">{mainAmount === undefined ? "—" : money(Number(mainAmount))}</td><td>{row.sourceSheet}</td>
                          <td><button aria-label={`Chi tiết ${row.externalOrderId ?? "báo cáo"}`} className="bd-row-detail" onClick={(event) => { event.stopPropagation(); setDetail({ kind: "RECORD", value: row }); }} type="button">Chi tiết</button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table></div>
                  <div className="bd-pagination"><Pagination page={safeRecordsPage} total={filteredRecords.length} totalPages={recordsPageCount} onPageChange={setRecordsPage} /></div>
                </>
              ) : <div className="bd-empty-state compact"><h3>Không tìm thấy dòng Shopee phù hợp</h3><p>{records.financialRecords.length ? "Thử đổi từ khóa hoặc loại dữ liệu." : "Không có báo cáo Shopee nào trong kỳ đang chọn. Kiểm tra ngày báo cáo hoặc xem lịch sử nhập."}</p></div>}
            </div>
          )}

          {canRead && section === "IMPORTS" && (
            <div className="bd-section-panel">
              <div className="bd-channel-heading">
                <div className="bd-channel-icon imports"><History size={20} /></div>
                <div><h3>Lịch sử nhập báo cáo</h3><p>Hiển thị tối đa 50 lần nhập gần nhất; tìm kiếm và bộ lọc chỉ áp dụng trong danh sách này.</p></div>
              </div>
              <div className="bd-filters">
                <label className="bd-search"><Search size={17} /><input onChange={(event) => { setImportsSearch(event.target.value); setImportsPage(1); }} placeholder="Tìm theo ngày, kỳ báo cáo hoặc mã lần nhập…" value={importsSearch} /></label>
                <FilterField label="Kết quả nhập"><select onChange={(event) => { setImportsFilter(event.target.value as typeof importsFilter); setImportsPage(1); }} value={importsFilter}><option value="ALL">Tất cả lần nhập</option><option value="IMPORTED">Có dòng mới</option><option value="DUPLICATES">Chỉ bỏ qua dòng trùng</option></select></FilterField>
                <FilterField label="Sắp xếp theo"><select onChange={(event) => { setImportsSort(event.target.value as typeof importsSort); setImportsPage(1); }} value={importsSort}><option value="newest">Vừa nhập gần đây</option><option value="oldest">Nhập từ lâu nhất</option><option value="period">Kỳ báo cáo mới nhất</option></select></FilterField>
                <PaginationSize onChange={changePageSize} value={pageSize} />
              </div>
              {imports.loading ? <div className="bd-empty-state compact"><p>Đang tải lịch sử nhập…</p></div> : pagedImports.length ? (
                <>
                  <div className="bd-table-wrap"><table className="bd-table">
                    <thead><tr><th>Kỳ báo cáo</th><th>Dòng đọc được</th><th>Dòng nhập mới</th><th>Ánh xạ</th><th>Loại dữ liệu</th><th>Thời điểm nhập</th><th></th></tr></thead>
                    <tbody>{pagedImports.map((batch) => (
                      <tr key={batch.id} onClick={() => setDetail({ kind: "IMPORT", value: batch })}>
                        <td className="bd-primary-cell">{batch.reportFrom ?? "—"} – {batch.reportTo ?? "—"}</td>
                        <td>{batch.sourceRowCount.toLocaleString("vi-VN")}</td><td>{batch.importedRowCount.toLocaleString("vi-VN")}</td>
                        <td><span className={`bd-badge ${!batch.summary?.mappingVersion || (batch.currentMappingVersion !== undefined && batch.summary.mappingVersion < batch.currentMappingVersion) ? "warning" : "neutral"}`}>{batch.summary?.mappingVersion ? `v${batch.summary.mappingVersion}` : "Không rõ"}</span></td>
                        <td><span className={`bd-badge ${batch.importedRowCount ? "order" : "neutral"}`}>{batch.importedRowCount ? "Đã nhập dữ liệu mới" : "Không có dòng mới"}</span></td>
                        <td>{date(batch.createdAt)}</td><td><button aria-label="Xem chi tiết lần nhập" className="bd-row-detail" onClick={(event) => { event.stopPropagation(); setDetail({ kind: "IMPORT", value: batch }); }} type="button">Chi tiết</button></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                  <div className="bd-pagination"><Pagination page={safeImportsPage} total={filteredImports.length} totalPages={importsPageCount} onPageChange={setImportsPage} /></div>
                </>
              ) : <div className="bd-empty-state compact"><h3>Không tìm thấy lần nhập phù hợp</h3><p>{imports.data?.length ? "Thử đổi từ khóa hoặc bộ lọc." : "Chưa có báo cáo Shopee nào được nhập."}</p></div>}
            </div>
          )}
        </section>
      </main>

      <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title={detail?.kind === "RECORD" ? "Chi tiết dòng báo cáo Shopee" : "Chi tiết lần nhập báo cáo"}>
        {detail?.kind === "RECORD" && (
          <div className="bd-modal-content">
            <div className="bd-modal-intro"><span className="bd-channel-icon shopee"><ShoppingBag size={20} /></span><div><h3>{recordLabel(detail.value.recordType)}</h3><p>{detail.value.externalOrderId ? `Mã đơn ${detail.value.externalOrderId}` : "Dòng báo cáo tài chính/đối soát"}</p></div></div>
            <div className="bd-detail-grid">
              <DetailLine label="Loại dữ liệu" value={recordLabel(detail.value.recordType)} />
              <DetailLine label="Mã đơn hàng" value={detail.value.externalOrderId ?? "—"} />
              <DetailLine label="Mã sản phẩm" value={detail.value.externalProductId ?? "—"} />
              <DetailLine label="Tên sản phẩm" value={detail.value.productName ?? "—"} />
              <DetailLine label="Ngày giao dịch/điều chỉnh" value={displayDate(detail.value.transactionDate)} />
              <DetailLine label="Ngày thanh toán" value={displayDate(detail.value.settlementDate)} />
              <DetailLine label="Trang tính nguồn" value={detail.value.sourceSheet} />
              <DetailLine label="Dòng trong trang tính" value={detail.value.sourceRow} />
              <DetailLine label="Mã lần nhập" value={detail.value.batch.id} />
              <DetailLine label="Kỳ báo cáo nguồn" value={`${displayDate(detail.value.batch.reportFrom)} – ${displayDate(detail.value.batch.reportTo)}`} />
              <DetailLine label="Phiên bản ánh xạ" value={detail.value.batch.mappingVersion ?? "Không có thông tin"} />
            </div>
            {detail.value.financialData && (
              <div className="bd-modal-finance"><h4>Chi tiết các khoản tiền</h4>
                {Object.entries(detail.value.financialData).map(([key, value]) => (
                  <DetailLine key={key} label={key === "adjustmentType" ? "Loại điều chỉnh" : financeLabel(key)} value={typeof value === "number" ? value : String(value)} amount={typeof value === "number"} />
                ))}
              </div>
            )}
            {detail.value.unmappedFinancialData && Object.keys(detail.value.unmappedFinancialData).length > 0 && (
              <div className="bd-quarantine">
                <div className="bd-section-heading"><div><h4>Trường số chưa ánh xạ</h4><p>Được lưu riêng theo nhãn gốc, không thuộc dữ liệu chuẩn.</p></div><span className="bd-badge warning">Cách ly</span></div>
                {Object.entries(detail.value.unmappedFinancialData).map(([key, value]) => (
                  <DetailLine key={key} label={key} value={value} amount />
                ))}
              </div>
            )}
            {detail.value.recordType === "SKU" && <p className="bd-modal-note">Dòng sản phẩm dùng nhận diện mặt hàng. Không cộng các khoản ở dòng này vào tổng tài chính đơn hàng và mẫu không cung cấp lượng bán đáng tin cậy.</p>}
            {detail.value.recordType !== "ORDER" && detail.value.recordType !== "SKU" && <p className="bd-modal-note">Dòng bổ sung dùng để đối soát riêng; không cộng lại vào doanh thu/phí đã ghi nhận ở dòng đơn hàng.</p>}
          </div>
        )}
        {detail?.kind === "IMPORT" && (
          <div className="bd-modal-content">
            <div className="bd-modal-intro"><span className="bd-channel-icon imports"><History size={20} /></span><div><h3>Nhập báo cáo Shopee</h3><p>Mã lần nhập {detail.value.id}</p></div></div>
            <div className="bd-detail-grid">
              <DetailLine label="Kỳ báo cáo từ" value={displayDate(detail.value.reportFrom)} />
              <DetailLine label="Kỳ báo cáo đến" value={displayDate(detail.value.reportTo)} />
              <DetailLine label="Dòng nguồn đọc được" value={detail.value.sourceRowCount.toLocaleString("vi-VN")} />
              {detail.value.summary?.uniqueRowCount !== undefined && <DetailLine label="Dòng duy nhất trong file" value={detail.value.summary.uniqueRowCount.toLocaleString("vi-VN")} />}
              <DetailLine label="Dòng mới được lưu" value={detail.value.importedRowCount.toLocaleString("vi-VN")} />
              {detail.value.summary?.uniqueRowCount !== undefined && <DetailLine label="Dòng trùng đã bỏ qua" value={(detail.value.summary.uniqueRowCount - detail.value.importedRowCount).toLocaleString("vi-VN")} />}
              <DetailLine label="Thời điểm nhập" value={date(detail.value.createdAt)} />
            </div>
            <p className="bd-modal-note">Các số liệu, số dòng theo loại và đối chiếu bên dưới mô tả toàn bộ file đã phân tích, không chỉ các dòng mới được lưu. Dòng trùng giữ nguyên dữ liệu từ lần nhập trước; phiên bản ánh xạ mới không tự cập nhật chúng.</p>
            {detail.value.summary?.counts && <div className="bd-modal-finance"><h4>Số dòng duy nhất trong file theo loại</h4>
              {Object.entries(detail.value.summary.counts).map(([key, value]) => <DetailLine key={key} label={recordLabel(key)} value={value.toLocaleString("vi-VN")} />)}
            </div>}
            {detail.value.summary?.financeTotals && <div className="bd-modal-finance"><h4>Tổng hợp tài chính dòng đơn hàng</h4>
              {Object.entries(detail.value.summary.financeTotals).map(([key, value]) => <DetailLine key={key} label={financeLabel(key)} value={money(value)} />)}
            </div>}
            {detail.value.summary?.summaryFinancialData && <div className="bd-modal-finance"><h4>Thống kê thu nhập từ trang Tổng quát</h4>
              {Object.entries(detail.value.summary.summaryFinancialData).map(([key, value]) => <DetailLine key={key} label={financeLabel(key)} value={money(value)} />)}
            </div>}
            {detail.value.summary?.reconciliations && detail.value.summary.reconciliations.length > 0 && <div className="bd-modal-finance"><h4>Đối chiếu Summary với dòng Order</h4>
              {detail.value.summary.reconciliations.map((check) => <DetailLine key={check.summaryField} label={`${financeLabel(check.summaryField)} · ${check.matches ? "Khớp" : "Chênh lệch"}`} value={`${money(check.summaryAmount)} / ${money(check.incomeAmount)}${check.matches ? "" : ` · lệch ${money(check.difference)}`}`} />)}
            </div>}
            {detail.value.summary?.unmappedFields && detail.value.summary.unmappedFields.length > 0 && <div className="bd-quarantine">
              <div className="bd-section-heading"><div><h4>Trường số đang cách ly</h4><p>Chưa có ánh xạ chuẩn; không đưa vào phép tính.</p></div><span className="bd-badge warning">Chưa ánh xạ</span></div>
              {detail.value.summary.unmappedFields.map((field) => <DetailLine key={`${field.sourceSheet}-${field.header}`} label={`${field.header} · ${field.sourceSheet}`} value={`${field.occurrences} dòng`} />)}
            </div>}
            <p className="bd-modal-note">Danh mục ánh xạ khi nhập: {detail.value.summary?.mappingVersion ? `v${detail.value.summary.mappingVersion}` : "không có thông tin"}; phiên bản hiện tại: {detail.value.currentMappingVersion ? `v${detail.value.currentMappingVersion}` : "không có thông tin"}.</p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
