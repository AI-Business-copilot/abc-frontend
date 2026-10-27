import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

const sizes = ["30ml", "50ml", "100ml"];
const versions = [
  { label: "Bản Tiêu Chuẩn", short: "STD", cost: 75000, price: 145000, stock: 20 },
  { label: "Bản Tăng Cường (Plus)", short: "PLUS", cost: 85000, price: 165000, stock: 20 },
];

export function ProductVariantsPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [cost, setCost] = useState(75000);
  const [margin, setMargin] = useState(48.5);
  const [selected, setSelected] = useState(true);

  const variants = useMemo(
    () =>
      sizes.flatMap((size, sizeIndex) =>
        versions.map((version, versionIndex) => ({
          ...version,
          size,
          sku: `SRM-B5-${size.toUpperCase()}-${version.short}`,
          barcode: `89385102940${sizeIndex * 12 + versionIndex * 7 + 12}`,
          stock: version.stock + sizeIndex * 5,
        })),
      ),
    [],
  );
  const totalCost = variants.reduce((total, variant) => total + variant.cost, 0);
  const totalPrice = variants.reduce((total, variant) => total + variant.price, 0);

  return (
    <div className="min-h-screen bg-[#f5f6fa] pb-24 text-[#101828]">
      <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1560px] px-5 py-3">
        <div className="flex items-center justify-between">
          <div><h1 className="text-[18px] font-bold"><span className="mr-2 rounded bg-[#4f46e5] px-2 py-1 text-[12px] text-white">BƯỚC 3 / 4</span>Sinh Biến thể SKU &amp; Định Giá Thương Mại</h1><p className="mt-1 text-[11px] text-[#667085]">Quy trình Khởi tạo Hàng hóa &amp; Biến thể SKU Matrix • Chuẩn hóa dữ liệu ERP đa kênh</p></div>
          <span className="rounded-lg bg-white px-4 py-2 text-[12px] font-semibold shadow-sm"><Icon name="verified_user" className="mr-1 align-middle text-[17px] text-[#067647]" />TMP-2025-0894 <span className="ml-2 text-[#98a2b3]">• 6 SKU khả dụng</span></span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {[
            ["✓", "BƯỚC 1 ✓", "Mẫu sản phẩm cha", "Serum B5 • TMP-2025-0894"],
            ["✓", "BƯỚC 2 ✓", "Thiết lập Thuộc tính", "2 Thuộc tính • 6 Tổ hợp"],
            ["3", "BƯỚC 3 • ĐANG THỰC HIỆN", "Sinh biến thể SKU", "Mã SKU, Barcode, Giá vốn / Bán"],
            ["4", "BƯỚC 4 • SẮP TỚI", "Số dư tồn ban đầu", "inventory_balances & Phân kho"],
          ].map(([number, eyebrow, title, subtitle], index) => <div key={title} className={["rounded-xl px-4 py-3", index === 2 ? "bg-[#4f46e5] text-white" : "bg-white"].join(" ")}><div className="flex items-center gap-3"><span className={["grid h-9 w-9 place-items-center rounded-full text-[18px] font-bold", index === 2 ? "bg-white text-[#4f46e5]" : "bg-[#d1fadf] text-[#067647]"].join(" ")}>{number}</span><div><p className={["text-[10px] font-semibold", index === 2 ? "text-white/80" : "text-[#667085]"].join(" ")}>{eyebrow}</p><p className="text-[14px] font-bold">{title}</p><p className={["text-[11px]", index === 2 ? "text-white/80" : "text-[#667085]"].join(" ")}>{subtitle}</p></div>{index === 2 && <span className="ml-auto rounded bg-white px-2 py-1 text-[10px] font-bold text-[#4338ca]">75%</span>}</div></div>)}
        </div>
        <section className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-lg bg-[#eef0ff] text-[#4338ca]"><Icon name="inventory_2" className="text-[25px]" /></span><div><h2 className="text-[16px] font-bold">Serum Dưỡng Ẩm Phục Hồi Da B5 Concentrated Intensive</h2><p className="text-[11px] text-[#667085]">Mã mẫu cha: <b>TMP-2025-0894</b>　•　Ngành: <b>Mỹ phẩm &amp; Làm đẹp</b>　•　ĐVT chính: <b>Chai (Bottle)</b></p><p className="text-[11px] text-[#4338ca]">Cơ cấu tổ hợp: <b>3 Dung tích (30ml, 50ml, 100ml) × 2 Phiên bản (Chuẩn, Tăng cường) = 6 SKU</b></p></div></div><div className="flex gap-2 text-center"><div className="rounded-lg bg-[#eef3ff] px-5 py-2"><p className="text-[10px] text-[#667085]">TỔNG DỰ PHÓNG VỐN</p><b>585.000 đ</b> <small>/ 1 bộ mẫu</small></div><div className="rounded-lg bg-[#eef3ff] px-5 py-2"><p className="text-[10px] text-[#667085]">BIÊN LỢI NHUẬN</p><b className="text-[#067647]">+47.8%</b></div></div>
        </section>
        <section className="mt-4 grid grid-cols-[1.05fr_1.2fr_1.15fr] items-end gap-3 rounded-xl bg-white p-4">
          <label className="text-[10px] font-bold uppercase">Quy tắc sinh mã SKU <span className="ml-8 text-[#4338ca]">[BRAND]-[CODE]-[VOL]-[VER]</span><div className="mt-1 rounded-lg bg-[#eef3ff] px-3 py-3 font-mono text-[13px]"><b># SRM-B5</b>　-[Dung_tích] -[Phiên_bản]</div></label>
          <label className="text-[10px] font-bold uppercase">Định giá cơ sở &amp; biên lợi nhuận (Margin)<div className="mt-1 flex items-center gap-2"><span className="flex-1 rounded-lg bg-[#eef3ff] px-3 py-3 text-[12px]">Vốn gốc: <input value={cost} onChange={(event) => setCost(Number(event.target.value))} type="number" className="w-24 bg-transparent text-right text-[15px] outline-none" /> đ</span><span className="flex-1 rounded-lg bg-[#eef3ff] px-3 py-3 text-[12px]">Margin: <input value={margin} onChange={(event) => setMargin(Number(event.target.value))} type="number" className="w-14 bg-transparent text-right text-[15px] text-[#067647] outline-none" /> %</span></div></label>
          <button className="h-12 rounded-lg bg-[#deebff] text-[14px] font-semibold text-[#344054]" onClick={() => setSelected(true)}><Icon name="payments" className="mr-2 align-middle text-[18px]" />Áp dụng cho {variants.length} Biến thể</button>
        </section>
        <section className="mt-4 overflow-hidden rounded-xl bg-white">
          <div className="flex items-center justify-between px-4 py-3"><h2 className="text-[16px] font-bold"><span className="mr-2 text-[#067647]">●</span>Danh Sách Biến Thể Hàng Hóa <span className="ml-2 rounded bg-[#eef3ff] px-2 py-1 font-mono text-[11px] text-[#667085]">6 SKUs Generated</span></h2><div className="flex gap-2"><button className="rounded-lg bg-[#f2f4f7] px-3 py-2 text-[11px] text-[#667085]"><Icon name="filter_alt" className="mr-1 align-middle text-[15px]" />Lọc thuộc tính nhanh...</button><button className="rounded-lg bg-[#f2f4f7] px-3 py-2 text-[11px] text-[#667085]"><Icon name="print" className="mr-1 align-middle text-[15px]" />In tem mã vạch</button></div></div>
          <table className="w-full text-left text-[12px]"><thead className="bg-[#eef3ff] text-[10px] uppercase text-[#667085]"><tr><th className="w-12 px-4 py-3"><input type="checkbox" checked={selected} onChange={(event) => setSelected(event.target.checked)} /></th><th className="px-2 py-3">Biến thể &amp; thuộc tính</th><th className="px-2 py-3">Mã SKU ERP</th><th className="px-2 py-3">Mã vạch barcode</th><th className="px-2 py-3">Giá vốn (cost)</th><th className="px-2 py-3">Giá bán lẻ (retail)</th><th className="px-2 py-3">Biên LN (%)</th><th className="px-2 py-3">Tồn an toàn</th><th className="px-2 py-3">Trạng thái</th><th className="px-2 py-3">Thao tác</th></tr></thead><tbody>{variants.map((variant) => <tr key={variant.sku} className="border-b border-[#eaecf0]"><td className="px-4 py-4"><input type="checkbox" checked={selected} onChange={(event) => setSelected(event.target.checked)} /></td><td className="px-2 py-3"><b className="block text-[14px]">Serum B5 {variant.size} Bản {variant.short === "STD" ? "Tiêu Chuẩn" : "Tăng Cường (Plus)"}</b><span className="mt-1 inline-block rounded bg-[#eef3ff] px-2 py-1 text-[10px]">{variant.size}</span></td><td className="px-2"><code className="rounded bg-[#eef3ff] px-2 py-2 font-semibold">{variant.sku}</code></td><td className="px-2"><code className="rounded bg-[#eef3ff] px-2 py-2">{variant.barcode}</code></td><td className="px-2"><span className="rounded bg-[#eef3ff] px-3 py-2">{variant.cost.toLocaleString("vi-VN")}</span></td><td className="px-2"><span className="rounded bg-[#eef0ff] px-3 py-2 font-semibold text-[#4338ca]">{variant.price.toLocaleString("vi-VN")}</span></td><td className="px-2"><span className="rounded bg-[#6ce7b7] px-2 py-1">{((variant.price - variant.cost) / variant.price * 100).toFixed(1)}%</span></td><td className="px-2"><span className="rounded bg-[#eef3ff] px-4 py-2">{variant.stock}</span></td><td className="px-2"><span className="rounded-full bg-[#6ce7b7] px-2 py-1 text-[10px]">Active</span></td><td className="px-2 text-[#667085]"><Icon name="edit" className="mr-2 text-[17px]" /><Icon name="content_copy" className="text-[17px]" /></td></tr>)}</tbody><tfoot className="bg-[#eef3ff]"><tr><td colSpan={4} className="px-4 py-3 font-mono">Tổng Giá Vốn: <b>{totalCost.toLocaleString("vi-VN")} đ</b>　•　Tổng Giá Bán: <b className="text-[#4338ca]">{totalPrice.toLocaleString("vi-VN")} đ</b></td><td colSpan={6} /></tr></tfoot></table>
        </section>
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eaecf0] bg-white px-5 py-3"><div className="mx-auto flex max-w-[1560px] justify-between"><button onClick={() => navigate("/products/new/attributes")} className="rounded-lg bg-[#eaf0ff] px-5 py-3 text-[14px] font-semibold text-[#344054]">← Quay lại: Bước 2 - Thuộc tính</button><button onClick={() => navigate("/products/new/inventory")} className="rounded-lg bg-[#4f46e5] px-7 py-3 text-[15px] font-bold text-white">Tiếp tục: Bước 4 - Thiết lập Tồn kho Ban đầu (Inventory) <Icon name="arrow_forward" className="ml-2 align-middle text-[20px]" /></button></div></footer>
    </div>
  );
}
