import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/pages/products/ui-icon";
import {
  inventoryApi,
  type SearchVariantItem,
} from "@/api/inventory";
import { OpeningStockVoucherModal, type VoucherItem } from "@/pages/products/opening-stock-voucher-modal";
import { useAuth } from "@/hooks/use-auth";

interface StockInLine {
  variant: SearchVariantItem;
  quantity: number;
  unitCost: number;
  lotNumber: string;
  manufacturingDate: string; // YYYY-MM-DD
  expirationDate: string;    // YYYY-MM-DD
}

interface StockInModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const vnd = (value: number) => new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";

export function StockInModal({ onClose, onSuccess }: StockInModalProps) {
  const { profile } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchVariantItem[]>([]);
  const [selectedLines, setSelectedLines] = useState<StockInLine[]>([]);
  const [note, setNote] = useState("Nạp tồn kho đợt hàng mới");

  // Bộ lọc lô áp dụng chung cho đợt đặt hàng
  const [batchLotNumber, setBatchLotNumber] = useState("");
  const [batchMfgDate, setBatchMfgDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchExpDate, setBatchExpDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);

  // Tìm kiếm SKU có sẵn trong hệ thống
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await inventoryApi.searchVariants({ search: keyword.trim(), limit: 15 });
        if (!cancelled) {
          setSearchResults(res.items || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Lỗi khi tìm kiếm sản phẩm");
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword]);

  const addVariantToLines = (v: SearchVariantItem) => {
    if (selectedLines.some((line) => line.variant.id === v.id)) {
      return;
    }
    const defaultMfg = batchMfgDate || new Date().toISOString().slice(0, 10);
    const defaultExp = v.hasLotTracking ? batchExpDate : "";
    setSelectedLines((prev) => [
      ...prev,
      {
        variant: v,
        quantity: 10,
        unitCost: Number(v.costPrice) || 0,
        lotNumber: batchLotNumber || "",
        manufacturingDate: defaultMfg,
        expirationDate: defaultExp,
      },
    ]);
  };

  const removeLine = (variantId: string) => {
    setSelectedLines((prev) => prev.filter((l) => l.variant.id !== variantId));
  };

  const updateLine = (variantId: string, patch: Partial<StockInLine>) => {
    setSelectedLines((prev) =>
      prev.map((l) => (l.variant.id === variantId ? { ...l, ...patch } : l)),
    );
  };

  // Áp dụng thông tin lô chung cho toàn bộ biến thể trong đợt đặt hàng này
  const applyBatchLotToAll = () => {
    if (!batchLotNumber && !batchMfgDate && !batchExpDate) {
      setError("Vui lòng nhập Số lô hoặc Ngày sản xuất để áp dụng nhanh.");
      return;
    }
    setSelectedLines((prev) =>
      prev.map((l) => ({
        ...l,
        lotNumber: batchLotNumber || l.lotNumber,
        manufacturingDate: batchMfgDate || l.manufacturingDate,
        expirationDate: l.variant.hasLotTracking ? batchExpDate || l.expirationDate : "",
      })),
    );
    setError("");
  };

  const totals = useMemo(() => {
    let qty = 0;
    let val = 0;
    for (const l of selectedLines) {
      qty += Number(l.quantity) || 0;
      val += (Number(l.quantity) || 0) * (Number(l.unitCost) || 0);
    }
    return { qty, val };
  }, [selectedLines]);

  const voucherItems: VoucherItem[] = useMemo(() => {
    return selectedLines.map((l) => ({
      id: l.variant.id,
      sku: l.variant.sku,
      barcode: l.variant.barcode || undefined,
      name: l.variant.productName,
      attributeText: l.variant.attributeText,
      unit: l.variant.unit || "Cái",
      quantity: Number(l.quantity) || 0,
      cost: Number(l.unitCost) || 0,
      lotNumber: l.lotNumber || undefined,
      manufacturingDate: l.manufacturingDate || undefined,
      expirationDate: l.expirationDate || undefined,
    }));
  }, [selectedLines]);

  const handleSubmit = async (applyNow: boolean) => {
    if (selectedLines.length === 0) {
      setError("Vui lòng chọn ít nhất một sản phẩm / biến thể để nạp tồn.");
      return;
    }

    // Kiểm tra ràng buộc Ngày sản xuất & Hạn sử dụng (Mỹ phẩm bắt buộc HSD, Thời trang không cần)
    for (const l of selectedLines) {
      if (!l.quantity || l.quantity <= 0) {
        setError(`Vui lòng nhập số lượng tồn > 0 cho SKU ${l.variant.sku}.`);
        return;
      }
      if (l.lotNumber && !l.manufacturingDate) {
        setError(`SKU ${l.variant.sku} đã nhập số lô thì bắt buộc phải có Ngày sản xuất (NSX).`);
        return;
      }
      if (l.variant.hasLotTracking) {
        if (!l.expirationDate) {
          setError(`Sản phẩm mỹ phẩm "${l.variant.productName}" bắt buộc phải có Hạn sử dụng (HSD) để quản lý FEFO.`);
          return;
        }
        if (l.manufacturingDate && l.expirationDate <= l.manufacturingDate) {
          setError(`Hạn sử dụng của SKU ${l.variant.sku} phải sau ngày sản xuất.`);
          return;
        }
      }
    }

    setSaving(true);
    setError("");
    try {
      await inventoryApi.createSheet({
        note: note.trim() || undefined,
        apply: applyNow,
        items: selectedLines.map((l) => ({
          variantId: l.variant.id,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost) || 0,
          lotNumber: l.lotNumber.trim() || undefined,
          manufacturingDate: l.manufacturingDate || undefined,
          expirationDate: l.variant.hasLotTracking ? l.expirationDate || undefined : undefined,
        })),
      });

      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Không thể tạo phiếu nạp tồn.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
        <div className="flex h-[94vh] max-h-[920px] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header Modal */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4f46e5] text-white">
                <Icon name="inventory" className="text-[22px]" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold text-gray-900">
                  Nạp Tồn Kho Hàng Hóa (Nhập Đợt Hàng &amp; Quản Lý Lô Date)
                </h2>
                <p className="text-[12px] text-gray-500">
                  Chọn sản phẩm có sẵn trong kho để nạp tồn, phân biệt lô hàng mới/cũ và quản lý hạn sử dụng FEFO.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <Icon name="close" className="text-[22px]" />
            </button>
          </div>

          {/* Body Modal: 2 Cột */}
          <div className="grid flex-1 grid-cols-[380px_1fr] overflow-hidden">
            {/* CỘT TRÁI: TÌM & CHỌN SKU TỪ CSDL */}
            <aside className="border-r border-gray-200 bg-[#f9fafb] p-4 flex flex-col overflow-hidden">
              <label className="text-[12.5px] font-bold text-gray-800 uppercase tracking-wide flex items-center justify-between">
                <span>1. Chọn sản phẩm từ hệ thống</span>
                <span className="text-[11px] font-normal text-indigo-600">Đã chọn ({selectedLines.length})</span>
              </label>

              <div className="mt-2.5 relative">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-gray-400"
                />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Gõ tên sản phẩm, mã SKU, barcode..."
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-[12.5px] text-gray-800 outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
                />
              </div>

              {/* Danh sách kết quả tìm kiếm */}
              <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
                {searchLoading ? (
                  <div className="py-8 text-center text-gray-400 text-[12px]">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-1" />
                    <p>Đang tìm biến thể...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-[12px] bg-white rounded-xl border border-dashed border-gray-200 p-4">
                    <p>Không tìm thấy sản phẩm phù hợp.</p>
                  </div>
                ) : (
                  searchResults.map((v) => {
                    const isSelected = selectedLines.some((l) => l.variant.id === v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => addVariantToLines(v)}
                        className={[
                          "p-2.5 rounded-xl border text-[12px] cursor-pointer transition-all flex items-start justify-between gap-2.5",
                          isSelected
                            ? "border-indigo-300 bg-indigo-50/50"
                            : "border-gray-200 bg-white hover:border-[#4f46e5] hover:shadow-xs",
                        ].join(" ")}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{v.productName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-semibold text-[#4f46e5] text-[11px] truncate">
                              {v.sku}
                            </span>
                            {v.attributeText && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded truncate">
                                {v.attributeText}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10.5px] text-gray-500">
                            <span>Tồn hiện tại: <b>{v.onHand}</b> {v.unit}</span>
                            <span>Giá vốn: <b>{vnd(v.costPrice)}</b></span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={[
                            "w-7 h-7 rounded-lg grid place-items-center text-white shrink-0 mt-1",
                            isSelected ? "bg-emerald-600" : "bg-[#4f46e5] hover:bg-[#4338ca]",
                          ].join(" ")}
                        >
                          <Icon name={isSelected ? "check" : "add"} className="text-[16px]" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* CỘT PHẢI: CẤU HÌNH SỐ LƯỢNG, LÔ VÀ ĐỢT HÀNG */}
            <main className="flex flex-col overflow-hidden bg-white">
              {/* Thanh gán nhanh Lô cho toàn bộ đợt đặt hàng */}
              <div className="p-4 border-b border-gray-200 bg-indigo-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12.5px] font-bold text-gray-800 flex items-center gap-1.5">
                    <Icon name="layers" className="text-[17px] text-[#4f46e5]" />
                    Áp dụng thông tin Lô nhanh cho Đợt đặt hàng (Cùng đợt có nhiều biến thể):
                  </span>
                  <button
                    type="button"
                    onClick={applyBatchLotToAll}
                    className="px-3 py-1 rounded-lg bg-[#4f46e5] text-white text-[11.5px] font-bold hover:bg-[#4338ca] shadow-xs"
                  >
                    Gán cho tất cả dòng bên dưới
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-1">Mã Lô (Batch code):</label>
                    <input
                      value={batchLotNumber}
                      onChange={(e) => setBatchLotNumber(e.target.value.toUpperCase())}
                      placeholder="VD: LOT-2026-01"
                      className="h-8 w-full rounded border border-gray-300 bg-white px-2.5 font-mono text-[11.5px] uppercase outline-none focus:border-[#4f46e5]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-1">Ngày sản xuất (NSX):</label>
                    <input
                      type="date"
                      value={batchMfgDate}
                      onChange={(e) => setBatchMfgDate(e.target.value)}
                      className="h-8 w-full rounded border border-gray-300 bg-white px-2 text-[11.5px] outline-none focus:border-[#4f46e5]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-1">Hạn sử dụng (HSD - Mỹ phẩm):</label>
                    <input
                      type="date"
                      value={batchExpDate}
                      onChange={(e) => setBatchExpDate(e.target.value)}
                      className="h-8 w-full rounded border border-gray-300 bg-white px-2 text-[11.5px] outline-none focus:border-[#4f46e5]"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[12px] text-red-700">
                  {error}
                </div>
              )}

              {/* Bảng danh sách SKU cần nhập tồn */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedLines.length === 0 ? (
                  <div className="grid h-64 place-items-center rounded-2xl border-2 border-dashed border-gray-200 text-center p-6 text-gray-400">
                    <div>
                      <Icon name="add_shopping_cart" className="text-[36px] text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-600">Chưa có sản phẩm nào được chọn</p>
                      <p className="text-[12px] mt-1">Chọn từ danh sách bên trái để thêm vào phiếu nạp tồn.</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left text-[12px] border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[10.5px] uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="p-2.5">Sản phẩm &amp; SKU</th>
                        <th className="p-2.5 w-24 text-right">SL Nạp</th>
                        <th className="p-2.5 w-28 text-right">Giá vốn (VND)</th>
                        <th className="p-2.5 w-28">Số Lô (PO)</th>
                        <th className="p-2.5 w-32">NSX &amp; HSD</th>
                        <th className="p-2.5 w-28 text-right">Thành tiền</th>
                        <th className="p-2.5 w-10 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedLines.map((line) => {
                        const lineTotal = line.quantity * line.unitCost;
                        const isCosmetic = line.variant.hasLotTracking;

                        return (
                          <tr key={line.variant.id} className="hover:bg-gray-50/50">
                            <td className="p-2.5">
                              <p className="font-bold text-gray-900 truncate max-w-[200px]">{line.variant.productName}</p>
                              <div className="flex items-center gap-1 text-[11px] font-mono text-[#4f46e5]">
                                <span>{line.variant.sku}</span>
                                {line.variant.attributeText && (
                                  <span className="text-gray-400 font-sans">• {line.variant.attributeText}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {isCosmetic ? "Quản lý Lô & HSD (Mỹ phẩm)" : "Hàng thời trang"}
                              </span>
                            </td>

                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => updateLine(line.variant.id, { quantity: Math.max(1, Number(e.target.value) || 0) })}
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-right font-bold text-gray-900 outline-none focus:border-[#4f46e5]"
                              />
                            </td>

                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={line.unitCost}
                                onChange={(e) => updateLine(line.variant.id, { unitCost: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-gray-800 outline-none focus:border-[#4f46e5]"
                              />
                            </td>

                            <td className="p-2.5">
                              <input
                                type="text"
                                value={line.lotNumber}
                                onChange={(e) => updateLine(line.variant.id, { lotNumber: e.target.value.toUpperCase() })}
                                placeholder="VD: LÔ-01"
                                className="w-24 rounded border border-gray-300 px-2 py-1 font-mono text-[11px] uppercase outline-none focus:border-[#4f46e5]"
                              />
                            </td>

                            <td className="p-2.5">
                              <div className="space-y-1">
                                <input
                                  type="date"
                                  title="Ngày sản xuất (NSX)"
                                  value={line.manufacturingDate}
                                  onChange={(e) => updateLine(line.variant.id, { manufacturingDate: e.target.value })}
                                  className="h-6 w-28 rounded border border-gray-300 px-1 text-[10.5px]"
                                />
                                {isCosmetic ? (
                                  <input
                                    type="date"
                                    title="Hạn sử dụng (HSD)"
                                    value={line.expirationDate}
                                    onChange={(e) => updateLine(line.variant.id, { expirationDate: e.target.value })}
                                    className="h-6 w-28 rounded border border-amber-300 bg-amber-50/50 px-1 text-[10.5px]"
                                  />
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic block">Không có HSD</span>
                                )}
                              </div>
                            </td>

                            <td className="p-2.5 text-right font-bold text-gray-900">
                              {vnd(lineTotal)}
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeLine(line.variant.id)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded"
                              >
                                <Icon name="delete" className="text-[16px]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer Modal: Ghi chú, Tổng tiền & Nút hành động */}
              <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Diễn giải / Căn cứ phiếu kiểm kê nạp tồn..."
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[12px] outline-none focus:border-[#4f46e5]"
                  />
                </div>

                <div className="text-right text-[12.5px] mr-2">
                  <span className="text-gray-500">Tổng tồn: <b className="text-gray-900">{totals.qty.toLocaleString("vi-VN")} cái</b></span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-gray-500">Tổng tiền: <b className="text-[#4f46e5] font-bold">{vnd(totals.val)}</b></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedLines.length === 0}
                    onClick={() => setShowVoucherPreview(true)}
                    className="h-9 px-3 rounded-lg border border-indigo-200 bg-white text-[12.5px] font-bold text-[#4f46e5] hover:bg-indigo-50 shadow-xs flex items-center gap-1 disabled:opacity-40"
                  >
                    <Icon name="receipt_long" className="text-[16px]" />
                    Xem trước A4
                  </button>

                  <button
                    type="button"
                    disabled={saving || selectedLines.length === 0}
                    onClick={() => void handleSubmit(false)}
                    className="h-9 px-4 rounded-lg border border-gray-300 bg-white text-[12.5px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Lưu bản nháp
                  </button>

                  <button
                    type="button"
                    disabled={saving || selectedLines.length === 0}
                    onClick={() => void handleSubmit(true)}
                    className="h-9 px-5 rounded-lg bg-[#4f46e5] text-[13px] font-bold text-white shadow-md hover:bg-[#4338ca] disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Icon name="check_circle" className="text-[17px]" />
                    {saving ? "Đang xử lý..." : "Lưu & Áp dụng ngay"}
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Modal Xem trước Phiếu A4 */}
      {showVoucherPreview && (
        <OpeningStockVoucherModal
          voucherCode={`PKK-${new Date().getFullYear()}-MỚI`}
          businessName={profile?.business?.name || "CỬA HÀNG ERP"}
          businessAddress={profile?.business?.address || "Việt Nam"}
          businessPhone={profile?.business?.phone || "0900000000"}
          creatorName={profile?.user?.fullName || "Quản trị viên"}
          note={note}
          items={voucherItems}
          hasLotTracking={selectedLines.some((l) => l.variant.hasLotTracking)}
          onClose={() => setShowVoucherPreview(false)}
          onConfirmPublish={() => {
            setShowVoucherPreview(false);
            void handleSubmit(true);
          }}
          isPublishing={saving}
        />
      )}
    </>
  );
}
