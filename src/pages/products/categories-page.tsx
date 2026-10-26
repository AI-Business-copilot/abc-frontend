import { useEffect, useMemo, useState } from "react";

import {
  categoriesApi,
  type CategoryListResponse,
  type CategoryNode,
} from "@/api/categories";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

const PAGE_SIZE = 8;

type Tone = "emerald" | "indigo" | "amber" | "sky";
type Status = "idle" | "loading" | "saving";

type FlatRow = {
  node: CategoryNode;
  parentName: string | null;
  tone: Tone;
  icon: string;
};

type FormState = {
  name: string;
  level: 1 | 2;
  parentId: string;
  description: string;
};

const EMPTY_FORM: FormState = { name: "", level: 2, parentId: "", description: "" };

const ROOT_STYLES: { icon: string; tone: Tone }[] = [
  { icon: "steps", tone: "amber" },
  { icon: "spa", tone: "emerald" },
  { icon: "shopping_bag", tone: "sky" },
  { icon: "checkroom", tone: "indigo" },
];

const rootStyle = (index: number) => ROOT_STYLES[index % ROOT_STYLES.length];

const numberText = (value: number) => new Intl.NumberFormat("vi-VN").format(value || 0);

function StatTile({
  icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  suffix: string;
  tone: "blue" | "rose";
}) {
  return (
    <div className={`stat-tile ${tone}`}>
      <span className={`stat-ico ${tone}`}>
        <Icon name={icon} className="text-[18px]" />
      </span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">
          <strong>{numberText(value)}</strong> {suffix}
        </div>
      </div>
    </div>
  );
}

function CategoryChipList({ attributes, tone }: { attributes: string[]; tone: Tone | "muted" }) {
  if (attributes.length === 0) {
    return <span className="text-[11px] text-[#98a2b3]">Chưa cấu hình</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {attributes.map((attribute) => (
        <span key={attribute} className={`cat-chip tone-${tone}`}>
          {attribute}
        </span>
      ))}
    </div>
  );
}

