import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

type Attribute = {
  id: string;
  name: string;
  slug: string;
  category: string;
  createdAt: string;
  icon: string;
  values: string[];
};

const initialAttributes: Attribute[] = [
  { id: "volume", name: "Dung tích", slug: "volume", category: "Mỹ phẩm & Làm đẹp", createdAt: "12/01/2025", icon: "science", values: ["30ml", "50ml", "100ml", "200ml"] },
  { id: "size", name: "Kích cỡ (Size)", slug: "size", category: "Thời trang & May mặc", createdAt: "15/01/2025", icon: "straighten", values: ["XS", "S", "M", "L", "XL", "XXL"] },
  { id: "color", name: "Màu sắc (Color)", slug: "color", category: "Thời trang & Phụ kiện", createdAt: "18/01/2025", icon: "palette", values: ["Đen", "Trắng", "Navy", "Đỏ", "Xanh"] },
  { id: "skin-tone", name: "Tông da (Skin Tone)", slug: "skin_tone", category: "Mỹ phẩm trang điểm", createdAt: "24/01/2025", icon: "face_retouching_natural", values: ["#01 Sáng Hồng", "#02 Tự Nhiên", "#03 Tối Màu"] },
  { id: "fragrance", name: "Mùi hương (Fragrance)", slug: "fragrance", category: "Nước hoa & Chăm sóc cá nhân", createdAt: "02/02/2025", icon: "spa", values: ["Hương Gỗ (Woody)", "Hương Hoa (Floral)", "Hương Cam Chanh (Citrus)"] },
];

