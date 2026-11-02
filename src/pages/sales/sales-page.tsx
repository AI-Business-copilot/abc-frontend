import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, Search, ShoppingBag, Trash2, CreditCard, Banknote } from "lucide-react";
import { salesApi, type Customer, type Sale, type SaleVariant } from "@/api/sales";
import type { Shift } from "@/api/purchases";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Back, Empty, ErrorBox, Field, Heading, Pager, code, date, money, total, useAction, useLoad, validateMoney, validateQty } from "@/pages/purchases/shared";
import "@/pages/purchases/purchases.css";
import "./sales.css";

const labels = { DRAFT: "Chờ thanh toán", COMPLETED: "Đã thanh toán", CANCELLED: "Đã hủy" };
function SaleStatus({ value }: { value: Sale["status"] }) { return <span className={`purchase-status ${value.toLowerCase()}`}>{labels[value]}</span>; }

export function SalesPage() {
  const { can } = usePermissions(); const { profile } = useAuth();
  const location = useLocation(); const navigate = useNavigate(); const [keyword, setKeyword] = useState("");
  const active = location.pathname === "/sales/new" ? "pos" : location.pathname.startsWith("/sales/customers") ? "customers" : "sales";
  return <div className="purchase-workspace" key={profile?.business?.id}>
    <CatalogHeader mode="sales" active={active} keyword={keyword} onKeywordChange={setKeyword} onSearch={() => navigate(`/sales${active === "customers" ? "/customers" : active === "pos" ? "/new" : ""}?${new URLSearchParams({ search: keyword.trim() })}`)} />
    <main className="purchases sales"><div className="purchase-breadcrumb"><Link to="/app/orders">Đơn hàng &amp; thanh toán</Link><span>›</span><strong>Bán lẻ &amp; thanh toán</strong></div>
      {!can("orders.read") ? <ErrorBox error="Bạn cần quyền xem đơn bán để sử dụng chức năng này." /> : <Routes key={`${profile?.business?.id}:${location.pathname}${active === "pos" ? "" : location.search}`}>
        <Route index element={<SaleList />} /><Route path="new" element={<SaleEditor />} /><Route path="customers" element={<Customers />} /><Route path=":id" element={<SaleDetail />} />
        <Route path="*" element={<Empty>Không tìm thấy trang. <Link to="/sales">Về đơn bán</Link></Empty>} />
      </Routes>}
    </main>
  </div>;
}

