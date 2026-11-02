import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { purchasesApi, type Order, type OrderPayload, type Query, type StockVariant } from "@/api/purchases";
import { usePermissions } from "@/hooks/use-permissions";
import { ReceiveForm } from "./receive-form";
import { Back, code, date, Empty, ErrorBox, Field, Heading, money, Pager, Status, statuses, today, total, useAction, useLoad, validateMoney, validateQty } from "./shared";

export function ListFilters({ kind, onChange, initialSearch = "" }: { kind: "orders" | "receipts"; onChange: (query: Query) => void; initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch); const [status, setStatus] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  return <form className="purchase-filters" onSubmit={(event) => { event.preventDefault(); onChange({ search, status, from, to }); }}>
    <Field label="Tìm kiếm"><input maxLength={255} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã chứng từ, nhà cung cấp, SKU" /></Field>
    <Field label="Trạng thái"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{(kind === "orders" ? ["ORDERED", "PARTIALLY_RECEIVED", "COMPLETED", "CLOSED_SHORT", "CANCELLED"] : ["RECEIVED", "CANCELLED"]).map((s) => <option key={s} value={s}>{statuses[s]}</option>)}</select></Field>
    <Field label="Từ ngày"><input aria-label="Từ ngày" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="Đến ngày"><input aria-label="Đến ngày" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></Field><button type="submit">Lọc dữ liệu</button>
  </form>;
}

export function OrderList({ initialCreate = false }: { initialCreate?: boolean }) {
  const [params] = useSearchParams(); const initialSearch = params.get("search") || "";
  const { can } = usePermissions(); const [query, setQuery] = useState<Query>({ search: initialSearch }); const [page, setPage] = useState(1);
  const result = useLoad(() => purchasesApi.orders({ ...query, page }), [query, page]);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(initialCreate);
  const [createdId, setCreatedId] = useState("");
  const closeCreate = () => { setCreating(false); if (initialCreate) navigate(`/purchases${params.size ? `?${params}` : ""}`, { replace: true }); };
  return <><Heading title="Đơn đặt mua" description="Theo dõi mua hàng từ nhà cung cấp. Tồn kho và công nợ được ghi nhận khi nhận hàng.">{can("inventory.receive") && <button className="purchase-primary" onClick={() => setCreating(true)}>+ Tạo đơn đặt mua</button>}<button onClick={result.reload}>Tải lại</button></Heading>{createdId && <div className="purchase-success" role="status">Đã tạo đơn đặt mua. <Link to={`/purchases/${createdId}`}>Xem chi tiết đơn →</Link></div>}{creating && can("inventory.receive") && <Editor popup onClose={closeCreate} onSaved={(id) => { setCreatedId(id); closeCreate(); result.reload(); }} />}<ListFilters kind="orders" initialSearch={initialSearch} onChange={(value) => { setQuery(value); setPage(1); }} /><ErrorBox error={result.error} />
    {result.loading ? <Empty>Đang tải đơn đặt mua…</Empty> : result.data && <><div className="purchase-table"><table><thead><tr><th>Mã đơn / Ngày đặt</th><th>Nhà cung cấp</th><th>Trạng thái</th><th>Đã nhận / Đặt</th><th>Giá trị đặt</th><th>Công nợ đã nhận</th></tr></thead><tbody>{result.data.items.map((order) => <tr key={order.id}><td><Link to={`/purchases/${order.id}`}>{order.poCode}</Link><small>{date(order.orderDate)}</small></td><td>{order.supplier.name}</td><td><Status value={order.status} /></td><td>{order.totals.receivedQty} / {order.totals.orderedQty}</td><td>{money(order.totals.orderedAmount)}</td><td>{money(order.totals.debtAmount)}</td></tr>)}</tbody></table>{!result.data.items.length && <Empty>Chưa có đơn đặt mua. Tạo đơn mới để bắt đầu.</Empty>}</div><Pager data={result.data} page={page} setPage={setPage} /></>}
  </>;
}

