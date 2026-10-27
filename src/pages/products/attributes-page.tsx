import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { productWizardApi, type AttributeRecord } from "@/api/product-wizard";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

type Industry = "beauty" | "fashion" | "other";

const industryLabel: Record<Industry, string> = {
  beauty: "Mỹ phẩm & Làm đẹp",
  fashion: "Thời trang & May mặc",
  other: "Đa ngành",
};

function removeDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function slugify(value: string) {
  return removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function industryOf(name: string): Industry {
  const normalized = removeDiacritics(name).toLowerCase();
  if (/(dung tich|loai da|han dung|mui huong|tong da|volume|skin|fragrance|expiry)/.test(normalized)) {
    return "beauty";
  }
  if (/(kich co|kich thuoc|mau sac|chat lieu|size|color|material)/.test(normalized)) {
    return "fashion";
  }
  return "other";
}

function iconOf(name: string) {
  const normalized = removeDiacritics(name).toLowerCase();
  if (normalized.includes("dung tich")) return "science";
  if (normalized.includes("kich co")) return "straighten";
  if (normalized.includes("mau sac")) return "palette";
  if (normalized.includes("loai da") || normalized.includes("tong da")) return "face_retouching_natural";
  if (normalized.includes("mui huong")) return "spa";
  if (normalized.includes("chat lieu")) return "texture";
  if (normalized.includes("han dung")) return "event_available";
  if (normalized.includes("kich thuoc")) return "aspect_ratio";
  return "category";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

export function AttributesPage() {
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("Tất cả ngành");
  const [attributes, setAttributes] = useState<AttributeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setAttributes(await productWizardApi.attributes());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    const result = { all: attributes.length, beauty: 0, fashion: 0, other: 0 };
    for (const attribute of attributes) result[industryOf(attribute.name)] += 1;
    return result;
  }, [attributes]);

  const filtered = useMemo(
    () =>
      attributes.filter((attribute) => {
        const industry = industryOf(attribute.name);
        const matchesKeyword = `${attribute.name} ${slugify(attribute.name)}`
          .toLowerCase()
          .includes(keyword.toLowerCase());
        const matchesFilter =
          filter === "Tất cả ngành" ||
          (filter === industryLabel.beauty && industry === "beauty") ||
          (filter === industryLabel.fashion && industry === "fashion") ||
          (filter === industryLabel.other && industry === "other");
        return matchesKeyword && matchesFilter;
      }),
    [attributes, filter, keyword],
  );

  const createAttribute = async () => {
    const name = newName.trim();
    if (!name) {
      setError("Vui lòng nhập tên thuộc tính.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await productWizardApi.createAttribute(name);
      setAttributes((current) => [...current, { ...created, attributeValues: created.attributeValues ?? [] }]);
      setNewName("");
      setShowCreate(false);
      setNotice(`Đã tạo thuộc tính “${created.name}”.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeAttribute = async (attribute: AttributeRecord) => {
    if (!window.confirm(`Xóa thuộc tính “${attribute.name}”? Thao tác này không thể hoàn tác.`)) return;
    setBusy(true);
    setError("");
    try {
      await productWizardApi.deleteAttribute(attribute.id);
      setAttributes((current) => current.filter((item) => item.id !== attribute.id));
      setNotice(`Đã xóa thuộc tính “${attribute.name}”.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Tên thuộc tính", "Slug", "Ngành hàng", "Số giá trị", "Ngày tạo"],
      ...attributes.map((attribute) => [
        attribute.name,
        slugify(attribute.name),
        industryLabel[industryOf(attribute.name)],
        String(attribute.attributeValues.length),
        formatDate(attribute.createdAt),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "thuoc-tinh.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const filterTabs = [
    { label: "Tất cả ngành", count: counts.all },
    { label: industryLabel.beauty, count: counts.beauty },
    { label: industryLabel.fashion, count: counts.fashion },
    { label: industryLabel.other, count: counts.other },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#101828]">
      <CatalogHeader active="attributes" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1360px] px-6 py-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-[12px] text-[#667085]">
              <Link to="/products">Trang chủ</Link>
              <span>/</span>
              <span>Sản phẩm</span>
              <span>/</span>
              <b className="text-[#4338ca]">Thuộc tính</b>
            </nav>
            <h1 className="text-[30px] font-extrabold tracking-tight">Thư Viện Thuộc Tính Dùng Chung</h1>
            <p className="mt-1 text-[14px] text-[#667085]">
              Quản lý danh mục thuộc tính cấp doanh nghiệp (Tenant-level), cấu hình cơ sở để tự động sinh ma trận biến thể SKU trong Copilot ERP.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCsv} className="h-12 rounded-lg bg-white px-5 text-[13px] font-semibold shadow-sm">
              <Icon name="download" className="mr-2 align-middle text-[18px]" />
              Xuất danh sách
            </button>
            <button
              onClick={() => setShowCreate((value) => !value)}
              className="h-12 rounded-lg bg-[#4f46e5] px-5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
            >
              ＋ Tạo loại thuộc tính mới
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-[#fecdca] bg-[#fef3f2] px-4 py-2.5 text-[12.5px] text-[#b42318]">{error}</div>
        )}
        {notice && (
          <div className="mt-5 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-2.5 text-[12.5px] text-[#067647]">{notice}</div>
        )}

        {showCreate && (
          <section className="mt-5 rounded-xl border border-[#dbe4f3] bg-white p-4">
            <h2 className="text-[15px] font-bold">Tạo loại thuộc tính mới</h2>
            <div className="mt-3 flex gap-2">
              <input
                autoFocus
                value={newName}
                maxLength={100}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void createAttribute()}
                placeholder="Ví dụ: Chất liệu, Dung tích, Kích cỡ..."
                className="h-11 flex-1 rounded-lg border-0 bg-[#eef3ff] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#c7cbff]"
              />
              <button
                disabled={busy}
                onClick={() => void createAttribute()}
                className="h-11 rounded-lg bg-[#4f46e5] px-6 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {busy ? "Đang tạo..." : "Tạo thuộc tính"}
              </button>
              <button onClick={() => setShowCreate(false)} className="h-11 rounded-lg bg-[#eef3ff] px-4 text-[13px] font-semibold text-[#344054]">
                Hủy
              </button>
            </div>
          </section>
        )}

        <section className="mt-7 flex items-center justify-between rounded-xl bg-[#eef2ff] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#4f46e5] text-white">
              <Icon name="auto_awesome" className="text-[21px]" />
            </span>
            <div>
              <h2 className="text-[16px] font-bold">Copilot Auto-Matrix Helper</h2>
              <p className="text-[12px] text-[#667085]">
                Hệ thống đang chuẩn hóa mã SKU theo định dạng <code className="text-[#4338ca]">[TENANT]-[SLUG]-[VALUE]</code>. Tối ưu sinh mã cho {attributes.length} nhóm thuộc tính.
              </p>
            </div>
          </div>
          <Link to="/products" className="rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-[#4338ca]">
            Cấu hình tiền tố SKU →
          </Link>
        </section>

        <section className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="relative max-w-[580px] flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#98a2b3]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên thuộc tính, mã nhận diện (slug)..."
              className="h-11 w-full rounded-lg border-0 bg-[#eef3ff] pl-10 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[#c7cbff]"
            />
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setFilter(tab.label)}
                className={[
                  "rounded-lg px-4 py-2.5 text-[12px] font-semibold",
                  filter === tab.label ? "bg-[#4f46e5] text-white" : "bg-[#e7edfa] text-[#667085]",
                ].join(" ")}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </section>

        <div className="mt-6 grid grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)] gap-6">
          <div className="space-y-4">
            {loading && <div className="rounded-xl bg-white p-6 text-[13px] text-[#667085]">Đang tải thư viện thuộc tính…</div>}
            {!loading && filtered.length === 0 && (
              <div className="rounded-xl bg-white p-6 text-[13px] text-[#667085]">Không tìm thấy thuộc tính phù hợp.</div>
            )}
            {filtered.map((attribute) => {
              const industry = industryOf(attribute.name);
              const values = attribute.attributeValues;
              return (
                <article key={attribute.id} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#eaf0ff] text-[#4338ca]">
                      <Icon name={iconOf(attribute.name)} className="text-[23px]" />
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[17px] font-bold">{attribute.name}</h2>
                        <code className="rounded bg-[#eef0ff] px-2 py-1 text-[12px] text-[#4338ca]">{slugify(attribute.name)}</code>
                        <span className="rounded-full bg-[#d1fadf] px-2 py-1 text-[10px] font-semibold text-[#067647]">● ACTIVE</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#667085]">
                        <Icon name="category" className="mr-1 align-middle text-[14px]" />
                        {industryLabel[industry]}　•　<Icon name="calendar_month" className="mr-1 align-middle text-[14px]" />
                        Khởi tạo: {formatDate(attribute.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-4 text-[#667085]">
                      <Link to={`/products/attributes/${attribute.id}`} title="Xem giá trị thuộc tính" className="hover:text-[#4338ca]">
                        <Icon name="edit" className="text-[20px]" />
                      </Link>
                      <button disabled={busy} onClick={() => void removeAttribute(attribute)} title="Xóa thuộc tính" className="hover:text-[#d92d20] disabled:opacity-50">
                        <Icon name="delete" className="text-[20px]" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-[#eef3ff] px-4 py-3">
                    <span className="mr-3 text-[11px] font-semibold uppercase text-[#667085]">{values.length} giá trị:</span>
                    {values.slice(0, 4).map((value) => (
                      <span key={value.id} className="mr-2 inline-block rounded-md bg-white px-3 py-1.5 font-mono text-[12px] font-semibold text-[#344054]">
                        {value.value}
                      </span>
                    ))}
                    {values.length === 0 && <span className="text-[12px] text-[#98a2b3]">Chưa có giá trị — mở chi tiết để thêm.</span>}
                    {values.length > 4 && <span className="text-[12px] text-[#667085]">+{values.length - 4} giá trị nữa</span>}
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="h-fit rounded-xl bg-[#eef2ff] p-5">
            <h2 className="text-[16px] font-bold">
              <Icon name="lightbulb" className="mr-2 align-middle text-[21px] text-[#4338ca]" />
              Mẹo tạo mã nhận diện
            </h2>
            <p className="mt-4 text-[13px] leading-[1.6] text-[#667085]">
              Mã định danh (Slug) nên viết thường không dấu, nối bằng gạch dưới (ví dụ:{" "}
              <code className="text-[#4338ca]">shoe_size</code>, <code className="text-[#4338ca]">material</code>) để thuận tiện cho việc truy vấn API tích hợp sẵn.
            </p>
            <div className="mt-5 rounded-lg bg-white p-4 text-[12px] text-[#667085]">
              <p className="font-semibold text-[#344054]">Tổng quan thư viện</p>
              <p className="mt-2 flex justify-between"><span>Tổng thuộc tính</span><b className="text-[#101828]">{counts.all}</b></p>
              <p className="mt-1 flex justify-between"><span>Mỹ phẩm &amp; Làm đẹp</span><b className="text-[#101828]">{counts.beauty}</b></p>
              <p className="mt-1 flex justify-between"><span>Thời trang &amp; May mặc</span><b className="text-[#101828]">{counts.fashion}</b></p>
              <p className="mt-1 flex justify-between"><span>Đa ngành</span><b className="text-[#101828]">{counts.other}</b></p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
