import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  const [a4Orientation, setA4Orientation] = useState<"portrait" | "landscape">("landscape");
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
    <>
      {/* 1. Màn hình Xem trước & Cấu hình (Ẩn hoàn toàn khi in) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
        <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header Modal */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4f46e5] text-white">
                <Icon name="print" className="text-[22px]" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold text-gray-900">
                  In Tem Mã Vạch Barcode (Chuẩn Code128 / EAN-13 Quét Cực Nhạy)
                </h2>
                <p className="text-[12px] text-gray-500">
                  Hỗ trợ cả máy in nhiệt cuộn (Xprinter, Zebra) và máy in văn phòng giấy decal A4
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
                  1. Chọn Máy in &amp; Khổ tem decal
                </label>
                <div className="mt-2 space-y-2">
                  <label className={["flex items-center gap-2 rounded-lg border p-2.5 text-[12.5px] font-medium cursor-pointer transition-colors", labelSize === "50x30" ? "border-[#4f46e5] bg-indigo-50/50 text-[#4f46e5]" : "border-gray-200 bg-white hover:border-gray-300"].join(" ")}>
                    <input
                      type="radio"
                      name="labelsize"
                      checked={labelSize === "50x30"}
                      onChange={() => setLabelSize("50x30")}
                      className="accent-[#4f46e5]"
                    />
                    <div>
                      <b className="block">Decal cuộn: 50mm × 30mm</b>
                      <span className="text-[11px] text-gray-500">Máy in nhiệt Xprinter / Bixolon 1 hàng</span>
                    </div>
                  </label>

                  <label className={["flex items-center gap-2 rounded-lg border p-2.5 text-[12.5px] font-medium cursor-pointer transition-colors", labelSize === "35x22" ? "border-[#4f46e5] bg-indigo-50/50 text-[#4f46e5]" : "border-gray-200 bg-white hover:border-gray-300"].join(" ")}>
                    <input
                      type="radio"
                      name="labelsize"
                      checked={labelSize === "35x22"}
                      onChange={() => setLabelSize("35x22")}
                      className="accent-[#4f46e5]"
                    />
                    <div>
                      <b className="block">Decal cuộn: 35mm × 22mm</b>
                      <span className="text-[11px] text-gray-500">Máy in nhiệt khổ nhỏ (mỹ phẩm, phụ kiện)</span>
                    </div>
                  </label>

                  <label className={["flex items-center gap-2 rounded-lg border p-2.5 text-[12.5px] font-medium cursor-pointer transition-colors", labelSize === "a4" ? "border-[#4f46e5] bg-indigo-50/50 text-[#4f46e5]" : "border-gray-200 bg-white hover:border-gray-300"].join(" ")}>
                    <input
                      type="radio"
                      name="labelsize"
                      checked={labelSize === "a4"}
                      onChange={() => setLabelSize("a4")}
                      className="accent-[#4f46e5]"
                    />
                    <div>
                      <b className="block">Tờ Decal A4 (Tomy 145 / Grid)</b>
                      <span className="text-[11px] text-gray-500">In lưới nhiều tem trên máy in văn phòng A4 / PDF</span>
                    </div>
                  </label>

                  {labelSize === "a4" && (
                    <div className="ml-6 flex items-center gap-4 text-[12px] bg-white p-2 rounded-lg border border-gray-200">
                      <span className="text-gray-500 font-medium">Hướng in:</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="a4_orient"
                          value="landscape"
                          checked={a4Orientation === "landscape"}
                          onChange={() => setA4Orientation("landscape")}
                          className="accent-[#4f46e5]"
                        />
                        <span>Khổ ngang (Landscape - 5 cột)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="a4_orient"
                          value="portrait"
                          checked={a4Orientation === "portrait"}
                          onChange={() => setA4Orientation("portrait")}
                          className="accent-[#4f46e5]"
                        />
                        <span>Khổ dọc (4 cột)</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[12.5px] font-bold text-gray-700 uppercase tracking-wide">
                  2. Thông tin hiển thị trên tem
                </label>
                <div className="mt-2 space-y-2 text-[13px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showShopName}
                      onChange={(e) => setShowShopName(e.target.checked)}
                      className="rounded accent-[#4f46e5]"
                    />
                    <span>Hiện tên doanh nghiệp ({shopName})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSku}
                      onChange={(e) => setShowSku(e.target.checked)}
                      className="rounded accent-[#4f46e5]"
                    />
                    <span>Hiện mã SKU nội bộ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="rounded accent-[#4f46e5]"
                    />
                    <span>Hiện giá bán lẻ niêm yết (VNĐ)</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[12.5px] font-bold text-gray-700 uppercase tracking-wide">
                    3. Số lượng tem ({printableItems.length} con tem)
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
                        max={500}
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] py-3.5 text-[14px] font-bold text-white shadow-lg shadow-indigo-200 hover:bg-[#4338ca] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Icon name="print" className="text-[20px]" />
                  In {printableItems.length} con tem ngay
                </button>
                <p className="mt-2 text-center text-[11px] text-gray-400">
                  {labelSize === "a4" ? "Chế độ A4: In trên giấy Tomy nhiều tem" : "Chế độ cuộn: Mỗi tem 1 trang giấy nhiệt"}
                </p>
              </div>
            </aside>

            {/* CỘT PHẢI: XEM TRƯỚC BẢN IN */}
            <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
              <div className="mb-3 flex items-center justify-between text-[13px] text-gray-600">
                <span className="font-medium">
                  Xem trước: Tổng cộng <b>{printableItems.length}</b> con tem
                </span>
                <span className="rounded bg-indigo-50 px-2.5 py-1 text-[12px] font-bold text-[#4f46e5]">
                  {labelSize === "50x30" ? "Cuộn 50 × 30 mm" : labelSize === "35x22" ? "Cuộn 35 × 22 mm" : "Tờ A4 Tomy Grid"}
                </span>
              </div>

              {printableItems.length === 0 ? (
                <div className="grid h-80 place-items-center rounded-2xl border-2 border-dashed border-gray-300 bg-white text-gray-400">
                  <p>Chưa chọn số lượng tem để in. Vui lòng tăng số lượng ở cột bên trái.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 justify-start">
                  {printableItems.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="bg-white shadow-sm border border-gray-300 rounded-xl flex flex-col justify-between items-center text-center p-2.5 text-black w-[240px] h-[155px] overflow-hidden"
                    >
                      {/* Header tem */}
                      <div className="w-full border-b border-gray-200 pb-1 leading-tight">
                        {showShopName && (
                          <p className="text-[9px] font-black uppercase tracking-wider text-gray-600 truncate">
                            {shopName}
                          </p>
                        )}
                        <p className="text-[11px] font-bold text-gray-900 truncate mt-0.5" title={item.templateName}>
                          {item.templateName}
                        </p>
                        {item.attributeText && (
                          <span className="inline-block bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[9.5px] font-semibold mt-0.5 truncate max-w-full">
                            {item.attributeText}
                          </span>
                        )}
                      </div>

                      {/* Barcode SVG quét cực nhạy */}
                      <div className="w-full flex justify-center items-center my-1 px-1 overflow-hidden">
                        <BarcodeSvg
                          value={item.barcode || item.sku}
                          width={1.3}
                          height={30}
                          fontSize={9.5}
                          displayValue={true}
                        />
                      </div>

                      {/* Footer tem: SKU và Giá có khoảng cách rõ ràng */}
                      <div className="w-full flex items-center justify-between gap-2 border-t border-gray-200 pt-1 text-[10px] leading-none">
                        {showSku && (
                          <span className="font-mono text-gray-700 font-semibold truncate flex-1 min-w-0 text-left" title={item.sku}>
                            {item.sku}
                          </span>
                        )}
                        {showPrice && (
                          <span className="font-bold text-[#d92d20] text-[11.5px] shrink-0 ml-auto whitespace-nowrap">
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
      </div>

      {/* 2. Portal in ấn chuyên dụng vào document.body */}
      {createPortal(
        <div id="printable-barcode-portal">
          <style>{`
            @media screen {
              #printable-barcode-portal {
                display: none !important;
              }
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 100% !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body > *:not(#printable-barcode-portal) {
                display: none !important;
              }
              #printable-barcode-portal {
                display: block !important;
                position: static !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }

              /* A4 GRID MODE */
              ${labelSize === "a4" ? `
                @page {
                  size: A4 ${a4Orientation};
                  margin: 6mm 6mm 6mm 6mm;
                }
                .barcode-print-grid {
                  display: grid !important;
                  grid-template-columns: ${a4Orientation === "landscape" ? "repeat(5, 1fr)" : "repeat(4, 1fr)"} !important;
                  gap: 2.5mm !important;
                  width: 100% !important;
                  box-sizing: border-box !important;
                }
                .barcode-print-card {
                  border: 1px dashed #777777 !important;
                  border-radius: 3px !important;
                  width: 100% !important;
                  height: 31mm !important;
                  max-height: 31mm !important;
                  padding: 1.5mm 2mm !important;
                  box-sizing: border-box !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                  text-align: center !important;
                  background: #ffffff !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: hidden !important;
                }
              ` : `
                /* ROLL THERMAL PRINTER MODE */
                @page {
                  size: ${labelSize === "50x30" ? "50mm 30mm" : "35mm 22mm"};
                  margin: 0 !important;
                }
                .barcode-print-grid {
                  display: block !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .barcode-print-card {
                  width: ${labelSize === "50x30" ? "50mm" : "35mm"} !important;
                  height: ${labelSize === "50x30" ? "30mm" : "22mm"} !important;
                  max-width: ${labelSize === "50x30" ? "50mm" : "35mm"} !important;
                  max-height: ${labelSize === "50x30" ? "30mm" : "22mm"} !important;
                  padding: 1mm 1.5mm !important;
                  box-sizing: border-box !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                  text-align: center !important;
                  background: #ffffff !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: hidden !important;
                }
              `}

              .price-tag {
                white-space: nowrap !important;
                font-weight: bold !important;
              }
            }
          `}</style>

          <div className="barcode-print-grid">
            {printableItems.map((item, idx) => (
              <div key={`print-${item.id}-${idx}`} className="barcode-print-card">
                {/* Header nhãn tem */}
                <div style={{ width: "100%", overflow: "hidden", lineHeight: 1.15 }}>
                  {showShopName && (
                    <div style={{ fontSize: labelSize === "35x22" ? "5.5pt" : "6.5pt", fontWeight: "bold", textTransform: "uppercase", color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {shopName}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: labelSize === "35x22" ? "5.5pt" : item.templateName.length > 22 ? "6.5pt" : "7.2pt",
                      fontWeight: "bold",
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={item.templateName}
                  >
                    {item.templateName}
                  </div>
                  {item.attributeText && (
                    <div style={{ fontSize: labelSize === "35x22" ? "5pt" : "5.8pt", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#555" }}>
                      {item.attributeText}
                    </div>
                  )}
                </div>

                {/* Vạch Barcode thật quét cực nhạy */}
                <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", margin: labelSize === "35x22" ? "0.2mm 0" : "0.5mm 0" }}>
                  <BarcodeSvg
                    value={item.barcode || item.sku}
                    width={labelSize === "35x22" ? 0.9 : 1.15}
                    height={labelSize === "35x22" ? 15 : 21}
                    fontSize={labelSize === "35x22" ? 6 : 7.5}
                    displayValue={true}
                    margin={1}
                    textMargin={1}
                  />
                </div>

                {/* Footer nhãn tem: SKU & Giá bán có khoảng cách rõ ràng, không bao giờ đè chữ */}
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px", fontSize: "6.5pt", lineHeight: 1 }}>
                  {showSku && (
                    <span style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: labelSize === "35x22" ? "5.5pt" : "6.2pt", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: "1 1 auto", minWidth: 0, textAlign: "left" }}>
                      {item.sku}
                    </span>
                  )}
                  {showPrice && (
                    <span className="price-tag" style={{ fontSize: labelSize === "35x22" ? "6.8pt" : "8pt", fontWeight: "900", color: "#000", whiteSpace: "nowrap", flex: "0 0 auto", marginLeft: "auto" }}>
                      {vnd(item.price)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
