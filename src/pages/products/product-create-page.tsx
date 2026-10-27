import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

const steps = [
  { number: 1, title: "Mẫu sản phẩm cha", subtitle: "product_templates & Lô Date" },
  { number: 2, title: "Thiết lập Thuộc tính", subtitle: "Attributes & Values Matrix" },
  { number: 3, title: "Sinh biến thể SKU", subtitle: "Tự động hóa Giá vốn / Bán lẻ" },
  { number: 4, title: "Số dư tồn ban đầu", subtitle: "inventory_balances & Kho" },
];

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Mỹ phẩm Chăm sóc da > Serum & Tinh chất đặc trị");
  const [unit, setUnit] = useState("Chai (Bottle)");
  const [name, setName] = useState("Serum Dưỡng Ẩm Phục Hồi Da B5 Concentrated Intensive");
  const [manageExpiry, setManageExpiry] = useState(true);
  const [activeAfterCreate, setActiveAfterCreate] = useState(true);

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828] pb-24">
      <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />

      <main className="mx-auto max-w-[1560px] px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[17px] font-bold">Quy trình Khởi tạo Hàng hóa &amp; Biến thể SKU Matrix</h1>
          <span className="text-[12px] text-[#667085]">
            Tiến độ tổng thể: <b className="text-[#4f46e5]">25%</b>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className={[
                "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                step.number === 1 ? "border-[#d7d2ff] bg-[#f8f7ff]" : "border-transparent bg-[#eef3fb]",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[20px] font-bold",
                  step.number === 1 ? "bg-[#4f46e5] text-white" : "bg-[#deebff] text-[#667085]",
                ].join(" ")}
              >
                {step.number}
              </span>
              <div>
                <p className={["text-[15px] font-bold", step.number === 1 ? "text-[#4338ca]" : "text-[#475467]"].join(" ")}>
                  {step.title} {step.number === 1 && <span className="text-[12px]">●</span>}
                </p>
                <p className="text-[11.5px] text-[#98a2b3]">{step.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)] gap-7">
          <section className="rounded-2xl border border-[#e8eaf0] bg-white p-5">
            <h2 className="flex items-center gap-2 text-[17px] font-bold">
              <Icon name="image" className="text-[22px] text-[#4f46e5]" />
              Hình ảnh Mẫu cha
            </h2>
            <div className="relative mt-4 h-[460px] overflow-hidden rounded-xl bg-gradient-to-b from-[#e7e9e4] to-[#9ea4a5]">
              <div className="absolute inset-0 grid place-items-center">
                <div className="h-[270px] w-[150px] rounded-[26px] border-[10px] border-[#d1d2cc] bg-gradient-to-r from-[#f3f4ed] via-[#dfe2d9] to-[#b8bbb2] shadow-[10px_14px_20px_rgba(16,24,40,0.22)]">
                  <div className="mt-24 border-y border-[#a5aaa1] py-3 text-center text-[11px] font-semibold text-[#667085]">
                    AURA ESSENCE
                    <br />
                    HYDRATING
                    <br />
                    B5 SERUM
                  </div>
                </div>
              </div>
              <span className="absolute right-3 top-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#344054]">
                Đại diện (Primary)
              </span>
              <div className="absolute inset-x-3 bottom-3 flex gap-1">
                <button className="h-9 flex-1 rounded-lg bg-white/95 text-[12px] font-semibold text-[#344054]">
                  <Icon name="crop" className="mr-1 align-middle text-[16px]" />
                  Cắt ảnh
                </button>
                <button aria-label="Xóa ảnh" className="w-11 rounded-lg bg-white/95 text-[#d92d20]">
                  <Icon name="delete" className="text-[17px]" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Góc ảnh bổ trợ (Gallery 3/4)</p>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {[1, 2].map((item) => (
                <div key={item} className="h-24 rounded-lg bg-gradient-to-br from-[#f2f1e8] to-[#c5c6bf] p-2 text-center text-[9px] text-[#667085]">
                  <div className="mx-auto mt-3 h-12 w-7 rounded-lg bg-[#d8d8d0] shadow-md" />
                </div>
              ))}
              <button className="h-24 rounded-lg bg-[#eef0ff] text-[10px] font-semibold text-[#667085]">
                <Icon name="add_a_photo" className="block mx-auto text-[22px]" />
                THÊM ẢNH
              </button>
              <div className="grid h-24 place-items-center rounded-lg bg-[#f8f9fc] text-[#98a2b3]">
                <Icon name="image" className="text-[23px]" />
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-[#eef4ff] px-3 py-2.5 text-[11px] leading-[1.4] text-[#667085]">
              <Icon name="info" className="mr-1 align-middle text-[15px] text-[#4f46e5]" />
              Khuyến nghị tỉ lệ 1:1 (tối thiểu 800×800px). Định dạng PNG, JPG, WebP ≤5MB.
            </div>
          </section>

          <section className="rounded-2xl border border-[#e8eaf0] bg-white p-7">
            <div className="flex items-start justify-between border-b border-[#eaecf0] pb-3">
              <h2 className="text-[20px] font-bold">Thông tin Mẫu Sản Phẩm Cha <span className="ml-1 rounded bg-[#6ce7b7] px-1.5 py-0.5 text-[11px]">ACTIVE</span></h2>
              <span className="text-[12px] text-[#667085]">ID Mẫu: <b className="rounded bg-[#eef0ff] px-1.5 py-1 font-mono text-[#4338ca]">TMP-2025-0894</b></span>
            </div>

            <label className="mt-4 block text-[12px] font-semibold">
              Phân loại Ngành Hàng <span className="text-[#d92d20]">*</span>
            </label>
            <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg bg-[#eef0ff] p-1">
              <button className="rounded-md bg-white py-3 text-[14px] font-bold text-[#4338ca] shadow-sm"><Icon name="checkroom" className="mr-2 align-middle text-[19px]" />Thời trang &amp; May mặc</button>
              <button className="py-3 text-[14px] font-semibold text-[#667085]"><Icon name="health_and_safety" className="mr-2 align-middle text-[19px]" />Mỹ phẩm &amp; Làm đẹp</button>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <label htmlFor="product-name" className="text-[12px] font-semibold">Tên Mẫu Sản Phẩm Đại Diện <span className="text-[#d92d20]">*</span></label>
              <span className="text-[11px] text-[#667085]">{name.length} / 255 ký tự</span>
            </div>
            <input id="product-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-12 w-full rounded-lg border-0 bg-[#eef3ff] px-3 text-[15px] outline-none focus:ring-2 focus:ring-[#c7cbff]" />

            <div className="mt-4 grid grid-cols-[1.25fr_0.85fr] gap-3">
              <label className="text-[12px] font-semibold">Danh Mục Sản Phẩm <span className="text-[#d92d20]">*</span>
                <span className="float-right text-[#4338ca]">＋ Thêm nhanh</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-12 w-full rounded-lg border-0 bg-[#eef3ff] px-3 text-[13px] font-normal outline-none">
                  <option>{category}</option>
                  <option>Thời trang &amp; May mặc</option>
                  <option>Đồ gia dụng</option>
                </select>
              </label>
              <label className="text-[12px] font-semibold">Đơn Vị Tính Cơ Sở (UoM) <span className="text-[#d92d20]">*</span>
                <select value={unit} onChange={(event) => setUnit(event.target.value)} className="mt-2 h-12 w-full rounded-lg border-0 bg-[#eef3ff] px-3 text-[13px] font-normal outline-none">
                  <option>Chai (Bottle)</option>
                  <option>Cái (Piece)</option>
                  <option>Hộp (Box)</option>
                </select>
                <span className="mt-1 block text-[10.5px] font-normal text-[#98a2b3]">Đơn vị chuẩn nhỏ nhất dùng tính định lượng tồn kho.</span>
              </label>
            </div>

            <div className="mt-5 rounded-xl bg-[#eef4ff] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#dff2ef] text-[#067647]"><Icon name="verified_user" className="text-[22px]" /></span>
                <div className="flex-1">
                  <h3 className="text-[16px] font-bold">Quản Lý &amp; Theo Dõi Lô Hạn Dùng</h3>
                  <p className="mt-1 text-[12px] leading-[1.4] text-[#667085]"><b>Quy chuẩn FEFO (First Expired, First Out):</b> Kích hoạt cờ này khi sản phẩm là mỹ phẩm, thực phẩm hoặc hóa phẩm có ngày hết hạn.</p>
                </div>
                <button onClick={() => setManageExpiry((value) => !value)} className={["relative h-8 w-16 rounded-full p-1 transition-colors", manageExpiry ? "bg-[#087f5b]" : "bg-[#98a2b3]"].join(" ")} aria-label="Quản lý hạn dùng">
                  <span className={["block h-6 w-6 rounded-full bg-white transition-transform", manageExpiry ? "translate-x-8" : ""].join(" ")} />
                </button>
              </div>
            </div>

            <label className="mt-5 block text-[12px] font-semibold">Mô Tả Tóm Tắt Dòng Sản Phẩm</label>
            <textarea defaultValue="Tinh chất phục hồi chuyên sâu chứa Vitamin B5 nồng độ 5% kết hợp phân tử Hyaluronic Acid đa tầng, hỗ trợ cấp ẩm tức thì và củng cố hàng rào bảo vệ da tự nhiên." className="mt-2 h-24 w-full resize-none rounded-lg border-0 bg-[#eef3ff] px-3 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#c7cbff]" />

            <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#eef4ff] px-3 py-3">
              <Icon name="toggle_on" className="text-[23px] text-[#4338ca]" />
              <div className="flex-1"><b className="text-[14px]">Kích hoạt kinh doanh ngay sau khi tạo</b><p className="text-[11px] text-[#667085]">Cho phép lên đơn và nhập kho ngay.</p></div>
              <button onClick={() => setActiveAfterCreate((value) => !value)} className={["relative h-7 w-14 rounded-full p-1", activeAfterCreate ? "bg-[#4338ca]" : "bg-[#98a2b3]"].join(" ")} aria-label="Kích hoạt kinh doanh">
                <span className={["block h-5 w-5 rounded-full bg-white", activeAfterCreate ? "translate-x-7" : ""].join(" ")} />
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eaecf0] bg-white px-5 py-3">
        <div className="mx-auto flex max-w-[1560px] items-center gap-2">
          <button onClick={() => navigate("/products")} className="h-12 rounded-lg bg-[#eaf0ff] px-5 text-[14px] font-semibold text-[#344054]">Hủy &amp; Quay lại</button>
          <button className="h-12 rounded-lg bg-[#eef3ff] px-5 text-[14px] font-semibold text-[#344054]"><Icon name="save" className="mr-2 align-middle text-[17px]" />Lưu bản nháp</button>
          <button onClick={() => navigate("/products/new/attributes")} className="h-12 rounded-lg bg-[#4f46e5] px-8 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]">Tiếp tục: Bước 2 - Thiết lập thuộc tính <Icon name="arrow_forward" className="ml-2 align-middle text-[20px]" /></button>
        </div>
      </footer>
    </div>
  );
}
