import { toast } from "react-toastify";
import { Building2, ContactRound, Info, LockKeyhole, Save, Settings2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { purchasesApi, type Supplier, type SupplierPayload } from "@/api/purchases";
import { code, Field, useAction } from "./shared";
import { PurchaseDialog } from "./purchase-dialog";
import { PurchaseForm } from "./purchase-form";

const editableFields = ["name", "phone", "contactPerson", "email", "taxCode", "address", "note"] as const;

export function SupplierForm({ supplier, onSaved, onClose }: { supplier?: Supplier; onSaved: () => void; onClose: () => void }) {
  const [data, setData] = useState<SupplierPayload>(supplier ?? { name: "", isActive: true });
  const [supplierCode] = useState(() => supplier ? supplier.supplierCode ?? "" : code("NCC"));
  const formId = useId();
  const codeHintId = useId();
  const statusHintId = useId();
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [retryLookup, setRetryLookup] = useState(0);
  const taxCode = data.taxCode?.trim() ?? "";
  const currentData = useRef(data);
  currentData.current = data;
  useEffect(() => {
    setLookupMessage("");
    if ((!retryLookup && taxCode === (supplier?.taxCode ?? "")) || !/^(\d{10}|\d{12}|\d{13}|\d{10}-\d{3})$/.test(taxCode)) { setLookingUp(false); return; }
    let active = true;
    setLookingUp(true);
    const timer = window.setTimeout(() => {
      const snapshot = currentData.current;
      void purchasesApi.lookupSupplierTax(taxCode).then(info => {
        if (!active) return;
        setData(current => ({ ...current, name: current.name === snapshot.name ? info.name : current.name, address: current.address === snapshot.address ? info.address : current.address }));
        setLookupMessage(`Đã lấy tên và địa chỉ từ ${info.source}. Bạn có thể kiểm tra và chỉnh sửa trước khi lưu.`);
      }).catch((error: unknown) => { if (active) setLookupMessage(error instanceof Error ? error.message : "Không thể tra cứu mã số thuế."); })
        .finally(() => { if (active) setLookingUp(false); });
    }, 800);
    return () => { active = false; window.clearTimeout(timer); };
  }, [taxCode, retryLookup, supplier?.taxCode]);
  const action = useAction(message => toast.error(message, { containerId: "supplier-profile-editor" }));
  const update = (key: typeof editableFields[number], value: string) => setData(current => ({ ...current, [key]: value }));

  return <PurchaseDialog
    title={supplier ? "Chỉnh sửa nhà cung cấp" : "Thêm nhà cung cấp"}
    description="Quản lý hồ sơ, thông tin liên hệ và trạng thái hợp tác."
    className="supplier-profile-dialog"
    busy={action.busy || lookingUp}
    onClose={onClose}
    toastContainerId="supplier-profile-editor"
    footer={<>
      <span className="supplier-required-note"><span>*</span> Thông tin bắt buộc</span>
      <button type="button" disabled={action.busy} onClick={onClose}>Hủy</button>
      <button type="submit" form={formId} className="purchase-primary" disabled={action.busy || lookingUp}><Save size={16} aria-hidden="true" />{action.busy ? "Đang lưu…" : "Lưu nhà cung cấp"}</button>
    </>}
  >
    <PurchaseForm id={formId} onSubmit={event => {
      event.preventDefault();
      if (lookingUp) return;
      void action.run(async () => {
        const payload = Object.fromEntries(editableFields.map(key => [key, data[key]?.trim() || null])) as SupplierPayload;
        payload.isActive = data.isActive;
        if (supplier) await purchasesApi.updateSupplier(supplier.id, payload);
        else await purchasesApi.createSupplier({ ...payload, supplierCode });
        onSaved();
      });
    }}>
      <fieldset disabled={action.busy} className="supplier-profile-layout">
        <div className="supplier-profile-main">
          <section className="supplier-form-section" aria-labelledby={`${formId}-general`}>
            <div className="supplier-section-heading"><span className="supplier-section-icon"><Building2 size={18} aria-hidden="true" /></span><div><h3 id={`${formId}-general`}>Thông tin nhà cung cấp</h3><p>Thông tin dùng trên hồ sơ và chứng từ mua hàng.</p></div></div>
            <div className="supplier-form-grid">
              <div className="supplier-field-wide"><Field label="Mã số thuế"><input maxLength={30} value={data.taxCode ?? ""} onChange={e => update("taxCode", e.target.value)} placeholder="Nhập mã số thuế để tự lấy tên và địa chỉ" /></Field>
                <button type="button" className="supplier-tax-lookup" disabled={lookingUp || !/^(\d{10}|\d{12}|\d{13}|\d{10}-\d{3})$/.test(taxCode)} onClick={() => setRetryLookup(current => current + 1)}>{lookingUp ? "Đang tra cứu…" : "Lấy lại thông tin"}</button>
                <p className="purchase-hint" role="status">{lookingUp ? "Đang lấy thông tin nhà cung cấp…" : lookupMessage || "Nhập đủ mã số thuế để tự điền tên và địa chỉ. Thông tin liên hệ bổ sung bên dưới."}</p>
              </div>
              <div className="supplier-field-wide"><Field label="Tên nhà cung cấp *"><input required maxLength={255} value={data.name ?? ""} onChange={e => update("name", e.target.value)} placeholder="Nhập tên công ty hoặc nhà cung cấp" autoComplete="organization" /></Field></div>
              <div className="supplier-field-wide"><Field label="Địa chỉ"><textarea rows={2} maxLength={5000} value={data.address ?? ""} onChange={e => update("address", e.target.value)} placeholder="Số nhà, tên đường, phường/xã, tỉnh/thành phố" autoComplete="street-address" /></Field></div>
            </div>
          </section>
          <section className="supplier-form-section" aria-labelledby={`${formId}-contact`}>
            <div className="supplier-section-heading"><span className="supplier-section-icon"><ContactRound size={18} aria-hidden="true" /></span><div><h3 id={`${formId}-contact`}>Thông tin liên hệ</h3><p>Người phụ trách trao đổi và đặt hàng.</p></div></div>
            <div className="supplier-form-grid">
              <Field label="Người liên hệ"><input maxLength={100} value={data.contactPerson ?? ""} onChange={e => update("contactPerson", e.target.value)} placeholder="Họ và tên người liên hệ" autoComplete="name" /></Field>
              <Field label="Số điện thoại"><input type="tel" maxLength={20} value={data.phone ?? ""} onChange={e => update("phone", e.target.value)} placeholder="Nhập số điện thoại" autoComplete="tel" /></Field>
              <div className="supplier-field-wide"><Field label="Email"><input type="email" maxLength={255} value={data.email ?? ""} onChange={e => update("email", e.target.value)} placeholder="ten@congty.vn" autoComplete="email" /></Field></div>
            </div>
          </section>
        </div>
        <aside className="supplier-profile-aside">
          <section className="supplier-form-section" aria-labelledby={`${formId}-settings`}>
            <div className="supplier-section-heading"><span className="supplier-section-icon"><Settings2 size={18} aria-hidden="true" /></span><div><h3 id={`${formId}-settings`}>Quản lý hồ sơ</h3><p>Thiết lập trạng thái hợp tác.</p></div></div>
            <Field label="Trạng thái hợp tác"><select value={String(data.isActive)} aria-describedby={statusHintId} onChange={e => setData(current => ({ ...current, isActive: e.target.value === "true" }))}><option value="true">Đang hợp tác</option><option value="false">Ngừng hợp tác</option></select></Field>
            <div id={statusHintId} className="supplier-status-hint"><Info size={16} aria-hidden="true" /><p>Ngừng hợp tác sẽ chặn đặt mua mới. Các đơn đã đặt vẫn được nhận hàng và thanh toán.</p></div>
            <div className="supplier-code-block"><Field label="Mã nhà cung cấp"><div className="supplier-code-control"><LockKeyhole size={15} aria-hidden="true" /><input readOnly value={supplierCode} placeholder="Chưa có mã" aria-describedby={codeHintId} /></div><small id={codeHintId} className="supplier-code-hint">{supplier ? "Mã do hệ thống quản lý, không thể chỉnh sửa." : "Mã được tạo tự động, bạn không cần nhập."}</small></Field></div>
          </section>
          <section className="supplier-form-section" aria-labelledby={`${formId}-note`}>
            <h3 id={`${formId}-note`}>Ghi chú nội bộ</h3>
            <label className="supplier-note-label"><span className="sr-only">Ghi chú nội bộ</span><textarea rows={4} maxLength={5000} value={data.note ?? ""} onChange={e => update("note", e.target.value)} placeholder="Ví dụ: thời gian liên hệ, lưu ý khi đặt hàng…" /></label>
            <p className="supplier-note-hint">Lưu thêm thông tin để thuận tiện khi làm việc với nhà cung cấp.</p>
          </section>
        </aside>
      </fieldset>
    </PurchaseForm>
  </PurchaseDialog>;
}
