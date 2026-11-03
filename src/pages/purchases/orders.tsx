import { MoneyInput } from "./money-input";
import { PurchaseForm } from "./purchase-form";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Eye, Search, X } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { purchasesApi, type Order, type OrderPayload, type Query, type StockVariant, type Supplier } from "@/api/purchases";
import { usePermissions } from "@/hooks/use-permissions";
import { validateDeliveryDate } from "./purchase-input";
import { ReceiveForm } from "./receive-form";
import { PaymentDialog } from "./payment-dialog";
import { PurchaseDialog } from "./purchase-dialog";
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
  const closeCreate = () => { setCreating(false); if (initialCreate) navigate(`/purchases${params.size ? `?${params}` : ""}`, { replace: true }); };
  return <><Heading title="Theo dõi mua hàng từ nhà cung cấp. Tồn kho và công nợ được ghi nhận khi nhận hàng.">{can("inventory.receive") && <button className="purchase-primary" onClick={() => setCreating(true)}>+ Tạo đơn đặt mua</button>}<button onClick={result.reload}>Tải lại</button></Heading>{creating && can("inventory.receive") && <Editor popup onClose={closeCreate} onSaved={(id) => { setCreating(false); navigate(`/purchases/${id}`); }} />}<ListFilters kind="orders" initialSearch={initialSearch} onChange={(value) => { setQuery(value); setPage(1); }} /><ErrorBox error={result.error} />
    {result.loading ? <Empty>Đang tải đơn đặt mua…</Empty> : result.data && <><div className="purchase-table"><table><thead><tr><th>Mã đơn / Ngày đặt</th><th>Nhà cung cấp</th><th>Trạng thái</th><th>Đã nhận / Đặt</th><th>Giá trị đặt</th><th>Công nợ đã nhận</th><th>Thao tác</th></tr></thead><tbody>{result.data.items.map((order) => <tr key={order.id}><td><strong>{order.poCode}</strong><small>{date(order.orderDate)}</small></td><td>{order.supplier.name}</td><td><Status value={order.status} /></td><td>{order.totals.receivedQty} / {order.totals.orderedQty}</td><td>{money(order.totals.orderedAmount)}</td><td>{money(order.totals.debtAmount)}</td><td><Link className="purchase-detail-link" to={`/purchases/${order.id}`} aria-label={`Xem chi tiết đơn ${order.poCode}`}><Eye size={16} aria-hidden="true" />Chi tiết</Link></td></tr>)}</tbody></table>{!result.data.items.length && <Empty>Chưa có đơn đặt mua. Tạo đơn mới để bắt đầu.</Empty>}</div><Pager data={result.data} page={page} setPage={setPage} /></>}
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

