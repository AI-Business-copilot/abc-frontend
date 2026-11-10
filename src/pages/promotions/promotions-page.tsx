import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { promotionsApi, type Promotion, type PromotionPayload, type PromotionScope, type PromotionDiscountType } from "@/api/promotions";
import { AppLayout } from "@/components/layout/app-layout";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/hooks/use-permissions";
import { Empty, ErrorBox, Field, Heading, money, Pager, useAction, useLoad } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";

type FormState = {
  name: string;
  description: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  scope: PromotionScope;
  startsAt: string;
  endsAt: string;
  minOrderAmount: string;
  usageLimit: string;
  priority: string;
  targetIds: string[];
};
type StatusFilter = "ALL" | Promotion["status"];
type SortOption = "newest" | "oldest" | "name" | "savings-high" | "usage-high" | "start-soon";

const PAGE_SIZES = [10, 20, 50];

function localDateTime(value: Date) {
  const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function blankForm(): FormState {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    name: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "10",
    scope: "STORE",
    startsAt: localDateTime(start),
    endsAt: localDateTime(end),
    minOrderAmount: "",
    usageLimit: "",
    priority: "0",
    targetIds: [],
  };
}

function fromPromotion(promotion: Promotion): FormState {
  return {
    name: promotion.name,
    description: promotion.description ?? "",
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    scope: promotion.scope,
    startsAt: localDateTime(new Date(promotion.startsAt)),
    endsAt: localDateTime(new Date(promotion.endsAt)),
    minOrderAmount: promotion.minOrderAmount ?? "",
    usageLimit: promotion.usageLimit === null ? "" : String(promotion.usageLimit),
    priority: String(promotion.priority),
    targetIds: promotion.targets.map(target => target.categoryId ?? target.productTemplateId).filter((id): id is string => Boolean(id)),
  };
}

function payload(form: FormState): PromotionPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    discountType: form.discountType,
    discountValue: form.discountValue,
    scope: form.scope,
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    minOrderAmount: form.minOrderAmount || null,
    usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
    priority: Number(form.priority),
    targetIds: form.scope === "STORE" ? [] : form.targetIds,
  };
}

