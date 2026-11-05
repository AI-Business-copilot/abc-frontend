import { toast } from "react-toastify";
import { SupplierForm } from "./supplier-form";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { purchasesApi, type Reconciliation, type Supplier } from "@/api/purchases";
import { SupplierProducts } from "./supplier-products";
import { usePermissions } from "@/hooks/use-permissions";
import { Empty, ErrorBox, Field, Heading, money, Pager, useAction, useLoad } from "./shared";

export function Suppliers() {
  const { can } = usePermissions(); const writable = can("inventory.receive");
  const [params] = useSearchParams(); const initialSearch = params.get("search") || "";
  const [search, setSearch] = useState(initialSearch); const [term, setTerm] = useState(initialSearch); const [page, setPage] = useState(1);
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const [editing, setEditing] = useState<Supplier | undefined>();
  const result = useLoad(() => purchasesApi.suppliers({ search: term, page, isActive: active }), [term, page, active]);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<Reconciliation | null>(null); const [previewName, setPreviewName] = useState(""); const action = useAction(message => toast.error(message));
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  if (selectedSupplier) return <SupplierProducts key={selectedSupplier.id} supplier={selectedSupplier} onClose={() => setSelectedSupplier(null)} />;
  return <><Heading title="Nhà cung cấp" description="Quản lý thông tin NCC và đối chiếu công nợ theo chứng từ.">{writable && <button disabled={action.busy} className="purchase-primary" onClick={() => { setEditing(undefined); setCreating((value) => !value); }}>{creating ? "Đóng tạo NCC" : "+ Thêm nhà cung cấp"}</button>}<button disabled={action.busy} onClick={result.reload}>Tải lại</button></Heading><ErrorBox error={result.error} />
    {(creating || editing) && writable && <SupplierForm key={editing?.id ?? "new"} supplier={editing} onClose={() => { setCreating(false); setEditing(undefined); }} onSaved={() => { setCreating(false); setEditing(undefined); toast.success("Đã lưu hồ sơ NCC."); result.reload(); }} />}
    <form className="purchase-filters" onSubmit={(event) => { event.preventDefault(); setTerm(search); setPage(1); }}><Field label="Tìm NCC"><input maxLength={255} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã NCC, tên, email, điện thoại hoặc người liên hệ" /></Field><Field label="Hợp tác"><select value={active} onChange={event => { setActive(event.target.value as typeof active); setPage(1); }}><option value="all">Tất cả</option><option value="true">Đang hợp tác</option><option value="false">Ngừng hợp tác</option></select></Field><button type="submit">Tìm kiếm</button></form>
    {result.loading ? <Empty>Đang tải nhà cung cấp…</Empty> : result.data && <><div className="purchase-table"><table><thead><tr><th>Nhà cung cấp</th><th>Điện thoại</th><th>Người liên hệ</th><th>Công nợ đang lưu</th><th /></tr></thead><tbody>{result.data.items.map((supplier) => <tr key={supplier.id}><td><strong>{supplier.name}</strong><small>{supplier.supplierCode || "Chưa có mã"} · {supplier.isActive ? "Đang hợp tác" : "Ngừng hợp tác"}</small><small>{supplier.email} {supplier.address}</small><small><button type="button" onClick={() => setSelectedSupplier(supplier)}>Xem sản phẩm / SKU</button></small></td><td>{supplier.phone || "—"}</td><td>{supplier.contactPerson || "—"}</td><td>{money(supplier.debtAmount)}</td><td>{writable && <button disabled={action.busy} onClick={() => { setCreating(false); setEditing(supplier); }}>Sửa hồ sơ</button>}<button disabled={action.busy} onClick={() => void action.run(async () => { setPreview(null); const data = await purchasesApi.reconcile(supplier.id); setPreviewName(supplier.name); setPreview(data); })}>Đối soát công nợ</button></td></tr>)}</tbody></table>{!result.data.items.length && <Empty>Chưa có nhà cung cấp phù hợp.</Empty>}</div><Pager data={result.data} page={page} setPage={setPage} /></>}
    {preview && <section className="purchase-panel"><Heading title={`Đối soát · ${previewName}`} description="Công nợ tính lại = tiền hàng đã nhận − đã trả − giá trị trả NCC đã hoàn tất." /><div className="purchase-metrics">{[["Nợ đang lưu", preview.storedDebtAmount], ["Nợ theo phiếu nhận", preview.receiptDebtAmount], ["Giá trị trả NCC", preview.vendorReturnCreditAmount], ["Nợ tính lại", preview.calculatedDebtAmount]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</div><p>Chênh lệch: <strong>{money(preview.difference)}</strong></p><p className="purchase-hint">Cơ sở tính không bao gồm nợ đầu kỳ và điều chỉnh ngoài chứng từ. Kiểm tra trước khi áp dụng.</p><div className="purchase-actions"><button disabled={action.busy} onClick={() => setPreview(null)}>Đóng</button>{writable && <button className="purchase-primary" disabled={action.busy || Number(preview.difference) === 0} onClick={() => void action.run(async () => { await purchasesApi.applyReconciliation(preview); setPreview(null); toast.success("Đã áp dụng công nợ theo chứng từ."); result.reload(); })}>{action.busy ? "Đang áp dụng…" : "Xác nhận áp dụng công nợ tính lại"}</button>}</div></section>}
  </>;
}
