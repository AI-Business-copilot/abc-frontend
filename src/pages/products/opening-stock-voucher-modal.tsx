import { useMemo } from "react";
import { Icon } from "@/pages/products/ui-icon";

export interface VoucherItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  attributeText: string;
  unit: string;
  quantity: number;
  cost: number;
  lotNumber?: string;
  expirationDate?: string;
  manufacturingDate?: string;
}

interface OpeningStockVoucherModalProps {
  voucherCode?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  creatorName?: string;
  note?: string;
  date?: string;
  items: VoucherItem[];
  hasLotTracking?: boolean;
  onClose: () => void;
  onConfirmPublish?: () => void;
  isPublishing?: boolean;
}

const vnd = (value: number) => new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";

// Hàm chuyển số thành chữ tiếng Việt chuẩn hóa đơn
function numberToVietnameseWords(num: number): string {
  if (num === 0) return "Không đồng";
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function readGroup(n: number): string {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    let res = "";
    if (h > 0 || n >= 100) res += digits[h] + " trăm ";
    if (t > 1) {
      res += digits[t] + " mươi ";
      if (u === 1) res += "mốt";
      else if (u === 5) res += "lăm";
      else if (u > 0) res += digits[u];
    } else if (t === 1) {
      res += "mười ";
      if (u === 5) res += "lăm";
      else if (u > 0) res += digits[u];
    } else if (t === 0 && u > 0) {
      if (h > 0) res += "lẻ ";
      res += digits[u];
    }
    return res.trim();
  }

  let raw = Math.round(num);
  let groupIdx = 0;
  const parts: string[] = [];
  while (raw > 0) {
    const chunk = raw % 1000;
    if (chunk > 0) {
      const s = readGroup(chunk);
      parts.unshift(s + " " + units[groupIdx]);
    }
    raw = Math.floor(raw / 1000);
    groupIdx++;
  }

  const str = parts.join(" ").trim().replace(/\s+/g, " ");
  return str.charAt(0).toUpperCase() + str.slice(1) + " đồng chẵn.";
}