function period(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayDiscount(promotion: Promotion) {
  return promotion.discountType === "PERCENTAGE"
    ? `${promotion.discountValue}%`
    : money(promotion.discountValue);
}

export function PromotionsPage() {
  const { can } = usePermissions();
  const promotions = useLoad(promotionsApi.list, []);
  const options = useLoad(promotionsApi.options, []);
  const action = useAction();
  const [form, setForm] = useState<FormState>(blankForm);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | PromotionScope>("ALL");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const refresh = () => promotions.reload();
  const closeForm = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(blankForm());
    action.setError("");
  };
  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    action.setError("");
    setModalOpen(true);
  };
  const change = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const filteredPromotions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi");
    const filtered = (promotions.data ?? []).filter(promotion => {
      const targetNames = promotion.targets
        .map(target => target.category?.name ?? target.productTemplate?.name ?? "")
        .join(" ");
      const matchesSearch = !normalizedSearch
        || `${promotion.name} ${promotion.description ?? ""} ${targetNames}`.toLocaleLowerCase("vi").includes(normalizedSearch);
      return matchesSearch
        && (statusFilter === "ALL" || promotion.status === statusFilter)
        && (scopeFilter === "ALL" || promotion.scope === scopeFilter);
    });

    return filtered.sort((a, b) => {
      switch (sort) {
        case "oldest": return a.createdAt.localeCompare(b.createdAt);
        case "name": return a.name.localeCompare(b.name, "vi");
        case "savings-high": return Number(b.totalDiscountAmount) - Number(a.totalDiscountAmount);
        case "usage-high": return b.usedCount - a.usedCount;
        case "start-soon": return a.startsAt.localeCompare(b.startsAt);
        case "newest":
        default: return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [promotions.data, search, statusFilter, scopeFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredPromotions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredPromotions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageData = {
    items: pageItems,
    pagination: { page: currentPage, pageSize, total: filteredPromotions.length, totalPages },
  };

  if (!can("promotions.manage")) {
    return <AppLayout><main className="purchases"><ErrorBox error="Bạn cần quyền quản lý khuyến mãi để sử dụng chức năng này." /></main></AppLayout>;
  }

  const availableTargets = form.scope === "CATEGORY"
    ? options.data?.categories.map(category => ({
        id: category.id,
        label: `${category.parentId ? "↳ " : ""}${category.name}`,
      })) ?? []
    : form.scope === "PRODUCT"
      ? options.data?.products.map(product => ({ id: product.id, label: product.name })) ?? []
      : [];

  return <AppLayout>
    <main className="purchases">
      <div className="purchase-breadcrumb"><Link to="/app">Tổng quan</Link><span>›</span><strong>Khuyến mãi</strong></div>
      <Heading title="Khuyến mãi" description="Quản lý ưu đãi tại quầy. Mỗi đơn chỉ tự động áp dụng một chương trình tốt nhất.">
        <button className="purchase-primary" type="button" onClick={openCreate}>+ Tạo chương trình khuyến mãi mới</button>
      </Heading>
      <ErrorBox error={action.error} />

      <section className="purchase-panel">
        <Heading title="Danh sách chương trình" description="Thống kê lượt dùng và tổng tiền giảm được ghi nhận tại các đơn đã thanh toán." />
        <form className="purchase-filters" onSubmit={event => event.preventDefault()}>
          <Field label="Tìm kiếm">
            <input
              type="search"
              value={search}
              onChange={event => { setSearch(event.target.value); setPage(1); }}
              placeholder="Tên, mô tả, danh mục hoặc sản phẩm"
            />
          </Field>
          <Field label="Trạng thái">
            <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value as StatusFilter); setPage(1); }}>
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang kích hoạt</option>
              <option value="PAUSED">Tạm dừng</option>
            </select>
          </Field>
          <Field label="Phạm vi">
            <select value={scopeFilter} onChange={event => { setScopeFilter(event.target.value as "ALL" | PromotionScope); setPage(1); }}>
              <option value="ALL">Tất cả phạm vi</option>
              <option value="STORE">Toàn cửa hàng</option>
              <option value="CATEGORY">Danh mục</option>
              <option value="PRODUCT">Sản phẩm</option>
            </select>
          </Field>
          <Field label="Sắp xếp">
            <select value={sort} onChange={event => { setSort(event.target.value as SortOption); setPage(1); }}>
              <option value="newest">Mới tạo gần đây</option>
              <option value="oldest">Tạo từ lâu</option>
              <option value="name">Tên A–Z</option>
              <option value="savings-high">Tổng giảm nhiều nhất</option>
              <option value="usage-high">Lượt dùng nhiều nhất</option>
              <option value="start-soon">Ngày bắt đầu gần nhất</option>
            </select>
          </Field>
          <Field label="Số dòng">
            <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>
              {PAGE_SIZES.map(size => <option key={size} value={size}>{size} / trang</option>)}
            </select>
          </Field>
        </form>

        <ErrorBox error={promotions.error} />
        {promotions.error && <button type="button" onClick={refresh}>Thử lại</button>}
        {promotions.loading ? <Empty>Đang tải chương trình…</Empty> : <>
          <div className="purchase-table">
            <table>
              <thead><tr><th>Chương trình</th><th>Ưu đãi</th><th>Thời gian</th><th>Lượt dùng</th><th>Tổng giảm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>{pageItems.map(promotion => <tr key={promotion.id}>
                <td>
                  <strong>{promotion.name}</strong>
                  <small>{promotion.scope === "STORE" ? "Toàn cửa hàng" : promotion.targets.map(target => target.category?.name ?? target.productTemplate?.name).filter(Boolean).join(", ")}</small>
                </td>
                <td>{displayDiscount(promotion)}<small>{promotion.minOrderAmount ? `Đơn từ ${money(promotion.minOrderAmount)}` : "Không yêu cầu tối thiểu"}</small></td>
                <td>{period(promotion.startsAt)}<small>đến {period(promotion.endsAt)}</small></td>
                <td>{promotion.usedCount}{promotion.usageLimit ? ` / ${promotion.usageLimit}` : " / không giới hạn"}</td>
                <td>{money(promotion.totalDiscountAmount)}</td>
                <td><span className={`purchase-status ${promotion.status.toLowerCase()}`}>{promotion.status === "ACTIVE" ? "Kích hoạt" : "Tạm dừng"}</span></td>
                <td><div className="purchase-actions">
                  <button type="button" onClick={() => {
                    setEditing(promotion);
                    setForm(fromPromotion(promotion));
                    action.setError("");
                    setModalOpen(true);
                  }}>Sửa</button>
                  <button type="button" disabled={action.busy} onClick={() => void action.run(async () => {
                    await promotionsApi.setStatus(promotion.id, promotion.status === "ACTIVE" ? "PAUSED" : "ACTIVE");
                    refresh();
                  })}>{promotion.status === "ACTIVE" ? "Tạm dừng" : "Kích hoạt"}</button>
                </div></td>
              </tr>)}</tbody>
            </table>
            {!filteredPromotions.length && <Empty>{search || statusFilter !== "ALL" || scopeFilter !== "ALL" ? "Không tìm thấy chương trình phù hợp bộ lọc." : "Chưa có chương trình khuyến mãi."}</Empty>}
          </div>
          <Pager data={pageData} page={currentPage} setPage={setPage} />
        </>}
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Cập nhật chương trình khuyến mãi" : "Tạo chương trình khuyến mãi"}
        onClose={closeForm}
      >
        <ErrorBox error={options.error} />
        <form onSubmit={event => {
          event.preventDefault();
          void action.run(async () => {
            if (form.scope !== "STORE" && !form.targetIds.length) throw new Error("Chọn ít nhất một danh mục hoặc sản phẩm.");
            const body = payload(form);
            if (editing) await promotionsApi.update(editing.id, body);
            else await promotionsApi.create(body);
            closeForm();
            setPage(1);
            refresh();
          });
        }}>
          <fieldset className="purchase-grid" disabled={action.busy || options.loading}>
            <Field label="Tên chương trình"><input required maxLength={150} value={form.name} onChange={event => change("name", event.target.value)} /></Field>
            <Field label="Mô tả"><input maxLength={2000} value={form.description} onChange={event => change("description", event.target.value)} /></Field>
            <Field label="Hình thức giảm"><select value={form.discountType} onChange={event => change("discountType", event.target.value as PromotionDiscountType)}><option value="PERCENTAGE">Theo phần trăm</option><option value="FIXED_AMOUNT">Số tiền cố định</option></select></Field>
            <Field label={form.discountType === "PERCENTAGE" ? "Phần trăm giảm (%)" : "Số tiền giảm (đ)"}><input required type="number" min="0.01" max={form.discountType === "PERCENTAGE" ? "100" : undefined} step="0.01" value={form.discountValue} onChange={event => change("discountValue", event.target.value)} /></Field>
            <Field label="Phạm vi áp dụng"><select value={form.scope} onChange={event => { change("scope", event.target.value as PromotionScope); change("targetIds", []); }}><option value="STORE">Toàn cửa hàng</option><option value="CATEGORY">Danh mục</option><option value="PRODUCT">Sản phẩm</option></select></Field>
            {form.scope !== "STORE" && <Field label={form.scope === "CATEGORY" ? "Danh mục áp dụng" : "Sản phẩm áp dụng"}>
              <select multiple required size={Math.min(6, Math.max(3, availableTargets.length))} value={form.targetIds} onChange={event => change("targetIds", Array.from(event.currentTarget.selectedOptions, option => option.value))}>
                {availableTargets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
              </select>
            </Field>}
            <Field label="Bắt đầu"><input required type="datetime-local" value={form.startsAt} onChange={event => change("startsAt", event.target.value)} /></Field>
            <Field label="Kết thúc"><input required type="datetime-local" min={form.startsAt} value={form.endsAt} onChange={event => change("endsAt", event.target.value)} /></Field>
            <Field label="Đơn tối thiểu (đ, tùy chọn)"><input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={event => change("minOrderAmount", event.target.value)} /></Field>
            <Field label="Giới hạn lượt dùng (để trống nếu không giới hạn)"><input type="number" min="1" step="1" value={form.usageLimit} onChange={event => change("usageLimit", event.target.value)} /></Field>
            <Field label="Ưu tiên khi mức giảm bằng nhau"><input type="number" min="0" max="1000000" step="1" value={form.priority} onChange={event => change("priority", event.target.value)} /></Field>
          </fieldset>
          <ErrorBox error={action.error} />
          {options.loading && <p className="purchase-hint">Đang tải danh mục và sản phẩm…</p>}
          <div className="purchase-actions">
            <button className="purchase-primary" disabled={action.busy || options.loading}>{action.busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo chương trình"}</button>
            <button type="button" disabled={action.busy} onClick={closeForm}>Hủy</button>
          </div>
        </form>
      </Modal>
    </main>
  </AppLayout>;
}
