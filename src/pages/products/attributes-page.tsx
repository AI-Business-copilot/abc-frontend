import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { productWizardApi, type AttributeRecord } from "@/api/product-wizard";
import {
  getAttributeIndustry,
  setAttributeIndustry,
  INDUSTRY_OPTIONS,
  type AttributeIndustry,
} from "@/lib/attribute-industry";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

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
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("all");
  const [attributes, setAttributes] = useState<AttributeRecord[]>([]);
  const [industryMap, setIndustryMap] = useState<Record<string, AttributeIndustry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState<AttributeIndustry>("fashion");
  const [busy, setBusy] = useState(false);

  // Resume banner state from Step 2
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);

  // Custom Delete Modal
  const [deletingAttribute, setDeletingAttribute] = useState<AttributeRecord | null>(null);

  useEffect(() => {
    try {
      const savedId = sessionStorage.getItem("abc:wizard:active_template_id");
      const savedName = sessionStorage.getItem("abc:wizard:active_template_name");
      if (savedId) {
        setActiveTemplateId(savedId);
        setActiveTemplateName(savedName || "Sản phẩm chưa đặt tên");
      }
    } catch {
      // ignore
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await productWizardApi.attributes();
      setAttributes(data);
      const initialMap: Record<string, AttributeIndustry> = {};
      for (const attr of data) {
        initialMap[attr.id] = getAttributeIndustry(attr.id, attr.name);
      }
      setIndustryMap(initialMap);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleIndustryChange = (attributeId: string, industry: AttributeIndustry) => {
    setAttributeIndustry(attributeId, industry);
    setIndustryMap((prev) => ({ ...prev, [attributeId]: industry }));
  };

  const counts = useMemo(() => {
    const result = { all: attributes.length, beauty: 0, fashion: 0, other: 0 };
    for (const attribute of attributes) {
      const ind = industryMap[attribute.id] || getAttributeIndustry(attribute.id, attribute.name);
      result[ind] = (result[ind] || 0) + 1;
    }
    return result;
  }, [attributes, industryMap]);

  const filtered = useMemo(
    () =>
      attributes.filter((attribute) => {
        const industry = industryMap[attribute.id] || getAttributeIndustry(attribute.id, attribute.name);
        const matchesKeyword = `${attribute.name} ${slugify(attribute.name)}`
          .toLowerCase()
          .includes(keyword.toLowerCase());
        const matchesFilter = filter === "all" || filter === industry;
        return matchesKeyword && matchesFilter;
      }),
    [attributes, industryMap, filter, keyword],
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
      setAttributeIndustry(created.id, newIndustry);
      setIndustryMap((prev) => ({ ...prev, [created.id]: newIndustry }));
      setAttributes((current) => [...current, { ...created, attributeValues: created.attributeValues ?? [] }]);
      setNewName("");
      setShowCreate(false);
      setNotice(`Đã tạo thuộc tính “${created.name}” thành công.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmRemoveAttribute = async () => {
    if (!deletingAttribute) return;
    const attr = deletingAttribute;
    setBusy(true);
    setError("");
    try {
      await productWizardApi.deleteAttribute(attr.id);
      setAttributes((current) => current.filter((item) => item.id !== attr.id));
      setNotice(`Đã xóa thuộc tính “${attr.name}”.`);
      setDeletingAttribute(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clearActiveProgress = () => {
    sessionStorage.removeItem("abc:wizard:active_template_id");
    sessionStorage.removeItem("abc:wizard:active_template_name");
    setActiveTemplateId(null);
    setActiveTemplateName(null);
  };

  const exportCsv = () => {
    const rows = [
      ["Tên thuộc tính", "Slug", "Ngành hàng", "Số giá trị", "Ngày tạo"],
      ...attributes.map((attribute) => {
        const ind = industryMap[attribute.id] || getAttributeIndustry(attribute.id, attribute.name);
        const indObj = INDUSTRY_OPTIONS.find((o) => o.value === ind);
        return [
          attribute.name,
          slugify(attribute.name),
          indObj ? indObj.label : "Đa ngành",
          String(attribute.attributeValues.length),
          formatDate(attribute.createdAt),
        ];
      }),
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
    { key: "all", label: "Tất cả ngành", count: counts.all },
    { key: "beauty", label: "Mỹ phẩm & Làm đẹp", count: counts.beauty },
    { key: "fashion", label: "Thời trang & May mặc", count: counts.fashion },
    { key: "other", label: "Đa ngành / Chung", count: counts.other },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#101828]">
      <CatalogHeader active="attributes" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1360px] px-6 py-7">
        {/* Banner tiến trình dở dang từ Bước 2 nếu có */}
        {activeTemplateId && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#0f4c3a]/40 bg-gradient-to-r from-[#ecfdf5] via-white to-[#ecfdf5] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f4c3a] text-white">
                <Icon name="bookmark" className="text-[22px]" />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-[#0a3528] uppercase tracking-wide">
                  Đang có tiến trình tạo sản phẩm dở dang (Bước 2 - Thiết lập thuộc tính)
                </p>
                <p className="text-[15px] font-bold text-[#101828]">
                  Mẫu sản phẩm cha: <span className="text-[#0a3528]">{activeTemplateName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/products/attributes-selection?templateId=${activeTemplateId}`)}
                className="flex items-center gap-1.5 rounded-xl bg-[#0f4c3a] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-[#0a3528]"
              >
                <span>Quay lại Bước 2 tiếp tục</span>
                <Icon name="arrow_forward" className="text-[17px]" />
              </button>
              <button
                type="button"
                onClick={clearActiveProgress}
                title="Bỏ qua nhắc nhở này"
                className="rounded-xl border border-[#d0d5dd] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#667085] hover:bg-[#f2f4f7]"
              >
                Bỏ qua
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-[12px] text-[#667085]">
              <Link to="/products">Trang chủ</Link>
              <span>/</span>
              <span>Sản phẩm</span>
              <span>/</span>
              <b className="text-[#0a3528]">Thuộc tính</b>
            </nav>
            <h1 className="text-[30px] font-extrabold tracking-tight">Thư Viện Thuộc Tính Dùng Chung</h1>
            <p className="mt-1 text-[14px] text-[#667085]">
              Quản lý danh mục thuộc tính cấp doanh nghiệp (Tenant-level), phân loại theo ngành hàng để tự động sinh ma trận biến thể SKU trong Copilot ERP.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCsv} className="h-12 rounded-lg bg-white px-5 text-[13px] font-semibold shadow-sm hover:bg-[#f9fafb]">
              <Icon name="download" className="mr-2 align-middle text-[18px]" />
              Xuất danh sách
            </button>
            <button
              onClick={() => setShowCreate((value) => !value)}
              className="h-12 rounded-lg bg-[#0f4c3a] px-5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:bg-[#0a3528]"
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

        {/* Khung tạo loại thuộc tính mới kèm cấu hình ngành */}
        {showCreate && (
          <section className="mt-5 rounded-xl border border-[#a7f3d0] bg-white p-5 shadow-sm">
            <h2 className="text-[16px] font-bold text-[#101828]">Tạo loại thuộc tính mới &amp; Cấu hình ngành hàng</h2>
            <div className="mt-3 grid grid-cols-[1fr_260px_auto_auto] items-center gap-3">
              <input
                autoFocus
                value={newName}
                maxLength={100}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void createAttribute()}
                placeholder="Ví dụ: Kích cỡ, Màu sắc, Dung tích, Chất liệu..."
                className="h-11 rounded-lg border border-[#d0d5dd] bg-[#f8f9fc] px-4 text-[13px] outline-none focus:border-[#0f4c3a] focus:bg-white"
              />
              <select
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value as AttributeIndustry)}
                className="h-11 rounded-lg border border-[#d0d5dd] bg-[#f8f9fc] px-3 text-[13px] font-medium outline-none focus:border-[#0f4c3a] focus:bg-white"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                disabled={busy}
                onClick={() => void createAttribute()}
                className="h-11 rounded-lg bg-[#0f4c3a] px-6 text-[13px] font-bold text-white shadow hover:bg-[#0a3528] disabled:opacity-60"
              >
                {busy ? "Đang tạo..." : "Tạo thuộc tính"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="h-11 rounded-lg border border-[#d0d5dd] bg-white px-4 text-[13px] font-semibold text-[#344054] hover:bg-[#f2f4f7]"
              >
                Hủy
              </button>
            </div>
            <p className="mt-2 text-[12px] text-[#667085]">
              Thuộc tính sẽ được lưu vào hệ thống và gắn với ngành hàng đã chọn để gợi ý đúng mẫu khi tạo sản phẩm cha.
            </p>
          </section>
        )}

        <section className="mt-7 flex items-center justify-between rounded-xl bg-[#ecfdf5] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#0f4c3a] text-white">
              <Icon name="auto_awesome" className="text-[21px]" />
            </span>
            <div>
              <h2 className="text-[16px] font-bold">Copilot Auto-Matrix Helper</h2>
              <p className="text-[12px] text-[#667085]">
                Hệ thống đang chuẩn hóa mã SKU theo định dạng <code className="text-[#0a3528] font-mono">[TENANT]-[SLUG]-[VALUE]</code>. Tối ưu sinh mã cho {attributes.length} nhóm thuộc tính.
              </p>
            </div>
          </div>
          <Link to="/products" className="rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-[#0a3528] shadow-sm hover:bg-[#f8f7ff]">
            Cấu hình tiền tố SKU →
          </Link>
        </section>

        {/* Tìm kiếm và Tabs Lọc theo Ngành */}
        <section className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="relative max-w-[580px] flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#98a2b3]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên thuộc tính, mã nhận diện (slug)..."
              className="h-11 w-full rounded-lg border-0 bg-[#ecfdf5] pl-10 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[#a7f3d0]"
            />
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={[
                  "rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-colors",
                  filter === tab.key ? "bg-[#0f4c3a] text-white shadow-sm" : "bg-[#e7edfa] text-[#667085] hover:bg-[#dde4f5]",
                ].join(" ")}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </section>

        {/* Danh sách thẻ thuộc tính */}
        <div className="mt-6 grid grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)] gap-6">
          <div className="space-y-4">
            {loading && <div className="rounded-xl bg-white p-6 text-[13px] text-[#667085]">Đang tải thư viện thuộc tính…</div>}
            {!loading && filtered.length === 0 && (
              <div className="rounded-xl bg-white p-6 text-[13px] text-[#667085]">Không tìm thấy thuộc tính phù hợp.</div>
            )}
            {filtered.map((attribute) => {
              const currentIndustry = industryMap[attribute.id] || getAttributeIndustry(attribute.id, attribute.name);
              const values = attribute.attributeValues;
              return (
                <article key={attribute.id} className="rounded-xl bg-white p-5 shadow-sm border border-[#eef0f6] hover:border-[#a7f3d0] transition-all">
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#eaf0ff] text-[#0a3528]">
                      <Icon name={iconOf(attribute.name)} className="text-[23px]" />
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[17px] font-bold">{attribute.name}</h2>
                        <code className="rounded bg-[#ecfdf5] px-2 py-1 text-[12px] text-[#0a3528]">{slugify(attribute.name)}</code>
                        <span className="rounded-full bg-[#d1fadf] px-2 py-0.5 text-[10px] font-semibold text-[#067647]">● ACTIVE</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#667085]">
                        <span className="flex items-center gap-1 font-medium">
                          <Icon name="category" className="text-[15px]" />
                          Ngành:
                        </span>
                        {/* Selector cấu hình ngành trực tiếp */}
                        <select
                          value={currentIndustry}
                          onChange={(e) => handleIndustryChange(attribute.id, e.target.value as AttributeIndustry)}
                          className="rounded-md border border-[#d0d5dd] bg-[#f8f9fc] px-2 py-0.5 text-[11.5px] font-semibold text-[#344054] outline-none focus:border-[#0f4c3a]"
                        >
                          {INDUSTRY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[#d0d5dd]">|</span>
                        <span>
                          <Icon name="calendar_month" className="mr-1 align-middle text-[14px]" />
                          Khởi tạo: {formatDate(attribute.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#667085]">
                      <Link
                        to={`/products/attributes/${attribute.id}`}
                        title="Quản lý giá trị thuộc tính"
                        className="flex items-center gap-1 rounded-lg bg-[#ecfdf5] px-3 py-1.5 text-[12px] font-semibold text-[#0a3528] hover:bg-[#e0e7ff]"
                      >
                        <Icon name="edit" className="text-[16px]" />
                        <span>Sửa giá trị</span>
                      </Link>
                      <button
                        disabled={busy}
                        onClick={() => setDeletingAttribute(attribute)}
                        title="Xóa thuộc tính"
                        className="rounded-lg p-2 text-[#667085] hover:bg-[#fef3f2] hover:text-[#d92d20] disabled:opacity-50"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-[#ecfdf5] px-4 py-3">
                    <span className="mr-3 text-[11px] font-semibold uppercase text-[#667085]">{values.length} giá trị:</span>
                    {values.slice(0, 5).map((value) => (
                      <span key={value.id} className="mr-2 inline-block rounded-md bg-white px-3 py-1.5 font-mono text-[12px] font-semibold text-[#344054] shadow-sm">
                        {value.value}
                      </span>
                    ))}
                    {values.length === 0 && <span className="text-[12px] text-[#98a2b3]">Chưa có giá trị — bấm "Sửa giá trị" để thêm.</span>}
                    {values.length > 5 && <span className="text-[12px] text-[#667085]">+{values.length - 5} giá trị nữa</span>}
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="h-fit rounded-xl bg-[#ecfdf5] p-5">
            <h2 className="text-[16px] font-bold">
              <Icon name="lightbulb" className="mr-2 align-middle text-[21px] text-[#0a3528]" />
              Cấu hình Ngành hàng cho Thuộc tính
            </h2>
            <p className="mt-3 text-[13px] leading-[1.6] text-[#667085]">
              Khi bạn gán thuộc tính vào ngành <b>Thời trang &amp; May mặc</b> hoặc <b>Mỹ phẩm &amp; Làm đẹp</b>, ở Bước 2 khi tạo sản phẩm thuộc ngành đó, hệ thống sẽ tự động đề xuất sẵn các thuộc tính tương ứng vào ma trận biến thể.
            </p>
            <div className="mt-5 rounded-lg bg-white p-4 text-[12px] text-[#667085] shadow-sm">
              <p className="font-semibold text-[#344054]">Tổng quan thư viện theo ngành</p>
              <p className="mt-2 flex justify-between"><span>Tổng thuộc tính</span><b className="text-[#101828]">{counts.all}</b></p>
              <p className="mt-1 flex justify-between"><span>Mỹ phẩm &amp; Làm đẹp</span><b className="text-[#101828]">{counts.beauty}</b></p>
              <p className="mt-1 flex justify-between"><span>Thời trang &amp; May mặc</span><b className="text-[#101828]">{counts.fashion}</b></p>
              <p className="mt-1 flex justify-between"><span>Đa ngành / Chung</span><b className="text-[#101828]">{counts.other}</b></p>
            </div>
          </aside>
        </div>

        {/* Modal xác nhận xóa thuộc tính (không dùng window.confirm) */}
        {deletingAttribute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Icon name="warning" className="text-[26px]" />
              </div>
              <h3 className="text-[18px] font-bold text-gray-900">Xác nhận xóa thuộc tính</h3>
              <p className="mt-2 text-[14px] text-gray-600">
                Bạn có chắc chắn muốn xóa thuộc tính <b className="text-gray-900 font-semibold">“{deletingAttribute.name}”</b>? Thao tác này sẽ xóa thuộc tính và các giá trị đi kèm, không thể hoàn tác.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeletingAttribute(null)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmRemoveAttribute()}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? "Đang xóa..." : "Xóa thuộc tính"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
