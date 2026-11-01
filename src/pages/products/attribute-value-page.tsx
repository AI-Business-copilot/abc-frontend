import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { productWizardApi, type AttributeRecord, type AttributeValueRecord } from "@/api/product-wizard";
import {
  getAttributeIndustry,
  setAttributeIndustry,
  INDUSTRY_OPTIONS,
  type AttributeIndustry,
} from "@/lib/attribute-industry";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", { hour12: false });
}

const displayCode = (id: string) => `VAL-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export function AttributeValuePage() {
  const navigate = useNavigate();
  const { attributeId = "" } = useParams();
  const [keyword, setKeyword] = useState("");
  const [newValue, setNewValue] = useState("");
  const [attribute, setAttribute] = useState<AttributeRecord | null>(null);
  const [values, setValues] = useState<AttributeValueRecord[]>([]);
  const [currentIndustry, setCurrentIndustry] = useState<AttributeIndustry>("fashion");
  const [sortAscending, setSortAscending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Resume banner state
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);

  // Custom Modals (replaces window.prompt & window.confirm)
  const [editingItem, setEditingItem] = useState<AttributeValueRecord | null>(null);
  const [editInputValue, setEditInputValue] = useState("");
  const [deletingItem, setDeletingItem] = useState<AttributeValueRecord | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRawText, setBulkRawText] = useState("");

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

  useEffect(() => {
    if (!attributeId) {
      navigate("/products/attributes", { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    productWizardApi
      .getAttribute(attributeId)
      .then((record) => {
        if (cancelled) return;
        setAttribute(record);
        setValues(record.attributeValues ?? []);
        setCurrentIndustry(getAttributeIndustry(record.id, record.name));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attributeId, navigate]);

  const handleIndustryChange = (industry: AttributeIndustry) => {
    if (!attribute) return;
    setAttributeIndustry(attribute.id, industry);
    setCurrentIndustry(industry);
    setNotice("Đã cập nhật cấu hình ngành cho thuộc tính.");
  };

  const filteredValues = useMemo(() => {
    const result = values.filter(
      (item) =>
        item.value.toLowerCase().includes(keyword.toLowerCase()) ||
        displayCode(item.id).toLowerCase().includes(keyword.toLowerCase()),
    );
    return [...result].sort((a, b) =>
      sortAscending
        ? a.value.localeCompare(b.value, undefined, { numeric: true })
        : b.value.localeCompare(a.value, undefined, { numeric: true }),
    );
  }, [keyword, sortAscending, values]);

  const addValue = async () => {
    const value = newValue.trim();
    if (!value || !attribute) return;
    setBusy(true);
    setError("");
    try {
      const created = await productWizardApi.addAttributeValue(attribute.id, value);
      setValues((current) => [
        ...current,
        {
          id: created.id,
          attributeId: attribute.id,
          value: created.value,
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewValue("");
      setNotice(`Đã thêm giá trị “${created.value}”.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openEditModal = (item: AttributeValueRecord) => {
    setEditingItem(item);
    setEditInputValue(item.value);
  };

  const submitEdit = async () => {
    if (!editingItem) return;
    const next = editInputValue.trim();
    if (!next) {
      setError("Giá trị thuộc tính không được để trống.");
      return;
    }
    if (next === editingItem.value) {
      setEditingItem(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await productWizardApi.updateAttributeValue(editingItem.id, next);
      setValues((current) =>
        current.map((value) => (value.id === editingItem.id ? { ...value, value: updated.value } : value)),
      );
      setNotice(`Đã cập nhật giá trị thành “${updated.value}”.`);
      setEditingItem(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setBusy(true);
    setError("");
    try {
      await productWizardApi.deleteAttributeValue(deletingItem.id);
      setValues((current) => current.filter((value) => value.id !== deletingItem.id));
      setNotice(`Đã xóa giá trị “${deletingItem.value}”.`);
      setDeletingItem(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const bulkParsedItems = useMemo(() => {
    return bulkRawText
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [bulkRawText]);

  const submitBulkAdd = async () => {
    if (!attribute || !bulkParsedItems.length) return;
    setBusy(true);
    setError("");
    let added = 0;
    const failures: string[] = [];
    for (const val of bulkParsedItems) {
      try {
        const created = await productWizardApi.addAttributeValue(attribute.id, val);
        setValues((current) => [
          ...current,
          { id: created.id, attributeId: attribute.id, value: created.value, createdAt: new Date().toISOString() },
        ]);
        added += 1;
      } catch {
        failures.push(val);
      }
    }
    setShowBulkModal(false);
    setBulkRawText("");
    setNotice(
      `Đã thêm thành công ${added}/${bulkParsedItems.length} giá trị.${failures.length ? ` Bỏ qua: ${failures.join(", ")}.` : ""}`,
    );
    setBusy(false);
  };

  const currentIndustryObj = INDUSTRY_OPTIONS.find((o) => o.value === currentIndustry) || INDUSTRY_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#101828]">
      <CatalogHeader active="attributes" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1440px] px-6 py-7">
        {/* Banner tiến trình nếu có */}
        {activeTemplateId && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#4f46e5]/40 bg-gradient-to-r from-[#eef2ff] via-white to-[#eef2ff] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4f46e5] text-white">
                <Icon name="bookmark" className="text-[22px]" />
              </span>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#4338ca]">
                  Đang có tiến trình tạo sản phẩm dở dang (Bước 2)
                </p>
                <p className="text-[15px] font-bold text-[#101828]">
                  Mẫu sản phẩm cha: <span className="text-[#4338ca]">{activeTemplateName}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/products/attributes-selection?templateId=${activeTemplateId}`)}
              className="flex items-center gap-1.5 rounded-xl bg-[#4f46e5] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-[#4338ca]"
            >
              <span>Quay lại Bước 2 tiếp tục</span>
              <Icon name="arrow_forward" className="text-[17px]" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-[#fecdca] bg-[#fef3f2] px-4 py-2.5 text-[12.5px] text-[#b42318]">{error}</div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-2.5 text-[12.5px] text-[#067647]">{notice}</div>
        )}

        <section className="rounded-2xl bg-white px-7 py-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <nav className="flex flex-wrap items-center gap-3 text-[13px] text-[#667085]">
                <Link to="/products" className="hover:text-[#4338ca]">▣ Sản phẩm</Link>
                <span>›</span>
                <Link to="/products/attributes" className="hover:text-[#4338ca]">Thuộc tính</Link>
                <span>›</span>
                <b className="text-[#101828]">{attribute?.name || "Đang tải..."}</b>
              </nav>
              <h1 className="mt-6 text-[31px] font-extrabold tracking-tight">
                Chi Tiết Giá Trị Thuộc Tính: <span className="text-[#4338ca]">{attribute?.name || ""}</span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#d1fadf] px-3 py-1 text-[12px] font-semibold text-[#067647]">● Đang hoạt động</span>
                
                {/* Cấu hình ngành cho thuộc tính này */}
                <div className="flex items-center gap-2 rounded-lg bg-[#f8f9fc] border border-[#e5e7eb] px-3 py-1.5 text-[13px]">
                  <span className="text-[#667085] font-medium">Ngành hàng:</span>
                  <select
                    value={currentIndustry}
                    onChange={(e) => handleIndustryChange(e.target.value as AttributeIndustry)}
                    className="rounded-md border border-[#d0d5dd] bg-white px-2 py-1 text-[12.5px] font-semibold text-[#101828] outline-none focus:border-[#4f46e5]"
                  >
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="rounded-lg bg-[#eef3ff] px-3 py-2 font-mono text-[12px] text-[#667085]">
                  ID: {attribute?.id || "—"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy || !attribute}
                onClick={() => {
                  setBulkRawText("");
                  setShowBulkModal(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-[#c7cbff] bg-[#f8f7ff] px-5 py-3 text-[14px] font-bold text-[#4338ca] hover:bg-[#eef0ff] disabled:opacity-60"
              >
                <Icon name="upload_file" className="text-[19px]" />
                Nhập danh sách hàng loạt (Bulk)
              </button>
              <button
                onClick={() => navigate("/products/attributes")}
                className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3 text-[13px] font-semibold text-[#344054] hover:bg-gray-50"
              >
                ← Quay lại danh mục thuộc tính
              </button>
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-2xl bg-white px-7 py-6 shadow-sm">
          <h2 className="text-[18px] font-bold text-[#101828]">
            <Icon name="add_box" className="mr-2 align-middle text-[22px] text-[#4338ca]" />
            Thêm Nhanh Giá Trị Mới Cho '{attribute?.name || ""}'
          </h2>
          <div className="mt-5 grid grid-cols-[1fr_260px] items-end gap-4">
            <label className="text-[13px] font-semibold text-gray-700">
              Giá trị cụ thể <span className="text-[#d92d20]">*</span>
              <div className="relative mt-2">
                <Icon name="text_fields" className="absolute left-4 top-1/2 -translate-y-1/2 text-[19px] text-[#667085]" />
                <input
                  value={newValue}
                  maxLength={100}
                  onChange={(event) => setNewValue(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void addValue()}
                  placeholder="Ví dụ: Đỏ ruby, 250ml, Size XL, Cotton 100%..."
                  className="h-12 w-full rounded-xl border border-[#d0d5dd] bg-[#f8f9fc] pl-12 pr-4 text-[14px] outline-none focus:border-[#4f46e5] focus:bg-white"
                />
              </div>
            </label>
            <button
              disabled={busy || !attribute}
              onClick={() => void addValue()}
              className="h-12 rounded-xl bg-[#4f46e5] text-[14px] font-bold text-white shadow-sm hover:bg-[#4338ca] disabled:opacity-60"
            >
              <Icon name="bookmark_add" className="mr-1.5 align-middle text-[19px]" />
              + Thêm vào thư viện
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#f8f9fc] border border-gray-100 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#667085]">Tổng giá trị</p>
              <b className="text-[20px] text-[#101828]">{values.length}</b>
            </div>
            <div className="rounded-xl bg-[#f8f9fc] border border-gray-100 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#667085]">Ngành hàng đang áp dụng</p>
              <b className="text-[14px] text-[#4338ca]">{currentIndustryObj.label}</b>
            </div>
            <div className="rounded-xl bg-[#f8f9fc] border border-gray-100 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-[#667085]">Trạng thái</p>
              <b className="text-[14px] text-[#067647]">● Active</b>
            </div>
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-7 py-6">
            <h2 className="text-[19px] font-bold">Danh Sách Giá Trị Thuộc Tính</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Icon name="filter_alt" className="absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#98a2b3]" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm kiếm giá trị..."
                  className="h-10 w-56 rounded-lg border border-[#d0d5dd] bg-[#f8f9fc] pl-9 pr-3 text-[12px] outline-none focus:border-[#4f46e5]"
                />
              </div>
              <button
                onClick={() => setSortAscending((current) => !current)}
                className="flex items-center gap-1 rounded-lg border border-[#d0d5dd] bg-white px-3 text-[12px] font-semibold text-[#667085] hover:bg-gray-50"
              >
                <Icon name="swap_vert" className="text-[17px]" />
                Sắp xếp {sortAscending ? "A-Z" : "Z-A"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead className="bg-[#eef3ff] text-[11px] uppercase text-[#667085]">
                <tr>
                  <th className="w-24 px-7 py-4"># Thứ tự</th>
                  <th className="px-5 py-4">Giá trị thuộc tính (Value)</th>
                  <th className="px-5 py-4">Ngày tạo (created_at)</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-7 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-7 py-8 text-center text-[#667085]" colSpan={5}>
                      Đang tải giá trị thuộc tính…
                    </td>
                  </tr>
                )}
                {!loading && filteredValues.length === 0 && (
                  <tr>
                    <td className="px-7 py-8 text-center text-[#667085]" colSpan={5}>
                      Chưa có giá trị nào phù hợp. Thêm giá trị mới ở phía trên.
                    </td>
                  </tr>
                )}
                {filteredValues.map((item, index) => (
                  <tr key={item.id} className="border-b border-[#eaecf0] hover:bg-[#fafbff]">
                    <td className="px-7 py-4 text-gray-500">
                      <span className="mr-2 text-[#98a2b3]">⁙</span>
                      {index + 1}
                    </td>
                    <td className="px-5 py-4">
                      <span className="mr-3 inline-block rounded-lg bg-[#eef0ff] px-3.5 py-1.5 text-[15px] font-bold text-[#344054]">
                        {item.value}
                      </span>
                      <code className="text-[12px] text-[#667085]">ID: {displayCode(item.id)}</code>
                    </td>
                    <td className="px-5 py-4 font-mono text-[12.5px] text-gray-600">{formatDateTime(item.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#d1fadf] px-2.5 py-1 text-[11px] font-semibold text-[#067647]">● Active</span>
                    </td>
                    <td className="px-7 py-4 text-right">
                      {/* Nút Sửa mở Modal chuyên nghiệp */}
                      <button
                        disabled={busy}
                        onClick={() => openEditModal(item)}
                        className="mr-3 rounded-lg p-2 text-[#475467] hover:bg-[#eef2ff] hover:text-[#4338ca] disabled:opacity-50"
                        title="Chỉnh sửa giá trị"
                      >
                        <Icon name="edit" className="text-[19px]" />
                      </button>
                      {/* Nút Xóa mở Modal xác nhận chuyên nghiệp */}
                      <button
                        disabled={busy}
                        onClick={() => setDeletingItem(item)}
                        className="rounded-lg p-2 text-[#475467] hover:bg-[#fef3f2] hover:text-[#d92d20] disabled:opacity-50"
                        title="Xóa giá trị"
                      >
                        <Icon name="delete" className="text-[19px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-7 py-4 text-[12px] text-[#667085] bg-[#fafbff] border-t border-[#eaecf0]">
            <span>
              Hiển thị {filteredValues.length} / {values.length} giá trị
            </span>
            <span className="font-mono">attribute_id: {attribute?.id || "—"}</span>
          </div>
        </section>

        {/* MODAL 1: CHỈNH SỬA GIÁ TRỊ (Thay thế window.prompt) */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-[17px] font-bold text-gray-900 flex items-center gap-2">
                  <Icon name="edit_note" className="text-[22px] text-[#4f46e5]" />
                  Chỉnh sửa giá trị thuộc tính
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>

              <div className="mt-4">
                <label className="text-[13px] font-semibold text-gray-700">
                  Tên giá trị thuộc tính <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={editInputValue}
                  onChange={(e) => setEditInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitEdit();
                    if (e.key === "Escape") setEditingItem(null);
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-[14px] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20"
                />
                <p className="mt-1.5 text-[12px] text-gray-500">
                  Giá trị cũ: <span className="font-semibold text-gray-800">{editingItem.value}</span>
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditingItem(null)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={busy || !editInputValue.trim()}
                  onClick={() => void submitEdit()}
                  className="rounded-xl bg-[#4f46e5] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#4338ca] disabled:opacity-60"
                >
                  {busy ? "Đang lưu..." : "Cập nhật giá trị"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: NHẬP DANH SÁCH HÀNG LOẠT (Thay thế window.prompt) */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                  <Icon name="upload_file" className="text-[22px] text-[#4f46e5]" />
                  Nhập danh sách giá trị hàng loạt (Bulk Add)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>

              <div className="mt-4">
                <label className="text-[13px] font-semibold text-gray-700">
                  Danh sách giá trị (mỗi giá trị trên một dòng hoặc cách nhau bởi dấu phẩy):
                </label>
                <textarea
                  autoFocus
                  rows={6}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  placeholder={`Ví dụ:\nSize S\nSize M\nSize L\nSize XL\nhoặc: 50ml, 100ml, 200ml, 500ml`}
                  className="mt-2 w-full rounded-xl border border-gray-300 p-3.5 text-[13px] font-mono outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20"
                />
                <div className="mt-2 flex items-center justify-between text-[12px] text-gray-500">
                  <span>Hỗ trợ phân tách bằng dấu xuống dòng hoặc dấu phẩy (<code>,</code>).</span>
                  <span className="font-semibold text-[#4f46e5]">
                    Đã nhận diện: {bulkParsedItems.length} giá trị
                  </span>
                </div>
              </div>

              {bulkParsedItems.length > 0 && (
                <div className="mt-3 max-h-28 overflow-y-auto rounded-xl bg-gray-50 p-2.5 border border-gray-200">
                  <p className="text-[11px] font-semibold uppercase text-gray-500 mb-1.5">Xem trước các giá trị sẽ thêm:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bulkParsedItems.map((val, idx) => (
                      <span key={idx} className="rounded bg-white border border-gray-200 px-2 py-0.5 text-[12px] font-medium text-gray-700">
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={busy || bulkParsedItems.length === 0}
                  onClick={() => void submitBulkAdd()}
                  className="rounded-xl bg-[#4f46e5] px-6 py-2.5 text-[13px] font-bold text-white hover:bg-[#4338ca] disabled:opacity-60"
                >
                  {busy ? "Đang xử lý..." : `Thêm ${bulkParsedItems.length} giá trị`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: XÁC NHẬN XÓA GIÁ TRỊ (Thay thế window.confirm) */}
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Icon name="delete_forever" className="text-[26px]" />
              </div>
              <h3 className="text-[18px] font-bold text-gray-900">Xóa giá trị thuộc tính</h3>
              <p className="mt-2 text-[14px] text-gray-600">
                Bạn có chắc chắn muốn xóa giá trị <b className="text-gray-900 font-semibold">“{deletingItem.value}”</b> khỏi thuộc tính <span className="font-semibold text-[#4f46e5]">{attribute?.name}</span>?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeletingItem(null)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmDelete()}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? "Đang xóa..." : "Xóa vĩnh viễn"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
