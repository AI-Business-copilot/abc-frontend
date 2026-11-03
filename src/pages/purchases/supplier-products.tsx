import { PurchaseForm } from "./purchase-form";
import { MoneyInput } from "./money-input";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { purchasesApi, type StockVariant, type Supplier, type SupplierProduct } from "@/api/purchases";
import { usePermissions } from "@/hooks/use-permissions";
import { Editor, type EditorLine } from "./orders";
import { date, Empty, ErrorBox, Field, Heading, money, Pager, useAction, useLoad, validateMoney } from "./shared";

export function SupplierProducts({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { can } = usePermissions(); const writable = can("inventory.receive"); const navigate = useNavigate();
  const [kind, setKind] = useState<"catalog" | "history">("catalog");
  const [search, setSearch] = useState(""); const [term, setTerm] = useState(""); const [page, setPage] = useState(1);
  const result = useLoad(() => purchasesApi.supplierProducts(supplier.id, { search: term, page }, kind), [supplier.id, term, page, kind]);
  const [adding, setAdding] = useState(false); const [skuSearch, setSkuSearch] = useState(""); const [skuTerm, setSkuTerm] = useState("");
  const variants = useLoad(() => adding ? purchasesApi.variants(skuTerm) : Promise.resolve(null), [adding, skuTerm]);
  const [candidate, setCandidate] = useState<StockVariant | null>(null); const [price, setPrice] = useState("");
  const [selected, setSelected] = useState<SupplierProduct[]>([]); const [creating, setCreating] = useState<EditorLine[] | null>(null);
  const action = useAction(); const [notice, setNotice] = useState("");
  const toggle = (product: SupplierProduct) => setSelected((current) => current.some((item) => item.id === product.id) ? current.filter((item) => item.id !== product.id) : [...current, product]);
  const beginEdit = (product: StockVariant, supplyPrice: string) => { setAdding(true); setCandidate(product); setPrice(supplyPrice); };
  return <>
    <button type="button" className="purchase-back" onClick={onClose}>← Danh sách nhà cung cấp</button>
    <Heading title={supplier.name} description="Quản lý SKU nhà cung cấp đang bán và tham khảo các lần nhập trước.">
      {writable && <button className="purchase-primary" onClick={() => { setAdding(!adding); setCandidate(null); }}> {adding ? "Đóng thêm SKU" : "+ Thêm SKU cung cấp"}</button>}
      <button disabled={action.busy} onClick={result.reload}>Tải lại</button>
    </Heading>
    <ErrorBox error={action.error || result.error} />{notice && <div className="purchase-success" role="status">{notice}</div>}
    <div className="purchase-actions" role="group" aria-label="Danh sách sản phẩm nhà cung cấp">
      <button className={kind === "catalog" ? "purchase-primary" : ""} aria-pressed={kind === "catalog"} onClick={() => { setKind("catalog"); setPage(1); }}>Sản phẩm cung cấp</button>
      <button className={kind === "history" ? "purchase-primary" : ""} aria-pressed={kind === "history"} onClick={() => { setKind("history"); setPage(1); }}>Hàng đã mua</button>
    </div>
    {adding && writable && <section className="purchase-panel"><h3>Thêm / cập nhật SKU cung cấp</h3>
      <PurchaseForm className="purchase-filters" onSubmit={(e) => { e.preventDefault(); setSkuTerm(skuSearch.trim()); }}><Field label="Tìm SKU trong danh mục cửa hàng"><input value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} maxLength={255} placeholder="SKU, mã vạch hoặc tên sản phẩm" /></Field><button>Tìm SKU</button></PurchaseForm>
      <ErrorBox error={variants.error} />
      <div className="purchase-sku-results">{variants.loading ? <p>Đang tìm SKU…</p> : variants.data?.items.map((variant) => <button type="button" key={variant.id} disabled={action.busy} onClick={() => { setCandidate(variant); setPrice(String(variant.costPrice)); }}><strong>{variant.sku}</strong><span>{variant.productName}</span><b>{candidate?.id === variant.id ? "✓" : "+"}</b></button>)}{variants.data?.items.length === 0 && <p>Không tìm thấy SKU. Hãy tạo sản phẩm trong danh mục trước.</p>}</div>
      {(variants.data?.total ?? 0) > 50 && <p className="purchase-hint">Hiển thị 50 kết quả đầu. Nhập từ khóa cụ thể để tìm thêm SKU.</p>}
      {candidate && <PurchaseForm onSubmit={(e) => { e.preventDefault(); void action.run(async () => {
        const normalized = validateMoney(price); await purchasesApi.saveSupplierProduct(supplier.id, candidate.id, normalized);
        setSelected((current) => current.map((item) => item.id === candidate.id ? { ...item, supplyPrice: normalized } : item));
        setCandidate(null); setAdding(false); setNotice("Đã lưu SKU và giá chào của nhà cung cấp."); result.reload();
      }); }}><fieldset disabled={action.busy}><p><strong>{candidate.sku}</strong> · {candidate.productName}</p><div className="purchase-grid"><Field label="Giá chào / đơn vị (đ)"><MoneyInput required min="0" max="9999999999.99" value={price} onValueChange={(value) => setPrice(value)} /></Field></div><button className="purchase-primary">Lưu SKU cung cấp</button></fieldset></PurchaseForm>}
      <p className="purchase-hint">Giá chào dùng để điền sẵn khi đặt mua. Bạn có thể điều chỉnh giá trên đơn.</p>
    </section>}
    <PurchaseForm className="purchase-filters" onSubmit={(e) => { e.preventDefault(); setTerm(search.trim()); setPage(1); }}><Field label="Tìm sản phẩm"><input maxLength={255} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SKU, mã vạch hoặc tên sản phẩm" /></Field><button>Tìm kiếm</button></PurchaseForm>
    {writable && <div className="purchase-actions"><span>Đã chọn {selected.length} SKU</span><button className="purchase-primary" disabled={!selected.length || selected.length > 500} onClick={() => setCreating(selected.map((item) => ({ variantId: item.id, sku: item.sku, name: item.productName, qty: "1", price: item.supplyPrice ?? item.lastPurchase?.actualCost ?? String(item.costPrice) })))}>Tạo đơn mua từ SKU đã chọn</button>{selected.length > 0 && <button onClick={() => setSelected([])}>Bỏ chọn tất cả</button>}</div>}
    {result.loading ? <Empty>Đang tải sản phẩm…</Empty> : result.data && <><div className="purchase-table"><table><thead><tr>{writable && <th>Chọn</th>}<th>SKU / Sản phẩm</th><th>Tồn kho</th><th>Giá chào</th><th>Lần nhập gần nhất</th>{writable && <th>Thao tác</th>}</tr></thead><tbody>{result.data.items.map((item) => <tr key={item.id}>
      {writable && <td><input className="supplier-product-checkbox" type="checkbox" aria-label={`Chọn ${item.sku}`} disabled={!item.isActive} checked={selected.some((product) => product.id === item.id)} onChange={() => toggle(item)} /></td>}
      <td><strong>{item.sku}</strong><small>{item.productName}{!item.isActive && " · Ngừng kinh doanh"}</small></td><td>{item.onHand}</td><td>{item.supplyPrice === null ? "Chưa có giá chào" : money(item.supplyPrice)}</td>
      <td>{item.lastPurchase ? <><Link to={`/purchases/receipts/${item.lastPurchase.id}`}>{item.lastPurchase.receiptCode}</Link><small>{date(item.lastPurchase.receivedAt)} · Giá {money(item.lastPurchase.actualCost)} · SL {item.lastPurchase.receivedQty}</small></> : "Chưa nhập hàng"}</td>
      {writable && <td><div className="purchase-actions"><button disabled={action.busy || !item.isActive} onClick={() => beginEdit(item, item.supplyPrice ?? item.lastPurchase?.actualCost ?? String(item.costPrice))}>{item.supplyPrice === null ? "Thêm vào danh sách cung cấp" : "Sửa giá chào"}</button>{item.supplyPrice !== null && <button disabled={action.busy} onClick={() => void action.run(async () => { await purchasesApi.removeSupplierProduct(supplier.id, item.id); setSelected((current) => current.filter((product) => product.id !== item.id)); setNotice("Đã bỏ SKU khỏi danh sách cung cấp. Lịch sử nhập hàng vẫn được giữ."); result.reload(); })}>Bỏ cung cấp</button>}</div></td>}
    </tr>)}</tbody></table>{!result.data.items.length && <Empty>{kind === "catalog" ? "Chưa có SKU cung cấp. Thêm SKU từ danh mục cửa hàng hoặc từ hàng đã mua." : "Chưa có phiếu nhận hàng còn hiệu lực từ nhà cung cấp này."}</Empty>}</div><Pager data={result.data} page={page} setPage={setPage} /></>}
    {creating && writable && <Editor popup initial={{ supplier, lines: creating }} onClose={() => setCreating(null)} onSaved={(id) => navigate(`/purchases/${id}`)} />}
  </>;
}
