import { useMemo, useState } from "react";
import { Icon } from "@/pages/products/ui-icon";
import { BarcodeSvg } from "@/components/barcode/barcode-svg";

export interface PrintableVariant {
  id: string;
  sku: string;
  barcode: string;
  templateName: string;
  attributeText: string;
  price: number;
}

interface BarcodePrintModalProps {
  shopName?: string;
  variants: PrintableVariant[];
  onClose: () => void;
}

type LabelSize = "50x30" | "35x22" | "a4";

const vnd = (value: number) => new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";

export function BarcodePrintModal({
  shopName = "CỬA HÀNG ERP",
  variants,
  onClose,
}: BarcodePrintModalProps) {
  // Số lượng in cho từng biến thể: mặc định mỗi loại 1 tem
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const v of variants) {
      init[v.id] = 1;
    }
    return init;
  });

  const [labelSize, setLabelSize] = useState<LabelSize>("50x30");
  const [showShopName, setShowShopName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);

  const setAllQuantities = (qty: number) => {
    const next: Record<string, number> = {};
    for (const v of variants) {
      next[v.id] = qty;
    }
    setQuantities(next);
  };

  const updateQuantity = (id: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, qty),
    }));
  };

  // Danh sách các con tem thực tế sẽ được in ra
  const printableItems = useMemo(() => {
    const items: Array<PrintableVariant & { printIndex: number }> = [];
    let count = 0;
    for (const v of variants) {
      const q = quantities[v.id] || 0;
      for (let i = 0; i < q; i++) {
        items.push({ ...v, printIndex: ++count });
      }
    }
    return items;
  }, [variants, quantities]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Vùng xem trước và cấu hình trên màn hình */}
      <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden print:hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4f46e5] text-white">
              <Icon name="print" className="text-[22px]" />
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-gray-900">
                In Tem Mã Vạch Sản Phẩm (Barcode Label Print)
              </h2>
              <p className="text-[12px] text-gray-500">
                Chuẩn mã vạch Code-128 / EAN-13 quét được 100% bằng máy quét súng laser và camera điện thoại
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

        {/* Nội dung 2 cột: Cột cấu hình & Cột xem trước tem in */}
        <div className="grid flex-1 grid-cols-[340px_1fr] overflow-hidden">
          {/* CỘT TRÁI: CẤU HÌNH IN */}
          <aside className="border-r border-gray-200 bg-[#f9fafb] p-5 overflow-y-auto space-y-5">
            <div>
              <label className="text-[12.5px] font-bold text-gray-700 uppercase tracking-wide">
                1. Khổ giấy in tem decal
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-[13px] font-medium cursor-pointer hover:border-[#4f46e5]">
                  <input
                    type="radio"
                    name="labelsize"
                    checked={labelSize === "50x30"}
                    onChange={() => setLabelSize("50x30")}
                  />
                  <span><b>Khổ 1 tem: 50mm × 30mm</b> (Phổ biến nhất)</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-[13px] font-medium cursor-pointer hover:border-[#4f46e5]">
                  <input
                    type="radio"
                    name="labelsize"
                    checked={labelSize === "35x22"}
                    onChange={() => setLabelSize("35x22")}
                  />
                  <span><b>Khổ 2 tem: 35mm × 22mm</b> (Máy in Xprinter)</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-[13px] font-medium cursor-pointer hover:border-[#4f46e5]">
                  <input
                    type="radio"
                    name="labelsize"
                    checked={labelSize === "a4"}
                    onChange={() => setLabelSize("a4")}
                  />
                  <span><b>Khổ A4</b> (Nhiều tem trên 1 trang giấy)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-[12.5px] font-bold text-gray-700 uppercase tracking-wide">
                2. Nội dung hiển thị trên tem
              </label>
              <div className="mt-2 space-y-2 text-[13px]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showShopName}
                    onChange={(e) => setShowShopName(e.target.checked)}
                    className="rounded text-[#4f46e5]"
                  />
                  <span>Hiện tên cửa hàng ({shopName})</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSku}
                    onChange={(e) => setShowSku(e.target.checked)}
                    className="rounded text-[#4f46e5]"
                  />
                  <span>Hiện mã SKU ERP</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-[#4f46e5]"
                  />
                  <span>Hiện giá bán lẻ niêm yết (VNĐ)</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[12.5px] font-bold text-gray-700 uppercase tracking-wide">
                  3. Số lượng tem in ({printableItems.length} tem)
                </label>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAllQuantities(1)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Mỗi loại 1
                </button>
                <button
                  type="button"
                  onClick={() => setAllQuantities(2)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Mỗi loại 2
                </button>
                <button
                  type="button"
                  onClick={() => setAllQuantities(5)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Mỗi loại 5
                </button>
              </div>

              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 text-[12px]">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border-b border-gray-100 pb-1.5 last:border-none">
                    <div className="truncate pr-2">
                      <p className="font-semibold text-gray-800 truncate">{v.attributeText || v.sku}</p>
                      <p className="font-mono text-[10.5px] text-gray-500">{v.barcode || v.sku}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={quantities[v.id] ?? 1}
                      onChange={(e) => updateQuantity(v.id, Number(e.target.value))}
                      className="w-14 rounded border border-gray-300 px-1.5 py-1 text-center font-bold text-[#4f46e5] outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={printableItems.length === 0}
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] py-3.5 text-[14px] font-bold text-white shadow-lg shadow-indigo-200 hover:bg-[#4338ca] disabled:opacity-50"
              >
                <Icon name="print" className="text-[20px]" />
                In {printableItems.length} con tem ngay
              </button>
              <p className="mt-2 text-center text-[11px] text-gray-400">
                Phím tắt: Nhấn Ctrl + P sau khi mở hộp thoại
              </p>
            </div>
          </aside>

          {/* CỘT PHẢI: XEM TRƯỚC BẢN IN (PRINT PREVIEW) */}
          <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
            <div className="mb-3 flex items-center justify-between text-[13px] text-gray-600">
              <span className="font-medium">
                Xem trước trang in: Tổng cộng <b>{printableItems.length}</b> con tem decal
              </span>
              <span className="rounded bg-indigo-50 px-2.5 py-1 text-[12px] font-bold text-[#4f46e5]">
                Định dạng: {labelSize === "50x30" ? "50 × 30 mm" : labelSize === "35x22" ? "35 × 22 mm" : "Khổ A4"}
              </span>
            </div>

            {printableItems.length === 0 ? (
              <div className="grid h-80 place-items-center rounded-2xl border-2 border-dashed border-gray-300 bg-white text-gray-400">
                <p>Chưa chọn số lượng tem để in. Vui lòng tăng số lượng ở cột bên trái.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-5 justify-start">
                {printableItems.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className={[
                      "bg-white shadow-md border-2 border-dashed border-gray-300 hover:border-[#4f46e5] rounded-xl flex flex-col justify-between items-center text-center p-3 text-black transition-all hover:scale-[1.02]",
                      labelSize === "50x30" ? "w-[260px] min-h-[165px]" : "w-[210px] min-h-[135px]",
                    ].join(" ")}
                  >
                    {/* Header tem */}
                    <div className="w-full border-b border-gray-200 pb-1">
                      {showShopName && (
                        <p className="text-[9.5px] font-black uppercase tracking-wider text-gray-700 truncate">
                          {shopName}
                        </p>
                      )}
                      <p className="text-[12px] font-black text-gray-900 truncate mt-0.5" title={item.templateName}>
                        {item.templateName}
                      </p>
                      {item.attributeText && (
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <span className="inline-block bg-gray-100 text-gray-900 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-black tracking-wide">
                            {item.attributeText}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Vạch Barcode thật quét được 100% */}
                    <div className="w-full flex justify-center items-center my-1.5 px-1 overflow-hidden">
                      <BarcodeSvg
                        value={item.barcode || item.sku}
                        width={labelSize === "50x30" ? 1.4 : 1.1}
                        height={labelSize === "50x30" ? 34 : 26}
                        fontSize={labelSize === "50x30" ? 10.5 : 8.5}
                        displayValue={true}
                      />
                    </div>

                    {/* Footer tem: SKU và Giá */}
                    <div className="w-full flex items-center justify-between border-t border-gray-200 pt-1 text-[10.5px]">
                      {showSku && (
                        <span className="font-mono text-gray-700 font-bold truncate max-w-[110px]" title={item.sku}>
                          {item.sku}
                        </span>
                      )}
                      {showPrice && (
                        <span className="font-black text-[#d92d20] text-[13px] ml-auto">
                          {vnd(item.price)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KHUNG IN THỰC TẾ TRÌNH DUYỆT BẮT ĐẦU KHI GỌI WINDOW.PRINT() */}
      {/* ========================================================= */}
      <div className="hidden print:block print:w-full print:m-0 print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { margin: 0 !important; padding: 0 !important; background: white !important; }
            @page {
              margin: 0;
              size: auto;
            }
            .thermal-label {
              page-break-inside: avoid;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              box-sizing: border-box;
              text-align: center;
              color: black;
              background: white;
              overflow: hidden;
            }
            .label-50x30 {
              width: 50mm;
              height: 30mm;
              padding: 1.5mm;
            }
            .label-35x22 {
              width: 35mm;
              height: 22mm;
              padding: 1mm;
            }
          }
        `}} />

        <div className="print:flex print:flex-wrap">
          {printableItems.map((item, idx) => (
            <div
              key={`print-${item.id}-${idx}`}
              className={[
                "thermal-label",
                labelSize === "50x30" ? "label-50x30" : "label-35x22",
              ].join(" ")}
            >
              <div style={{ width: "100%", overflow: "hidden", lineHeight: 1.1 }}>
                {showShopName && (
                  <div style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase" }}>
                    {shopName}
                  </div>
                )}
                <div style={{ fontSize: "8pt", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden" }}>
                  {item.templateName}
                </div>
                <div style={{ fontSize: "7pt", whiteSpace: "nowrap", overflow: "hidden" }}>
                  {item.attributeText}
                </div>
              </div>

              <div style={{ width: "100%", display: "flex", justifyContent: "center", margin: "1mm 0" }}>
                <BarcodeSvg
                  value={item.barcode || item.sku}
                  width={labelSize === "50x30" ? 1.3 : 1.0}
                  height={labelSize === "50x30" ? 30 : 22}
                  fontSize={8}
                  displayValue={true}
                />
              </div>

              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "7pt" }}>
                {showSku && <span style={{ fontFamily: "monospace" }}>{item.sku}</span>}
                {showPrice && (
                  <span style={{ fontWeight: "bold", fontSize: "9pt", marginLeft: "auto" }}>
                    {vnd(item.price)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
