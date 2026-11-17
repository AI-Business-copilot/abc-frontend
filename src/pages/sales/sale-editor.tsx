import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, LockKeyhole, Plus, RefreshCw, Search, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { salesApi, type SaleVariant } from "@/api/sales";
import { inventoryApi } from "@/api/inventory";
import { usePermissions } from "@/hooks/use-permissions";
import { MoneyInput } from "@/pages/purchases/money-input";
import { Modal } from "@/components/ui/modal";
import { code, date, Empty, ErrorBox, Field, Heading, money, total, useAction, useLoad, validateMoney, today } from "@/pages/purchases/shared";

import { SaleCheckout, type CartLine } from "./sale-checkout";
import { SaleCheckoutSteps } from "./sale-checkout-steps";

export function SaleEditor() {
  const { can } = usePermissions();
  const [step, setStep] = useState(0);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
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
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orderCode] = useState(() => code("POS"));
  const [lotVariant, setLotVariant] = useState<SaleVariant | null>(null);
  const lots = useLoad(() => lotVariant ? inventoryApi.getVariantLots(lotVariant.id) : Promise.resolve({ lots: [] }), [lotVariant?.id]);
  const amount = total(lines.map(line => ({ qty: line.qty, price: String(line.variant.basePrice) })));
  const previewKey = JSON.stringify(lines.map(line => [line.variant.id, line.qty]));
  const promotionPreview = useLoad(() => {
    if (!lines.length || invalidLines(lines)) return Promise.resolve(null);
    return salesApi.promotionPreview(lines.map(line => ({ variantId: line.variant.id, quantity: Number(line.qty) })));
  }, [previewKey]);
  const products = variants.data?.items.filter(v => !inStock || v.onHand > 0) || [];
  const add = (variant: SaleVariant) => setLines(current => {
    const existing = current.find(l => l.variant.id === variant.id);
    if (existing) return current.map(l => l.variant.id === variant.id ? { ...l, variant, qty: String(Math.min(variant.onHand, (Number(l.qty) || 0) + 1)) } : l);
    return current.length < 500 ? [...current, { variant, qty: "1" }] : current;
  });
  if (!can("orders.create")) return <ErrorBox error="Bạn cần quyền tạo đơn bán để bán hàng tại quầy." />;

  return <>
    <Heading title="Bán hàng tại quầy" description="Chọn sản phẩm, kiểm tra đơn hàng và hoàn tất thanh toán theo từng bước."><Link to="/sales" className="sales-text-link">Đơn chờ & lịch sử <ArrowRight size={16} /></Link></Heading>
    <div className="sales-shift-bar"><div><span className={`sales-dot ${shift.data ? "open" : ""}`} /><strong>{shift.loading ? "Đang kiểm tra ca…" : shift.data ? "Ca bán đang mở" : "Mở ca để bắt đầu bán hàng"}</strong>{shift.data && <small>{date(shift.data.openedAt)} · Đầu ca {money(shift.data.openingCash)}</small>}</div><button type="button" aria-label="Kiểm tra lại ca" disabled={shift.loading || action.busy || checkoutBusy} onClick={shift.reload}><RefreshCw size={16} /></button></div>
    {shift.data && <p className="purchase-hint">{previousDayShift ? "Ca này được mở từ ngày trước và chưa đóng. " : ""}Thanh toán đơn hàng không tự đóng ca.{can("cash.shift.read") && <> <Link className="sales-text-link" to="/app/cash-shifts">Quản lý / đóng ca →</Link></>}</p>}
    <ErrorBox error={shift.error} /><ErrorBox error={action.error} />
    {!shift.loading && !shift.data && !shift.error && <form className="sales-open-shift" onSubmit={e => { e.preventDefault(); void action.run(async () => { await salesApi.openShift(validateMoney(opening)); shift.reload(); }); }}><Field label="Tiền mặt đầu ca"><MoneyInput value={opening} onValueChange={setOpening} required disabled={action.busy} /></Field><button className="purchase-primary" disabled={action.busy}>{action.busy ? "Đang mở…" : "Mở ca bán"}</button></form>}
    {action.error && <p className="purchase-hint">Nếu lỗi xảy ra khi tạo đơn, <Link to={`/sales?search=${encodeURIComponent(orderCode)}`}>tra cứu mã {orderCode}</Link> trước khi gửi lại.</p>}
    <SaleCheckoutSteps step={step} onBack={setStep} busy={checkoutBusy} />
    <div hidden={step !== 0}><div className="sales-pos">
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
        <div className="sales-order-code"><LockKeyhole size={13} /><span>{orderCode}</span><small>Tự động</small></div>
        <div className="sales-cart-lines">{lines.length ? lines.map(l => <div className="sales-cart-line" key={l.variant.id}><div><strong>{l.variant.productName}</strong><small>{l.variant.sku} · {l.qty} × {money(l.variant.basePrice)}</small></div><div className="sales-line-end"><strong>{money(total([{ qty: l.qty, price: String(l.variant.basePrice) }]))}</strong><button type="button" aria-label={`Xóa ${l.variant.sku}`} onClick={() => setLines(current => current.filter(row => row.variant.id !== l.variant.id))}><Trash2 size={16} /></button></div></div>) : <Empty><ShoppingCart size={30} className="sales-empty-icon" />Giỏ hàng đang trống<p>Chọn sản phẩm ở bên trái để bắt đầu.</p></Empty>}</div>
        <div className="sales-cart-summary">
          <div className="sales-total"><span>Tạm tính</span><strong>{money(promotionPreview.data?.totalGrossAmount ?? amount)}</strong></div>
          {promotionPreview.data && Number(promotionPreview.data.discountAmount) > 0 && <div className="sales-summary-discount"><span>{promotionPreview.data.promotion?.name || "Khuyến mãi"}</span><strong>−{money(promotionPreview.data.discountAmount)}</strong></div>}
          <div className="sales-total"><span>Tổng dự kiến</span><strong>{money(promotionPreview.data?.totalNetAmount ?? amount)}</strong></div>
          <p className="purchase-hint">Tiếp theo: điều chỉnh số lượng, thông tin khách hàng và chọn phương thức thanh toán.</p>
          <button type="button" className="purchase-primary sales-full" disabled={!lines.length || !can("inventory.read")} onClick={() => setStep(1)}>Thanh toán <ArrowRight size={17} /></button>
        </div>
      </aside>
    </div>
    </div>
    <SaleCheckout step={step} setStep={setStep} lines={lines} setLines={setLines} orderCode={orderCode} shiftId={shift.data?.id} shiftReady={!!shift.data && !shift.loading && !shift.error} preview={promotionPreview.data} previewLoading={promotionPreview.loading} previewError={promotionPreview.error} reloadPreview={promotionPreview.reload} onBusyChange={setCheckoutBusy} />
    <Modal open={!!lotVariant} title={`Lô hàng · ${lotVariant?.productName || ""}`} onClose={() => setLotVariant(null)}><p className="purchase-hint">{lotVariant?.sku} · Hệ thống tự chọn lô còn hạn gần nhất khi thanh toán. Tồn lô là tổng tồn, chưa loại trừ hàng hỏng.</p><ErrorBox error={lots.error} />{lots.error && <button onClick={lots.reload}>Thử lại</button>}{lots.loading ? <Empty>Đang tải lô hàng…</Empty> : <div className="purchase-table"><table><thead><tr><th>Số lô</th><th>Hạn sử dụng</th><th>Tồn</th></tr></thead><tbody>{lots.data?.lots.map(l => <tr key={l.id}><td>{l.lotNumber}</td><td>{date(l.expirationDate)}</td><td>{l.quantityOnHand}</td></tr>)}</tbody></table>{!lots.data?.lots.length && !lots.error && <Empty>Chưa có lô hàng.</Empty>}</div>}</Modal>
  </>;
}

function invalidLines(lines: { variant: SaleVariant; qty: string }[]) {
  return lines.some(line => !/^\d+$/.test(line.qty) || Number(line.qty) < 1 || Number(line.qty) > 2147483647);
}
