import { toast } from "react-toastify";
import { PurchaseDialog } from "./purchase-dialog";
import { useState } from "react";
import { purchasesApi, type Supplier, type SupplierPayload } from "@/api/purchases";
import { Field, useAction } from "./shared";
import { PurchaseForm } from "./purchase-form";

export function SupplierForm({ supplier, onSaved, onClose }: { supplier?: Supplier; onSaved: () => void; onClose: () => void }) {
  const [data, setData] = useState<SupplierPayload>(supplier ?? { name: "", isActive: true });
  const action = useAction(message => toast.error(message, { containerId: "supplier-profile-editor" }));
  const fields = [["name", "Tên NCC *", 255], ["supplierCode", "Mã NCC", 50], ["phone", "Điện thoại", 20], ["contactPerson", "Người liên hệ", 100], ["email", "Email", 255], ["taxCode", "Mã số thuế", 30], ["address", "Địa chỉ", 5000], ["note", "Ghi chú", 5000]] as const;
  return <PurchaseDialog title={supplier ? "Sửa hồ sơ NCC" : "Nhà cung cấp mới"} busy={action.busy} onClose={onClose} toastContainerId="supplier-profile-editor"><section className="purchase-panel"><PurchaseForm onSubmit={event => { event.preventDefault(); void action.run(async () => {
    const payload = Object.fromEntries(fields.map(([key]) => [key, data[key]?.trim() || null])) as SupplierPayload;
    payload.isActive = data.isActive;
    if (supplier) await purchasesApi.updateSupplier(supplier.id, payload); else await purchasesApi.createSupplier(payload);
    onSaved();
  }); }}><fieldset disabled={action.busy}><div className="purchase-grid">{fields.map(([key, label, max]) => <Field key={key} label={label}><input required={key === "name"} type={key === "email" ? "email" : "text"} maxLength={max} value={String(data[key] ?? "")} onChange={event => setData(current => ({ ...current, [key]: event.target.value }))} /></Field>)}<Field label="Trạng thái hợp tác"><select value={String(data.isActive)} onChange={event => setData(current => ({ ...current, isActive: event.target.value === "true" }))}><option value="true">Đang hợp tác</option><option value="false">Ngừng hợp tác</option></select></Field></div><p className="purchase-hint">Ngừng hợp tác sẽ chặn đặt mua mới. Các đơn đã đặt vẫn được nhận hàng và thanh toán.</p><div className="purchase-actions"><button className="purchase-primary">{action.busy ? "Đang lưu…" : "Lưu hồ sơ"}</button></div></fieldset></PurchaseForm></section></PurchaseDialog>;
}
