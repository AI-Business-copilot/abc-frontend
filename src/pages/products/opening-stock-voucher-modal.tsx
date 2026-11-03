import { useMemo } from "react";
import { createPortal } from "react-dom";
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

// Hàm chuyển số thành chữ tiếng Việt chuẩn hóa đơn kế toán
function numberToVietnameseWords(num: number): string {
  if (num === 0) return "Không đồng chẵn.";
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
  creatorName = "Quản trị viên",
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

  const voucherDocumentBody = (
    <div className="a4-voucher-content font-sans text-black leading-tight text-[11px]">
      {/* Header Doanh nghiệp */}
      <div className="flex items-start justify-between border-b-2 border-black pb-2">
        <div>
          <h3 className="text-[14px] font-black uppercase tracking-wider text-black">
            {businessName}
          </h3>
          <p className="text-[10px] text-gray-700 mt-0.5">Địa chỉ: {businessAddress}</p>
          <p className="text-[10px] text-gray-700">Điện thoại: {businessPhone}</p>
        </div>
        <div className="text-right">
          <span className="inline-block border border-black bg-gray-50 px-2 py-0.5 text-[9px] font-mono font-bold text-black">
            Mẫu số 01 - VT (TT 88/2021 &amp; TT 200/2014/TT-BTC)
          </span>
          <p className="font-mono text-[12px] font-black text-black mt-1">
            Số: {voucherCode}
          </p>
        </div>
      </div>

      {/* Tiêu đề Phiếu */}
      <div className="my-3 text-center">
        <h1 className="text-[17px] font-black uppercase tracking-wider text-black">
          PHIẾU KIỂM KÊ KHO &amp; NHẬP TỒN ĐẦU KỲ
        </h1>
        <p className="text-[10.5px] text-gray-600 italic mt-0.5">
          Ngày lập: {date} • Địa điểm: {businessAddress}
        </p>
      </div>

      {/* Thông tin diễn giải */}
      <div className="mb-2.5 text-[10.5px] text-black">
        <div className="grid grid-cols-2 gap-4 border border-gray-300 p-2 rounded">
          <p>
            <b>Người lập biểu:</b> {creatorName}
          </p>
          <p>
            <b>Diễn giải / Căn cứ:</b> {note}
          </p>
        </div>
      </div>

      {/* Bảng kê chi tiết sản phẩm / biến thể */}
      <table className="w-full border-collapse border border-black text-[10.5px] voucher-table">
        <thead>
          <tr className="bg-gray-100 text-black font-bold text-center">
            <th className="border border-black p-1.5 w-8">STT</th>
            <th className="border border-black p-1.5 text-left">Tên sản phẩm &amp; Biến thể</th>
            <th className="border border-black p-1.5 w-24 text-left font-mono">Mã SKU</th>
            {hasLotTracking && (
              <th className="border border-black p-1.5 w-20 text-center">Lô / HSD</th>
            )}
            <th className="border border-black p-1.5 w-12 text-center">ĐVT</th>
            <th className="border border-black p-1.5 w-14 text-right">SL Tồn</th>
            <th className="border border-black p-1.5 w-20 text-right">Đơn giá vốn</th>
            <th className="border border-black p-1.5 w-24 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const lineTotal = item.quantity * item.cost;
            return (
              <tr key={item.id} className="avoid-break">
                <td className="border border-black p-1.5 text-center">{index + 1}</td>
                <td className="border border-black p-1.5">
                  <div className="font-bold text-black">{item.name}</div>
                  {item.attributeText && (
                    <div className="text-[9.5px] text-gray-600">{item.attributeText}</div>
                  )}
                  {item.barcode && (
                    <div className="text-[9px] text-gray-700 font-mono">
                      Mã vạch: {item.barcode}
                    </div>
                  )}
                </td>
                <td className="border border-black p-1.5 font-mono text-[10px] font-semibold text-black">
                  {item.sku}
                </td>
                {hasLotTracking && (
                  <td className="border border-black p-1.5 text-center text-[9.5px]">
                    {item.lotNumber ? (
                      <div>
                        <span className="font-mono font-bold text-black">{item.lotNumber}</span>
                        {item.expirationDate && (
                          <div className="text-gray-600 text-[9px]">HSD: {item.expirationDate}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                )}
                <td className="border border-black p-1.5 text-center">{item.unit || "Cái"}</td>
                <td className="border border-black p-1.5 text-right font-bold text-black">
                  {item.quantity.toLocaleString("vi-VN")}
                </td>
                <td className="border border-black p-1.5 text-right text-black">
                  {vnd(item.cost)}
                </td>
                <td className="border border-black p-1.5 text-right font-bold text-black">
                  {vnd(lineTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold text-black avoid-break">
            <td
              colSpan={hasLotTracking ? 4 : 3}
              className="border border-black p-1.5 text-right uppercase font-bold"
            >
              Tổng cộng:
            </td>
            <td className="border border-black p-1.5 text-center text-[10px]">Khoản</td>
            <td className="border border-black p-1.5 text-right text-[11px] font-black text-black">
              {totals.quantity.toLocaleString("vi-VN")}
            </td>
            <td className="border border-black p-1.5"></td>
            <td className="border border-black p-1.5 text-right text-[11px] font-black text-black">
              {vnd(totals.value)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Số tiền viết bằng chữ */}
      <div className="mt-2 text-[10.5px] text-black italic avoid-break">
        <b>Tổng số tiền (bằng chữ):</b> {totals.words}
      </div>

      {/* Chữ ký 2 bên: Người lập biểu & Chủ shop (Hộ kinh doanh / Doanh nghiệp) */}
      <div className="mt-8 grid grid-cols-2 gap-8 text-center text-[11px] text-black avoid-break">
        <div>
          <p className="font-bold text-[11.5px] uppercase">Người lập biểu</p>
          <p className="text-[9.5px] text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
          <div className="h-14"></div>
          <p className="font-bold text-black text-[12px]">{creatorName}</p>
        </div>
        <div>
          <p className="font-bold text-[11.5px] uppercase">Người kiểm duyệt / Chủ cửa hàng</p>
          <p className="text-[9.5px] text-gray-500 italic mt-0.5">(Ký, xác nhận biên bản)</p>
          <div className="h-14"></div>
          <p className="font-bold text-black text-[12px]">{businessName}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Modal xem trước trên màn hình */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
        <div className="flex h-[94vh] max-h-[900px] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header Modal */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3.5 bg-gray-50 shrink-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4f46e5] text-white">
                <Icon name="receipt_long" className="text-[22px]" />
              </span>
              <div>
                <h2 className="text-[17px] font-bold text-gray-900">
                  Xem Trước Phiếu Kiểm Kê / Nhập Tồn Kho (Khổ A4 Chuẩn)
                </h2>
                <p className="text-[11.5px] text-gray-500">
                  Phiếu nạp tồn đầu kỳ lưu trữ chứng từ kế toán và ký biên bản giao nhận (Chuẩn 1 trang A4)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-[#4338ca] transition-colors"
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

          {/* Vùng xem trước tương tác */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
            <div className="mx-auto max-w-[780px] bg-white p-8 shadow-sm rounded-xl border border-gray-200">
              {voucherDocumentBody}
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3.5 bg-gray-50 shrink-0">
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

      {/* 2. Portal in ấn A4 chuẩn trực tiếp vào document.body - Hoàn toàn độc lập khỏi modal */}
      {createPortal(
        <div id="printable-voucher-portal">
          <style>{`
            @media screen {
              #printable-voucher-portal {
                display: none !important;
              }
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 12mm 8mm 12mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body > *:not(#printable-voucher-portal) {
                display: none !important;
              }
              #printable-voucher-portal {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }
              .avoid-break {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              .voucher-table th, .voucher-table td {
                padding: 3.5px 5px !important;
                font-size: 10px !important;
              }
            }
          `}</style>
          {voucherDocumentBody}
        </div>,
        document.body,
      )}
    </>
  );
}
