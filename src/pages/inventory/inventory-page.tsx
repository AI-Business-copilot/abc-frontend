import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";
import { useAuth } from "@/hooks/use-auth";
import {
  inventoryApi,
  type OpeningStockListResponse,
  type OpeningStockSheetDetail,
} from "@/api/inventory";
import {
  OpeningStockVoucherModal,
  type VoucherItem,
} from "@/pages/products/opening-stock-voucher-modal";

const vnd = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";

export function InventoryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OpeningStockListResponse | null>(null);
  const [error, setError] = useState("");

  // Modal xem trước chứng từ A4
  const [activeSheet, setActiveSheet] = useState<OpeningStockSheetDetail | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);

  const loadSheets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await inventoryApi.listSheets({
        search: keyword,
        status: statusFilter,
        pageSize: 50,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách phiếu nạp tồn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSheets();
    }, 200);
    return () => clearTimeout(timer);
  }, [keyword, statusFilter]);

  const viewSheet = async (id: string) => {
    setSheetLoading(true);
    try {
      const detail = await inventoryApi.getSheet(id);
      setActiveSheet(detail);
    } catch (err: any) {
      alert("Lỗi khi tải chi tiết phiếu: " + (err?.message || ""));
    } finally {
      setSheetLoading(false);
    }
  };

  const handleApplySheet = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn áp dụng phiếu này vào sổ tồn kho? Số lượng sẽ được ghi nhận chính thức.")) {
      return;
    }
    setApplyBusy(true);
    try {
      await inventoryApi.applySheet(id);
      setActiveSheet(null);
      await loadSheets();
    } catch (err: any) {
      alert("Lỗi khi áp dụng phiếu: " + (err?.message || ""));
    } finally {
      setApplyBusy(false);
    }
  };

  const totals = data?.totals || { totalQuantity: 0, totalValue: 0, totalSku: 0 };
  const statusStats = data?.statusStats || { draft: 0, applied: 0, cancelled: 0 };
  const rows = data?.rows || [];

  const voucherItems: VoucherItem[] =
    activeSheet?.items.map((it) => ({
      id: it.id,
      sku: it.sku,
      name: it.productName || "Sản phẩm",
      attributeText: it.attributeText || "Mặc định",
      unit: it.unitOfMeasure || "Cái",
      cost: Number(it.unitCost) || 0,
      quantity: Number(it.quantity) || 0,
      lotNumber: it.lotNumber || undefined,
      manufacturingDate: it.manufacturingDate ? it.manufacturingDate.slice(0, 10) : undefined,
      expirationDate: it.expirationDate ? it.expirationDate.slice(0, 10) : undefined,
    })) || [];

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="inventory" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />

      <main className="mx-auto max-w-[1580px] px-6 py-5">
        {/* Header Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-[#4f46e5] uppercase bg-[#eef0ff] px-2 py-0.5 rounded">
                Chứng từ kiểm kê & nạp tồn
              </span>
              <span className="text-[12px] text-[#667085]">Lưu trữ &amp; In ấn chuẩn A4</span>
            </div>
            <h1 className="text-[26px] font-extrabold text-gray-900 mt-1">Phiếu Kiểm Kê &amp; Nạp Tồn Kho</h1>
            <p className="text-[13px] text-[#667085] mt-0.5">
              Quản lý toàn bộ lịch sử các phiếu kiểm kê nạp tồn kho đầu kỳ và kiểm kê định kỳ của doanh nghiệp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/products/new")}
              className="rounded-lg bg-[#4f46e5] px-5 py-2.5 text-[13.5px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)] hover:bg-[#4338ca] transition-colors flex items-center gap-1.5"
            >
              <Icon name="add_circle" className="text-[18px]" />
              Tạo sản phẩm &amp; nạp tồn mới
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Cards */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white p-5 border border-gray-100 shadow-xs">
            <div className="flex justify-between text-[#667085]">
              <span className="text-[13px] font-medium">Tổng số phiếu</span>
              <span className="rounded-lg bg-[#e6efff] p-2 text-[#4338ca]">
                <Icon name="receipt_long" className="text-[20px]" />
              </span>
            </div>
            <p className="mt-3 text-[26px] font-extrabold text-gray-900">
              {data?.total || 0} <span className="text-[12px] font-normal text-[#667085]">phiếu</span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 border border-gray-100 shadow-xs">
            <div className="flex justify-between text-[#667085]">
              <span className="text-[13px] font-medium">Tổng SKU đã nạp</span>
              <span className="rounded-lg bg-[#ecfdf3] p-2 text-[#027a48]">
                <Icon name="category" className="text-[20px]" />
              </span>
            </div>
            <p className="mt-3 text-[26px] font-extrabold text-[#027a48]">
              {totals.totalSku} <span className="text-[12px] font-normal text-[#667085]">SKU</span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 border border-gray-100 shadow-xs">
            <div className="flex justify-between text-[#667085]">
              <span className="text-[13px] font-medium">Tổng giá trị vốn nạp</span>
              <span className="rounded-lg bg-[#eef4ff] p-2 text-[#4f46e5]">
                <Icon name="account_balance_wallet" className="text-[20px]" />
              </span>
            </div>
            <p className="mt-3 text-[24px] font-extrabold text-[#4f46e5]">
              {vnd(totals.totalValue)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 border border-gray-100 shadow-xs">
            <div className="flex justify-between text-[#667085]">
              <span className="text-[13px] font-medium">Phiếu nháp cần duyệt</span>
              <span className="rounded-lg bg-[#fef3f2] p-2 text-[#d92d20]">
                <Icon name="pending_actions" className="text-[20px]" />
              </span>
            </div>
            <p className={`mt-3 text-[26px] font-extrabold ${statusStats.draft > 0 ? "text-[#d92d20]" : "text-gray-900"}`}>
              {statusStats.draft} <span className="text-[12px] font-normal text-[#667085]">phiếu</span>
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <section className="mt-5 rounded-xl bg-white p-4 border border-gray-100 shadow-xs flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#98a2b3]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm mã phiếu (OSTK-...), ghi chú, người lập..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-[#f9fafb] pl-10 pr-4 text-[13px] outline-none focus:border-[#4f46e5] focus:bg-white transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-[#f9fafb] px-3.5 text-[13px] text-gray-700 outline-none focus:border-[#4f46e5]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="APPLIED">Đã áp dụng vào kho (APPLIED)</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
          </select>

          <button
            onClick={() => void loadSheets()}
            className="h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-semibold text-gray-700 flex items-center gap-1.5 shadow-xs"
          >
            <Icon name="refresh" className="text-[17px] text-gray-500" />
            Làm mới
          </button>
        </section>

        {/* Table Content */}
        <section className="mt-4 overflow-hidden rounded-xl bg-white border border-gray-100 shadow-xs">
          {loading ? (
            <div className="py-16 text-center text-[#667085] text-[13.5px]">
              <Icon name="progress_activity" className="animate-spin text-[24px] text-[#4f46e5] mb-2 inline-block" />
              <div>Đang tải danh sách phiếu kiểm kê...</div>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-600 text-[13px]">{error}</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-[#667085]">
              <Icon name="inventory_2" className="text-[44px] text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">Chưa có phiếu nạp tồn nào.</p>
              <p className="text-[12.5px] mt-1 text-gray-500">
                Khi bạn hoàn tất Bước 4 trong trình tạo sản phẩm hoặc tạo phiếu mới, phiếu kiểm kê kho sẽ tự động lưu trữ tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#f8f9fc] border-b border-[#eaecf0] text-[#475467] font-semibold text-[12px]">
                  <tr>
                    <th className="px-5 py-3.5">Mã phiếu</th>
                    <th className="px-4 py-3.5">Người lập</th>
                    <th className="px-4 py-3.5 text-center">Dòng SKU</th>
                    <th className="px-4 py-3.5 text-right">Tổng SL tồn</th>
                    <th className="px-4 py-3.5 text-right">Tổng giá trị vốn</th>
                    <th className="px-4 py-3.5 text-center">Trạng thái</th>
                    <th className="px-4 py-3.5">Ngày lập</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaecf0]">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#fcfdff] transition-colors">
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => void viewSheet(row.id)}
                          className="font-mono font-bold text-[#4f46e5] hover:underline flex items-center gap-1.5"
                        >
                          <Icon name="receipt" className="text-[16px]" />
                          {row.code || "OSTK-UNNAMED"}
                        </button>
                        {row.note && (
                          <div className="text-[11px] text-gray-500 truncate max-w-[240px] mt-0.5">
                            {row.note}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-800">{row.createdByUser?.fullName || "Chủ Cửa Hàng"}</div>
                        <div className="text-[11px] text-gray-400">{row.createdByUser?.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="rounded-full bg-[#f2f4f7] px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-gray-700">
                          {row.totalLines} SKU
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                        {row.totalQuantity.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[#4f46e5]">
                        {vnd(row.totalValue)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {row.status === "APPLIED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đã áp dụng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Bản nháp
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11.5px] text-gray-500">
                        {new Date(row.createdAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void viewSheet(row.id)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-[12px] font-bold text-[#4f46e5] hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          >
                            <Icon name="visibility" className="text-[15px]" />
                            Xem &amp; In phiếu
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Loading overlay when loading sheet detail */}
      {sheetLoading && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs grid place-items-center">
          <div className="rounded-xl bg-white p-6 shadow-xl flex items-center gap-3">
            <Icon name="progress_activity" className="animate-spin text-[24px] text-[#4f46e5]" />
            <span className="text-[13.5px] font-semibold text-gray-800">Đang nạp chi tiết phiếu kiểm kê...</span>
          </div>
        </div>
      )}

      {/* OPENING STOCK VOUCHER MODAL (A4 PRINT & PREVIEW) */}
      {activeSheet && (
        <OpeningStockVoucherModal
          voucherCode={activeSheet.code || "OSTK-001"}
          businessName={profile?.business?.name || "CỬA HÀNG ERP"}
          businessAddress={profile?.business?.address || "Việt Nam"}
          businessPhone={profile?.business?.phone || "0900000000"}
          creatorName={activeSheet.createdBy || profile?.user?.fullName || "Quản trị viên"}
          note={activeSheet.note || "Phiếu nạp tồn kho ban đầu"}
          items={voucherItems}
          hasLotTracking={activeSheet.items.some((it) => Boolean(it.lotNumber))}
          onClose={() => setActiveSheet(null)}
          onConfirmPublish={
            activeSheet.status === "DRAFT"
              ? () => void handleApplySheet(activeSheet.id)
              : undefined
          }
          isPublishing={applyBusy}
        />
      )}
    </div>
  );
}