export type EditorLine = { variantId: string; sku: string; name: string; qty: string; price: string };
export function Editor({ order, initial, popup = false, onClose, onSaved }: { order?: Order; initial?: { supplier: Supplier; lines: EditorLine[] }; popup?: boolean; onClose?: () => void; onSaved?: (id: string) => void }) {
  const navigate = useNavigate(); const action = useAction();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const deliveryHintId = useId();
  useEffect(() => {
    if (!popup || !dialog.current) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, [popup]);
  const [poCode] = useState(() => order?.poCode || code("PO")); const [supplierId, setSupplierId] = useState(order?.supplierId || initial?.supplier.id || "");
  const [selectedSupplier, setSelectedSupplier] = useState(order?.supplier || initial?.supplier);
  const [orderDate] = useState(() => order?.orderDate.slice(0, 10) || today()); const [deliveryDate, setDeliveryDate] = useState(order?.expectedDeliveryDate?.slice(0, 10) || "");
  const [lines, setLines] = useState<EditorLine[]>(order?.purchaseOrderItems.map((item) => ({ variantId: item.variantId, sku: item.variant.sku, name: item.variant.template.name, qty: String(item.orderedQty), price: item.unitPrice })) || initial?.lines || []);
  const [supplierSearch, setSupplierSearch] = useState(""); const [supplierTerm, setSupplierTerm] = useState("");
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [showSkuSearch, setShowSkuSearch] = useState(false);
  const supplierSelectId = useId(); const supplierSearchId = useId(); const skuSearchId = useId();
  const suppliers = useLoad(() => purchasesApi.suppliers({ search: supplierTerm, pageSize: 100 }), [supplierTerm]);
  const [skuSearch, setSkuSearch] = useState(""); const [skuTerm, setSkuTerm] = useState("");
  const variants = useLoad(() => purchasesApi.variants(skuTerm), [skuTerm]);
  const change = (index: number, patch: Partial<EditorLine>) => setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const add = (variant: StockVariant) => setLines((current) => current.some((item) => item.variantId === variant.id) ? current : [...current, { variantId: variant.id, sku: variant.sku, name: variant.productName, qty: "1", price: String(variant.costPrice) }]);
  const submit = (event: FormEvent) => { event.preventDefault(); void action.run(async () => {
    if (!order && orderDate < today()) throw new Error("Ngày đặt không được trước hôm nay.");
    validateDeliveryDate(deliveryDate, orderDate);
    if (!lines.length || lines.length > 500) throw new Error("Đơn đặt mua cần từ 1 đến 500 SKU.");
    const payload: OrderPayload = { poCode: poCode.trim(), supplierId, orderDate, expectedDeliveryDate: deliveryDate, items: lines.map((line) => ({ variantId: line.variantId, orderedQty: validateQty(line.qty), unitPrice: validateMoney(line.price) })) };
    validateMoney(total(lines), 1_000_000_000_000);
    const saved = await purchasesApi.saveOrder(payload, order?.id);
    if (onSaved) onSaved(saved.id);
    else navigate(`/purchases/${saved.id}`, { replace: true });
  }); };
  const content = <>{!popup && <><Back to={order ? `/purchases/${order.id}` : undefined} /><Heading title={order ? `Sửa ${order.poCode}` : "Tạo đơn đặt mua"} description="Chọn SKU có sẵn trong danh mục. Giá đặt mua có thể khác giá nhận thực tế." /></>}
    <ErrorBox error={action.error} />{action.error && !order && <p className="purchase-hint">Nếu mất kết nối khi lưu, tra cứu mã {poCode} trong danh sách trước khi gửi lại.</p>}
    <section className="purchase-panel"><ErrorBox error={suppliers.error} />
      <PurchaseForm onSubmit={submit}><fieldset disabled={action.busy}><div className="purchase-grid"><Field label="Mã đơn đặt mua *"><input readOnly maxLength={50} value={poCode} title="Mã đơn đặt mua được tạo tự động và không thể chỉnh sửa." /></Field>
        <div className="purchase-field">
          <div className="purchase-picker-heading"><label htmlFor={supplierSelectId}>Nhà cung cấp *</label><button type="button" className="purchase-search-toggle" aria-label={showSupplierSearch ? "Đóng tìm nhà cung cấp" : "Tìm nhà cung cấp"} title={showSupplierSearch ? "Đóng tìm nhà cung cấp" : "Tìm nhà cung cấp"} aria-expanded={showSupplierSearch} aria-controls={supplierSearchId} onClick={() => { setShowSupplierSearch(!showSupplierSearch); if (showSupplierSearch) { setSupplierSearch(""); setSupplierTerm(""); } }}>{showSupplierSearch ? <X size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}</button></div>
          <select id={supplierSelectId} required value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setSelectedSupplier(suppliers.data?.items.find((item) => item.id === e.target.value)); }}><option value="">{suppliers.loading ? "Đang tải…" : "Chọn nhà cung cấp"}</option>{selectedSupplier && !suppliers.data?.items.some((s) => s.id === selectedSupplier.id) && <option value={selectedSupplier.id}>{selectedSupplier.name}</option>}{suppliers.data?.items.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
          {showSupplierSearch && <div id={supplierSearchId} className="purchase-picker-search"><input autoFocus aria-label="Tìm nhà cung cấp" value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="Tên hoặc số điện thoại" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setSupplierTerm(supplierSearch.trim()); } }} /><button type="button" aria-label="Tìm nhà cung cấp theo từ khóa" onClick={() => setSupplierTerm(supplierSearch.trim())}><Search size={18} aria-hidden="true" /></button></div>}
        </div><Field label="Ngày đặt *"><input readOnly type="date" value={orderDate} title="Ngày đặt được ghi nhận tự động và không thể chỉnh sửa." /></Field><Field label="Ngày giao dự kiến *"><input required type="date" min={orderDate} value={deliveryDate} aria-describedby={deliveryHintId} onChange={(e) => setDeliveryDate(e.target.value)} /><small id={deliveryHintId} className="purchase-hint">Bắt buộc chọn ngày giao dự kiến, không trước ngày đặt.</small></Field></div>
        <div className="purchase-picker-heading"><span>Chọn SKU / Sản phẩm</span><button type="button" className="purchase-search-toggle" aria-label={showSkuSearch ? "Đóng tìm SKU" : "Tìm SKU"} title={showSkuSearch ? "Đóng tìm SKU" : "Tìm SKU"} aria-expanded={showSkuSearch} aria-controls={skuSearchId} onClick={() => { setShowSkuSearch(!showSkuSearch); if (showSkuSearch) { setSkuSearch(""); setSkuTerm(""); } }}>{showSkuSearch ? <X size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}</button></div>
        {showSkuSearch && <div id={skuSearchId} className="purchase-picker-search"><input autoFocus aria-label="Tìm SKU" value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} placeholder="SKU, mã vạch hoặc tên hàng" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setSkuTerm(skuSearch.trim()); } }} /><button type="button" aria-label="Tìm SKU theo từ khóa" onClick={() => setSkuTerm(skuSearch.trim())}><Search size={18} aria-hidden="true" /></button></div>}<ErrorBox error={variants.error} />
        <div className="purchase-sku-results">{variants.loading ? <p>Đang tìm SKU…</p> : variants.data?.items.map((variant) => <button type="button" disabled={lines.some((line) => line.variantId === variant.id)} key={variant.id} onClick={() => add(variant)}><strong>{variant.sku}</strong><span>{variant.productName} · Tồn: {variant.onHand}</span><b>+</b></button>)}{variants.data?.items.length === 0 && <p>Không tìm thấy SKU.</p>}</div>{((variants.data?.total ?? 0) > 50 || (suppliers.data?.pagination.total ?? 0) > 100) && <p className="purchase-hint">Hiển thị tối đa 50 SKU và 100 NCC mỗi lần tìm. Bấm biểu tượng kính lúp để tìm thêm.</p>}
        <div className="purchase-table"><table><thead><tr><th>SKU / Sản phẩm</th><th>Số lượng đặt</th><th>Đơn giá (đ)</th><th>Thành tiền</th><th /></tr></thead><tbody>{lines.map((line, index) => <tr key={line.variantId}><td><strong>{line.sku}</strong><small>{line.name}</small></td><td><input aria-label={`Số lượng ${line.sku}`} type="number" min="1" max="2147483647" step="1" required value={line.qty} onChange={(e) => change(index, { qty: e.target.value })} /></td><td><MoneyInput aria-label={`Đơn giá ${line.sku}`} min="0" max="9999999999.99" required value={line.price} onValueChange={(value) => change(index, { price: value })} /></td><td>{money(total([line]))}</td><td><button type="button" aria-label={`Xóa ${line.sku}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>Xóa</button></td></tr>)}</tbody></table>{!lines.length && <Empty>Chọn SKU ở trên để thêm vào đơn.</Empty>}</div><div className="purchase-summary"><span>{lines.length} SKU · Tổng giá trị đặt</span><strong>{money(total(lines))}</strong></div><div className="purchase-actions">{popup && <button type="button" onClick={onClose}>Hủy</button>}<button className="purchase-primary" type="submit" disabled={!lines.length || !supplierId}>{action.busy ? "Đang lưu…" : "Lưu đơn đặt mua"}</button></div>
      </fieldset></PurchaseForm></section>
  </>;
  if (!popup) return content;
  return <dialog ref={dialog} className="purchase-create-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!action.busy) onClose?.(); }}>
    <div className="purchase-dialog-header"><div><h2 id={titleId}>Tạo đơn đặt mua</h2><p>Chọn nhà cung cấp, SKU và số lượng đặt mua.</p></div><button type="button" className="purchase-dialog-close" aria-label="Đóng tạo đơn đặt mua" disabled={action.busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
    <div className="purchase-dialog-body">{content}</div>
  </dialog>;
}

export function OrderDetail() {
  const { id = "" } = useParams(); const { can } = usePermissions(); const action = useAction();
  const [paymentId, setPaymentId] = useState(""); const [choosingPayment, setChoosingPayment] = useState(false);
  const [success, setSuccess] = useState("");
  const result = useLoad(() => purchasesApi.order(id), [id]); const [receiving, setReceiving] = useState(false); const [finish, setFinish] = useState<"cancel" | "close" | null>(null);
  const order = result.data;
  if (result.loading) return <Empty>Đang tải chi tiết đơn…</Empty>;
  if (!order) return <><Back /><ErrorBox error={result.error} /><button onClick={result.reload}>Thử lại</button></>;
  const writable = can("inventory.receive"); const open = ["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status);
  const received = order.purchaseReceipts.filter((receipt) => receipt.status === "RECEIVED");
  const unpaid = received.filter((receipt) => Number(receipt.debtAmount) > 0);
  const progress = <section className="purchase-flow" aria-label="Tiến trình mua hàng">
    <ol className="purchase-steps">
      <li className="is-done"><span>1</span><div><strong>Đã đặt mua</strong><small>{date(order.orderDate)}</small></div></li>
      <li className={open ? "is-current" : received.length ? "is-done" : ""}><span>2</span><div><strong>Nhận hàng</strong><small>{order.totals.receivedQty} / {order.totals.orderedQty} sản phẩm đã nhận</small></div></li>
      <li className={received.length && !unpaid.length ? "is-done" : unpaid.length ? "is-current" : ""}><span>3</span><div><strong>Thanh toán</strong><small>{unpaid.length ? `${unpaid.length} phiếu còn nợ` : received.length ? "Đã thanh toán đủ hàng đã nhận" : "Sau khi nhận hàng"}</small></div></li>
    </ol>
    <div className="purchase-next-action"><div><strong>{order.status === "CANCELLED" ? "Đơn đặt mua đã hủy" : !received.length ? "Bước tiếp theo: nhận hàng từ nhà cung cấp" : unpaid.length ? "Bạn có khoản cần thanh toán" : open ? "Tiếp tục nhận phần hàng còn lại" : "Đã hoàn tất nhận hàng và thanh toán"}</strong><p>{order.status === "CANCELLED" ? "Không thể nhận hàng cho đơn này." : !received.length ? "Khi hàng được giao, bấm Nhận hàng để nhập số lượng thực nhận. Bạn có thể trả tiền ngay lúc nhận hoặc để trả sau." : unpaid.length ? "Chọn Thanh toán ở phiếu nhận bên dưới. Mỗi đợt nhận hàng có số tiền và lịch sử thanh toán riêng." : open ? "Các phiếu đã nhận đều được thanh toán đủ. Bạn có thể ghi nhận đợt giao tiếp theo." : "Xem lại từng phiếu nhận để kiểm tra hàng hóa và lịch sử trả tiền."}</p></div><div className="purchase-actions">{writable && open && <button type="button" className="purchase-primary" onClick={() => setReceiving(!receiving)}>{receiving ? "Đóng nhận hàng" : received.length ? "Nhận thêm hàng" : "Nhận hàng"}</button>}{writable && unpaid.length > 0 && <button type="button" className="purchase-primary" onClick={() => { if (unpaid.length === 1) setPaymentId(unpaid[0].id); else setChoosingPayment(true); }}>Thanh toán</button>}</div></div>
  </section>;
  return <><Back /><Heading title={order.poCode} description={`${order.supplier.name} · Ngày đặt ${date(order.orderDate)} · Dự kiến giao ${date(order.expectedDeliveryDate)}`}><Status value={order.status} /><button disabled={action.busy} onClick={() => { setReceiving(false); setFinish(null); result.reload(); }}>Tải lại</button>{writable && order.status === "ORDERED" && !order.purchaseReceipts.length && <Link to={`/purchases/${id}/edit`}>Sửa đơn</Link>}</Heading>
    {success && <div className="purchase-success" role="status">{success}</div>}
    {progress}
    <div className="purchase-metrics">{[["Giá trị đặt", order.totals.orderedAmount], ["Giá trị đã nhận", order.totals.receivedAmount], ["Đã thanh toán", order.totals.paidAmount], ["Còn nợ NCC", order.totals.debtAmount]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</div>
    <section className="purchase-panel"><h3>Chi tiết SKU</h3><div className="purchase-table"><table><thead><tr><th>SKU / Sản phẩm</th><th>Đặt</th><th>Đã nhận</th><th>Còn thiếu</th><th>Giá đặt</th></tr></thead><tbody>{order.purchaseOrderItems.map((item) => <tr key={item.id}><td><strong>{item.variant.sku}</strong><small>{item.variant.template.name}</small></td><td>{item.orderedQty}</td><td>{item.receivedQty}</td><td>{item.remainingQty}</td><td>{money(item.unitPrice)}</td></tr>)}</tbody></table></div></section>
    {receiving && writable && open && <ReceiveForm key={order.id} order={order} onClose={() => setReceiving(false)} onSaved={() => { setReceiving(false); setSuccess("Đã nhận hàng. Bạn có thể thanh toán các phiếu còn nợ ngay tại đây."); result.reload(); }} />}
    {paymentId && writable && <PaymentDialog receiptId={paymentId} onClose={() => setPaymentId("")} onSaved={() => { setPaymentId(""); setSuccess("Đã ghi nhận thanh toán nhà cung cấp."); result.reload(); }} />}
    {choosingPayment && writable && <PurchaseDialog compact title="Chọn phiếu cần thanh toán" onClose={() => setChoosingPayment(false)}><div className="purchase-receipt-choices">{unpaid.map((receipt) => <button key={receipt.id} type="button" onClick={() => { setChoosingPayment(false); setPaymentId(receipt.id); }}><span><strong>{receipt.receiptCode}</strong><small>{date(receipt.receivedAt)}</small></span><span>Còn nợ {money(receipt.debtAmount)}</span></button>)}</div></PurchaseDialog>}
    <section id="order-receipts" className="purchase-panel"><Heading title="Các đợt nhận hàng" description="Mở phiếu nhận để xem chi tiết, lịch sử kho và thanh toán." /><div className="purchase-table"><table><thead><tr><th>Phiếu nhận</th><th>Ngày nhận</th><th>Trạng thái</th><th>Tiền hàng</th><th>Đã trả</th><th>Còn nợ</th><th aria-label="Thao tác" /></tr></thead><tbody>{order.purchaseReceipts.map((receipt) => <tr key={receipt.id}><td><Link to={`/purchases/receipts/${receipt.id}`}>{receipt.receiptCode}</Link></td><td>{date(receipt.receivedAt)}</td><td><Status value={receipt.status} /></td><td>{money(receipt.totalAmount)}</td><td>{money(receipt.paidAmount)}</td><td>{money(receipt.debtAmount)}</td><td>{writable && receipt.status === "RECEIVED" && Number(receipt.debtAmount) > 0 ? <button type="button" className="purchase-primary" onClick={() => setPaymentId(receipt.id)}>Thanh toán</button> : <Link to={`/purchases/receipts/${receipt.id}`}>Xem phiếu</Link>}</td></tr>)}</tbody></table>{!order.purchaseReceipts.length && <Empty>Đơn chưa nhận hàng.</Empty>}</div></section>
    {writable && open && <section className="purchase-panel"><div className="purchase-actions">{order.status === "ORDERED" && <button disabled={action.busy || receiving} className="purchase-danger" onClick={() => setFinish("cancel")}>Hủy đơn đặt mua</button>}{order.status === "PARTIALLY_RECEIVED" && <button disabled={action.busy || receiving} onClick={() => setFinish("close")}>Đóng phần giao thiếu</button>}</div>{finish && <div className="purchase-confirm"><p>{finish === "cancel" ? "Hủy đơn này? Đơn sẽ không thể nhận hàng." : "Đóng phần còn thiếu? Giữ nguyên hàng đã nhận và công nợ, dừng nhận thêm."}</p><div className="purchase-actions"><button disabled={action.busy} onClick={() => setFinish(null)}>Quay lại</button><button className="purchase-danger" disabled={action.busy} onClick={() => void action.run(async () => { await purchasesApi.finishOrder(id, finish); setFinish(null); result.reload(); })}>Xác nhận {finish === "cancel" ? "hủy đơn" : "đóng phần thiếu"}</button></div></div>}<ErrorBox error={action.error} /></section>}
  </>;
}
