import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

type Attribute = {
  id: number;
  name: string;
  order: number;
  values: string[];
};

const initialAttributes: Attribute[] = [
  { id: 1, name: "Dung tích (Volume)", order: 10, values: ["30ml #30", "50ml #50", "100ml #100"] },
  { id: 2, name: "Phiên bản / Công thức", order: 20, values: ["Bản Tiêu Chuẩn (Standard) #STD", "Bản Tăng Cường (Intensive - Extra Panthenol) #INT"] },
];

function AttributeCard({
  attribute,
  onChange,
  onRemove,
}: {
  attribute: Attribute;
  onChange: (attribute: Attribute) => void;
  onRemove: () => void;
}) {
  const [newValue, setNewValue] = useState("");

  const addValue = () => {
    const value = newValue.trim();
    if (!value) return;
    onChange({ ...attribute, values: [...attribute.values, value] });
    setNewValue("");
  };

  return (
    <section className="rounded-2xl border border-[#e8eaf0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
      <div className="flex items-center gap-2">
        <Icon name="drag_indicator" className="text-[20px] text-[#667085]" />
        <span className="rounded bg-[#eef0ff] px-2 py-1 text-[13px] font-bold text-[#4338ca]">#{attribute.id}</span>
        <select
          value={attribute.name}
          onChange={(event) => onChange({ ...attribute, name: event.target.value })}
          className="h-11 min-w-[400px] rounded-lg border-0 bg-[#eef3ff] px-3 text-[16px] font-semibold outline-none focus:ring-2 focus:ring-[#c7cbff]"
        >
          <option>Dung tích (Volume)</option>
          <option>Phiên bản / Công thức</option>
          <option>Màu sắc (Color)</option>
          <option>Kích thước (Size)</option>
        </select>
        <span className="rounded bg-[#f2f4f7] px-2.5 py-1.5 font-mono text-[11px] text-[#667085]">display_order: {attribute.order}</span>
        <div className="ml-auto flex items-center gap-4 text-[#667085]">
          <button aria-label="Đưa thuộc tính lên" className="hover:text-[#4338ca]"><Icon name="arrow_upward" className="text-[20px]" /></button>
          <button aria-label="Đưa thuộc tính xuống" className="hover:text-[#4338ca]"><Icon name="arrow_downward" className="text-[20px]" /></button>
          <button onClick={onRemove} aria-label="Xóa thuộc tính" className="text-[#d92d20] hover:text-[#b42318]"><Icon name="delete" className="text-[20px]" /></button>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-[#667085]">Giá trị thuộc tính áp dụng cho mẫu cha này ({attribute.values.length} giá trị đã chọn):</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {attribute.values.map((value) => {
          const [label, code] = value.split(" #");
          return (
            <span key={value} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef3ff] px-3 py-2 text-[13px] font-semibold text-[#344054]">
              {label} <small className="font-mono text-[#667085]">#{code}</small>
              <button onClick={() => onChange({ ...attribute, values: attribute.values.filter((item) => item !== value) })} aria-label={`Xóa ${label}`} className="ml-1 text-[#98a2b3] hover:text-[#d92d20]">×</button>
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#eef3ff] p-2">
        <Icon name="add_circle_outline" className="ml-1 text-[20px] text-[#667085]" />
        <input
          value={newValue}
          onChange={(event) => setNewValue(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && addValue()}
          placeholder="Gõ giá trị mới (ví dụ: 15ml, 250ml) và nhấn Enter..."
          className="h-8 flex-1 bg-transparent px-1 text-[12px] outline-none placeholder:text-[#667085]"
        />
        <button onClick={addValue} className="rounded-md bg-[#4f46e5] px-3 py-2 text-[12px] font-semibold text-white">Thêm ↵</button>
        <button className="rounded-md bg-[#deebff] px-3 py-2 text-[12px] font-semibold text-[#344054]"><Icon name="library_add" className="mr-1 align-middle text-[15px]" />Thư viện</button>
      </div>
    </section>
  );
}

export function ProductAttributesPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [attributes, setAttributes] = useState(initialAttributes);

  const combinations = useMemo(() => attributes.reduce((total, attribute) => total * Math.max(attribute.values.length, 1), 1), [attributes]);

  const updateAttribute = (updated: Attribute) => {
    setAttributes((current) => current.map((attribute) => (attribute.id === updated.id ? updated : attribute)));
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] pb-24 text-[#101828]">
      <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1560px] px-5 py-3">
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-[#d6d9cd] to-[#929795] p-2"><div className="mx-auto h-10 w-5 rounded-md bg-[#e5e6dd]" /></div>
            <div>
              <div className="flex items-center gap-2"><span className="rounded bg-[#eef0ff] px-2 py-1 font-mono text-[12px] font-bold text-[#4338ca]">TMP-2025-0894</span><span className="rounded bg-[#eef3ff] px-2 py-1 text-[11px] text-[#667085]">Ngành: Mỹ phẩm &amp; Làm đẹp</span><span className="rounded-full bg-[#d1fadf] px-2 py-1 text-[11px] font-semibold text-[#067647]">● Quản lý Lô Date FEFO: BẬT</span></div>
              <p className="mt-1 text-[14px] text-[#667085]">Đang cấu hình cho Mẫu cha: <b className="text-[17px] text-[#101828]">Serum Dưỡng Ẩm Phục Hồi Da B5 Concentrated Intensive</b></p>
            </div>
          </div>
          <div className="flex gap-2"><button className="rounded-lg bg-[#eef3ff] px-4 py-3 text-[12px] font-semibold text-[#344054]"><Icon name="edit_note" className="mr-1 align-middle text-[17px]" />Xem / sửa mẫu cha</button><button className="rounded-lg bg-[#eef0ff] px-4 py-3 text-[12px] font-semibold text-[#4338ca]"><Icon name="info" className="mr-1 align-middle text-[17px]" />Kế thừa mã danh mục &amp; thuế suất VAT 10%</button></div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-4">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#4f46e5] text-white text-[20px] font-bold">1.</span><div><h1 className="text-[17px] font-bold">Thuộc Tính Sinh Biến Thể</h1><p className="text-[12px] text-[#667085]">Gắn chiều thuộc tính để tự động tổ hợp mã SKU trong ma trận biến thể</p></div></div>
          <span className="rounded-full bg-[#eef3ff] px-3 py-2 font-mono text-[12px] text-[#667085]">{attributes.length}/3 Thuộc tính đã chọn</span>
        </div>

        <div className="mt-4 space-y-3">
          {attributes.map((attribute) => <AttributeCard key={attribute.id} attribute={attribute} onChange={updateAttribute} onRemove={() => setAttributes((current) => current.filter((item) => item.id !== attribute.id))} />)}
        </div>
        <button onClick={() => setAttributes((current) => current.length >= 3 ? current : [...current, { id: 3, name: "Màu sắc (Color)", order: 30, values: ["Màu tự nhiên #NAT"] }])} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e8eaf0] bg-white py-4 text-[15px] font-bold text-[#4338ca] hover:bg-[#f8f7ff]"><Icon name="library_add" className="text-[20px]" />+ Thêm thuộc tính khác (Tối đa 3 chiều ma trận)</button>

        <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-4">
          <section className="rounded-2xl bg-[#eef0ff] p-4">
            <div className="flex items-center justify-between"><h2 className="text-[17px] font-bold"><Icon name="calculate" className="mr-2 align-middle text-[20px] text-[#4338ca]" />Dự tính sinh biến thể SKU</h2><span className="rounded-lg bg-[#4f46e5] px-3 py-2 text-[17px] font-bold text-white">{combinations} Biến thể SKU</span></div>
            <div className="mt-3 rounded-lg bg-white px-3 py-2 text-[16px]"><b className="text-[#4338ca]">{attributes[0]?.values.length ?? 0}</b> Dung tích <span className="mx-2 text-[#98a2b3]">×</span> <b className="text-[#4338ca]">{attributes[1]?.values.length ?? 0}</b> Phiên bản <span className="mx-2">=</span> <b>{combinations} Biến thể SKU dự kiến tạo ra ở Bước 3</b></div>
            <div className="mt-3 grid grid-cols-6 gap-1.5">{Array.from({ length: Math.min(combinations, 6) }, (_, index) => <div key={index} className="rounded-lg bg-white px-2 py-3 text-center text-[11px]"><b className="font-mono text-[#4338ca]">{attributes[0]?.values[index % (attributes[0]?.values.length || 1)]?.split(" #")[0]}</b><span className="mt-1 block text-[#667085]">{attributes[1]?.values[index % (attributes[1]?.values.length || 1)]?.split(" #")[0]?.replace("Bản ", "")}</span></div>)}</div>
            <p className="mt-3 text-[12px] text-[#667085]"><Icon name="verified_user" className="mr-2 align-middle text-[16px] text-[#4338ca]" /><b className="font-mono text-[#4338ca]">Ràng buộc toàn vẹn CSDL:</b> Một biến thể không được có 2 giá trị cùng thuộc tính.</p>
          </section>
          <section className="rounded-2xl border border-[#dbe4f3] bg-white p-4"><h2 className="text-[17px] font-bold"><span className="mr-2 inline-grid h-9 w-9 place-items-center rounded-lg bg-[#d1fadf] text-[#067647]">💡</span>Quản lý Thuộc tính dùng chung</h2><p className="mt-1 text-[11px] uppercase text-[#98a2b3]">CẤP TENANT / TOÀN HỆ THỐNG</p><p className="mt-3 text-[12px] leading-[1.5] text-[#667085]">💡 <b>Gợi ý:</b> Quản lý và bổ sung Thư viện Thuộc tính &amp; Giá trị dùng chung toàn doanh nghiệp tại menu <b>Sản phẩm &gt; Thuộc tính.</b></p><button className="mt-5 w-full rounded-lg bg-[#deebff] px-3 py-3 text-left text-[13px] font-semibold text-[#344054]"><Icon name="library_books" className="mr-2 align-middle text-[18px]" />Mở Thư viện Thuộc Tính <Icon name="arrow_outward" className="float-right text-[18px]" /></button></section>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eaecf0] bg-white px-5 py-3">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between"><button onClick={() => navigate("/products/new")} className="rounded-lg bg-[#eaf0ff] px-5 py-3 text-[14px] font-semibold text-[#344054]">← Quay lại: Bước 1 - Mẫu sản phẩm cha</button><div className="flex items-center gap-4"><button className="text-[14px] font-semibold text-[#667085]"><Icon name="bookmark_border" className="mr-1 align-middle text-[18px]" />Lưu bản nháp</button><button onClick={() => navigate("/products/new/variants")} className="rounded-lg bg-[#4f46e5] px-7 py-3 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]">Tiếp tục: Bước 3 - Sinh biến thể SKU ({combinations} SKU) <Icon name="arrow_forward" className="ml-2 align-middle text-[20px]" /></button></div></div>
      </footer>
    </div>
  );
}