export function OrderEditor() {
  const { id } = useParams(); const { can } = usePermissions();
  const result = useLoad(() => id ? purchasesApi.order(id) : Promise.resolve(null), [id]);
  if (!can("inventory.receive")) return <ErrorBox error="Bạn không có quyền tạo hoặc sửa đơn đặt mua." />;
  if (result.loading) return <Empty>Đang tải…</Empty>;
  if (result.error) return <><ErrorBox error={result.error} /><button onClick={result.reload}>Thử lại</button></>;
  const order = result.data;
  if (order && (order.status !== "ORDERED" || order.purchaseReceipts.length > 0)) return <><Back to={`/purchases/${order.id}`} /><ErrorBox error="Chỉ sửa được đơn chưa có bất kỳ phiếu nhận nào." /></>;
  return <Editor key={id || "new"} order={order || undefined} />;
}

type EditorLine = { variantId: string; sku: string; name: string; qty: string; price: string };
function Editor({ order, popup = false, onClose, onSaved }: { order?: Order; popup?: boolean; onClose?: () => void; onSaved?: (id: string) => void }) {
  const navigate = useNavigate(); const action = useAction();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!popup || !dialog.current) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, [popup]);
  const [poCode, setCode] = useState(() => order?.poCode || code("PO")); const [supplierId, setSupplierId] = useState(order?.supplierId || "");
  const [selectedSupplier, setSelectedSupplier] = useState(order?.supplier);
  const [orderDate, setDate] = useState(order?.orderDate.slice(0, 10) || today()); const [deliveryDate, setDeliveryDate] = useState(order?.expectedDeliveryDate?.slice(0, 10) || "");
  const [lines, setLines] = useState<EditorLine[]>(order?.purchaseOrderItems.map((item) => ({ variantId: item.variantId, sku: item.variant.sku, name: item.variant.template.name, qty: String(item.orderedQty), price: item.unitPrice })) || []);
  const [supplierSearch, setSupplierSearch] = useState(""); const [supplierTerm, setSupplierTerm] = useState("");
  const suppliers = useLoad(() => purchasesApi.suppliers({ search: supplierTerm, pageSize: 100 }), [supplierTerm]);
  const [skuSearch, setSkuSearch] = useState(""); const [skuTerm, setSkuTerm] = useState("");
  const variants = useLoad(() => purchasesApi.variants(skuTerm), [skuTerm]);
  const change = (index: number, patch: Partial<EditorLine>) => setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const add = (variant: StockVariant) => setLines((current) => current.some((item) => item.variantId === variant.id) ? current : [...current, { variantId: variant.id, sku: variant.sku, name: variant.productName, qty: "1", price: String(variant.costPrice) }]);
  const submit = (event: FormEvent) => { event.preventDefault(); void action.run(async () => {
    if (!lines.length || lines.length > 500) throw new Error("Đơn đặt mua cần từ 1 đến 500 SKU.");
    const payload: OrderPayload = { poCode: poCode.trim(), supplierId, orderDate, ...(deliveryDate ? { expectedDeliveryDate: deliveryDate } : {}), items: lines.map((line) => ({ variantId: line.variantId, orderedQty: validateQty(line.qty), unitPrice: validateMoney(line.price) })) };
    validateMoney(total(lines), 1_000_000_000_000);
    const saved = await purchasesApi.saveOrder(payload, order?.id);
    if (onSaved) onSaved(saved.id);
    else navigate(`/purchases/${saved.id}`, { replace: true });
  }); };
  const content = <>{!popup && <><Back to={order ? `/purchases/${order.id}` : undefined} /><Heading title={order ? `Sửa ${order.poCode}` : "Tạo đơn đặt mua"} description="Chọn SKU có sẵn trong danh mục. Giá đặt mua có thể khác giá nhận thực tế." /></>}
    <ErrorBox error={action.error} />{action.error && !order && <p className="purchase-hint">Nếu mất kết nối khi lưu, tra cứu mã {poCode} trong danh sách trước khi gửi lại.</p>}
    <section className="purchase-panel"><div className="purchase-filters"><Field label="Tìm nhà cung cấp"><input value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="Tên hoặc số điện thoại" /></Field><button disabled={action.busy} onClick={() => setSupplierTerm(supplierSearch)}>Tìm NCC</button><Link to="/purchases/suppliers">+ Thêm NCC</Link></div><ErrorBox error={suppliers.error} />
      <form onSubmit={submit}><fieldset disabled={action.busy}><div className="purchase-grid"><Field label="Mã đơn đặt mua *"><input required maxLength={50} value={poCode} onChange={(e) => setCode(e.target.value)} /></Field><Field label="Nhà cung cấp *"><select required value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setSelectedSupplier(suppliers.data?.items.find((item) => item.id === e.target.value)); }}><option value="">{suppliers.loading ? "Đang tải…" : "Chọn nhà cung cấp"}</option>{selectedSupplier && !suppliers.data?.items.some((s) => s.id === selectedSupplier.id) && <option value={selectedSupplier.id}>{selectedSupplier.name}</option>}{suppliers.data?.items.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field><Field label="Ngày đặt *"><input required type="date" value={orderDate} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Ngày giao dự kiến"><input type="date" min={orderDate} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></Field></div>
        <div className="purchase-filters"><Field label="Tìm SKU"><input value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} placeholder="SKU, mã vạch hoặc tên hàng" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setSkuTerm(skuSearch); } }} /></Field><button type="button" onClick={() => setSkuTerm(skuSearch)}>Tìm SKU</button></div><ErrorBox error={variants.error} />
        <div className="purchase-sku-results">{variants.loading ? <p>Đang tìm SKU…</p> : variants.data?.items.map((variant) => <button type="button" disabled={lines.some((line) => line.variantId === variant.id)} key={variant.id} onClick={() => add(variant)}><strong>{variant.sku}</strong><span>{variant.productName} · Tồn: {variant.onHand}</span><b>+</b></button>)}{variants.data?.items.length === 0 && <p>Không tìm thấy SKU.</p>}</div><p className="purchase-hint">Hiển thị tối đa 50 SKU và 100 NCC mỗi lần tìm. Nhập tên hoặc mã cụ thể để tìm thêm.</p>
        <div className="purchase-table"><table><thead><tr><th>SKU / Sản phẩm</th><th>Số lượng đặt</th><th>Đơn giá (đ)</th><th>Thành tiền</th><th /></tr></thead><tbody>{lines.map((line, index) => <tr key={line.variantId}><td><strong>{line.sku}</strong><small>{line.name}</small></td><td><input aria-label={`Số lượng ${line.sku}`} type="number" min="1" max="2147483647" step="1" required value={line.qty} onChange={(e) => change(index, { qty: e.target.value })} /></td><td><input aria-label={`Đơn giá ${line.sku}`} type="number" min="0" max="9999999999.99" step="0.01" required value={line.price} onChange={(e) => change(index, { price: e.target.value })} /></td><td>{money(total([line]))}</td><td><button type="button" aria-label={`Xóa ${line.sku}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>Xóa</button></td></tr>)}</tbody></table>{!lines.length && <Empty>Chọn SKU ở trên để thêm vào đơn.</Empty>}</div><div className="purchase-summary"><span>{lines.length} SKU · Tổng giá trị đặt</span><strong>{money(total(lines))}</strong></div><div className="purchase-actions">{popup && <button type="button" onClick={onClose}>Hủy</button>}<button className="purchase-primary" type="submit" disabled={!lines.length || !supplierId}>{action.busy ? "Đang lưu…" : "Lưu đơn đặt mua"}</button></div>
      </fieldset></form></section>
  </>;
  if (!popup) return content;
  return <dialog ref={dialog} className="purchase-create-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!action.busy) onClose?.(); }}>
    <div className="purchase-dialog-header"><div><h2 id={titleId}>Tạo đơn đặt mua</h2><p>Chọn nhà cung cấp, SKU và số lượng đặt mua.</p></div><button type="button" className="purchase-dialog-close" aria-label="Đóng tạo đơn đặt mua" disabled={action.busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
    <div className="purchase-dialog-body">{content}</div>
  </dialog>;
}

export function OrderDetail() {
  const { id = "" } = useParams(); const { can } = usePermissions(); const action = useAction();
  const result = useLoad(() => purchasesApi.order(id), [id]); const [receiving, setReceiving] = useState(false); const [finish, setFinish] = useState<"cancel" | "close" | null>(null);
  const order = result.data;
  if (result.loading) return <Empty>Đang tải chi tiết đơn…</Empty>;
  if (!order) return <><Back /><ErrorBox error={result.error} /><button onClick={result.reload}>Thử lại</button></>;
  const writable = can("inventory.receive"); const open = ["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status);
  return <><Back /><Heading title={order.poCode} description={`${order.supplier.name} · Ngày đặt ${date(order.orderDate)} · Dự kiến giao ${date(order.expectedDeliveryDate)}`}><Status value={order.status} /><button disabled={action.busy} onClick={() => { setReceiving(false); setFinish(null); result.reload(); }}>Tải lại</button>{writable && order.status === "ORDERED" && !order.purchaseReceipts.length && <Link to={`/purchases/${id}/edit`}>Sửa đơn</Link>}{writable && open && <button className="purchase-primary" onClick={() => setReceiving((value) => !value)}>{receiving ? "Đóng kiểm đếm" : "Nhận hàng"}</button>}</Heading>
    <div className="purchase-metrics">{[["Giá trị đặt", order.totals.orderedAmount], ["Giá trị đã nhận", order.totals.receivedAmount], ["Đã thanh toán", order.totals.paidAmount], ["Còn nợ NCC", order.totals.debtAmount]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</div>
    <section className="purchase-panel"><h3>Chi tiết SKU</h3><div className="purchase-table"><table><thead><tr><th>SKU / Sản phẩm</th><th>Đặt</th><th>Đã nhận</th><th>Còn thiếu</th><th>Giá đặt</th></tr></thead><tbody>{order.purchaseOrderItems.map((item) => <tr key={item.id}><td><strong>{item.variant.sku}</strong><small>{item.variant.template.name}</small></td><td>{item.orderedQty}</td><td>{item.receivedQty}</td><td>{item.remainingQty}</td><td>{money(item.unitPrice)}</td></tr>)}</tbody></table></div></section>
    {receiving && writable && open && <ReceiveForm key={order.id} order={order} />}
    <section className="purchase-panel"><Heading title="Các đợt nhận hàng" description="Mở phiếu nhận để xem chi tiết, lịch sử kho và thanh toán." /><div className="purchase-table"><table><thead><tr><th>Phiếu nhận</th><th>Ngày nhận</th><th>Trạng thái</th><th>Tiền hàng</th><th>Đã trả</th><th>Còn nợ</th></tr></thead><tbody>{order.purchaseReceipts.map((receipt) => <tr key={receipt.id}><td><Link to={`/purchases/receipts/${receipt.id}`}>{receipt.receiptCode}</Link></td><td>{date(receipt.receivedAt)}</td><td><Status value={receipt.status} /></td><td>{money(receipt.totalAmount)}</td><td>{money(receipt.paidAmount)}</td><td>{money(receipt.debtAmount)}</td></tr>)}</tbody></table>{!order.purchaseReceipts.length && <Empty>Đơn chưa nhận hàng.</Empty>}</div></section>
    {writable && open && <section className="purchase-panel"><div className="purchase-actions">{order.status === "ORDERED" && <button disabled={action.busy || receiving} className="purchase-danger" onClick={() => setFinish("cancel")}>Hủy đơn đặt mua</button>}{order.status === "PARTIALLY_RECEIVED" && <button disabled={action.busy || receiving} onClick={() => setFinish("close")}>Đóng phần giao thiếu</button>}</div>{finish && <div className="purchase-confirm"><p>{finish === "cancel" ? "Hủy đơn này? Đơn sẽ không thể nhận hàng." : "Đóng phần còn thiếu? Giữ nguyên hàng đã nhận và công nợ, dừng nhận thêm."}</p><div className="purchase-actions"><button disabled={action.busy} onClick={() => setFinish(null)}>Quay lại</button><button className="purchase-danger" disabled={action.busy} onClick={() => void action.run(async () => { await purchasesApi.finishOrder(id, finish); setFinish(null); result.reload(); })}>Xác nhận {finish === "cancel" ? "hủy đơn" : "đóng phần thiếu"}</button></div></div>}<ErrorBox error={action.error} /></section>}
  </>;
}