export function AttributesPage() {
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("Tất cả ngành (5)");
  const [attributes, setAttributes] = useState(initialAttributes);
  const filtered = useMemo(() => attributes.filter((attribute) => {
    const matchesKeyword = `${attribute.name} ${attribute.slug}`.toLowerCase().includes(keyword.toLowerCase());
    const matchesFilter = filter === "Tất cả ngành (5)" || attribute.category.includes(filter);
    return matchesKeyword && matchesFilter;
  }), [attributes, filter, keyword]);

  const addAttribute = () => {
    const id = `attribute-${attributes.length + 1}`;
    setAttributes((current) => [...current, {
      id,
      name: "Thuộc tính mới",
      slug: id,
      category: "Mỹ phẩm & Làm đẹp",
      createdAt: new Date().toLocaleDateString("vi-VN"),
      icon: "category",
      values: [],
    }]);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#101828]">
      <CatalogHeader active="attributes" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1360px] px-6 py-7">
        <div className="flex items-start justify-between">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-[12px] text-[#667085]"><Link to="/products">Trang chủ</Link><span>/</span><span>Sản phẩm</span><span>/</span><b className="text-[#4338ca]">Thuộc tính</b></nav>
            <h1 className="text-[30px] font-extrabold tracking-tight">Thư Viện Thuộc Tính Dùng Chung</h1>
            <p className="mt-1 text-[14px] text-[#667085]">Quản lý danh mục thuộc tính cấp doanh nghiệp (Tenant-level), cấu hình cơ sở để tự động sinh ma trận biến thể SKU trong Copilot ERP.</p>
          </div>
          <div className="flex gap-3"><button className="h-12 rounded-lg bg-white px-5 text-[13px] font-semibold shadow-sm"><Icon name="download" className="mr-2 align-middle text-[18px]" />Xuất danh sách</button><button onClick={addAttribute} className="h-12 rounded-lg bg-[#4f46e5] px-5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]">＋ Tạo loại thuộc tính mới</button></div>
        </div>
        <section className="mt-7 flex items-center justify-between rounded-xl bg-[#eef2ff] px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#4f46e5] text-white"><Icon name="auto_awesome" className="text-[21px]" /></span><div><h2 className="text-[16px] font-bold">Copilot Auto-Matrix Helper</h2><p className="text-[12px] text-[#667085]">Hệ thống đang chuẩn hóa mã SKU theo định dạng <code className="text-[#4338ca]">[TENANT]-[SLUG]-[VALUE]</code>. Tối ưu sinh mã cho 5 nhóm thuộc tính.</p></div></div><button className="rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-[#4338ca]">Cấu hình tiền tố SKU →</button></section>
        <section className="mt-6 flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"><div className="relative flex-1 max-w-[580px]"><Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#98a2b3]" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm tên thuộc tính, mã nhận diện (slug)..." className="h-11 w-full rounded-lg border-0 bg-[#eef3ff] pl-10 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[#c7cbff]" /></div><div className="ml-auto flex gap-2">{["Tất cả ngành (5)", "Mỹ phẩm & Làm đẹp", "Thời trang & May mặc", "Phụ kiện"].map((item) => <button key={item} onClick={() => setFilter(item)} className={["rounded-lg px-4 py-2.5 text-[12px] font-semibold", filter === item ? "bg-[#4f46e5] text-white" : "bg-[#e7edfa] text-[#667085]"].join(" ")}>{item}</button>)}</div></section>
        <div className="mt-6 grid grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)] gap-6">
          <div className="space-y-4">{filtered.map((attribute) => <article key={attribute.id} className="rounded-xl bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-12 w-12 place-items-center rounded-lg bg-[#eaf0ff] text-[#4338ca]"><Icon name={attribute.icon} className="text-[23px]" /></span><div className="flex-1"><div className="flex items-center gap-2"><h2 className="text-[17px] font-bold">{attribute.name}</h2><code className="rounded bg-[#eef0ff] px-2 py-1 text-[12px] text-[#4338ca]">{attribute.slug}</code><span className="rounded-full bg-[#d1fadf] px-2 py-1 text-[10px] font-semibold text-[#067647]">● ACTIVE</span></div><p className="mt-1 text-[11px] text-[#667085]"><Icon name="category" className="mr-1 align-middle text-[14px]" />{attribute.category}　•　<Icon name="calendar_month" className="mr-1 align-middle text-[14px]" />Khởi tạo: {attribute.createdAt}</p></div><div className="flex gap-4 text-[#667085]"><Link to={`/products/attributes/${attribute.id}`} title="Chỉnh sửa thuộc tính" className="hover:text-[#4338ca]"><Icon name="edit" className="text-[20px]" /></Link><button title="Xóa thuộc tính" className="hover:text-[#d92d20]"><Icon name="delete" className="text-[20px]" /></button></div></div><div className="mt-4 rounded-lg bg-[#eef3ff] px-4 py-3"><span className="mr-3 text-[11px] font-semibold uppercase text-[#667085]">{attribute.values.length} giá trị{attribute.id === "color" ? " (gồm mã HEX)" : ""}:</span>{attribute.values.slice(0, 4).map((value) => <span key={value} className="mr-2 inline-block rounded-md bg-white px-3 py-1.5 font-mono text-[12px] font-semibold text-[#344054]">{value}</span>)}{attribute.values.length > 4 && <span className="text-[12px] text-[#667085]">+{attribute.values.length - 4} giá trị nữa</span>}</div></article>)}</div>
          <aside className="h-fit rounded-xl bg-[#eef2ff] p-5"><h2 className="text-[16px] font-bold"><Icon name="lightbulb" className="mr-2 align-middle text-[21px] text-[#4338ca]" />Mẹo tạo mã nhận diện</h2><p className="mt-4 text-[13px] leading-[1.6] text-[#667085]">Mã định danh (Slug) nên viết thường không dấu, nối bằng gạch dưới (ví dụ: <code className="text-[#4338ca]">shoe_size</code>, <code className="text-[#4338ca]">material</code>) để thuận tiện cho việc truy vấn API tích hợp sẵn.</p></aside>
        </div>
      </main>
    </div>
  );
}
