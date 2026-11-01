import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  productWizardApi,
  type AttributeOption,
  type TemplateDetail,
} from "@/api/product-wizard";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";
import { getPrimaryImage } from "@/lib/image-utils";

type Selection = {
  attributeId: string;
  displayOrder: number;
  valueIds: string[];
};

const selectionKey = (templateId: string) => `abc:wizard:selections:${templateId}`;

function readSelections(templateId: string): Selection[] {
  try {
    const raw = sessionStorage.getItem(selectionKey(templateId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function defaultSelections(attributes: AttributeOption[], industry: string): Selection[] {
  const preferred =
    industry === "BEAUTY"
      ? ["Dung tích", "Loại da", "Phiên bản"]
      : ["Kích cỡ", "Màu sắc", "Chất liệu"];
  const withValues = attributes.filter((attribute) => attribute.attributeValues.length > 0);
  const picked: AttributeOption[] = [];
  for (const token of preferred) {
    const found = withValues.find((attribute) => attribute.name.toLowerCase().includes(token.toLowerCase()));
    if (found && !picked.some((attribute) => attribute.id === found.id)) picked.push(found);
  }
  for (const attribute of withValues) {
    if (picked.length >= 2) break;
    if (!picked.some((item) => item.id === attribute.id)) picked.push(attribute);
  }
  return picked.slice(0, 2).map((attribute, index) => ({
    attributeId: attribute.id,
    displayOrder: (index + 1) * 10,
    valueIds: attribute.attributeValues.slice(0, index === 0 ? 3 : 2).map((value) => value.id),
  }));
}

export function ProductAttributesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId") || "";

  const [keyword, setKeyword] = useState("");
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [openLibrary, setOpenLibrary] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!templateId) {
      navigate("/products/new", { replace: true });
      return;
    }
    let cancelled = false;
    Promise.all([productWizardApi.getTemplate(templateId), productWizardApi.attributes()])
      .then(([detail, attributeList]) => {
        if (cancelled) return;
        setTemplate(detail);
        setAttributes(attributeList);
        const saved = readSelections(templateId);
        const valid = saved.filter((item) => attributeList.some((attribute) => attribute.id === item.attributeId));
        if (valid.length) {
          setSelections(valid);
        } else {
          const industry = sessionStorage.getItem(`abc:wizard:industry:${templateId}`) || "BEAUTY";
          setSelections(defaultSelections(attributeList, industry));
        }
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [templateId, navigate]);

  const attrById = useMemo(() => new Map(attributes.map((attribute) => [attribute.id, attribute])), [attributes]);

  const selectedAttributes = useMemo(
    () =>
      selections
        .map((selection) => {
          const attribute = attrById.get(selection.attributeId);
          if (!attribute) return null;
          const values = selection.valueIds
            .map((id) => attribute.attributeValues.find((value) => value.id === id))
            .filter((value): value is { id: string; value: string } => Boolean(value));
          return { selection, attribute, values };
        })
        .filter((item): item is { selection: Selection; attribute: AttributeOption; values: { id: string; value: string }[] } => Boolean(item)),
    [selections, attrById],
  );

  const combinations = useMemo(() => {
    if (selectedAttributes.length === 0) return [] as string[];
    let combos: string[][] = [[]];
    for (const item of selectedAttributes) {
      if (item.values.length === 0) return [];
      combos = combos.flatMap((combo) => item.values.map((value) => [...combo, value.value]));
    }
    return combos.map((combo) => combo.join(" • "));
  }, [selectedAttributes]);

  const persist = (nextSelections: Selection[]) => {
    setSelections(nextSelections);
    sessionStorage.setItem(selectionKey(templateId), JSON.stringify(nextSelections));
  };

  const updateSelection = (attributeId: string, patch: Partial<Selection>) => {
    persist(
      selections.map((selection) =>
        selection.attributeId === attributeId ? { ...selection, ...patch } : selection,
      ),
    );
  };

  const toggleValue = (attributeId: string, valueId: string) => {
    const current = selections.find((selection) => selection.attributeId === attributeId);
    if (!current) return;
    const valueIds = current.valueIds.includes(valueId)
      ? current.valueIds.filter((id) => id !== valueId)
      : [...current.valueIds, valueId];
    updateSelection(attributeId, { valueIds });
  };

  const addValue = async (attributeId: string) => {
    const value = (newValues[attributeId] || "").trim();
    if (!value) return;
    setError("");
    try {
      const created = await productWizardApi.addAttributeValue(attributeId, value);
      setAttributes((current) =>
        current.map((attribute) =>
          attribute.id === attributeId
            ? { ...attribute, attributeValues: [...attribute.attributeValues, created] }
            : attribute,
        ),
      );
      const current = selections.find((selection) => selection.attributeId === attributeId);
      if (current) updateSelection(attributeId, { valueIds: [...current.valueIds, created.id] });
      setNewValues((current) => ({ ...current, [attributeId]: "" }));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addAttribute = () => {
    if (selections.length >= 3) {
      setError("Tối đa 3 chiều thuộc tính trong ma trận biến thể.");
      return;
    }
    const candidate = attributes.find(
      (attribute) => attribute.attributeValues.length > 0 && !selections.some((selection) => selection.attributeId === attribute.id),
    );
    if (!candidate) {
      setError("Không còn thư viện thuộc tính nào có sẵn giá trị để thêm.");
      return;
    }
    persist([
      ...selections,
      { attributeId: candidate.id, displayOrder: (selections.length + 1) * 10, valueIds: [candidate.attributeValues[0].id] },
    ]);
  };

  const removeAttribute = (attributeId: string) => {
    persist(selections.filter((selection) => selection.attributeId !== attributeId));
  };

  const saveDraft = () => {
    persist(selections);
    setNotice("Đã lưu cấu hình thuộc tính cho mẫu sản phẩm.");
  };

  const goBackToStep1 = () => {
    persist(selections);
    navigate(`/products/new?templateId=${templateId}`);
  };

  const goNext = () => {
    if (selections.length === 0) {
      setError("Vui lòng chọn ít nhất một thuộc tính sinh biến thể.");
      return;
    }
    if (combinations.length === 0) {
      setError("Mỗi thuộc tính cần có ít nhất một giá trị đã chọn.");
      return;
    }
    if (combinations.length > 60) {
      setError("Tối đa 60 tổ hợp biến thể trong một lần tạo để bảo đảm hiệu năng.");
      return;
    }
    persist(selections);
    navigate(`/products/new/variants?templateId=${templateId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa]">
        <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />
        <div className="mx-auto max-w-[1560px] px-5 py-10 text-[13px] text-[#667085]">Đang tải cấu hình mẫu sản phẩm…</div>
      </div>
    );
  }

  const categoryLabel = template?.category
    ? `${template.category.parent ? template.category.parent.name + " › " : ""}${template.category.name}`
    : "Chưa phân loại";

  return (
    <div className="min-h-screen bg-[#f5f6fa] pb-24 text-[#101828]">
      <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1560px] px-5 py-3">
        {error && <div className="mb-3 rounded-lg border border-[#fecdca] bg-[#fef3f2] px-4 py-2.5 text-[12.5px] text-[#b42318]">{error}</div>}
        {notice && <div className="mb-3 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-2.5 text-[12.5px] text-[#067647]">{notice}</div>}

        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-lg bg-[#eef0ff] text-[#4338ca]">
              {template?.imageUrl ? (
                <img alt={template.name} className="h-full w-full object-cover" src={getPrimaryImage(template.imageUrl)} />
              ) : (
                <Icon name="inventory_2" className="text-[26px]" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#eef0ff] px-2 py-1 font-mono text-[12px] font-bold text-[#4338ca]">{template?.code || "TMP"}</span>
                <span className="rounded bg-[#eef3ff] px-2 py-1 text-[11px] text-[#667085]">Ngành: {template?.category?.parent?.name || template?.category?.name || "Chưa phân loại"}</span>
                <span className={["rounded-full px-2 py-1 text-[11px] font-semibold", template?.hasLotTracking ? "bg-[#d1fadf] text-[#067647]" : "bg-[#f2f4f7] text-[#667085]"].join(" ")}>
                  ● Quản lý Lô Date FEFO: {template?.hasLotTracking ? "BẬT" : "TẮT"}
                </span>
              </div>
              <p className="mt-1 text-[14px] text-[#667085]">
                Đang cấu hình cho Mẫu cha: <b className="text-[17px] text-[#101828]">{template?.name}</b>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={goBackToStep1} className="rounded-lg bg-[#eef3ff] px-4 py-3 text-[12px] font-semibold text-[#344054]">
              <Icon name="edit_note" className="mr-1 align-middle text-[17px]" />
              Xem / sửa mẫu cha
            </button>
            <span className="rounded-lg bg-[#eef0ff] px-4 py-3 text-[12px] font-semibold text-[#4338ca]">
              <Icon name="info" className="mr-1 align-middle text-[17px]" />
              {categoryLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            ["✓", "BƯỚC 1 ✓", "Mẫu sản phẩm cha", template?.code || ""],
            ["2", "BƯỚC 2 • ĐANG THỰC HIỆN", "Thiết lập Thuộc tính", "Chọn chiều & giá trị"],
            ["3", "BƯỚC 3 • SẮP TỚI", "Sinh biến thể SKU", "Mã SKU, Barcode, Giá"],
            ["4", "BƯỚC 4 • SẮP TỚI", "Sổ dư tồn đầu", "inventory_balances"],
          ].map(([number, eyebrow, title, subtitle], index) => (
            <div key={title} className={["rounded-xl px-4 py-3", index === 1 ? "bg-[#4f46e5] text-white" : "bg-white"].join(" ")}>
              <div className="flex items-center gap-3">
                <span className={["grid h-9 w-9 place-items-center rounded-full text-[18px] font-bold", index === 0 ? "bg-[#d1fadf] text-[#067647]" : index === 1 ? "bg-white text-[#4f46e5]" : "bg-[#eef3ff] text-[#667085]"].join(" ")}>
                  {number}
                </span>
                <div>
                  <p className={["text-[10px] font-semibold", index === 1 ? "text-white/80" : "text-[#667085]"].join(" ")}>{eyebrow}</p>
                  <p className="text-[14px] font-bold">{title}</p>
                  <p className={["text-[11px]", index === 1 ? "text-white/80" : "text-[#667085]"].join(" ")}>{subtitle}</p>
                </div>
                {index === 1 && <span className="ml-auto rounded bg-white px-2 py-1 text-[10px] font-bold text-[#4338ca]">50%</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#4f46e5] text-[20px] font-bold text-white">1.</span>
            <div>
              <h1 className="text-[17px] font-bold">Thuộc Tính Sinh Biến Thể</h1>
              <p className="text-[12px] text-[#667085]">Gắn chiều thuộc tính để tự động tổ hợp mã SKU trong ma trận biến thể</p>
            </div>
          </div>
          <span className="rounded-full bg-[#eef3ff] px-3 py-2 font-mono text-[12px] text-[#667085]">{selections.length}/3 Thuộc tính đã chọn</span>
        </div>

        <div className="mt-4 space-y-3">
          {selectedAttributes.map(({ selection, attribute, values }, index) => {
            const available = attributes.filter(
              (item) => item.id === attribute.id || !selections.some((s) => s.attributeId === item.id),
            );
            return (
              <section key={attribute.id} className="rounded-2xl border border-[#e8eaf0] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon name="drag_indicator" className="text-[20px] text-[#667085]" />
                  <span className="rounded bg-[#eef0ff] px-2 py-1 text-[13px] font-bold text-[#4338ca]">#{index + 1}</span>
                  <select
                    value={attribute.id}
                    onChange={(event) => updateSelection(attribute.id, { attributeId: event.target.value, valueIds: [] })}
                    className="h-11 min-w-[300px] rounded-lg border-0 bg-[#eef3ff] px-3 text-[16px] font-semibold outline-none focus:ring-2 focus:ring-[#c7cbff]"
                  >
                    {available.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <span className="rounded bg-[#f2f4f7] px-2.5 py-1.5 font-mono text-[11px] text-[#667085]">display_order: {selection.displayOrder}</span>
                  <div className="ml-auto flex items-center gap-4 text-[#667085]">
                    <span className="text-[11px]">{values.length} giá trị đã chọn</span>
                    <button onClick={() => removeAttribute(attribute.id)} aria-label="Xóa thuộc tính" className="text-[#d92d20] hover:text-[#b42318]">
                      <Icon name="delete" className="text-[20px]" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-[12px] text-[#667085]">Giá trị thuộc tính áp dụng cho mẫu cha này:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {values.map((value) => (
                    <span key={value.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef3ff] px-3 py-2 text-[13px] font-semibold text-[#344054]">
                      {value.value}
                      <button onClick={() => toggleValue(attribute.id, value.id)} aria-label={`Xóa ${value.value}`} className="ml-1 text-[#98a2b3] hover:text-[#d92d20]">
                        ×
                      </button>
                    </span>
                  ))}
                  {values.length === 0 && <span className="text-[12px] text-[#98a2b3]">Chưa chọn giá trị nào bên dưới.</span>}
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#eef3ff] p-2">
                  <Icon name="add_circle_outline" className="ml-1 text-[20px] text-[#667085]" />
                  <input
                    value={newValues[attribute.id] || ""}
                    onChange={(event) => setNewValues((current) => ({ ...current, [attribute.id]: event.target.value }))}
                    onKeyDown={(event) => event.key === "Enter" && void addValue(attribute.id)}
                    placeholder={`Gõ giá trị mới cho ${attribute.name} và nhấn Enter...`}
                    className="h-8 flex-1 bg-transparent px-1 text-[12px] outline-none placeholder:text-[#667085]"
                  />
                  <button onClick={() => void addValue(attribute.id)} className="rounded-md bg-[#4f46e5] px-3 py-2 text-[12px] font-semibold text-white">
                    Thêm ↵
                  </button>
                  <button
                    onClick={() => setOpenLibrary((current) => ({ ...current, [attribute.id]: !current[attribute.id] }))}
                    className="rounded-md bg-[#deebff] px-3 py-2 text-[12px] font-semibold text-[#344054]"
                  >
                    <Icon name="library_add" className="mr-1 align-middle text-[15px]" />
                    Thư viện
                  </button>
                </div>

                {openLibrary[attribute.id] && (
                  <div className="mt-2 rounded-lg border border-[#e1e7f2] bg-[#fbfcff] p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Chọn nhanh từ thư viện {attribute.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {attribute.attributeValues.map((value) => {
                        const active = selection.valueIds.includes(value.id);
                        return (
                          <button
                            key={value.id}
                            onClick={() => toggleValue(attribute.id, value.id)}
                            className={["rounded-md px-2.5 py-1.5 text-[12px] font-semibold", active ? "bg-[#4f46e5] text-white" : "bg-white text-[#344054] ring-1 ring-[#d0d5dd] hover:bg-[#eef3ff]"].join(" ")}
                          >
                            {value.value}
                          </button>
                        );
                      })}
                      {attribute.attributeValues.length === 0 && <span className="text-[12px] text-[#98a2b3]">Thư viện chưa có giá trị.</span>}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <button
          onClick={addAttribute}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e8eaf0] bg-white py-4 text-[15px] font-bold text-[#4338ca] hover:bg-[#f8f7ff]"
        >
          <Icon name="library_add" className="text-[20px]" />
          + Thêm thuộc tính khác (Tối đa 3 chiều ma trận)
        </button>

        <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-4">
          <section className="rounded-2xl bg-[#eef0ff] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold">
                <Icon name="calculate" className="mr-2 align-middle text-[20px] text-[#4338ca]" />
                Dự tính sinh biến thể SKU
              </h2>
              <span className="rounded-lg bg-[#4f46e5] px-3 py-2 text-[17px] font-bold text-white">{combinations.length} Biến thể SKU</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px]">
              {selectedAttributes.map((item, index) => (
                <span key={item.attribute.id} className="font-semibold text-[#344054]">
                  <b className="text-[#4338ca]">{item.values.length}</b> {item.attribute.name}
                  {index < selectedAttributes.length - 1 && <span className="mx-2 text-[#98a2b3]">×</span>}
                </span>
              ))}
              <span className="text-[#98a2b3]">=</span>
              <b className="text-[#101828]">{combinations.length} Biến thể SKU dự kiến tạo ra ở Bước 3</b>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {combinations.slice(0, 6).map((combo) => (
                <div key={combo} className="rounded-lg bg-white px-2 py-3 text-center text-[11px] font-semibold text-[#344054]">
                  {combo}
                </div>
              ))}
              {combinations.length === 0 && <div className="col-span-3 rounded-lg bg-white px-3 py-3 text-[12px] text-[#98a2b3]">Chọn ít nhất một giá trị cho mỗi thuộc tính để xem trước tổ hợp.</div>}
            </div>
            <p className="mt-3 text-[12px] text-[#667085]">
              <Icon name="verified_user" className="mr-2 align-middle text-[16px] text-[#4338ca]" />
              <b className="font-mono text-[#4338ca]">Ràng buộc toàn vẹn CSDL:</b> Một biến thể không được có 2 giá trị cùng thuộc tính.
            </p>
          </section>
          <section className="rounded-2xl border border-[#dbe4f3] bg-white p-4">
            <h2 className="text-[17px] font-bold">
              <span className="mr-2 inline-grid h-9 w-9 place-items-center rounded-lg bg-[#d1fadf] text-[#067647]">💡</span>
              Quản lý Thuộc tính dùng chung
            </h2>
            <p className="mt-1 text-[11px] uppercase text-[#98a2b3]">CẤP TENANT / TOÀN HỆ THỐNG</p>
            <p className="mt-3 text-[12px] leading-[1.5] text-[#667085]">
              <b>Gợi ý:</b> Quản lý và bổ sung Thư viện Thuộc tính &amp; Giá trị dùng chung toàn doanh nghiệp tại menu{" "}
              <b>Sản phẩm &gt; Thuộc tính.</b>
            </p>
            <button onClick={() => navigate("/products/attributes")} className="mt-5 w-full rounded-lg bg-[#deebff] px-3 py-3 text-left text-[13px] font-semibold text-[#344054]">
              <Icon name="library_books" className="mr-2 align-middle text-[18px]" />
              Mở Thư viện Thuộc Tính
              <Icon name="arrow_outward" className="float-right text-[18px]" />
            </button>
          </section>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eaecf0] bg-white px-5 py-3">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between">
          <button type="button" onClick={goBackToStep1} className="rounded-lg bg-[#eaf0ff] px-5 py-3 text-[14px] font-semibold text-[#344054]">
            ← Quay lại: Bước 1 - Mẫu sản phẩm cha
          </button>
          <div className="flex items-center gap-4">
            <button onClick={saveDraft} className="text-[14px] font-semibold text-[#667085]">
              <Icon name="bookmark_border" className="mr-1 align-middle text-[18px]" />
              Lưu bản nháp
            </button>
            <button onClick={goNext} className="rounded-lg bg-[#4f46e5] px-7 py-3 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
              Tiếp tục: Bước 3 - Sinh biến thể SKU ({combinations.length} SKU)
              <Icon name="arrow_forward" className="ml-2 align-middle text-[20px]" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
