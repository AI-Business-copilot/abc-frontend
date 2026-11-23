import { useState } from "react";
import { purchasesApi, type Supplier, type SupplierImportMapping, type SupplierImportPreview } from "@/api/purchases";
import { PurchaseDialog } from "./purchase-dialog";
import { Field, money } from "./shared";

const fields = [["sku", "SKU nội bộ *"], ["name", "Tên sản phẩm *"], ["price", "Giá chào *"], ["supplierSku", "Mã hàng NCC"], ["unit", "Đơn vị tính"]] as const;
export function SupplierImport({ supplier, onClose, onSaved }: { supplier: Supplier; onClose: () => void; onSaved: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SupplierImportPreview | null>(null);
  const [mapping, setMapping] = useState<SupplierImportMapping>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  async function inspect(selected: File, columns?: SupplierImportMapping) {
    setBusy(true); setError(""); setPreview(null);
    try {
      const result = await purchasesApi.previewSupplierImport(supplier.id, selected, columns);
      setPreview(result); setMapping(result.mapping); setDirty(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Không đọc được file."); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!file || !preview || !preview.valid || dirty) return;
    setBusy(true); setError("");
    try {
      const result = await purchasesApi.confirmSupplierImport(supplier.id, file, preview);
      onSaved(`Đã nhập ${result.total} sản phẩm: ${result.created} mới, ${result.linked} liên kết, ${result.updated} cập nhật.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể nhập file."); setDirty(true); }
    finally { setBusy(false); }
  }
  return <PurchaseDialog title="Nhập sản phẩm từ Excel / CSV" description={supplier.name} busy={busy} onClose={onClose}
    footer={<><button disabled={busy} onClick={onClose}>Đóng</button><button className="purchase-primary" disabled={busy || !preview?.valid || dirty} onClick={() => void confirm()}>{busy ? "Đang xử lý…" : `Nhập ${preview?.items.length ?? 0} sản phẩm`}</button></>}>
    <section className="purchase-panel">
      <p>Chọn file .xlsx hoặc CSV UTF-8, tối đa 5 MB và 500 sản phẩm. Hệ thống đọc trang tính đầu tiên, tiêu đề ở dòng 1.</p>
      <p className="purchase-hint">Cần có SKU, tên sản phẩm và giá chào. Giá dùng số thuần, ví dụ 12500 hoặc 12500.50. Có thể bổ sung mã hàng NCC và đơn vị tính.</p>
      <p className="purchase-hint">SKU mới sẽ tạo sản phẩm có giá bán 0 và tồn kho 0. SKU đã có sẽ được liên kết hoặc cập nhật giá chào của NCC. Kiểm tra SKU nội bộ trước khi nhập để tránh tạo trùng hàng.</p>
      <Field label="File danh sách sản phẩm"><input type="file" accept=".xlsx,.csv" disabled={busy} onChange={event => {
        const selected = event.target.files?.[0] ?? null; setFile(selected); setPreview(null); setMapping({}); setError("");
        if (selected) {
          if (selected.size > 5 * 1024 * 1024) { setError("File tối đa 5 MB."); return; }
          void inspect(selected);
        }
      }} /></Field>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Đang xử lý file…</p>}
      {preview && <>
        <div className="purchase-grid">{fields.map(([key, label]) => <Field key={key} label={label}><select disabled={busy} value={mapping[key] ?? ""} onChange={event => {
          const value = event.target.value;
          setMapping(current => { const next = { ...current }; if (value) next[key] = Number(value); else delete next[key]; return next; }); setDirty(true);
        }}><option value="">Chọn cột</option>{preview.headers.map((header, i) => <option key={i} value={i + 1}>{i + 1}. {header}</option>)}</select></Field>)}</div>
        <button disabled={busy || !file} onClick={() => file && void inspect(file, mapping)}>Kiểm tra và xem trước lại</button>
        {dirty && <p role="status">Hãy xem trước lại sau khi thay đổi cột hoặc dữ liệu.</p>}
        {preview.issues.map((issue, i) => <p role="alert" key={i}>{issue}</p>)}
        <p>{preview.items.length} dòng · {preview.items.filter(item => !!item.error).length} dòng lỗi. Sửa file rồi tải lại nếu có lỗi.</p>
        <div className="purchase-table"><table><thead><tr><th>Dòng</th><th>SKU</th><th>Tên hàng NCC</th><th>Giá chào</th><th>Xử lý</th></tr></thead><tbody>{preview.items.map(item => <tr key={item.row}><td>{item.row}</td><td>{item.sku}</td><td>{item.name}{item.currentName && item.currentName !== item.name && <small> · Hàng nội bộ: {item.currentName}</small>}</td><td>{item.price ? money(item.price) : "—"}</td><td>{item.error || ({ create: "Tạo sản phẩm mới", link: "Liên kết SKU hiện có", update: "Cập nhật hàng NCC" }[item.action] ?? item.action)}</td></tr>)}</tbody></table></div>
      </>}
    </section>
  </PurchaseDialog>;
}
