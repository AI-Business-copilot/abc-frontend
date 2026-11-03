import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";
import { inventoryApi, type LedgerListResponse } from "@/api/inventory";

const vnd = (value: number) => new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";

const compactVnd = (value: number) => {
  if (!value) return "0 đ";
  if (Math.abs(value) >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2).replace(".", ",") + " tỷ";
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(".", ",") + " tr";
  return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " đ";
};

const mapTypeName = (type: string) => {
  switch (type) {
    case "OPENING_STOCK":
      return "Tồn đầu kỳ";
    case "PURCHASE_RECEIPT":
    case "PURCHASE_ORDER":
      return "Nhập mua PO";
    case "POS_SALE":
    case "SALE":
      return "Bán hàng POS";
    case "ADJUSTMENT":
      return "Cân chỉnh kiểm kê";
    case "SCRAP":
      return "Xuất hủy hàng hỏng";
    case "CUSTOMER_RETURN":
      return "Khách trả hàng";
    case "VENDOR_RETURN":
      return "Trả hàng NCC";
    default:
      return type || "Biến động";
  }
};

export function StockLogPage() {
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<LedgerListResponse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 200);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, selectedType]);

  const fetchLedger = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await inventoryApi.getLedger({
        search: debouncedKeyword,
        type: selectedType,
        page,
        pageSize,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Không thể tải nhật ký biến động kho");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLedger();
  }, [debouncedKeyword, selectedType, page, pageSize]);

  const items = data?.items || [];
  const stats = data?.stats || {
    totalRecords: 0,
    positiveQuantity: 0,
    negativeQuantity: 0,
    totalIncreaseValue: 0,
    totalDecreaseValue: 0,
  };
  const pagination = data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />

      <main className="mx-auto max-w-[1580px] px-6 py-5">
        {/* Breadcrumb & Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-1">
              <Link to="/products" className="hover:text-[#4f46e5]">Sản phẩm</Link>
              <span>/</span>
              <span className="font-semibold text-gray-700">Kho hàng &amp; Kiểm kê</span>
            </div>
            <h1 className="text-[24px] font-black tracking-tight text-gray-900">
              Nhật Ký Biến Động Kho (Stock Ledger)
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Sổ cái kho lưu trữ toàn bộ lịch sử xuất - nhập - tồn bất biến, phục vụ đối soát và kiểm toán tài chính.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/inventory"
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white text-[12.5px] font-bold text-gray-700 hover:bg-gray-50 shadow-xs transition-colors"
            >
              <Icon name="receipt_long" className="text-[18px]" />
              Phiếu kiểm kê &amp; Nạp tồn (F02)
            </Link>
            <button
              onClick={() => void fetchLedger()}
              className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-[12.5px] font-bold text-[#4f46e5] hover:bg-indigo-100 transition-colors"
            >
              <Icon name="refresh" className="text-[18px]" />
              Làm mới
            </button>
          </div>
        </div>

        {/* 3 Thẻ thống kê tổng quan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                  TỔNG LƯỢT BIẾN ĐỘNG LEDGER
                </p>
                <p className="mt-2 text-[30px] font-black text-gray-900 leading-none">
                  {stats.totalRecords.toLocaleString("vi-VN")}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-[#4f46e5]">
                <Icon name="list_alt" className="text-[24px]" />
              </span>
            </div>
            <p className="mt-3 text-[11.5px] text-gray-500">
              Số dòng giao dịch ghi nhận bất biến trong hệ thống
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
                  TỔNG SẢN PHẨM NHẬP KHO (+)
                </p>
                <p className="mt-2 text-[30px] font-black text-emerald-600 leading-none">
                  +{stats.positiveQuantity.toLocaleString("vi-VN")}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon name="add_box" className="text-[24px]" />
              </span>
            </div>
            <p className="mt-3 text-[11.5px] text-emerald-700 font-medium">
              Giá trị nhập: <b>+{compactVnd(stats.totalIncreaseValue)}</b>
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-rose-700 uppercase">
                  TỔNG SẢN PHẨM XUẤT KHO (-)
                </p>
                <p className="mt-2 text-[30px] font-black text-rose-600 leading-none">
                  -{stats.negativeQuantity.toLocaleString("vi-VN")}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-600">
                <Icon name="logout" className="text-[24px]" />
              </span>
            </div>
            <p className="mt-3 text-[11.5px] text-rose-700 font-medium">
              Giá trị xuất: <b>-{compactVnd(stats.totalDecreaseValue)}</b>
            </p>
          </div>
        </div>

        {/* Thanh tìm kiếm & Lọc */}
        <section className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 border border-gray-200 shadow-xs">
          <div className="relative flex-1 min-w-[300px]">
            <Icon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-gray-400"
            />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, mã SKU, mã phiếu hoặc người tạo..."
              className="h-11 w-full rounded-xl bg-gray-50 pl-10 pr-4 text-[13px] text-gray-800 outline-none border border-transparent focus:border-[#4f46e5] focus:bg-white transition-all"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-11 rounded-xl bg-gray-50 px-4 text-[13px] font-medium text-gray-700 border border-gray-200 outline-none cursor-pointer"
          >
            <option value="">Nguồn gốc: Tất cả giao dịch</option>
            <option value="OPENING_STOCK">Tồn đầu kỳ (F02)</option>
            <option value="PURCHASE_RECEIPT">Nhập mua PO</option>
            <option value="POS_SALE">Bán hàng POS</option>
            <option value="ADJUSTMENT">Cân chỉnh kiểm kê</option>
            <option value="SCRAP">Xuất hủy hàng hỏng</option>
          </select>
        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {/* Bảng Ledger Giao dịch */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between bg-gray-50/80 px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-[16px] font-bold text-gray-900">
                Sổ Nhật Ký Biến Động Kho (Ledger)
                <span className="ml-2.5 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-0.5 text-[11px] font-bold text-[#4f46e5]">
                  Trang {pagination.page} / {pagination.totalPages || 1}
                </span>
              </h2>
              <p className="mt-0.5 text-[11.5px] text-gray-500">
                Hiển thị {items.length} trong tổng số {pagination.total.toLocaleString("vi-VN")} bản ghi
              </p>
            </div>
            <span className="text-[12px] text-gray-500">
              Sắp xếp: <b className="text-gray-900 font-semibold">Mới nhất trước ↓</b>
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500 text-[13px]">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
              <p>Đang truy vấn sổ cái kho...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <Icon name="receipt_long" className="text-[44px] text-gray-300" />
              <p className="mt-2 text-[14px] font-semibold text-gray-600">
                Chưa có bản ghi biến động kho nào
              </p>
              <p className="text-[12px] text-gray-400 mt-1">
                Các giao dịch Nhập tồn đầu kỳ, Bán hàng hoặc Nhập kho sẽ tự động ghi sổ tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-gray-50 text-[10.5px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3.5">Thời gian &amp; Mã phiếu</th>
                    <th className="px-4 py-3.5">Sản phẩm &amp; SKU</th>
                    <th className="px-4 py-3.5 text-center">Loại biến động</th>
                    <th className="px-4 py-3.5 text-right">Biến động</th>
                    <th className="px-4 py-3.5 text-right">Tồn sau</th>
                    <th className="px-4 py-3.5 text-right">Giá trị thay đổi</th>
                    <th className="px-5 py-3.5">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((row) => {
                    const isPositive = row.quantityChanged > 0;
                    const dateObj = new Date(row.createdAt);
                    const timeStr = dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    const dateStr = dateObj.toLocaleDateString("vi-VN");

                    return (
                      <tr key={row.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-gray-900">{timeStr}</span>{" "}
                          <span className="text-gray-400 text-[11px]">{dateStr}</span>
                          {row.sheetCode && (
                            <code className="mt-1 block font-mono font-bold text-[#4f46e5] text-[11px]">
                              {row.sheetCode}
                            </code>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <b className="block text-[13px] text-gray-900">{row.productName}</b>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold text-gray-600">
                              {row.sku}
                            </span>
                            {row.lotNumber && (
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-mono">
                                Lô: {row.lotNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={[
                              "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                              row.transactionType === "OPENING_STOCK"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : isPositive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200",
                            ].join(" ")}
                          >
                            ● {mapTypeName(row.transactionType)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={[
                              "text-[14px] font-bold font-mono",
                              isPositive ? "text-emerald-600" : "text-rose-600",
                            ].join(" ")}
                          >
                            {isPositive ? `+${row.quantityChanged}` : row.quantityChanged}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                          {row.balanceAfter.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-800">
                          {vnd(row.totalCostValue)}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 text-[12px]">
                          {row.createdBy || "Hệ thống"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Phân trang */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3.5 text-[12px] text-gray-600 bg-gray-50/50">
            <div>
              Hiển thị:
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="ml-2 rounded-lg border border-gray-300 bg-white px-2 py-1 font-semibold text-gray-700"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
              >
                ‹
              </button>
              <span className="px-2 font-bold text-gray-800">
                {pagination.page} / {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