export function OpeningStockVoucherModal({
  voucherCode = "PKK-2026-001",
  businessName = "CỬA HÀNG BÁN LẺ",
  businessAddress = "Việt Nam",
  businessPhone = "0900000000",
  creatorName = "Quản lý kho",
  note = "Kiểm kê nạp tồn kho ban đầu khi tạo sản phẩm mới",
  date = new Date().toLocaleDateString("vi-VN"),
  items,
  hasLotTracking = false,
  onClose,
  onConfirmPublish,
  isPublishing = false,
}: OpeningStockVoucherModalProps) {
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalVal = 0;
    for (const item of items) {
      totalQty += item.quantity;
      totalVal += item.quantity * item.cost;
    }
    return {
      quantity: totalQty,
      value: totalVal,
      words: numberToVietnameseWords(totalVal),
    };
  }, [items]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
      {/* Vùng hộp thoại xem trước và in */}
      <div className="flex h-[94vh] max-h-[900px] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden print:max-w-none print:h-auto print:shadow-none print:rounded-none">
        {/* Header Modal - Ẩn khi in ấn */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3.5 bg-gray-50 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4f46e5] text-white">
              <Icon name="receipt_long" className="text-[22px]" />
            </span>
            <div>
              <h2 className="text-[17px] font-bold text-gray-900">
                Xem Trước Phiếu Kiểm Kê / Nhập Tồn Kho (Chuẩn A4)
              </h2>
              <p className="text-[11.5px] text-gray-500">
                Phiếu nạp tồn đầu kỳ lưu trữ chứng từ kế toán và ký biên bản giao nhận
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3.5 py-2 text-[12.5px] font-bold text-white shadow-sm hover:bg-[#4338ca] transition-colors"
            >
              <Icon name="print" className="text-[18px]" />
              In Phiếu A4
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <Icon name="close" className="text-[22px]" />
            </button>
          </div>
        </div>

        {/* Nội dung Phiếu A4 có thể cuộn hoặc in ấn */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 print:p-0 print:bg-white print:overflow-visible">
          <div className="mx-auto max-w-[780px] bg-white p-8 shadow-sm rounded-xl border border-gray-200 print:border-none print:shadow-none print:p-0">
            {/* Header Doanh nghiệp */}
            <div className="flex items-start justify-between border-b border-gray-300 pb-4">
              <div>
                <h3 className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900">
                  {businessName}
                </h3>
                <p className="text-[12px] text-gray-600 mt-0.5">Địa chỉ: {businessAddress}</p>
                <p className="text-[12px] text-gray-600">Điện thoại: {businessPhone}</p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10.5px] font-mono text-gray-600">
                  Mẫu số 01 - VT (TT 200/BTC)
                </span>
                <p className="font-mono text-[12.5px] font-bold text-[#4f46e5] mt-1.5">
                  Số: {voucherCode}
                </p>
              </div>
            </div>

            {/* Tiêu đề Phiếu */}
            <div className="my-6 text-center">
              <h1 className="text-[21px] font-black uppercase tracking-wider text-gray-900">
                PHIẾU KIỂM KÊ KHO &amp; NHẬP TỒN ĐẦU KỲ
              </h1>
              <p className="text-[12px] text-gray-500 italic mt-1">
                Ngày lập: {date} • Kho hàng: Kho Tổng Chính
              </p>
            </div>

            {/* Thông tin diễn giải */}
            <div className="mb-5 grid grid-cols-2 gap-4 text-[12px] text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 print:bg-transparent print:border-none print:p-0">
              <div>
                <p>
                  <b>Người lập phiếu:</b> {creatorName}
                </p>
                <p className="mt-1">
                  <b>Bộ phận:</b> Quản lý Kho vận &amp; Bán hàng
                </p>
              </div>
              <div>
                <p>
                  <b>Diễn giải:</b> {note}
                </p>
                <p className="mt-1">
                  <b>Chế độ quản lý:</b>{" "}
                  {hasLotTracking ? "Quản lý Lô & Hạn sử dụng (FEFO)" : "Sản phẩm thông thường"}
                </p>
              </div>
            </div>

            {/* Bảng kê chi tiết sản phẩm / biến thể */}
            <table className="w-full border-collapse border border-gray-400 text-[11.5px]">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-bold text-center">
                  <th className="border border-gray-400 p-2 w-10">STT</th>
                  <th className="border border-gray-400 p-2 text-left">Tên sản phẩm &amp; Biến thể</th>
                  <th className="border border-gray-400 p-2 w-28 text-left font-mono">Mã SKU</th>
                  {hasLotTracking && (
                    <th className="border border-gray-400 p-2 w-24 text-center">Lô / HSD</th>
                  )}
                  <th className="border border-gray-400 p-2 w-14 text-center">ĐVT</th>
                  <th className="border border-gray-400 p-2 w-16 text-right">SL Tồn</th>
                  <th className="border border-gray-400 p-2 w-24 text-right">Đơn giá vốn</th>
                  <th className="border border-gray-400 p-2 w-28 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const lineTotal = item.quantity * item.cost;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-400 p-2 text-center">{index + 1}</td>
                      <td className="border border-gray-400 p-2">
                        <div className="font-bold text-gray-900">{item.name}</div>
                        {item.attributeText && (
                          <div className="text-[10px] text-gray-500">{item.attributeText}</div>
                        )}
                        {item.barcode && (
                          <div className="text-[10px] text-[#4f46e5] font-mono">
                            Mã vạch: {item.barcode}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-400 p-2 font-mono text-[11px] font-semibold text-gray-700">
                        {item.sku}
                      </td>
                      {hasLotTracking && (
                        <td className="border border-gray-400 p-2 text-center text-[10.5px]">
                          {item.lotNumber ? (
                            <div>
                              <span className="font-mono font-bold text-indigo-700">
                                {item.lotNumber}
                              </span>
                              {item.expirationDate && (
                                <div className="text-gray-500 text-[10px]">
                                  HSD: {item.expirationDate}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </td>
                      )}
                      <td className="border border-gray-400 p-2 text-center">{item.unit || "Cái"}</td>
                      <td className="border border-gray-400 p-2 text-right font-bold text-gray-900">
                        {item.quantity.toLocaleString("vi-VN")}
                      </td>
                      <td className="border border-gray-400 p-2 text-right text-gray-700">
                        {vnd(item.cost)}
                      </td>
                      <td className="border border-gray-400 p-2 text-right font-bold text-[#4f46e5]">
                        {vnd(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold text-gray-900">
                  <td
                    colSpan={hasLotTracking ? 4 : 3}
                    className="border border-gray-400 p-2 text-right uppercase"
                  >
                    Tổng cộng:
                  </td>
                  <td className="border border-gray-400 p-2 text-center text-[11px] text-gray-600">
                    Khoản
                  </td>
                  <td className="border border-gray-400 p-2 text-right text-[12px] font-black text-indigo-900">
                    {totals.quantity.toLocaleString("vi-VN")}
                  </td>
                  <td className="border border-gray-400 p-2"></td>
                  <td className="border border-gray-400 p-2 text-right text-[12px] font-black text-[#4f46e5]">
                    {vnd(totals.value)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Số tiền viết bằng chữ */}
            <div className="mt-3 text-[12px] text-gray-700 italic">
              <b>Tổng số tiền (bằng chữ):</b> {totals.words}
            </div>

            {/* Chữ ký 3 bên */}
            <div className="mt-10 grid grid-cols-3 gap-4 text-center text-[12px] text-gray-800">
              <div>
                <p className="font-bold">Người lập phiếu</p>
                <p className="text-[10.5px] text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-bold text-gray-900">{creatorName}</p>
              </div>
              <div>
                <p className="font-bold">Thủ kho</p>
                <p className="text-[10.5px] text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-bold text-gray-900">Nguyễn Văn Kho</p>
              </div>
              <div>
                <p className="font-bold">Giám đốc / Kế toán trưởng</p>
                <p className="text-[10.5px] text-gray-500 italic">(Ký, đóng dấu)</p>
                <div className="h-16"></div>
                <p className="font-bold text-gray-900">{businessName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer nút hành động */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3.5 bg-gray-50 print:hidden shrink-0">
          <div className="text-[12.5px] text-gray-600">
            Tổng tồn nhập: <b className="text-gray-900">{totals.quantity} cái</b> • Giá trị:{" "}
            <b className="text-[#4f46e5]">{vnd(totals.value)}</b>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Đóng &amp; Sửa số lượng
            </button>
            {onConfirmPublish && (
              <button
                type="button"
                disabled={isPublishing}
                onClick={onConfirmPublish}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-2 text-[13px] font-bold text-white shadow-md hover:bg-[#4338ca] transition-colors disabled:opacity-50"
              >
                {isPublishing ? "Đang lưu kho..." : "Xác nhận Nhập kho & Hoàn tất"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
