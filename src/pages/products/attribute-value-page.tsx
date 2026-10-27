import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { productWizardApi, type AttributeRecord, type AttributeValueRecord } from "@/api/product-wizard";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

function removeDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function industryLabel(name: string) {
  const normalized = removeDiacritics(name).toLowerCase();
  if (/(dung tich|loai da|han dung|mui huong|tong da|volume|skin|fragrance|expiry)/.test(normalized)) {
    return "Mỹ phẩm & Làm đẹp";
  }
  if (/(kich co|kich thuoc|mau sac|chat lieu|size|color|material)/.test(normalized)) {
    return "Thời trang & May mặc";
  }
  return "Đa ngành";
}

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
  const [sortAscending, setSortAscending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  const editValue = async (item: AttributeValueRecord) => {
    const next = window.prompt(`Sửa giá trị “${item.value}”:`, item.value)?.trim();
    if (!next || next === item.value) return;
    setBusy(true);
    setError("");
    try {
      const updated = await productWizardApi.updateAttributeValue(item.id, next);
      setValues((current) => current.map((value) => (value.id === item.id ? { ...value, value: updated.value } : value)));
      setNotice(`Đã cập nhật giá trị thành “${updated.value}”.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeValue = async (item: AttributeValueRecord) => {
    if (!window.confirm(`Xóa giá trị “${item.value}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await productWizardApi.deleteAttributeValue(item.id);
      setValues((current) => current.filter((value) => value.id !== item.id));
      setNotice(`Đã xóa giá trị “${item.value}”.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const bulkAdd = async () => {
    if (!attribute) return;
    const raw = window.prompt("Nhập danh sách giá trị, cách nhau bởi dấu phẩy hoặc xuống dòng:");
    if (!raw) return;
    const items = raw
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!items.length) return;
    setBusy(true);
    setError("");
    let added = 0;
    const failures: string[] = [];
    for (const value of items) {
      try {
        const created = await productWizardApi.addAttributeValue(attribute.id, value);
        setValues((current) => [
          ...current,
          { id: created.id, attributeId: attribute.id, value: created.value, createdAt: new Date().toISOString() },
        ]);
        added += 1;
      } catch {
        failures.push(value);
      }
    }
    setNotice(`Đã thêm ${added}/${items.length} giá trị.${failures.length ? ` Bỏ qua: ${failures.join(", ")}.` : ""}`);
    setBusy(false);
  };

  const industry = attribute ? industryLabel(attribute.name) : "Đang tải";

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#101828]">
      <CatalogHeader active="attributes" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1440px] px-6 py-7">
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
                <Link to="/products">▣ Sản phẩm</Link>
                <span>›</span>
                <Link to="/products/attributes">Thuộc tính</Link>
                <span>›</span>
                <b className="text-[#101828]">{attribute?.name || "Đang tải..."}</b>
              </nav>
              <h1 className="mt-8 text-[31px] font-extrabold tracking-tight">
                Chi Tiết Giá Trị Thuộc Tính: {attribute?.name || ""}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eef0ff] px-3 py-1 text-[12px] font-semibold text-[#4338ca]">● Đang hoạt động</span>
                <span className="rounded-lg bg-[#eef3ff] px-3 py-2 text-[13px] text-[#667085]">
                  ♧ Ngành hàng: <b className="text-[#344054]">{industry}</b>
                </span>
                <span className="rounded-lg bg-[#eef3ff] px-3 py-2 font-mono text-[12px] text-[#667085]">
                  ID: {attribute?.id || "—"}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("/products/attributes")}
              className="rounded-lg bg-[#eef3ff] px-4 py-3 text-[13px] font-semibold text-[#344054]"
            >
              ← Quay lại danh mục thuộc tính
            </button>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              disabled={busy || !attribute}
              onClick={() => void bulkAdd()}
              className="rounded-lg bg-[#eef3ff] px-5 py-3 text-[14px] font-semibold text-[#344054] disabled:opacity-60"
            >
              <Icon name="upload_file" className="mr-2 align-middle text-[18px]" />
              Nhập danh sách hàng loạt (Bulk)
            </button>
          </div>
        </section>

        <section className="mt-7 rounded-2xl bg-white px-7 py-6 shadow-sm">
          <h2 className="text-[18px] font-bold">
            <Icon name="add_box" className="mr-2 align-middle text-[22px] text-[#4338ca]" />
            Thêm Nhanh Giá Trị Mới Cho '{attribute?.name || ""}'
          </h2>
          <div className="mt-5 grid grid-cols-[1fr_340px] items-end gap-5">
            <label className="text-[13px] font-semibold">
              Giá trị cụ thể <span className="text-[#d92d20]">*</span>
              <div className="relative mt-2">
                <Icon name="text_fields" className="absolute left-4 top-1/2 -translate-y-1/2 text-[19px] text-[#667085]" />
                <input
                  value={newValue}
                  maxLength={100}
                  onChange={(event) => setNewValue(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void addValue()}
                  placeholder="Ví dụ: 150ml, 500ml, 1000ml..."
                  className="h-14 w-full rounded-lg border-0 bg-[#eef3ff] pl-12 pr-4 text-[14px] font-normal outline-none focus:ring-2 focus:ring-[#c7cbff]"
                />
              </div>
            </label>
            <button
              disabled={busy || !attribute}
              onClick={() => void addValue()}
              className="h-14 rounded-lg bg-[#4338ca] text-[14px] font-bold text-white disabled:opacity-60"
            >
              <Icon name="bookmark_add" className="mr-2 align-middle text-[19px]" />
              + Thêm vào thư viện
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#eef3ff] px-4 py-3">
              <p className="text-[11px] uppercase text-[#667085]">Tổng giá trị</p>
              <b className="text-[20px]">{values.length}</b>
            </div>
            <div className="rounded-lg bg-[#eef3ff] px-4 py-3">
              <p className="text-[11px] uppercase text-[#667085]">Ngành hàng</p>
              <b className="text-[14px]">{industry}</b>
            </div>
            <div className="rounded-lg bg-[#eef3ff] px-4 py-3">
              <p className="text-[11px] uppercase text-[#667085]">Trạng thái</p>
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
                  className="h-11 w-52 rounded-lg border-0 bg-[#eef3ff] pl-9 pr-3 text-[12px] outline-none"
                />
              </div>
              <button
                onClick={() => setSortAscending((current) => !current)}
                className="rounded-lg bg-[#eef3ff] px-4 text-[12px] text-[#667085]"
              >
                <Icon name="swap_vert" className="mr-1 align-middle text-[17px]" />
                Sắp xếp
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
                  <tr key={item.id} className="border-b border-[#eaecf0]">
                    <td className="px-7 py-5">
                      <span className="mr-2 text-[#98a2b3]">⁙</span>
                      {index + 1}
                    </td>
                    <td className="px-5 py-5">
                      <span className="mr-3 inline-block rounded-lg bg-[#e4ebfb] px-4 py-2 text-[18px] font-bold text-[#344054]">
                        {item.value}
                      </span>
                      <code className="text-[#667085]">ID: {displayCode(item.id)}</code>
                    </td>
                    <td className="px-5 py-5 font-mono">{formatDateTime(item.createdAt)}</td>
                    <td className="px-5 py-5">
                      <span className="rounded-full bg-[#b8f5db] px-3 py-1 text-[11px] font-semibold text-[#067647]">● Active</span>
                    </td>
                    <td className="px-7 py-5 text-right">
                      <button
                        disabled={busy}
                        onClick={() => void editValue(item)}
                        className="mr-5 text-[#475467] hover:text-[#4338ca] disabled:opacity-50"
                        title="Sửa giá trị"
                      >
                        <Icon name="edit" className="text-[20px]" />
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void removeValue(item)}
                        className="text-[#475467] hover:text-[#d92d20] disabled:opacity-50"
                        title="Xóa giá trị"
                      >
                        <Icon name="delete" className="text-[20px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-7 py-4 text-[12px] text-[#667085]">
            <span>
              Hiển thị {filteredValues.length} / {values.length} giá trị
            </span>
            <span className="font-mono">attribute_id: {attribute?.id || "—"}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
