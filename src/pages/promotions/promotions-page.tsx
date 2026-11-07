import { useState } from "react";
import { Link } from "react-router-dom";

import { promotionsApi, type Promotion, type PromotionPayload, type PromotionScope, type PromotionDiscountType } from "@/api/promotions";
import { AppLayout } from "@/components/layout/app-layout";
import { usePermissions } from "@/hooks/use-permissions";
import { Empty, ErrorBox, Field, Heading, money, useAction, useLoad } from "@/pages/purchases/shared";

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

export function PromotionsPage() {
  const { can } = usePermissions();
  const promotions = useLoad(promotionsApi.list, []);
  const options = useLoad(promotionsApi.options, []);
  const action = useAction();
  const [form, setForm] = useState<FormState>(blankForm);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const refresh = () => promotions.reload();
  const reset = () => { setEditing(null); setForm(blankForm()); };
  const change = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(current => ({ ...current, [key]: value }));

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
      <Heading title="Khuyến mãi" description="Quản lý ưu đãi tại quầy. Mỗi đơn chỉ tự động áp dụng một chương trình tốt nhất." />
      <ErrorBox error={action.error} />
      <section className="purchase-panel">
        <Heading title={editing ? "Cập nhật chương trình" : "Tạo chương trình"} description="Chương trình chỉ được áp dụng trong thời gian hiệu lực và khi đáp ứng điều kiện." />
        {options.error && <ErrorBox error={options.error} />}
        <form onSubmit={event => {
          event.preventDefault();
          void action.run(async () => {
            if (form.scope !== "STORE" && !form.targetIds.length) throw new Error("Chọn ít nhất một danh mục hoặc sản phẩm.");
            const body = payload(form);
            if (editing) await promotionsApi.update(editing.id, body);
            else await promotionsApi.create(body);
            reset();
            refresh();
          });
        }}>
          <fieldset className="purchase-filters" disabled={action.busy || options.loading}>
            <Field label="Tên chương trình"><input required maxLength={150} value={form.name} onChange={event => change("name", event.target.value)} /></Field>
            <Field label="Mô tả"><input maxLength={2000} value={form.description} onChange={event => change("description", event.target.value)} /></Field>
            <Field label="Hình thức giảm"><select value={form.discountType} onChange={event => change("discountType", event.target.value as PromotionDiscountType)}><option value="PERCENTAGE">Theo phần trăm</option><option value="FIXED_AMOUNT">Số tiền cố định</option></select></Field>
            <Field label={form.discountType === "PERCENTAGE" ? "Phần trăm giảm (%)" : "Số tiền giảm (đ)"}><input required type="number" min="0.01" max={form.discountType === "PERCENTAGE" ? "100" : undefined} step="0.01" value={form.discountValue} onChange={event => change("discountValue", event.target.value)} /></Field>
            <Field label="Phạm vi áp dụng"><select value={form.scope} onChange={event => { change("scope", event.target.value as PromotionScope); change("targetIds", []); }}><option value="STORE">Toàn cửa hàng</option><option value="CATEGORY">Danh mục</option><option value="PRODUCT">Sản phẩm</option></select></Field>
            {form.scope !== "STORE" && <Field label={form.scope === "CATEGORY" ? "Danh mục áp dụng" : "Sản phẩm áp dụng"}><select multiple required size={Math.min(6, Math.max(3, availableTargets.length))} value={form.targetIds} onChange={event => change("targetIds", Array.from(event.currentTarget.selectedOptions, option => option.value))}>{availableTargets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}</select></Field>}
            <Field label="Bắt đầu"><input required type="datetime-local" value={form.startsAt} onChange={event => change("startsAt", event.target.value)} /></Field>
            <Field label="Kết thúc"><input required type="datetime-local" min={form.startsAt} value={form.endsAt} onChange={event => change("endsAt", event.target.value)} /></Field>
            <Field label="Đơn tối thiểu (đ, tùy chọn)"><input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={event => change("minOrderAmount", event.target.value)} /></Field>
            <Field label="Giới hạn lượt dùng (để trống nếu không giới hạn)"><input type="number" min="1" step="1" value={form.usageLimit} onChange={event => change("usageLimit", event.target.value)} /></Field>
            <Field label="Ưu tiên khi mức giảm bằng nhau"><input type="number" min="0" max="1000000" step="1" value={form.priority} onChange={event => change("priority", event.target.value)} /></Field>
            <div className="purchase-actions"><button className="purchase-primary">{action.busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo chương trình"}</button>{editing && <button type="button" onClick={reset}>Hủy sửa</button>}</div>
          </fieldset>
        </form>
      </section>

      <section className="purchase-panel">
        <Heading title="Danh sách chương trình" description="Thống kê lượt dùng và tổng tiền giảm được ghi nhận tại các đơn đã thanh toán." />
        <ErrorBox error={promotions.error} />
        {promotions.loading ? <Empty>Đang tải chương trình…</Empty> : promotions.data && <div className="purchase-table"><table>
          <thead><tr><th>Chương trình</th><th>Ưu đãi</th><th>Thời gian</th><th>Lượt dùng</th><th>Tổng giảm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{promotions.data.map(promotion => <tr key={promotion.id}>
            <td><strong>{promotion.name}</strong><small>{promotion.scope === "STORE" ? "Toàn cửa hàng" : promotion.targets.map(target => target.category?.name ?? target.productTemplate?.name).filter(Boolean).join(", ")}</small></td>
            <td>{promotion.discountType === "PERCENTAGE" ? `${promotion.discountValue}%` : money(promotion.discountValue)}<small>{promotion.minOrderAmount ? `Đơn từ ${money(promotion.minOrderAmount)}` : "Không yêu cầu tối thiểu"}</small></td>
            <td>{period(promotion.startsAt)}<small>đến {period(promotion.endsAt)}</small></td>
            <td>{promotion.usedCount}{promotion.usageLimit ? ` / ${promotion.usageLimit}` : " / không giới hạn"}</td>
            <td>{money(promotion.totalDiscountAmount)}</td>
            <td><span className={`purchase-status ${promotion.status.toLowerCase()}`}>{promotion.status === "ACTIVE" ? "Kích hoạt" : "Tạm dừng"}</span></td>
            <td><div className="purchase-actions"><button type="button" onClick={() => { setEditing(promotion); setForm(fromPromotion(promotion)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Sửa</button><button type="button" disabled={action.busy} onClick={() => void action.run(async () => { await promotionsApi.setStatus(promotion.id, promotion.status === "ACTIVE" ? "PAUSED" : "ACTIVE"); refresh(); })}>{promotion.status === "ACTIVE" ? "Tạm dừng" : "Kích hoạt"}</button></div></td>
          </tr>)}</tbody>
        </table>{!promotions.data.length && <Empty>Chưa có chương trình khuyến mãi.</Empty>}</div>}
      </section>
    </main>
  </AppLayout>;
}