function CategoryTable({
  rows,
  page,
  totalPages,
  shown,
  total,
  collapsed,
  selected,
  onToggleRow,
  onToggleAll,
  onToggleCollapse,
  onEdit,
  onDelete,
  onPage,
}: {
  rows: FlatRow[];
  page: number;
  totalPages: number;
  shown: number;
  total: number;
  collapsed: Set<string>;
  selected: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onToggleCollapse: (id: string) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
  onPage: (page: number) => void;
}) {
  const allChecked = rows.length > 0 && rows.every((row) => selected.has(row.node.id));

  return (
    <div className="mt-3 bg-white border border-[#eaecf0] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-[12.5px]">
          <thead>
            <tr className="bg-[#f0f4f9] text-[#667085] text-[10.5px] uppercase tracking-[0.02em]">
              <th className="w-11 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={onToggleAll}
                  aria-label="Chọn tất cả danh mục"
                  className="accent-[#4f46e5] w-3.5 h-3.5"
                />
              </th>
              <th className="text-left px-2 py-3 font-semibold">Mã &amp; tên danh mục (cấu trúc phân cấp)</th>
              <th className="text-left px-2 py-3 font-semibold w-[160px]">Cấp danh mục</th>
              <th className="text-left px-2 py-3 font-semibold w-[150px]">Số mẫu / biến thể SKU</th>
              <th className="text-left px-2 py-3 font-semibold w-[250px]">Thuộc tính ngành hàng</th>
              <th className="text-left px-2 py-3 font-semibold w-[130px]">Trạng thái</th>
              <th className="text-left px-2 py-3 font-semibold w-[120px]">Thao tác quản trị</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[12.5px] text-[#98a2b3]">
                  Không tìm thấy danh mục phù hợp.
                </td>
              </tr>
            )}

            {rows.map(({ node, parentName, tone, icon }) => {
              const isChild = node.level === 2;
              const isCollapsed = collapsed.has(node.id);
              return (
                <tr
                  key={node.id}
                  className={`cat-row ${isChild ? "child" : ""} border-t border-[#f0f2f5]`}
                >
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(node.id)}
                      onChange={() => onToggleRow(node.id)}
                      aria-label={`Chọn ${node.name}`}
                      className="accent-[#4f46e5] w-3.5 h-3.5 mt-1"
                    />
                  </td>

                  <td className="px-2 py-2.5 align-middle">
                    <div className="flex items-center gap-2">
                      {isChild ? (
                        <Icon name="subdirectory_arrow_right" className="text-[16px] text-[#98a2b3]" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleCollapse(node.id)}
                          className="w-6 h-6 grid place-items-center rounded-md text-[#667085] hover:bg-[#f2f4f7]"
                          aria-label={isCollapsed ? "Mở rộng danh mục" : "Thu gọn danh mục"}
                        >
                          <Icon name={isCollapsed ? "chevron_right" : "expand_more"} className="text-[18px]" />
                        </button>
                      )}
                      <span className={`cat-icon tone-${tone} ${isChild ? "sm" : ""}`}>
                        <Icon name={icon} className="text-[17px]" />
                      </span>
                      <div className="leading-tight">
                        <div className={isChild ? "font-medium text-[#344054]" : "font-semibold"}>{node.name}</div>
                        <div className="text-[10px] text-[#98a2b3] font-mono mt-0.5">{node.code}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-2.5 align-middle">
                    {isChild ? (
                      <div className="text-[11px] leading-snug text-[#667085]">
                        <span className="text-[#98a2b3]">Cấp 2 •</span> {parentName}
                      </div>
                    ) : (
                      <span className="level-badge">Cấp 1 (Gốc)</span>
                    )}
                  </td>

                  <td className="px-2 py-2.5 align-middle">
                    <div className="flex items-baseline gap-1 whitespace-nowrap">
                      <strong className="text-[13px]">{numberText(node.templateCount)}</strong>
                      <span className="text-[11.5px] text-[#475467]">Mẫu</span>
                      <span className="text-[11px] text-[#98a2b3]">({numberText(node.variantCount)} SKU)</span>
                    </div>
                  </td>

                  <td className="px-2 py-2.5 align-middle">
                    <CategoryChipList attributes={node.attributes} tone={isChild ? "muted" : tone} />
                  </td>

                  <td className="px-2 py-2.5 align-middle">
                    <span className={`status-pill ${node.isActive ? "" : "off"}`}>
                      <i />
                      {node.isActive ? "Đang hoạt động" : "Tạm ẩn"}
                    </span>
                  </td>

                  <td className="px-2 py-2.5 align-middle">
                    <div className="flex items-center gap-0.5">
                      <button type="button" className="cat-action" disabled title="Di chuyển danh mục (sắp ra mắt)">
                        <Icon name="drive_file_move" className="text-[18px]" />
                      </button>
                      <button type="button" className="cat-action indigo" onClick={() => onEdit(node)} title="Sửa danh mục">
                        <Icon name="edit" className="text-[17px]" />
                      </button>
                      <button type="button" className="cat-action red" onClick={() => onDelete(node)} title="Xoá danh mục">
                        <Icon name="delete" className="text-[17px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#eaecf0] text-[11.5px] text-[#667085]">
        <span>
          Hiển thị {numberText(shown)} trên tổng số {numberText(total)} danh mục
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="page-btn"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Trang trước"
          >
            <Icon name="chevron_left" className="text-[18px]" />
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
            <button
              key={item}
              type="button"
              className={`page-btn ${item === page ? "active" : ""}`}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            aria-label="Trang sau"
          >
            <Icon name="chevron_right" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [data, setData] = useState<CategoryListResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [mode, setMode] = useState<"list" | "create">("list");
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setStatus("loading");
    setError("");
    try {
      const response = await categoriesApi.list();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh mục.");
    } finally {
      setStatus("idle");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, data]);

  const stats = data?.stats ?? { total: 0, active: 0, missingProducts: 0 };
  const parents = data?.parents ?? [];

  const filteredRoots = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const items = data?.items ?? [];
    if (!query) return items;
    const matches = (node: CategoryNode) =>
      node.name.toLowerCase().includes(query) || node.code.toLowerCase().includes(query);
    return items.filter((root) => matches(root) || root.children.some(matches));
  }, [data, keyword]);

  const styleByRootId = useMemo(() => {
    const map = new Map<string, { icon: string; tone: Tone }>();
    (data?.items ?? []).forEach((root, index) => map.set(root.id, rootStyle(index)));
    return map;
  }, [data]);

  const rows = useMemo<FlatRow[]>(() => {
    const query = keyword.trim();
    const flat: FlatRow[] = [];
    filteredRoots.forEach((root) => {
      const style = styleByRootId.get(root.id) ?? ROOT_STYLES[0];
      flat.push({ node: root, parentName: null, tone: style.tone, icon: style.icon });
      if (!query && collapsed.has(root.id)) return;
      for (const child of root.children) {
        flat.push({ node: child, parentName: root.name, tone: style.tone, icon: "label" });
      }
    });
    return flat;
  }, [filteredRoots, collapsed, keyword, styleByRootId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const allChecked = pageRows.length > 0 && pageRows.every((row) => prev.has(row.node.id));
      const next = new Set(prev);
      for (const row of pageRows) {
        if (allChecked) next.delete(row.node.id);
        else next.add(row.node.id);
      }
      return next;
    });
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(filteredRoots.filter((root) => root.children.length > 0).map((root) => root.id)));

  const startCreate = () => {
    setMode("create");
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setNotice("");
  };

  const startEdit = (node: CategoryNode) => {
    setMode("create");
    setEditing(node);
    setForm({
      name: node.name,
      level: node.level,
      parentId: node.parentId ?? "",
      description: node.description ?? "",
    });
    setFormError("");
  };

  const submitForm = async () => {
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Vui lòng nhập tên danh mục hàng hóa.");
      return;
    }
    if (form.level === 2 && !form.parentId) {
      setFormError("Vui lòng chọn danh mục cha cho danh mục cấp 2.");
      return;
    }

    setStatus("saving");
    try {
      if (editing) {
        await categoriesApi.update(editing.id, {
          name: form.name.trim(),
          parentId: form.level === 2 ? form.parentId : null,
          description: form.description.trim(),
        });
        setNotice(`Đã cập nhật danh mục "${form.name.trim()}".`);
      } else {
        await categoriesApi.create({
          name: form.name.trim(),
          level: form.level,
          parentId: form.level === 2 ? form.parentId : null,
          description: form.description.trim(),
        });
        setNotice(`Đã tạo danh mục "${form.name.trim()}".`);
      }
      setMode("list");
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không lưu được danh mục.");
    } finally {
      setStatus("idle");
    }
  };

  const removeCategory = async (node: CategoryNode) => {
    const confirmed = window.confirm(
      `Xoá danh mục "${node.name}"? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      await categoriesApi.remove(node.id);
      setNotice(`Đã xoá danh mục "${node.name}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được danh mục.");
    }
  };

  const resetForm = () => {
    if (editing) {
      setMode("list");
      setEditing(null);
      setForm(EMPTY_FORM);
      setFormError("");
      return;
    }
    setForm(EMPTY_FORM);
    setFormError("");
  };

  return (
    <div className="abc-products min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader
        active="categories"
        keyword={keyword}
        onKeywordChange={(value) => {
          setKeyword(value);
          setPage(1);
        }}
      />

      <main className="max-w-[1560px] mx-auto px-6 py-5">
        <section className="bg-white border border-[#eaecf0] rounded-2xl px-6 py-5 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">
              Cơ cấu Danh mục Sản phẩm (Categories)
            </h1>
            <p className="mt-1 max-w-[760px] text-[12.5px] text-[#667085]">
              Phân cấp cây danh mục 2 tầng, quản trị mối liên kết giữa Product Templates và Product Variants SKU theo
              chuẩn ERP.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatTile icon="folder_open" label="Danh mục" value={stats.active} suffix="Hoạt động" tone="blue" />
            <StatTile
              icon="warning"
              label="Chưa phân loại"
              value={stats.missingProducts}
              suffix="Sản phẩm"
              tone="rose"
            />
          </div>
        </section>

        <div className="mt-3 bg-white border border-[#eaecf0] rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
          <div className="bg-[#f2f4f7] rounded-lg p-1 flex items-center gap-1">
            <button
              type="button"
              className={`seg-btn ${mode === "list" ? "active" : ""}`}
              onClick={() => {
                setMode("list");
                setEditing(null);
              }}
            >
              <Icon name="list" className="text-[17px]" />
              Danh sách Danh mục
              <span className={`seg-count ${mode === "list" ? "on" : ""}`}>{numberText(stats.total)}</span>
            </button>
            <button
              type="button"
              className={`seg-btn ${mode === "create" ? "active" : ""}`}
              onClick={startCreate}
            >
              <Icon name="add_circle" className="text-[17px]" />
              Tạo mới Danh mục
            </button>
          </div>

          {mode === "list" && (
            <div className="ml-auto flex items-center gap-2">
              <div className="cat-filter">
                <Icon name="filter_list" className="text-[17px]" />
                <input
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Lọc theo tên ngành hàng..."
                  className="flex-1 bg-transparent outline-none text-[12px] text-[#101828] placeholder:text-[#98a2b3]"
                />
              </div>
              <button type="button" className="tool-btn" onClick={expandAll}>
                <Icon name="unfold_more" className="text-[17px]" />
                Mở rộng
              </button>
              <button type="button" className="tool-btn" onClick={collapseAll}>
                <Icon name="unfold_less" className="text-[17px]" />
                Thu gọn
              </button>
            </div>
          )}
        </div>

        {notice && (
          <div className="mt-3 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-2.5 text-[12px] text-[#067647]">
            {notice}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-[#fecdca] bg-[#fef3f2] px-4 py-2.5 text-[12px] text-[#b42318]">
            {error}
          </div>
        )}

        {mode === "list" ? (
          status === "loading" && !data ? (
            <div className="mt-3 bg-white border border-[#eaecf0] rounded-xl px-4 py-14 text-center text-[12.5px] text-[#98a2b3]">
              Đang tải cơ cấu danh mục...
            </div>
          ) : (
            <CategoryTable
              rows={pageRows}
              page={currentPage}
              totalPages={totalPages}
              shown={pageRows.length}
              total={stats.total}
              collapsed={collapsed}
              selected={selected}
              onToggleRow={toggleRow}
              onToggleAll={toggleAll}
              onToggleCollapse={toggleCollapse}
              onEdit={startEdit}
              onDelete={removeCategory}
              onPage={setPage}
            />
          )
        ) : (
          <section className="mt-3 bg-white border border-[#eaecf0] rounded-2xl px-6 py-6 max-w-[1000px]">
            <div className="pb-4 border-b border-[#eaecf0]">
              <h2 className="text-[18px] font-bold">
                {editing ? "Cập nhật Danh mục Hàng hóa" : "Khởi tạo Danh mục Hàng hóa mới"}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#667085]">
                Khai báo phân cấp cha/con và cấu hình thuộc tính kế thừa cho SKU.
              </p>
            </div>

            <div className="pt-5 max-w-[760px] space-y-5">
              <div>
                <div className="flex items-end justify-between gap-3">
                  <label htmlFor="category-name" className="text-[12.5px] font-semibold">
                    Tên danh mục hàng hóa <span className="text-[#f04438]">*</span>
                  </label>
                  <span className="text-[11px] text-[#98a2b3]">Bắt buộc</span>
                </div>
                <input
                  id="category-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Ví dụ: Áo Khoác Bomber Outerwear"
                  className="mt-1.5 h-11 w-full rounded-lg bg-[#eef4fb] px-3.5 text-[13px] outline-none focus:ring-2 focus:ring-[#c7cbff] placeholder:text-[#98a2b3]"
                />
              </div>

              <div className="rounded-xl border border-[#e4e7ec] bg-[#f9fafb] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                    <Icon name="account_tree" className="text-[17px] text-[#4f46e5]" />
                    Phân cấp danh mục (Hierarchy Level) <span className="text-[#f04438]">*</span>
                  </span>
                  <span className="text-[10.5px] text-[#98a2b3]">2 Cấp chuẩn ERP</span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, level: 1, parentId: "" }))}
                    className={`hierarchy-card ${form.level === 1 ? "selected" : ""}`}
                  >
                    <span className={`hierarchy-ico ${form.level === 1 ? "on" : ""}`}>
                      <Icon name="folder" className="text-[18px]" />
                    </span>
                    <span className="leading-tight text-left">
                      <span className="block text-[12.5px] font-semibold">Danh mục Gốc (Cấp 1)</span>
                      <span className="block text-[10.5px] text-[#98a2b3]">Nhóm ngành hàng độc lập</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, level: 2 }))}
                    className={`hierarchy-card ${form.level === 2 ? "selected" : ""}`}
                  >
                    <span className={`hierarchy-ico ${form.level === 2 ? "on" : ""}`}>
                      <Icon name="subdirectory_arrow_right" className="text-[18px]" />
                    </span>
                    <span className="leading-tight text-left">
                      <span className="block text-[12.5px] font-semibold">Danh mục Con (Cấp 2)</span>
                      <span className="block text-[10.5px] text-[#98a2b3]">Kế thừa từ danh mục cha</span>
                    </span>
                  </button>
                </div>

                {form.level === 2 && (
                  <div className="mt-4">
                    <div className="flex items-end justify-between gap-3">
                      <label htmlFor="category-parent" className="text-[12.5px] font-semibold">
                        Danh mục cha (Parent Category) <span className="text-[#f04438]">*</span>
                      </label>
                      <span className="text-[10.5px] text-[#98a2b3]">Cấp 1 trực thuộc</span>
                    </div>
                    <select
                      id="category-parent"
                      value={form.parentId}
                      onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
                      className="mt-1.5 h-10 w-full sm:w-[320px] rounded-lg border border-[#d0d5dd] bg-white px-3 text-[12.5px] outline-none focus:ring-2 focus:ring-[#c7cbff]"
                    >
                      <option value="">Chọn danh mục cha</option>
                      {parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.name} ({parent.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="category-description" className="text-[12.5px] font-semibold">
                  Mô tả chi tiết &amp; Hướng dẫn xếp kho
                </label>
                <textarea
                  id="category-description"
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Nhập định hướng nhóm mặt hàng, vị trí lưu kho khu vực, hoặc đặc tính kỹ thuật..."
                  className="mt-1.5 w-full rounded-lg bg-[#eef4fb] px-3.5 py-3 text-[13px] outline-none resize-y focus:ring-2 focus:ring-[#c7cbff] placeholder:text-[#98a2b3]"
                />
              </div>

              {formError && (
                <p className="rounded-lg border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-[12px] text-[#b42318]">
                  {formError}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-[#eaecf0] pt-4">
              <button type="button" className="ghost-btn" onClick={resetForm}>
                {editing ? "Huỷ" : "Làm mới / Huỷ"}
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={submitForm}
                disabled={status === "saving"}
              >
                <Icon name="save" className="text-[17px]" />
                {status === "saving" ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Lưu Danh Mục"}
              </button>
            </div>
          </section>
        )}

        {mode === "list" && !data && status === "idle" && (
          <div className="mt-3 bg-white border border-[#eaecf0] rounded-xl px-4 py-12 text-center">
            <p className="text-[13px] font-semibold">Chưa có danh mục nào</p>
            <p className="mt-1 text-[12px] text-[#667085]">Tạo danh mục đầu tiên để bắt đầu phân loại hàng hóa.</p>
            <button type="button" className="primary-btn mt-4" onClick={startCreate}>
              <Icon name="add_circle" className="text-[17px]" />
              Tạo mới Danh mục
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
