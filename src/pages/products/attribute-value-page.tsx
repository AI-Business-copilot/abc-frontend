import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

type AttributeValue = { value: string; id: string; createdAt: string };

const initialValues: AttributeValue[] = [
  { value: "30ml", id: "VAL-30ML", createdAt: "12/01/2025 09:15" },
  { value: "50ml", id: "VAL-50ML", createdAt: "12/01/2025 09:18" },
  { value: "100ml", id: "VAL-100ML", createdAt: "15/01/2025 14:02" },
  { value: "200ml", id: "VAL-200ML", createdAt: "18/02/2025 11:30" },
];

export function AttributeValuePage() {
  const navigate = useNavigate();
  const { attributeId } = useParams();
  const attributeName = attributeId === "size" ? "Kích cỡ (Size)" : "Dung tích (Volume)";
  const [keyword, setKeyword] = useState("");
  const [newValue, setNewValue] = useState("");
  const [values, setValues] = useState(initialValues);
  const [sortAscending, setSortAscending] = useState(true);

  const filteredValues = useMemo(() => {
    const result = values.filter((item) => item.value.toLowerCase().includes(keyword.toLowerCase()) || item.id.toLowerCase().includes(keyword.toLowerCase()));
    return [...result].sort((a, b) => sortAscending ? a.value.localeCompare(b.value, undefined, { numeric: true }) : b.value.localeCompare(a.value, undefined, { numeric: true }));
  }, [keyword, sortAscending, values]);

  const addValue = () => {
    const value = newValue.trim();
    if (!value) return;
    const code = value.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
    setValues((current) => [...current, { value, id: `VAL-${code}`, createdAt: new Date().toLocaleString("vi-VN") }]);
    setNewValue("");
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#101828]">
      <CatalogHeader active="attributes" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1440px] px-6 py-7">
        <section className="rounded-2xl bg-white px-7 py-7 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <nav className="flex items-center gap-3 text-[13px] text-[#667085]"><Link to="/products">▣ Sản phẩm</Link><span>›</span><Link to="/products/attributes">Thuộc tính</Link><span>›</span><b className="text-[#101828]">Dung tích (Volume)</b></nav>
              <h1 className="mt-8 text-[31px] font-extrabold tracking-tight">Chi Tiết Giá Trị Thuộc Tính: {attributeName}</h1>
              <div className="mt-3 flex items-center gap-2"><span className="rounded-full bg-[#eef0ff] px-3 py-1 text-[12px] font-semibold text-[#4338ca]">● Đang hoạt động</span><span className="rounded-lg bg-[#eef3ff] px-3 py-2 text-[13px] text-[#667085]">♧ Ngành hàng: <b className="text-[#344054]">Mỹ phẩm &amp; Làm đẹp</b></span></div>
            </div>
            <button onClick={() => navigate("/products/attributes")} className="rounded-lg bg-[#eef3ff] px-4 py-3 text-[13px] font-semibold text-[#344054]">← Quay lại danh mục thuộc tính</button>
          </div>
          <div className="mt-6 flex justify-end gap-3"><button onClick={addValue} className="rounded-lg bg-[#4f46e5] px-5 py-3 text-[14px] font-bold text-white">⊕ + Thêm giá trị mới</button><button className="rounded-lg bg-[#eef3ff] px-5 py-3 text-[14px] font-semibold text-[#344054]"><Icon name="upload_file" className="mr-2 align-middle text-[18px]" />Nhập danh sách hàng loạt (Bulk)</button></div>
        </section>

        <section className="mt-7 rounded-2xl bg-white px-7 py-6 shadow-sm"><h2 className="text-[18px] font-bold"><Icon name="add_box" className="mr-2 align-middle text-[22px] text-[#4338ca]" />Thêm Nhanh Giá Trị Mới Cho '{attributeName}'</h2><div className="mt-5 grid grid-cols-[1fr_340px] items-end gap-5"><label className="text-[13px] font-semibold">Giá trị cụ thể <span className="text-[#d92d20]">*</span><div className="relative mt-2"><Icon name="text_fields" className="absolute left-4 top-1/2 -translate-y-1/2 text-[19px] text-[#667085]" /><input value={newValue} onChange={(event) => setNewValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addValue()} placeholder="Ví dụ: 150ml, 500ml, 1000ml..." className="h-14 w-full rounded-lg border-0 bg-[#eef3ff] pl-12 pr-4 text-[14px] font-normal outline-none focus:ring-2 focus:ring-[#c7cbff]" /></div></label><button onClick={addValue} className="h-14 rounded-lg bg-[#4338ca] text-[14px] font-bold text-white"><Icon name="bookmark_add" className="mr-2 align-middle text-[19px]" />+ Thêm vào thư viện</button></div></section>

        <section className="mt-7 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="flex items-center justify-between px-7 py-6"><h2 className="text-[19px] font-bold">Danh Sách Giá Trị Thuộc Tính</h2><div className="flex gap-2"><div className="relative"><Icon name="filter_alt" className="absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#98a2b3]" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm kiếm giá trị..." className="h-11 w-52 rounded-lg border-0 bg-[#eef3ff] pl-9 pr-3 text-[12px] outline-none" /></div><button onClick={() => setSortAscending((current) => !current)} className="rounded-lg bg-[#eef3ff] px-4 text-[12px] text-[#667085]"><Icon name="swap_vert" className="mr-1 align-middle text-[17px]" />Sắp xếp</button></div></div><table className="w-full text-left text-[13px]"><thead className="bg-[#eef3ff] text-[11px] uppercase text-[#667085]"><tr><th className="w-24 px-7 py-4"># Thứ tự</th><th className="px-5 py-4">Giá trị thuộc tính (Value)</th><th className="px-5 py-4">Ngày tạo (created_at)</th><th className="px-5 py-4">Trạng thái</th><th className="px-7 py-4 text-right">Thao tác</th></tr></thead><tbody>{filteredValues.map((item, index) => <tr key={item.id} className="border-b border-[#eaecf0]"><td className="px-7 py-5"><span className="mr-2 text-[#98a2b3]">⁙</span>{index + 1}</td><td className="px-5 py-5"><span className={["mr-3 inline-block rounded-lg px-4 py-2 text-[18px] font-bold", index === 1 ? "bg-[#4f46e5] text-white" : "bg-[#e4ebfb] text-[#344054]"].join(" ")}>{item.value}</span><code className="text-[#667085]">ID: {item.id}</code></td><td className="px-5 py-5 font-mono">{item.createdAt}</td><td className="px-5 py-5"><span className="rounded-full bg-[#b8f5db] px-3 py-1 text-[11px] font-semibold text-[#067647]">● Active</span></td><td className="px-7 py-5 text-right"><button className="mr-5 text-[#475467]" title="Sửa giá trị"><Icon name="edit" className="text-[20px]" /></button><button onClick={() => setValues((current) => current.filter((value) => value.id !== item.id))} className="text-[#d92d20]" title="Xóa giá trị"><Icon name="delete" className="text-[20px]" /></button></td></tr>)}</tbody></table><div className="flex items-center justify-between px-7 py-5 text-[12px] text-[#667085]"><span>Hiển thị <b className="rounded bg-[#eef3ff] px-3 py-2 text-[#344054]">{filteredValues.length}</b> trên tổng số {values.length} giá trị</span><div className="flex gap-2"><button className="text-[#98a2b3]">‹</button><button className="grid h-9 w-9 place-items-center rounded-lg bg-[#4338ca] font-bold text-white">1</button><button className="text-[#98a2b3]">›</button></div></div></section>
      </main>
    </div>
  );
}
