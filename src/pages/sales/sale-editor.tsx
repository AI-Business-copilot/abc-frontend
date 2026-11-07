import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Minus, Plus, RefreshCw, Search, ShoppingBag, ShoppingCart, Trash2, Users } from "lucide-react";
import { salesApi, type Customer, type SaleVariant } from "@/api/sales";
import { inventoryApi } from "@/api/inventory";
import { usePermissions } from "@/hooks/use-permissions";
import { MoneyInput } from "@/pages/purchases/money-input";
import { Modal } from "@/components/ui/modal";
import { code, date, Empty, ErrorBox, Field, Heading, money, total, useAction, useLoad, validateMoney, validateQty, today } from "@/pages/purchases/shared";

export function SaleEditor() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const action = useAction();
  const shift = useLoad(salesApi.shift, []);
  const shiftOpenedDate = shift.data ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(shift.data.openedAt)) : "";
  const previousDayShift = !!shiftOpenedDate && shiftOpenedDate < today();
  const [opening, setOpening] = useState("0");
  const [search, setSearch] = useState(params.get("search") || "");
  const [term, setTerm] = useState(search);
  const [category, setCategory] = useState("");
  const [inStock, setInStock] = useState(false);
  useEffect(() => { setSearch(params.get("search") || ""); }, [params.toString()]);
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const variants = useLoad(() => can("inventory.read") ? salesApi.variants(term, category) : Promise.resolve({ items: [], categories: [], total: 0 }), [term, category, can("inventory.read")]);
  const [lines, setLines] = useState<{ variant: SaleVariant; qty: string }[]>([]);
  const [orderCode, setCode] = useState(() => code("POS"));
  const [customerTerm, setCustomerTerm] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  useEffect(() => { const timer = setTimeout(() => setCustomerTerm(customerSearch.trim()), 300); return () => clearTimeout(timer); }, [customerSearch]);
  const customers = useLoad(() => salesApi.customers({ search: customerTerm, pageSize: 50 }), [customerTerm]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lotVariant, setLotVariant] = useState<SaleVariant | null>(null);
  const lots = useLoad(() => lotVariant ? inventoryApi.getVariantLots(lotVariant.id) : Promise.resolve({ lots: [] }), [lotVariant?.id]);
  const amount = total(lines.map(line => ({ qty: line.qty, price: String(line.variant.basePrice) })));
  const products = variants.data?.items.filter(v => !inStock || v.onHand > 0) || [];
  const invalidQty = lines.some(l => !/^\d+$/.test(l.qty) || Number(l.qty) < 1 || Number(l.qty) > l.variant.onHand || Number(l.qty) > 2147483647);
  const add = (variant: SaleVariant) => setLines(current => {
    const existing = current.find(l => l.variant.id === variant.id);
    if (existing) return current.map(l => l.variant.id === variant.id ? { ...l, variant, qty: String(Math.min(variant.onHand, (Number(l.qty) || 0) + 1)) } : l);
    return current.length < 500 ? [...current, { variant, qty: "1" }] : current;
  });
  const changeQty = (id: string, qty: string) => setLines(current => current.map(l => l.variant.id === id ? { ...l, qty } : l));
  if (!can("orders.create")) return <ErrorBox error="Bạn cần quyền tạo đơn bán để bán hàng tại quầy." />;

  return <>
    <Heading title="Bán hàng tại quầy" description="Chọn hàng · Tạo đơn · Thu tiền"><Link to="/sales" className="sales-text-link">Đơn chờ & lịch sử <ArrowRight size={16} /></Link></Heading>
    <div className="sales-shift-bar"><div><span className={`sales-dot ${shift.data ? "open" : ""}`} /><strong>{shift.loading ? "Đang kiểm tra ca…" : shift.data ? "Ca bán đang mở" : "Mở ca để bắt đầu bán hàng"}</strong>{shift.data && <small>{date(shift.data.openedAt)} · Đầu ca {money(shift.data.openingCash)}</small>}</div><button type="button" aria-label="Kiểm tra lại ca" disabled={shift.loading || action.busy} onClick={shift.reload}><RefreshCw size={16} /></button></div>
    {shift.data && <p className="purchase-hint">{previousDayShift ? "Ca n?y ???c m? t? ng?y tr??c v? ch?a ??ng. " : ""}Thanh to?n ??n h?ng kh?ng t? ??ng ca.{can("cash.shift.read") && <> <Link className="sales-text-link" to="/app/cash-shifts">Qu?n l? / ??ng ca ?</Link></>}</p>}
    <ErrorBox error={shift.error} /><ErrorBox error={action.error} />
    {!shift.loading && !shift.data && !shift.error && <form className="sales-open-shift" onSubmit={e => { e.preventDefault(); void action.run(async () => { await salesApi.openShift(validateMoney(opening)); shift.reload(); }); }}><Field label="Tiền mặt đầu ca"><MoneyInput value={opening} onValueChange={setOpening} required disabled={action.busy} /></Field><button className="purchase-primary" disabled={action.busy}>{action.busy ? "Đang mở…" : "Mở ca bán"}</button></form>}
    {action.error && <p className="purchase-hint">Nếu lỗi xảy ra khi tạo đơn, <Link to={`/sales?search=${encodeURIComponent(orderCode)}`}>tra cứu mã {orderCode}</Link> trước khi gửi lại.</p>}
    <div className="sales-pos">
      <section className="purchase-panel sales-products">
        <div className="sales-section-title"><div><h3>Danh sách sản phẩm</h3><p>Tìm hàng nhanh bằng tên, SKU hoặc mã vạch</p></div><button type="button" aria-label="Tải lại sản phẩm" disabled={variants.loading} onClick={variants.reload}><RefreshCw size={16} /></button></div>
        {!can("inventory.read") ? <ErrorBox error="Bạn cần quyền xem tồn kho để chọn sản phẩm bán." /> : <>
          <form className="sales-search" onSubmit={e => { e.preventDefault(); setTerm(search.trim()); variants.reload(); }}><Search size={18} /><input aria-label="Tìm sản phẩm bán" maxLength={255} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nhập tên, SKU hoặc quét mã vạch…" /><button type="submit">Tìm</button></form>
          <div className="sales-product-filters"><select aria-label="Danh mục sản phẩm" value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả danh mục</option>{variants.data?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><label><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} /> Còn hàng</label><small>{variants.data ? `${products.length} / ${variants.data.total} SKU` : ""}</small></div>
          <ErrorBox error={variants.error} />{variants.error && <button onClick={variants.reload}>Thử lại</button>}
          {variants.loading ? <Empty>Đang tải sản phẩm…</Empty> : products.length ? <div className="sales-product-grid">{products.map(v => {
            const qty = Number(lines.find(l => l.variant.id === v.id)?.qty) || 0;
            return <article className={`sales-product-card ${qty ? "in-cart" : ""}`} key={v.id}>
              <button className="sales-product" type="button" disabled={action.busy || v.onHand <= qty || (!qty && lines.length >= 500)} onClick={() => add(v)}>
                <span className="sales-product-art">{v.imageUrl ? <img src={v.imageUrl} alt="" /> : <ShoppingBag size={32} />}{qty > 0 && <span className="sales-product-count">{qty}</span>}</span>
                <small>{v.sku}</small><strong>{v.productName}</strong><small>{v.attributeText || v.unit}</small>
                <span className="sales-product-price">{money(v.basePrice)}<Plus size={18} /></span><small className={v.onHand > 0 ? "sales-stock" : "sales-out"}>{v.onHand > 0 ? `Tồn ${v.onHand} ${v.unit}` : "Hết hàng"}</small>
              </button>{v.hasLotTracking && <button type="button" className="sales-lot-link" onClick={() => setLotVariant(v)}>Xem lô & hạn dùng</button>}
            </article>;
          })}</div> : <Empty><ShoppingBag size={32} className="sales-empty-icon" />Không có sản phẩm phù hợp.<p>Thử từ khóa hoặc danh mục khác.</p></Empty>}
          <p className="purchase-hint">Hiển thị tối đa 100 SKU mỗi lần tìm. Tồn hiển thị là tổng tồn; hàng hỏng, hạn dùng và tồn bán được được kiểm tra lại khi tạo đơn và thanh toán.</p>
        </>}
      </section>
      <aside className="purchase-panel sales-cart">
        <div className="sales-section-title"><div><h3><ShoppingCart size={19} /> Đơn bán mới</h3><p>{lines.length} SKU · {lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0)} sản phẩm</p></div></div>
        <form onSubmit={e => { e.preventDefault(); void action.run(async () => {
          if (!shift.data || shift.loading || shift.error) throw new Error("Kiểm tra và mở ca bán trước khi tạo đơn.");
          if (!lines.length || invalidQty) throw new Error("Kiểm tra số lượng sản phẩm trong giỏ.");
          validateMoney(amount);
          const saved = await salesApi.create({ orderCode: orderCode.trim(), shiftId: shift.data.id, ...(customer ? { customerId: customer.id } : {}), items: lines.map(l => ({ variantId: l.variant.id, quantity: validateQty(l.qty) })) });
          navigate(`/sales/${saved.id}`, { replace: true });
        }); }}><fieldset disabled={action.busy}>
          <Field label="Mã đơn"><input required maxLength={50} value={orderCode} onChange={e => setCode(e.target.value)} /></Field>
          <div className="sales-customer-heading"><strong><Users size={16} /> Khách hàng</strong><button type="button" onClick={() => setAddingCustomer(v => !v)}>{addingCustomer ? "Đóng" : "+ Thêm mới"}</button></div>
          <input aria-label="Tìm khách hàng" maxLength={255} placeholder="Tìm tên hoặc số điện thoại…" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
          <select aria-label="Khách hàng của đơn" value={customer?.id || ""} onChange={e => setCustomer(customers.data?.items.find(c => c.id === e.target.value) || null)}><option value="">Khách vãng lai</option>{customer && !customers.data?.items.some(c => c.id === customer.id) && <option value={customer.id}>{customer.name} · {customer.phone}</option>}{customers.data?.items.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select>
          {customers.loading && <small role="status">Đang tìm khách hàng…</small>}<ErrorBox error={customers.error} />{customers.error && <button type="button" onClick={customers.reload}>Tải lại khách hàng</button>}
          {addingCustomer && <div className="sales-new-customer"><Field label="Tên khách hàng"><input maxLength={150} value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Số điện thoại"><input type="tel" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></Field><button type="button" onClick={() => void action.run(async () => { if (!name.trim() || !phone.trim()) throw new Error("Nhập tên và số điện thoại khách hàng."); const saved = await salesApi.createCustomer(name, phone); setCustomer(saved); setName(""); setPhone(""); setAddingCustomer(false); customers.reload(); })}>Lưu & chọn khách</button></div>}
          <div className="sales-cart-lines">{lines.length ? lines.map(l => <div className="sales-cart-line" key={l.variant.id}><div><strong>{l.variant.productName}</strong><small>{l.variant.sku} · {money(l.variant.basePrice)}</small><div className="sales-quantity"><button type="button" aria-label={`Giảm ${l.variant.sku}`} disabled={Number(l.qty) <= 1} onClick={() => changeQty(l.variant.id, String(Number(l.qty) - 1))}><Minus size={13} /></button><input aria-label={`Số lượng ${l.variant.sku}`} type="number" required min="1" max={Math.min(l.variant.onHand, 2147483647)} step="1" value={l.qty} onChange={e => changeQty(l.variant.id, e.target.value)} /><button type="button" aria-label={`Tăng ${l.variant.sku}`} disabled={Number(l.qty) >= l.variant.onHand} onClick={() => changeQty(l.variant.id, String((Number(l.qty) || 0) + 1))}><Plus size={13} /></button></div></div><div className="sales-line-end"><strong>{money(total([{ qty: l.qty, price: String(l.variant.basePrice) }]))}</strong><button type="button" aria-label={`Xóa ${l.variant.sku}`} onClick={() => setLines(current => current.filter(row => row.variant.id !== l.variant.id))}><Trash2 size={16} /></button></div></div>) : <Empty><ShoppingCart size={30} className="sales-empty-icon" />Giỏ hàng đang trống<p>Chọn sản phẩm ở bên trái để bắt đầu.</p></Empty>}</div>
          {invalidQty && <ErrorBox error="Số lượng phải là số nguyên dương và không vượt tồn hiển thị." />}
          <div className="sales-cart-summary"><div className="sales-total"><span>Tổng dự kiến</span><strong>{money(amount)}</strong></div><p className="purchase-hint">Giá được chốt khi tạo đơn. Đơn chờ thanh toán chưa giữ hàng hoặc trừ kho.</p><button className="purchase-primary sales-full" disabled={!lines.length || invalidQty || !shift.data || shift.loading || !!shift.error || !can("inventory.read") || Number(amount) <= 0}>{action.busy ? "Đang lưu đơn…" : <>Tạo đơn & thanh toán <ArrowRight size={17} /></>}</button></div>
        </fieldset></form>
      </aside>
    </div>
    <Modal open={!!lotVariant} title={`Lô hàng · ${lotVariant?.productName || ""}`} onClose={() => setLotVariant(null)}><p className="purchase-hint">{lotVariant?.sku} · Hệ thống tự chọn lô còn hạn gần nhất khi thanh toán. Tồn lô là tổng tồn, chưa loại trừ hàng hỏng.</p><ErrorBox error={lots.error} />{lots.error && <button onClick={lots.reload}>Thử lại</button>}{lots.loading ? <Empty>Đang tải lô hàng…</Empty> : <div className="purchase-table"><table><thead><tr><th>Số lô</th><th>Hạn sử dụng</th><th>Tồn</th></tr></thead><tbody>{lots.data?.lots.map(l => <tr key={l.id}><td>{l.lotNumber}</td><td>{date(l.expirationDate)}</td><td>{l.quantityOnHand}</td></tr>)}</tbody></table>{!lots.data?.lots.length && !lots.error && <Empty>Chưa có lô hàng.</Empty>}</div>}</Modal>
  </>;
}