function SaleList() {
  const { can } = usePermissions(); const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const result = useLoad(() => salesApi.orders({ page, search: params.get("search") || "", status: params.get("status") || "", from: params.get("from") || "", to: params.get("to") || "" }), [params.toString()]);
  const filter = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); next.delete("page"); setParams(next); };
  return <><Heading title="Đơn bán hàng" description="Theo dõi đơn tại quầy, đơn chờ thanh toán và lịch sử thu tiền.">{can("orders.create") && <Link className="purchase-primary" to="/sales/new">+ Bán tại quầy</Link>}</Heading>
    <form className="purchase-filters" onSubmit={e => { e.preventDefault(); filter("search", search); }}><Field label="Tìm đơn bán"><input value={search} maxLength={255} onChange={e => setSearch(e.target.value)} placeholder="Nhập mã đơn bán…" /></Field><Field label="Trạng thái"><select value={params.get("status") || ""} onChange={e => filter("status", e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Từ ngày"><input type="date" value={params.get("from") || ""} onChange={e => filter("from", e.target.value)} /></Field><Field label="Đến ngày"><input type="date" min={params.get("from") || undefined} value={params.get("to") || ""} onChange={e => filter("to", e.target.value)} /></Field><button>Tìm kiếm</button></form>
    <ErrorBox error={result.error} />{result.error && <button onClick={result.reload}>Thử lại</button>}
    {result.loading ? <Empty>Đang tải đơn bán…</Empty> : result.data && <><div className="purchase-table"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày tạo</th><th>Trạng thái</th><th>Tổng tiền</th><th>Thanh toán</th></tr></thead><tbody>{result.data.items.map(order => <tr key={order.id}><td><Link to={`/sales/${order.id}`}>{order.orderCode}</Link></td><td>{order.customer?.name || "Khách vãng lai"}</td><td>{date(order.createdAt)}</td><td><SaleStatus value={order.status} /></td><td>{money(order.totalNetAmount)}</td><td>{order.orderPayments.map(p => p.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản").join(", ") || "—"}</td></tr>)}</tbody></table>{!result.data.items.length && <Empty><ShoppingBag size={30} className="sales-empty-icon" />Chưa có đơn bán phù hợp.</Empty>}</div><Pager data={result.data} page={page} setPage={value => { const next = new URLSearchParams(params); next.set("page", String(value)); setParams(next); }} /></>}
  </>;
}

function ShiftPanel({ shift }: { shift: { data: Shift | null | undefined; loading: boolean; error: string; reload: () => void } }) {
  const action = useAction(); const [opening, setOpening] = useState("0"); const { can } = usePermissions();
  return <section className="purchase-shift"><strong>{shift.loading ? "Đang kiểm tra ca…" : shift.data ? "● Ca bán đang mở" : "Chưa có ca bán đang mở"}</strong><ErrorBox error={shift.error || action.error} />
    {shift.data ? <p>Mở ngày {date(shift.data.openedAt)} · Tiền đầu ca {money(shift.data.openingCash)}</p> : !shift.loading && can("orders.create") && <form onSubmit={e => { e.preventDefault(); void action.run(async () => { await salesApi.openShift(validateMoney(opening)); shift.reload(); }); }}><fieldset disabled={action.busy}><Field label="Tiền mặt đầu ca (đ)"><input type="number" min="0" step="0.01" required value={opening} onChange={e => setOpening(e.target.value)} /></Field><button className="purchase-primary">{action.busy ? "Đang mở ca…" : "Mở ca bán"}</button></fieldset></form>}
    <button type="button" disabled={action.busy || shift.loading} onClick={shift.reload}>Kiểm tra lại ca</button>
  </section>;
}

function SaleEditor() {
  const { can } = usePermissions(); const navigate = useNavigate(); const [params] = useSearchParams(); const action = useAction();
  const shift = useLoad(salesApi.shift, []);
  const [search, setSearch] = useState(params.get("search") || ""), [term, setTerm] = useState(params.get("search") || "");
  useEffect(() => { setSearch(params.get("search") || ""); setTerm(params.get("search") || ""); }, [params.toString()]);
  const variants = useLoad(() => can("inventory.read") ? salesApi.variants(term) : Promise.resolve({ items: [] }), [term]);
  const [lines, setLines] = useState<{ variant: SaleVariant; qty: string }[]>([]);
  const [orderCode, setCode] = useState(() => code("POS"));
  const [customerSearch, setCustomerSearch] = useState(""), [customerTerm, setCustomerTerm] = useState("");
  const customers = useLoad(() => salesApi.customers({ search: customerTerm, pageSize: 50 }), [customerTerm]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false), [newName, setNewName] = useState(""), [newPhone, setNewPhone] = useState("");
  const amount = total(lines.map(l => ({ qty: l.qty, price: String(l.variant.basePrice) })));
  if (!can("orders.create")) return <ErrorBox error="Bạn cần quyền tạo đơn bán để bán hàng tại quầy." />;
  return <><Heading title="Bán hàng tại quầy" description="Chọn sản phẩm, tạo đơn và xác nhận thanh toán."><Link to="/sales">Xem đơn bán →</Link></Heading>
    <ErrorBox error={action.error} />{action.error && <p className="purchase-hint">Nếu mất kết nối khi tạo đơn, <Link to={`/sales?search=${encodeURIComponent(orderCode)}`}>tra cứu mã {orderCode}</Link> trước khi tạo lại.</p>}
    <div className="sales-pos"><section className="purchase-panel sales-products"><Heading title="Chọn sản phẩm" description="Tìm theo tên, SKU hoặc mã vạch." />
      {!can("inventory.read") ? <ErrorBox error="Bạn cần quyền xem tồn kho để chọn sản phẩm bán." /> : <><form className="sales-search" onSubmit={e => { e.preventDefault(); setTerm(search); }}><Search size={18} /><input aria-label="Tìm sản phẩm bán" value={search} maxLength={255} onChange={e => setSearch(e.target.value)} placeholder="Tên sản phẩm, SKU, mã vạch…" /><button>Tìm</button></form><ErrorBox error={variants.error} />{variants.error && <button onClick={variants.reload}>Thử lại</button>}
      {variants.loading ? <Empty>Đang tìm sản phẩm…</Empty> : <div className="sales-product-grid">{variants.data?.items.map(v => <button className="sales-product" type="button" key={v.id} disabled={action.busy || v.onHand <= 0 || lines.length >= 500} onClick={() => setLines(current => { const existing = current.find(l => l.variant.id === v.id); return existing ? current.map(l => l.variant.id === v.id ? { ...l, qty: String(Math.min(2147483647, (Number(l.qty) || 0) + 1)) } : l) : [...current, { variant: v, qty: "1" }]; })}><span className="sales-product-art">{v.imageUrl ? <img src={v.imageUrl} alt="" /> : <ShoppingBag size={28} />}</span><strong>{v.productName}</strong><small>{v.sku}{v.attributeText ? ` · ${v.attributeText}` : ""}</small><span className="sales-product-price">{money(v.basePrice)}<Plus size={17} /></span><small>Tồn: {v.onHand}{v.hasLotTracking ? " · Theo lô" : ""}</small></button>)}</div>}{variants.data?.items.length === 0 && <Empty>Không tìm thấy sản phẩm.</Empty>}<p className="purchase-hint">Hiển thị tối đa 50 SKU. Tồn hiển thị là tổng tồn; số lượng bán được và hạn dùng được kiểm tra khi tạo đơn và thanh toán.</p></>}
    </section><aside className="sales-cart"><ShiftPanel shift={shift} /><section className="purchase-panel"><Heading title="Đơn bán mới" description={`${lines.length} SKU đã chọn`} />
      <form onSubmit={e => { e.preventDefault(); void action.run(async () => { if (!shift.data) throw new Error("Mở ca bán trước khi tạo đơn."); if (!lines.length) throw new Error("Chọn ít nhất một sản phẩm."); validateMoney(amount); const saved = await salesApi.create({ orderCode: orderCode.trim(), shiftId: shift.data.id, ...(customer ? { customerId: customer.id } : {}), items: lines.map(l => ({ variantId: l.variant.id, quantity: validateQty(l.qty) })) }); navigate(`/sales/${saved.id}`, { replace: true }); }); }}><fieldset disabled={action.busy}>
        <Field label="Mã đơn bán"><input required maxLength={50} value={orderCode} onChange={e => setCode(e.target.value)} /></Field>
        <div className="sales-customer"><Field label="Tìm khách hàng"><input value={customerSearch} maxLength={255} onChange={e => setCustomerSearch(e.target.value)} placeholder="Tên hoặc số điện thoại" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); setCustomerTerm(customerSearch); } }} /></Field><button type="button" onClick={() => setCustomerTerm(customerSearch)}>Tìm khách</button><button type="button" onClick={() => setAddingCustomer(value => !value)}>+ Thêm khách</button></div><ErrorBox error={customers.error} /><Field label="Khách hàng"><select value={customer?.id || ""} onChange={e => setCustomer(customers.data?.items.find(c => c.id === e.target.value) || null)}><option value="">Khách vãng lai</option>{customer && !customers.data?.items.some(c => c.id === customer.id) && <option value={customer.id}>{customer.name} · {customer.phone}</option>}{customers.data?.items.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></Field>
        {addingCustomer && <div className="purchase-confirm"><h3>Khách hàng mới</h3><Field label="Tên khách hàng"><input maxLength={150} value={newName} onChange={e => setNewName(e.target.value)} /></Field><Field label="Số điện thoại"><input type="tel" maxLength={20} value={newPhone} onChange={e => setNewPhone(e.target.value)} /></Field><button className="sales-cancel" type="button" onClick={() => void action.run(async () => { if (!newName.trim() || !newPhone.trim()) throw new Error("Nhập tên và số điện thoại khách hàng."); const saved = await salesApi.createCustomer(newName, newPhone); setCustomer(saved); setAddingCustomer(false); setNewName(""); setNewPhone(""); customers.reload(); })}>Lưu & chọn khách</button></div>}<div className="sales-cart-lines">{lines.map(l => <div className="sales-cart-line" key={l.variant.id}><div><strong>{l.variant.productName}</strong><small>{l.variant.sku} · {money(l.variant.basePrice)}</small></div><input aria-label={`Số lượng ${l.variant.sku}`} type="number" min="1" max="2147483647" step="1" required value={l.qty} onChange={e => setLines(current => current.map(row => row.variant.id === l.variant.id ? { ...row, qty: e.target.value } : row))} /><button type="button" aria-label={`Xóa ${l.variant.sku}`} onClick={() => setLines(current => current.filter(row => row.variant.id !== l.variant.id))}><Trash2 size={16} /></button></div>)}{!lines.length && <Empty>Chọn sản phẩm để bắt đầu đơn bán.</Empty>}</div>
        <div className="sales-total"><span>Tổng dự kiến</span><strong>{money(amount)}</strong></div><p className="purchase-hint">Đơn nháp chưa giữ hàng hoặc trừ kho. Giá chính thức được chốt khi tạo đơn.</p><button className="purchase-primary sales-full" disabled={!lines.length || !shift.data || !can("inventory.read") || Number(amount) <= 0}>{action.busy ? "Đang tạo đơn…" : "Tạo đơn & đến thanh toán"}</button>
      </fieldset></form></section></aside></div>
  </>;
}

function SaleDetail() {
  const { id = "" } = useParams(); const { can } = usePermissions(); const { profile } = useAuth(); const result = useLoad(() => salesApi.order(id), [id]); const shift = useLoad(salesApi.shift, []); const action = useAction();
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH"), [reference, setReference] = useState(""), [confirmed, setConfirmed] = useState(false), [cancel, setCancel] = useState(false);
  if (result.loading) return <Empty>Đang tải đơn bán…</Empty>;
  if (!result.data) return <><Back to="/sales">Đơn bán hàng</Back><ErrorBox error={result.error} /><button onClick={result.reload}>Thử lại</button></>;
  const order = result.data; const own = order.cashierId === profile?.user.id; const writable = can("orders.create") && own && order.status === "DRAFT";
  const matchingShift = shift.data?.id === order.shiftId;
  return <><Back to="/sales">Đơn bán hàng</Back><Heading title={order.orderCode} description={`${date(order.createdAt)} · ${order.customer?.name || "Khách vãng lai"}${order.customer ? ` · ${order.customer.phone}` : ""}`}><SaleStatus value={order.status} /><button disabled={action.busy} onClick={() => { result.reload(); shift.reload(); setConfirmed(false); }}>Tải lại</button>{order.status === "COMPLETED" && <Link className="purchase-primary" to="/sales/new">Đơn bán mới</Link>}</Heading>
    <ErrorBox error={action.error} />{action.error && <p className="purchase-hint">Tải lại đơn để kiểm tra kết quả trước khi thử thanh toán lại. Nếu đã nhận tiền mà đơn chưa hoàn tất, kiểm tra tồn và ca bán trước khi xử lý tiếp.</p>}
    {order.status === "COMPLETED" && <div className="purchase-success" role="status">Đã ghi nhận thanh toán và xuất kho thành công.</div>}
    <div className="sales-detail"><section className="purchase-panel"><h3>Sản phẩm trong đơn</h3><div className="purchase-table"><table><thead><tr><th>Sản phẩm / SKU</th><th>Lô / Hạn dùng</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{order.orderItems.map(l => <tr key={l.id}><td><strong>{l.variant?.sku || l.variantId}</strong><small>{l.variant?.template.name}</small></td><td>{l.lot ? <>{l.lot.lotNumber}<small>{date(l.lot.expirationDate)}</small></> : "—"}</td><td>{l.quantity}</td><td>{money(l.unitPrice)}</td><td>{money(l.subtotal)}</td></tr>)}</tbody></table></div><p className="purchase-hint">Với sản phẩm quản lý lô, hệ thống chọn lô còn hạn có hạn dùng gần nhất khi thanh toán.</p>
      {order.orderPayments.length > 0 && <><h3>Lịch sử thanh toán</h3>{order.orderPayments.map(p => <div className="sales-payment-record" key={p.id}><strong>{p.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"} · {money(p.amount)}</strong><small>{date(p.createdAt)}{p.paymentReference ? ` · ${p.paymentReference}` : ""}</small></div>)}</>}
    </section><section className="purchase-panel sales-payment"><h3>Thanh toán</h3><div className="sales-total"><span>Tổng cần thu</span><strong>{money(order.totalNetAmount)}</strong></div>
      {writable ? <><ErrorBox error={shift.error} />{!shift.loading && !matchingShift && <ErrorBox error="Ca gốc của đơn không còn là ca đang mở. Kiểm tra lại ca; đơn chỉ thanh toán được trong ca gốc của người tạo." />}
        <form onSubmit={e => { e.preventDefault(); void action.run(async () => { if (!confirmed || !matchingShift) throw new Error("Kiểm tra ca và xác nhận đã nhận đủ tiền."); await salesApi.pay(id, method, order.totalNetAmount, method === "BANK_TRANSFER" ? reference : ""); setConfirmed(false); result.reload(); shift.reload(); }); }}><fieldset disabled={action.busy}><div className="sales-methods">{([['CASH', 'Tiền mặt', Banknote], ['BANK_TRANSFER', 'Chuyển khoản', CreditCard]] as const).map(([value, label, Icon]) => <button type="button" className={method === value ? "selected" : ""} aria-pressed={method === value} key={value} onClick={() => { setMethod(value); setConfirmed(false); }}><Icon size={20} />{label}</button>)}</div>{method === "BANK_TRANSFER" && <Field label="Mã giao dịch chuyển khoản (nếu có)"><input maxLength={100} value={reference} onChange={e => setReference(e.target.value)} /></Field>}
        <label className="sales-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>Tôi đã kiểm tra và nhận đủ {money(order.totalNetAmount)} từ khách.</span></label><p className="purchase-hint">{method === "BANK_TRANSFER" ? "Kiểm tra tiền đã vào tài khoản trước khi xác nhận." : "Kiểm đếm tiền mặt trước khi xác nhận."} Xác nhận sẽ hoàn tất đơn và trừ kho.</p><button className="purchase-primary sales-full" disabled={!confirmed || !matchingShift || shift.loading || Number(order.totalNetAmount) <= 0}>{action.busy ? "Đang xử lý…" : "Xác nhận thanh toán"}</button>
        <button className="purchase-danger sales-full sales-cancel" type="button" onClick={() => setCancel(true)}>Hủy đơn nháp</button></fieldset></form>
        {cancel && <div className="purchase-confirm"><p>Hủy đơn này? Đơn chưa thanh toán sẽ không trừ kho.</p><div className="purchase-actions"><button disabled={action.busy} onClick={() => setCancel(false)}>Quay lại</button><button className="purchase-danger" disabled={action.busy} onClick={() => void action.run(async () => { await salesApi.cancel(id); setCancel(false); result.reload(); })}>Xác nhận hủy</button></div></div>}
      </> : <p className="purchase-hint">{order.status === "DRAFT" ? "Chỉ người tạo đơn có quyền bán hàng mới có thể xác nhận thanh toán hoặc hủy đơn nháp." : order.status === "COMPLETED" ? "Đơn đã thanh toán. Không thể thu tiền hoặc hủy lần nữa." : "Đơn đã hủy, không phát sinh thu tiền hoặc xuất kho."}</p>}
    </section></div>
  </>;
}

function Customers() {
  const { can } = usePermissions(); const [params] = useSearchParams(); const [search, setSearch] = useState(params.get("search") || ""), [term, setTerm] = useState(params.get("search") || ""), [page, setPage] = useState(1);
  const result = useLoad(() => salesApi.customers({ search: term, page, pageSize: 20 }), [term, page]); const action = useAction(); const [name, setName] = useState(""), [phone, setPhone] = useState("");
  return <><Heading title="Khách hàng" description="Lưu thông tin khách để gắn vào đơn bán tại quầy." /><ErrorBox error={action.error} />
    {can("orders.create") && <section className="purchase-panel"><h3>Thêm khách hàng</h3><form onSubmit={e => { e.preventDefault(); void action.run(async () => { await salesApi.createCustomer(name, phone); setName(""); setPhone(""); setPage(1); setTerm(""); setSearch(""); result.reload(); }); }}><fieldset className="purchase-filters" disabled={action.busy}><Field label="Tên khách hàng"><input required maxLength={150} value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Số điện thoại"><input required type="tel" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></Field><button className="purchase-primary">{action.busy ? "Đang lưu…" : "Thêm khách hàng"}</button></fieldset></form></section>}
    <form className="purchase-filters" onSubmit={e => { e.preventDefault(); setTerm(search); setPage(1); }}><Field label="Tìm khách hàng"><input maxLength={255} value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên hoặc số điện thoại" /></Field><button>Tìm kiếm</button></form><ErrorBox error={result.error} />{result.error && <button onClick={result.reload}>Thử lại</button>}{result.loading ? <Empty>Đang tải khách hàng…</Empty> : result.data && <><div className="purchase-table"><table><thead><tr><th>Tên khách hàng</th><th>Số điện thoại</th></tr></thead><tbody>{result.data.items.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.phone}</td></tr>)}</tbody></table>{!result.data.items.length && <Empty>Chưa có khách hàng phù hợp.</Empty>}</div><Pager data={result.data} page={page} setPage={setPage} /></>}
  </>;
}
