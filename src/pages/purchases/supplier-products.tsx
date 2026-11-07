import { Check, LockKeyhole, Star } from "lucide-react";
import { toast } from "react-toastify";
import { PurchaseDialog } from "./purchase-dialog";
import { PurchaseForm } from "./purchase-form";
import { MoneyInput } from "./money-input";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { purchasesApi, type SupplierCatalog, type StockVariant, type Supplier, type SupplierProduct } from "@/api/purchases";
import { usePermissions } from "@/hooks/use-permissions";
import { Editor, type EditorLine } from "./orders";
import { date, Empty, ErrorBox, Field, Heading, money, Pager, useAction, useLoad, validateMoney } from "./shared";

export function SupplierProducts({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { can } = usePermissions(); const writable = can("inventory.receive") && supplier.isActive; const navigate = useNavigate();
  const [active, setActive] = useState<"true" | "false" | "all">("true");
  const [conditions, setConditions] = useState<Partial<SupplierCatalog>>({});
  const [kind, setKind] = useState<"catalog" | "history">("catalog");
  const [search, setSearch] = useState(""); const [term, setTerm] = useState(""); const [page, setPage] = useState(1);
  const result = useLoad(() => purchasesApi.supplierProducts(supplier.id, { search: term, page, isActive: active }, kind), [supplier.id, term, page, kind, active]);
  const [adding, setAdding] = useState(false); const [skuSearch, setSkuSearch] = useState(""); const [skuTerm, setSkuTerm] = useState("");
  const variants = useLoad(() => adding ? purchasesApi.variants(skuTerm) : Promise.resolve(null), [adding, skuTerm]);
  const [candidate, setCandidate] = useState<StockVariant | null>(null); const [price, setPrice] = useState("");
  const [selected, setSelected] = useState<SupplierProduct[]>([]); const [creating, setCreating] = useState<EditorLine[] | null>(null);
  const action = useAction(message => toast.error(message, adding ? { containerId: "supplier-product-editor" } : undefined));
  const toggle = (product: SupplierProduct) => setSelected((current) => current.some((item) => item.id === product.id) ? current.filter((item) => item.id !== product.id) : [...current, product]);
  const productDefaults = (product: StockVariant) => ({
    supplierSku: `NCC-${product.id.replaceAll("-", "").toUpperCase()}`,
    supplierProductName: product.productName,
    minOrderQty: 1, orderMultiple: 1, isActive: true, isPreferred: false,
  });
  const beginEdit = (product: StockVariant, supplyPrice: string) => {
    setAdding(true); setCandidate(product); setPrice(supplyPrice);
    const c = (product as SupplierProduct).catalog;
    setConditions(c ? {
      supplierSku: c.supplierSku || productDefaults(product).supplierSku,
      supplierProductName: c.supplierProductName || product.productName,
      minOrderQty: c.minOrderQty, orderMultiple: c.orderMultiple,
      leadTimeDays: c.leadTimeDays, isPreferred: c.isPreferred, note: c.note,
    } : productDefaults(product));
  };
  const selectVariant = (variant: StockVariant) => {
    if (candidate?.id === variant.id) return;
    const existing = result.data?.items.find(item => item.id === variant.id && item.catalog);
    if (existing) { beginEdit(existing, existing.supplyPrice ?? ""); return; }
    setCandidate(variant); setPrice(""); setConditions(productDefaults(variant));
  };

  return <>
    <button type="button" className="purchase-back" onClick={onClose}>← Danh sách nhà cung cấp</button>
    <Heading title={supplier.name} description="Quản lý SKU nhà cung cấp đang bán và tham khảo các lần nhập trước.">
      {writable && <button className="purchase-primary" onClick={() => { setAdding(true); setCandidate(null); setSkuSearch(""); setSkuTerm(""); setPrice(""); setConditions({}); }}> + Thêm sản phẩm NCC</button>}
      <button disabled={action.busy} onClick={result.reload}>Tải lại</button>
    </Heading>
    <ErrorBox error={result.error} />
    <div className="purchase-actions" role="group" aria-label="Danh sách sản phẩm nhà cung cấp">
      <button className={kind === "catalog" ? "purchase-primary" : ""} aria-pressed={kind === "catalog"} onClick={() => { setKind("catalog"); setPage(1); }}>Sản phẩm cung cấp</button>
      <button className={kind === "history" ? "purchase-primary" : ""} aria-pressed={kind === "history"} onClick={() => { setKind("history"); setPage(1); }}>Hàng đã mua</button>
    </div>
    {adding && writable && <PurchaseDialog title="Thêm / cập nhật sản phẩm NCC" description={supplier.name} busy={action.busy} toastContainerId="supplier-product-editor" onClose={() => { setAdding(false); setCandidate(null); }}><section className="purchase-panel">
      <PurchaseForm className="purchase-filters" onSubmit={(e) => { e.preventDefault(); setSkuTerm(skuSearch.trim()); }}><Field label="Tìm SKU trong danh mục cửa hàng"><input value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} maxLength={255} placeholder="SKU, mã vạch hoặc tên sản phẩm" /></Field><button>Tìm SKU</button></PurchaseForm>
      <ErrorBox error={variants.error} />
      <div className="purchase-sku-results">{variants.loading ? <p>Đang tìm SKU…</p> : variants.data?.items.map((variant) => <button type="button" key={variant.id} disabled={action.busy} onClick={() => selectVariant(variant)}><strong>{variant.sku}</strong><span>{variant.productName}</span><b>{candidate?.id === variant.id ? "✓" : "+"}</b></button>)}{variants.data?.items.length === 0 && <p>Không tìm thấy SKU. Hãy tạo sản phẩm trong danh mục trước.</p>}</div>
      {(variants.data?.total ?? 0) > 50 && <p className="purchase-hint">Hiển thị 50 kết quả đầu. Nhập từ khóa cụ thể để tìm thêm SKU.</p>}
      {candidate && <PurchaseForm onSubmit={(e) => { e.preventDefault(); void action.run(async () => {
        const normalized = validateMoney(price); await purchasesApi.saveSupplierProduct(supplier.id, candidate.id, normalized, conditions);
        setSelected([]);
        setCandidate(null); setAdding(false); toast.success("Đã lưu SKU và giá chào của nhà cung cấp."); result.reload();
      }); }}><fieldset disabled={action.busy}>
        <div className="supplier-product-identity">
          <div className="supplier-product-identity-heading"><LockKeyhole size={16} aria-hidden="true" /><strong>Thông tin sản phẩm</strong><span>Theo SKU đã chọn</span></div>
          <div className="purchase-grid">
            <Field label="Mã hàng NCC"><input readOnly value={conditions.supplierSku ?? ''} title="Mã hàng được tạo tự động khi chọn SKU." /></Field>
            <Field label="Tên sản phẩm"><input readOnly value={conditions.supplierProductName ?? ''} title="Tên sản phẩm được điền theo SKU đã chọn." /></Field>
          </div>
          <small>SKU nội bộ: {candidate.sku} · Chọn SKU khác ở trên để đổi sản phẩm.</small>
        </div>
        <div className="purchase-grid">
          <Field label="Giá chào / đơn vị (đ)"><MoneyInput required min="0" max="9999999999.99" value={price} onValueChange={setPrice} /></Field>
          {([['minOrderQty', 'Đặt tối thiểu', 1], ['orderMultiple', 'Bội số đặt', 1], ['leadTimeDays', 'Số ngày giao', 0]] as const).map(([key, label, min]) => <Field key={key} label={label}><input type="number" required={key !== 'leadTimeDays'} min={min} max={2147483647} step={1} value={conditions[key] ?? (key === 'leadTimeDays' ? '' : 1)} onChange={event => setConditions(current => ({ ...current, [key]: event.target.value === '' ? null : Number(event.target.value) }))} /></Field>)}
          <Field label="Ghi chú"><input maxLength={5000} value={conditions.note ?? ''} onChange={event => setConditions(current => ({ ...current, note: event.target.value }))} /></Field>
        </div>
        <button type="button" role="switch" aria-checked={conditions.isPreferred ?? false} aria-label="Đặt làm nhà cung cấp ưu tiên cho sản phẩm" aria-describedby="supplier-preferred-description" className="supplier-preferred-choice" onClick={() => setConditions(current => ({ ...current, isPreferred: !current.isPreferred }))}>
          <span className="supplier-preferred-icon"><Star size={21} fill={conditions.isPreferred ? 'currentColor' : 'none'} aria-hidden="true" /></span>
          <span className="supplier-preferred-copy"><strong>{conditions.isPreferred ? 'Đã chọn làm NCC ưu tiên' : 'Đặt làm NCC ưu tiên'}</strong><span id="supplier-preferred-description">{conditions.isPreferred ? 'Khi lưu, NCC này sẽ thay thế NCC ưu tiên hiện tại của sản phẩm.' : 'Chọn NCC này làm nguồn cung ưu tiên cho sản phẩm. Mỗi SKU có một NCC ưu tiên.'}</span></span>
          <span className="supplier-preferred-status">{conditions.isPreferred ? 'Đã chọn' : 'Chưa chọn'}</span>
          <span className="supplier-preferred-switch" aria-hidden="true"><span>{conditions.isPreferred && <Check size={12} strokeWidth={3} />}</span></span>
        </button>
        <div className="purchase-actions"><button className="purchase-primary">{action.busy ? 'Đang lưu…' : 'Lưu SKU cung cấp'}</button></div>
      </fieldset></PurchaseForm>}
      <p className="purchase-hint">Mã hàng và tên sản phẩm được điền tự động, không chỉnh sửa trong biểu mẫu này. Giá chào dùng để điền sẵn khi đặt mua.</p>
    </section></PurchaseDialog>}
    <PurchaseForm className="purchase-filters" onSubmit={(e) => { e.preventDefault(); setTerm(search.trim()); setPage(1); }}><Field label="Tìm sản phẩm"><input maxLength={255} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SKU, mã vạch hoặc tên sản phẩm" /></Field><Field label="Trạng thái cung cấp"><select value={active} onChange={event => { setActive(event.target.value as typeof active); setPage(1); setSelected([]); }}><option value="true">Đang cung cấp</option><option value="false">Đã ngừng</option><option value="all">Tất cả</option></select></Field><button>Tìm kiếm</button></PurchaseForm>
    {writable && <div className="purchase-actions"><span>Đã chọn {selected.length} SKU</span><button className="purchase-primary" disabled={!selected.length || selected.length > 500} onClick={() => setCreating(selected.map((item) => ({ variantId: item.id, sku: item.sku, name: item.productName, qty: String(Math.ceil((item.catalog?.minOrderQty ?? 1) / (item.catalog?.orderMultiple ?? 1)) * (item.catalog?.orderMultiple ?? 1)), price: item.supplyPrice ?? "0", minOrderQty: item.catalog?.minOrderQty, orderMultiple: item.catalog?.orderMultiple })))}>Tạo đơn mua từ SKU đã chọn</button>{selected.length > 0 && <button onClick={() => setSelected([])}>Bỏ chọn tất cả</button>}</div>}
    {result.loading ? <Empty>Đang tải sản phẩm…</Empty> : result.data && <><div className="purchase-table"><table><thead><tr>{writable && <th>Chọn</th>}<th>SKU / Sản phẩm</th><th>Tồn kho</th><th>Giá chào</th><th>Lần nhập gần nhất</th>{writable && <th>Thao tác</th>}</tr></thead><tbody>{result.data.items.map((item) => <tr key={item.id}>
      {writable && <td><input className="supplier-product-checkbox" type="checkbox" aria-label={`Chọn ${item.sku}`} disabled={!item.isActive || !item.catalog?.isActive} checked={selected.some((product) => product.id === item.id)} onChange={() => toggle(item)} /></td>}
      <td><strong>{item.sku}</strong><small>{item.productName}{!item.isActive && " · Ngừng kinh doanh"}</small><small>{item.catalog?.supplierSku} · {item.catalog?.isActive ? "Đang cung cấp" : "Chưa / ngừng cung cấp"}{item.catalog?.isPreferred ? " · NCC ưu tiên" : ""}</small><small>Đơn vị: {item.unitOfMeasure || "—"} · Tối thiểu: {item.catalog?.minOrderQty ?? "—"} · Bội số: {item.catalog?.orderMultiple ?? "—"} · Giao: {item.catalog?.leadTimeDays ?? "Mặc định SKU"}</small></td><td>{item.onHand}</td><td>{item.supplyPrice === null ? "Chưa có giá chào" : money(item.supplyPrice)}</td>
      <td>{item.lastPurchase ? <><Link to={`/purchases/receipts/${item.lastPurchase.id}`}>{item.lastPurchase.receiptCode}</Link><small>{date(item.lastPurchase.receivedAt)} · Giá {money(item.lastPurchase.actualCost)} · SL {item.lastPurchase.receivedQty}</small></> : "Chưa nhập hàng"}</td>
      {writable && <td><div className="purchase-actions"><button disabled={action.busy || !item.isActive} onClick={() => beginEdit(item, item.supplyPrice ?? "")}>{item.supplyPrice === null ? "Thêm vào danh sách cung cấp" : "Sửa điều kiện / kích hoạt"}</button>{item.catalog?.isActive && <button disabled={action.busy} onClick={() => void action.run(async () => { await purchasesApi.removeSupplierProduct(supplier.id, item.id); setSelected((current) => current.filter((product) => product.id !== item.id)); toast.success("Đã bỏ SKU khỏi danh sách cung cấp. Lịch sử nhập hàng vẫn được giữ."); result.reload(); })}>Bỏ cung cấp</button>}</div></td>}
    </tr>)}</tbody></table>{!result.data.items.length && <Empty>{kind === "catalog" ? "Chưa có SKU cung cấp. Thêm SKU từ danh mục cửa hàng hoặc từ hàng đã mua." : "Chưa có phiếu nhận hàng còn hiệu lực từ nhà cung cấp này."}</Empty>}</div><Pager data={result.data} page={page} setPage={setPage} /></>}
    {creating && writable && <Editor popup initial={{ supplier, lines: creating }} onClose={() => setCreating(null)} onSaved={(id) => navigate(`/purchases/${id}`)} />}
  </>;
}
