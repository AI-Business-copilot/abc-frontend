import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FileSpreadsheet,
  History,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";

import { businessDataApi, type AiReadyData, type BusinessDataBatch, type ShopeePreview } from "@/api/business-data";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/use-permissions";
import { date, ErrorBox, money, useAction, useLoad, today } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";

type PosMetric = AiReadyData["pos"]["metrics"][number];
type ShopeeRecord = AiReadyData["shopee"]["financialRecords"][number];
type Section = "POS" | "SHOPEE" | "IMPORTS";
type Detail =
  | { kind: "POS"; value: PosMetric }
  | { kind: "SHOPEE"; value: ShopeeRecord }
  | { kind: "IMPORT"; value: BusinessDataBatch };
type PosFilter = "ALL" | "SOLD" | "RETURNED" | "PROFIT" | "LOSS";
type ShopeeRecordType = "ALL" | "ORDER" | "SKU" | "ADJUSTMENT" | "SERVICE_FEE" | "SHIPPING_DISCREPANCY";
type ShopeeSort = "date-newest" | "date-oldest" | "order" | "type";

const PAGE_SIZES = [10, 20, 50];
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

function defaultFrom() {
  const value = new Date();
  value.setDate(value.getDate() - 29);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function financeLabel(key: string) {
  return FINANCE_LABELS[key] ?? key;
}

function recordLabel(type: string) {
  return RECORD_LABELS[type as Exclude<ShopeeRecordType, "ALL">] ?? type;
}

function displayDate(value: string | null | undefined) {
  return value ? date(value) : "—";
}

function getAmount(value: string | number) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function PaginationSize({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="bd-page-size">
      <span>Số dòng/trang</span>
      <select aria-label="Số dòng mỗi trang" onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="bd-filter-field"><span>{label}</span>{children}</label>;
}

function SummaryCard({ label, value, detail, icon: Icon }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Store;
}) {
  return (
    <article className="bd-summary-card">
      <span className="bd-summary-icon"><Icon size={18} /></span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function DetailLine({ label, value, amount = false }: { label: string; value: React.ReactNode; amount?: boolean }) {
  return (
    <div className="bd-detail-line">
      <span>{label}</span>
      <strong className={amount && typeof value === "number" && value < 0 ? "bd-negative" : ""}>
        {amount && typeof value === "number" ? money(value) : value}
      </strong>
    </div>
  );
}

export function BusinessDataPage() {
  const { can } = usePermissions();
  const canManage = can("business_data.manage");
  const canRead = can("analytics.read") && can("finance.read");
  const canImport = canManage && can("finance.read");
  const imports = useLoad<BusinessDataBatch[]>(() => canRead ? businessDataApi.listImports() : Promise.resolve([]), [canRead]);
  const action = useAction();
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [preview, setPreview] = useState<ShopeePreview | null>(null);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [readyData, setReadyData] = useState<AiReadyData | null>(null);
  const [message, setMessage] = useState("");
  const [hasDataWarning, setHasDataWarning] = useState(false);
  const [section, setSection] = useState<Section>("POS");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [posPage, setPosPage] = useState(1);
  const [shopeePage, setShopeePage] = useState(1);
  const [importsPage, setImportsPage] = useState(1);
  const [posSearch, setPosSearch] = useState("");
  const [posFilter, setPosFilter] = useState<PosFilter>("ALL");
  const [posSort, setPosSort] = useState("date-newest");
  const [shopeeSearch, setShopeeSearch] = useState("");
  const [shopeeFilter, setShopeeFilter] = useState<ShopeeRecordType>("ALL");
  const [shopeeQuality, setShopeeQuality] = useState<"ALL" | "QUARANTINED" | "OLDER">("ALL");
  const [shopeeSort, setShopeeSort] = useState<ShopeeSort>("date-newest");
  const [importsSearch, setImportsSearch] = useState("");
  const [importsFilter, setImportsFilter] = useState<"ALL" | "IMPORTED" | "DUPLICATES">("ALL");
  const [importsSort, setImportsSort] = useState<"newest" | "oldest" | "period">("newest");

  const runPreview = () => action.run(async () => {
    if (!file) throw new Error("Vui lòng chọn file báo cáo .xlsx.");
    setMessage("");
    setPreview(null);
    setPreview(await businessDataApi.previewShopee(file));
  });

  const importReport = () => action.run(async () => {
    if (!file || !preview || preview.alreadyImported) return;
    const result = await businessDataApi.importShopee(file);
    setMessage(`Đã nhập ${result.importedRowCount} dòng mới; bỏ qua ${result.skippedDuplicateRows} dòng trùng.${readyData ? " Nếu tải lại thất bại, hãy dùng nút cập nhật để xem dữ liệu mới." : ""}`);
    setHasDataWarning(false);
    setPreview(null);
    setFile(null);
    setFileInputKey((key) => key + 1);
    setDetail(null);
    imports.reload();
    if (readyData && canRead) {
      setReadyData(null);
      await refreshReadyData();
      setMessage(`Đã nhập ${result.importedRowCount} dòng mới; bỏ qua ${result.skippedDuplicateRows} dòng trùng. Dữ liệu theo kênh đã được tải lại.`);
    }
  });

  const refreshReadyData = async () => {
    const data = await businessDataApi.aiReady(from, to);
    setReadyData(data);
    setPosPage(1);
    setShopeePage(1);
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
    const needle = posSearch.trim().toLocaleLowerCase("vi");
    const values = (readyData?.pos.metrics ?? []).filter((row) => {
      const searchable = `${row.variant.template.name} ${row.variant.sku} ${row.metricDate}`.toLocaleLowerCase("vi");
      const netRevenue = getAmount(row.netRevenue);
      return (!needle || searchable.includes(needle))
        && (posFilter === "ALL"
          || (posFilter === "SOLD" && row.unitsSold > 0)
          || (posFilter === "RETURNED" && row.unitsReturned > 0)
          || (posFilter === "PROFIT" && netRevenue > 0)
          || (posFilter === "LOSS" && netRevenue < 0));
    });
    return values.sort((left, right) => {
      switch (posSort) {
        case "date-oldest": return left.metricDate.localeCompare(right.metricDate) || left.variant.sku.localeCompare(right.variant.sku, "vi");
        case "revenue-high": return getAmount(right.netRevenue) - getAmount(left.netRevenue);
        case "revenue-low": return getAmount(left.netRevenue) - getAmount(right.netRevenue);
        case "units-high": return right.unitsSold - left.unitsSold;
        case "product": return left.variant.template.name.localeCompare(right.variant.template.name, "vi");
        case "date-newest":
        default: return right.metricDate.localeCompare(left.metricDate) || left.variant.sku.localeCompare(right.variant.sku, "vi");
      }
    });
  }, [readyData?.pos.metrics, posFilter, posSearch, posSort]);

  const filteredShopee = useMemo(() => {
    const needle = shopeeSearch.trim().toLocaleLowerCase("vi");
    const values = (readyData?.shopee.financialRecords ?? []).filter((row) => {
      const searchable = `${row.externalOrderId ?? ""} ${row.externalProductId ?? ""} ${row.productName ?? ""} ${row.sourceSheet} ${row.recordType} ${row.batch.id}`.toLocaleLowerCase("vi");
      return (!needle || searchable.includes(needle))
        && (shopeeFilter === "ALL" || row.recordType === shopeeFilter)
        && (shopeeQuality === "ALL"
          || (shopeeQuality === "QUARANTINED" && !!row.unmappedFinancialData && Object.keys(row.unmappedFinancialData).length > 0)
          || (shopeeQuality === "OLDER" && (row.batch.mappingVersion === null || row.batch.mappingVersion < (readyData?.shopee.currentMappingVersion ?? 0))));
    });
    return values.sort((left, right) => {
      const leftDate = left.transactionDate ?? left.settlementDate ?? "";
      const rightDate = right.transactionDate ?? right.settlementDate ?? "";
      switch (shopeeSort) {
        case "date-oldest": return leftDate.localeCompare(rightDate);
        case "order": return (left.externalOrderId ?? "").localeCompare(right.externalOrderId ?? "");
        case "type": return left.recordType.localeCompare(right.recordType);
        case "date-newest":
        default: return rightDate.localeCompare(leftDate);
      }
    });
  }, [readyData?.shopee.financialRecords, readyData?.shopee.currentMappingVersion, shopeeFilter, shopeeQuality, shopeeSearch, shopeeSort]);

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

  const posPageCount = Math.max(1, Math.ceil(filteredPos.length / pageSize));
  const safePosPage = Math.min(posPage, posPageCount);
  const shopeePageCount = Math.max(1, Math.ceil(filteredShopee.length / pageSize));
  const safeShopeePage = Math.min(shopeePage, shopeePageCount);
  const importsPageCount = Math.max(1, Math.ceil(filteredImports.length / pageSize));
  const safeImportsPage = Math.min(importsPage, importsPageCount);
  const pagedPos = filteredPos.slice((safePosPage - 1) * pageSize, safePosPage * pageSize);
  const pagedShopee = filteredShopee.slice((safeShopeePage - 1) * pageSize, safeShopeePage * pageSize);
  const pagedImports = filteredImports.slice((safeImportsPage - 1) * pageSize, safeImportsPage * pageSize);

  const changePageSize = (value: number) => {
    setPageSize(value);
    setPosPage(1);
    setShopeePage(1);
    setImportsPage(1);
  };

  const changeDateRange = (kind: "from" | "to", value: string) => {
    if (kind === "from") setFrom(value);
    else setTo(value);
    setReadyData(null);
    setDetail(null);
  };

  const sectionTabs: Array<{ id: Section; label: string; description: string; icon: typeof Store; count: number | null }> = [
    { id: "POS", label: "Bán hàng tại cửa hàng", description: "Đơn POS, hàng bán và đổi trả", icon: Store, count: readyData?.pos.metrics.length ?? null },
    { id: "SHOPEE", label: "Shopee", description: "Tài chính sàn và đối soát", icon: ShoppingBag, count: readyData?.shopee.financialRecords.length ?? null },
    { id: "IMPORTS", label: "Lịch sử nhập", description: "Các báo cáo đã nạp", icon: History, count: imports.data?.length ?? null },
  ];

  return (
    <AppLayout>
      <main className="bd-page">
        <header className="bd-hero">
          <div className="bd-hero-copy">
            <span className="bd-eyebrow"><BarChart3 size={15} /> NỀN DỮ LIỆU ĐA KÊNH</span>
            <h1>Dữ liệu kinh doanh</h1>
            <p>Tổng hợp và tra cứu dữ liệu bán hàng theo từng kênh. POS và Shopee được giữ riêng để AI không nhầm lẫn doanh thu, tồn kho và nhu cầu.</p>
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
            {canManage && canRead && <small className="bd-range-caption">Thao tác sẽ tổng hợp lại POS trong kỳ rồi tải dữ liệu POS và Shopee để xem.</small>}
            {readyData && <small className="bd-range-caption">Đang xem {readyData.range.from} – {readyData.range.to} ({readyData.range.dayCount} ngày)</small>}
          </div>
        </header>

        <ErrorBox error={action.error || imports.error} />
        {message && <div role="status" className={`bd-notice ${hasDataWarning ? "warning" : "success"}`}>{message}</div>}

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
                      <div><h3>Các trường số chưa ánh xạ — đang cách ly</h3><p>Các giá trị này được giữ riêng theo tên cột nguồn; chưa cộng vào tổng chuẩn và không dùng cho phép tính AI.</p></div>
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
            <div><span className="bd-eyebrow">KHÔNG GIAN PHÂN TÍCH</span><h2>Dữ liệu theo kênh</h2><p>Chọn từng kênh để tìm kiếm, lọc và xem chi tiết dữ liệu đã tổng hợp.</p></div>
            {readyData && <span className="bd-badge neutral">{readyData.range.from} – {readyData.range.to}</span>}
          </div>
          <nav aria-label="Phân loại nguồn dữ liệu" className="bd-tabs">
            {sectionTabs.map(({ id, label, description, icon: Icon, count }) => (
              <button aria-current={section === id ? "page" : undefined} className={`bd-tab${section === id ? " active" : ""}`} key={id} onClick={() => setSection(id)} type="button">
                <span className="bd-tab-icon"><Icon size={18} /></span>
                <span className="bd-tab-copy"><strong>{label}</strong><small>{description}</small></span>
                {count !== null && <span className="bd-tab-count">{count.toLocaleString("vi-VN")}</span>}
                <ChevronRight className="bd-tab-arrow" size={16} />
              </button>
            ))}
          </nav>

          {!readyData && section !== "IMPORTS" && (
            <div className="bd-empty-state"><span><Boxes size={22} /></span><h3>Chưa tải dữ liệu phân tích</h3><p>Chọn kỳ cần xem ở trên rồi bấm nút cập nhật hoặc tải dữ liệu.</p></div>
          )}

          {section === "POS" && readyData && (
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
                <label className="bd-search"><Search size={17} /><input onChange={(event) => { setPosSearch(event.target.value); setPosPage(1); }} placeholder="Tìm tên sản phẩm, SKU hoặc ngày…" value={posSearch} /></label>
                <FilterField label="Tình trạng"><select onChange={(event) => { setPosFilter(event.target.value as PosFilter); setPosPage(1); }} value={posFilter}><option value="ALL">Tất cả dòng</option><option value="SOLD">Có phát sinh bán</option><option value="RETURNED">Có phát sinh trả</option><option value="PROFIT">Doanh thu thuần dương</option><option value="LOSS">Doanh thu thuần âm</option></select></FilterField>
                <FilterField label="Sắp xếp theo"><select onChange={(event) => { setPosSort(event.target.value); setPosPage(1); }} value={posSort}><option value="date-newest">Ngày mới nhất</option><option value="date-oldest">Ngày cũ nhất</option><option value="revenue-high">Doanh thu cao nhất</option><option value="revenue-low">Doanh thu thấp nhất</option><option value="units-high">Số lượng bán nhiều nhất</option><option value="product">Tên sản phẩm A–Z</option></select></FilterField>
                <PaginationSize onChange={changePageSize} value={pageSize} />
              </div>
              {pagedPos.length ? (
                <>
                  <div className="bd-table-wrap"><table className="bd-table">
                    <thead><tr><th>Ngày ghi nhận</th><th>Sản phẩm</th><th>SKU</th><th>Đơn hàng</th><th>Đã bán</th><th>Đã trả</th><th>Doanh thu gộp</th><th>Giảm giá</th><th>Hoàn tiền</th><th>Doanh thu thuần</th><th>Giá vốn thuần</th><th></th></tr></thead>
                    <tbody>{pagedPos.map((row) => (
                      <tr key={`${row.metricDate}-${row.variant.id}`} onClick={() => setDetail({ kind: "POS", value: row })}>
                        <td>{displayDate(row.metricDate)}</td><td className="bd-primary-cell">{row.variant.template.name}</td><td>{row.variant.sku}</td><td>{row.orderCount}</td><td>{row.unitsSold}</td><td>{row.unitsReturned}</td><td>{money(row.grossSales)}</td><td>{money(row.discountAmount)}</td><td>{money(row.refundAmount)}</td><td className="bd-emphasis-cell">{money(row.netRevenue)}</td><td>{money(row.netCogs)}</td><td><button aria-label={`Chi tiết ${row.variant.template.name}`} className="bd-row-detail" onClick={(event) => { event.stopPropagation(); setDetail({ kind: "POS", value: row }); }} type="button">Chi tiết</button></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                  <div className="bd-pagination"><Pagination page={safePosPage} total={filteredPos.length} totalPages={posPageCount} onPageChange={setPosPage} /></div>
                </>
              ) : <div className="bd-empty-state compact"><h3>Không tìm thấy dữ liệu POS phù hợp</h3><p>{readyData.pos.metrics.length ? "Thử đổi từ khóa hoặc bộ lọc." : "Chưa có chỉ số trong khoảng ngày này. Nếu có giao dịch, hãy chạy “Tổng hợp POS”."}</p></div>}
            </div>
          )}

          {section === "SHOPEE" && readyData && (
            <div className="bd-section-panel">
              <div className="bd-channel-heading">
                <div className="bd-channel-icon shopee"><ShoppingBag size={20} /></div>
                <div><h3>Báo cáo tài chính Shopee</h3><p>Dòng đơn hàng được dùng cho tài chính; các dòng SKU, phí và điều chỉnh được giữ riêng để đối soát.</p></div>
              </div>
              <div className="bd-callout"><strong>Lưu ý về dữ liệu:</strong> báo cáo này không cung cấp số lượng bán theo SKU đáng tin cậy, vì vậy không dùng để tính nhu cầu sản phẩm hoặc tồn kho Shopee.</div>
              <div className="bd-callout">Dòng được chọn khi ngày giao dịch hoặc ngày thanh toán thuộc kỳ. Dòng thiếu cả hai ngày được chọn theo kỳ của báo cáo; vì vậy dữ liệu này không phải tổng quyết toán theo ngày thanh toán.</div>
              {readyData.shopee.recordsTruncated && <div className="bd-callout"><strong>Dữ liệu chưa đầy đủ:</strong> chỉ tải {readyData.shopee.recordLimit.toLocaleString("vi-VN")} dòng đầu tiên. Thẻ thống kê, tìm kiếm và bộ lọc chỉ áp dụng cho các dòng đã tải; hãy thu hẹp khoảng ngày.</div>}
              {readyData.shopee.financialRecords.some((row) => row.batch.mappingVersion === null || row.batch.mappingVersion < readyData.shopee.currentMappingVersion) && (
                <div className="bd-callout"><strong>Có dữ liệu từ danh mục ánh xạ cũ hoặc không rõ phiên bản.</strong> Các lần nhập trước không tự cập nhật theo danh mục v{readyData.shopee.currentMappingVersion}; xem chi tiết dòng và lịch sử nhập để kiểm tra nguồn.</div>
              )}
              {readyData.shopee.quarantinedFinancialRecords > 0 && (
                <div className="bd-callout"><strong>Dữ liệu chưa ánh xạ đang được cách ly:</strong> {readyData.shopee.quarantinedFinancialRecords.toLocaleString("vi-VN")} dòng có trường số chưa thuộc danh mục chuẩn. Chúng không được tính vào tài chính đã ánh xạ.</div>
              )}
              <div className="bd-summary-grid">
                <SummaryCard icon={CircleDollarSign} label="Dòng đơn hàng" value={readyData.shopee.financialRecords.filter((row) => row.recordType === "ORDER").length.toLocaleString("vi-VN")} detail="Nguồn số liệu tài chính" />
                <SummaryCard icon={Boxes} label="Dòng sản phẩm/SKU" value={readyData.shopee.financialRecords.filter((row) => row.recordType === "SKU").length.toLocaleString("vi-VN")} detail="Không cộng vào tổng doanh thu" />
                <SummaryCard icon={ArrowUpDown} label="Điều chỉnh" value={readyData.shopee.financialRecords.filter((row) => row.recordType === "ADJUSTMENT").length.toLocaleString("vi-VN")} detail="Theo ngày hoàn thành điều chỉnh" />
                <SummaryCard icon={History} label="Lần nhập báo cáo" value={readyData.shopee.batches.length.toLocaleString("vi-VN")} detail="Kỳ giao với ngày đã chọn, tối đa 50" />
              </div>
              <div className="bd-filters">
                <label className="bd-search"><Search size={17} /><input onChange={(event) => { setShopeeSearch(event.target.value); setShopeePage(1); }} placeholder="Tìm mã đơn, sản phẩm, sheet hoặc lần nhập…" value={shopeeSearch} /></label>
                <FilterField label="Loại dữ liệu"><select onChange={(event) => { setShopeeFilter(event.target.value as ShopeeRecordType); setShopeePage(1); }} value={shopeeFilter}>{Object.entries(RECORD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FilterField>
                <FilterField label="Chất lượng dữ liệu"><select onChange={(event) => { setShopeeQuality(event.target.value as typeof shopeeQuality); setShopeePage(1); }} value={shopeeQuality}><option value="ALL">Tất cả</option><option value="QUARANTINED">Có trường cách ly</option><option value="OLDER">Ánh xạ cũ hoặc không rõ</option></select></FilterField>
                <FilterField label="Sắp xếp theo"><select onChange={(event) => { setShopeeSort(event.target.value as ShopeeSort); setShopeePage(1); }} value={shopeeSort}><option value="date-newest">Ngày mới nhất</option><option value="date-oldest">Ngày cũ nhất</option><option value="order">Mã đơn A–Z</option><option value="type">Loại dữ liệu</option></select></FilterField>
                <PaginationSize onChange={changePageSize} value={pageSize} />
              </div>
              {pagedShopee.length ? (
                <>
                  <div className="bd-table-wrap"><table className="bd-table">
                    <thead><tr><th>Loại dữ liệu</th><th>Mã đơn hàng</th><th>Mã sản phẩm</th><th>Tên sản phẩm</th><th>Ngày giao dịch</th><th>Ngày thanh toán</th><th>Khoản tài chính chính</th><th>Sheet nguồn</th><th></th></tr></thead>
                    <tbody>{pagedShopee.map((row) => {
                      const mainAmount = row.financialData
                        ? row.financialData.sellerReceivedAmount ?? row.financialData.adjustmentAmount ?? row.financialData.actualShippingFee ?? row.financialData.voucherPackageFee
                        : undefined;
                      return (
                        <tr key={row.id} onClick={() => setDetail({ kind: "SHOPEE", value: row })}>
                          <td><span className={`bd-badge ${row.recordType.toLocaleLowerCase("en-US")}`}>{recordLabel(row.recordType)}</span>{row.unmappedFinancialData && Object.keys(row.unmappedFinancialData).length > 0 && <span className="bd-badge warning">Chưa ánh xạ</span>}</td>
                          <td className="bd-primary-cell">{row.externalOrderId ?? "—"}</td><td>{row.externalProductId ?? "—"}</td><td className="bd-product-name">{row.productName ?? "—"}</td>
                          <td>{displayDate(row.transactionDate)}</td><td>{displayDate(row.settlementDate)}</td>
                          <td className="bd-emphasis-cell">{mainAmount === undefined ? "—" : money(Number(mainAmount))}</td><td>{row.sourceSheet}</td>
                          <td><button aria-label={`Chi tiết ${row.externalOrderId ?? "báo cáo"}`} className="bd-row-detail" onClick={(event) => { event.stopPropagation(); setDetail({ kind: "SHOPEE", value: row }); }} type="button">Chi tiết</button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table></div>
                  <div className="bd-pagination"><Pagination page={safeShopeePage} total={filteredShopee.length} totalPages={shopeePageCount} onPageChange={setShopeePage} /></div>
                </>
              ) : <div className="bd-empty-state compact"><h3>Không tìm thấy dòng Shopee phù hợp</h3><p>{readyData.shopee.financialRecords.length ? "Thử đổi từ khóa hoặc loại dữ liệu." : "Không có báo cáo Shopee nào trong kỳ đang chọn. Kiểm tra ngày báo cáo hoặc xem lịch sử nhập."}</p></div>}
            </div>
          )}

          {section === "IMPORTS" && canRead && (
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
          {section === "IMPORTS" && !canRead && <div className="bd-empty-state compact"><h3>Bạn chưa có quyền xem dữ liệu tài chính</h3><p>Cần quyền xem phân tích và tài chính của doanh nghiệp.</p></div>}
        </section>
      </main>

      <Modal open={detail !== null} onClose={() => setDetail(null)} size="wide" title={detail?.kind === "POS" ? "Chi tiết chỉ số POS" : detail?.kind === "SHOPEE" ? "Chi tiết dòng báo cáo Shopee" : "Chi tiết lần nhập báo cáo"}>
        {detail?.kind === "POS" && (
          <div className="bd-modal-content">
            <div className="bd-modal-intro"><span className="bd-channel-icon pos"><Store size={20} /></span><div><h3>{detail.value.variant.template.name}</h3><p>SKU {detail.value.variant.sku} · Ngày ghi nhận {displayDate(detail.value.metricDate)}</p></div></div>
            <div className="bd-detail-grid">
              <DetailLine label="Số đơn hàng" value={detail.value.orderCount} />
              <DetailLine label="Số lượng bán" value={`${detail.value.unitsSold} ${detail.value.variant.template.unitOfMeasure}`} />
              <DetailLine label="Số lượng trả" value={`${detail.value.unitsReturned} ${detail.value.variant.template.unitOfMeasure}`} />
              <DetailLine label="Doanh thu gộp" value={getAmount(detail.value.grossSales)} amount />
              <DetailLine label="Giảm giá" value={getAmount(detail.value.discountAmount)} amount />
              <DetailLine label="Tiền hoàn trả" value={getAmount(detail.value.refundAmount)} amount />
              <DetailLine label="Doanh thu thuần" value={getAmount(detail.value.netRevenue)} amount />
              <DetailLine label="Giá vốn thuần" value={getAmount(detail.value.netCogs)} amount />
            </div>
            <p className="bd-modal-note">Ngày trả hàng được ghi nhận riêng với ngày bán. Giá vốn được hoàn lại khi sản phẩm trả về trạng thái có thể nhập kho và có liên kết hợp lệ với đơn gốc.</p>
          </div>
        )}
        {detail?.kind === "SHOPEE" && (
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
                <div className="bd-section-heading"><div><h4>Trường số chưa ánh xạ</h4><p>Được lưu riêng theo nhãn gốc, không thuộc dữ liệu chuẩn và không dùng cho phép tính AI.</p></div><span className="bd-badge warning">Cách ly</span></div>
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
