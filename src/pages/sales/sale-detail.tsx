import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Banknote, CheckCircle2, CreditCard, Printer, RefreshCw } from "lucide-react";
import { salesApi } from "@/api/sales";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { MoneyInput } from "@/pages/purchases/money-input";
import { Back, date, Empty, ErrorBox, Field, Heading, money, useAction, useLoad, validateMoney } from "@/pages/purchases/shared";
import { cashChange } from "./sale-money";

export function SaleDetail() {
  const { id = "" } = useParams();
  const { can } = usePermissions();
  const { profile } = useAuth();
  const result = useLoad(() => salesApi.order(id), [id]);
  const shift = useLoad(salesApi.shift, []);
  const action = useAction();
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [reference, setReference] = useState("");
  const [received, setReceived] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [cancel, setCancel] = useState(false);
  if (result.loading) return <Empty>Đang tải đơn bán…</Empty>;
  if (!result.data) return <><Back to="/sales">Đơn bán hàng</Back><ErrorBox error={result.error} /><button onClick={result.reload}>Thử lại</button></>;
  const order = result.data;
  const writable = can("orders.create") && order.cashierId === profile?.user.id && order.status === "DRAFT";
  const matchingShift = !shift.loading && !shift.error && shift.data?.id === order.shiftId;
  const freeOrder = Number(order.totalNetAmount) === 0;
  const change = cashChange(received, order.totalNetAmount);
  const cashValid = freeOrder || method !== "CASH" || change !== null;
  const completed = order.status === "COMPLETED";
  const refresh = () => { setConfirmed(false); result.reload(); shift.reload(); };
  return <div className="sales-receipt-view">
    <div className="sales-no-print"><Back to="/sales">Đơn bán hàng</Back></div>
    <Heading title={order.orderCode} description={`${date(order.createdAt)} · ${order.customer?.name || "Khách vãng lai"}${order.customer ? ` · ${order.customer.phone}` : ""}`}>
      <span className={`purchase-status ${order.status.toLowerCase()}`}>{completed ? "Đã thanh toán" : order.status === "DRAFT" ? "Chờ thanh toán" : "Đã hủy"}</span>
      <button className="sales-no-print" disabled={action.busy} onClick={refresh}><RefreshCw size={15} /> Tải lại</button>
      {completed && <><button className="sales-no-print" onClick={() => window.print()}><Printer size={15} /> In hóa đơn</button><Link className="purchase-primary sales-no-print" to="/sales/new">+ Đơn mới</Link></>}
    </Heading>
    <ErrorBox error={action.error} />{action.error && <p className="purchase-hint">Tải lại đơn để kiểm tra kết quả trước khi thử lại. Nếu đã nhận tiền, đối chiếu ca và tồn kho trước khi xử lý tiếp.</p>}
    {completed && <div className="sales-completed" role="status"><CheckCircle2 size={25} /><div><strong>{freeOrder ? "Đơn hàng đã hoàn tất" : "Thanh toán thành công"}</strong><p>{freeOrder ? "Đơn được thanh toán toàn bộ bằng khuyến mãi; hàng đã xuất kho." : "Đã ghi nhận tiền và xuất kho cho đơn hàng này."}</p></div></div>}
    <div className="sales-detail">
      <section className="purchase-panel">
        <div className="sales-section-title"><h3>Sản phẩm trong đơn</h3><small>{order.orderItems.reduce((sum, l) => sum + l.quantity, 0)} sản phẩm</small></div>
        <div className="purchase-table"><table><thead><tr><th>Sản phẩm / SKU</th><th>Lô / Hạn dùng</th><th>SL</th><th>Đơn giá</th><th>Tạm tính</th><th>Giảm giá</th></tr></thead><tbody>{order.orderItems.map(l => <tr key={l.id}><td><strong>{l.variant?.template.name || "Sản phẩm"}</strong><small>{l.variant?.sku || l.variantId}</small></td><td>{l.lotItem ? <>{l.lotItem.lot.lotNumber}<small>{date(l.lotItem.expirationDate)}</small></> : "—"}</td><td>{l.quantity}</td><td>{money(l.unitPrice)}</td><td>{money(l.subtotal)}</td><td>{Number(l.discountAmount) > 0 ? `−${money(l.discountAmount)}` : "—"}</td></tr>)}</tbody></table></div>
        <p className="purchase-hint">Sản phẩm theo lô được xuất từ lô còn hạn có hạn dùng gần nhất khi thanh toán.</p>
        {!!order.orderPayments.length && <section className="sales-history"><h3>Lịch sử thanh toán</h3>{order.orderPayments.map(p => <div className="sales-payment-record" key={p.id}><span className="sales-payment-icon">{p.paymentMethod === "CASH" ? <Banknote size={21} /> : p.paymentMethod === "PROMOTION" ? <CheckCircle2 size={21} /> : <CreditCard size={21} />}</span><div><strong>{p.paymentMethod === "CASH" ? "Tiền mặt" : p.paymentMethod === "PROMOTION" ? "Khuyến mãi thanh toán toàn bộ" : "Chuyển khoản"}</strong><small>{date(p.createdAt)}{p.paymentReference ? ` · ${p.paymentReference}` : ""}</small></div><strong>{money(p.amount)}</strong></div>)}</section>}
        {completed && <details className="sales-ledger sales-no-print"><summary>Đối chiếu xuất kho · {order.inventoryLedger.length} bút toán</summary><div className="purchase-table"><table><thead><tr><th>SKU</th><th>Ngày xuất</th><th>Số lượng xuất</th><th>Tồn sau xuất</th></tr></thead><tbody>{order.inventoryLedger.map(l => <tr key={l.id}><td>{order.orderItems.find(i => i.variantId === l.variantId)?.variant?.sku || l.variantId}</td><td>{date(l.createdAt)}</td><td>{l.quantityChanged}</td><td>{l.balanceAfter}</td></tr>)}</tbody></table>{!order.inventoryLedger.length && <Empty>Chưa có bút toán xuất kho.</Empty>}</div></details>}
      </section>
      <aside className="purchase-panel sales-payment">
        <h3>{completed ? "Tổng thanh toán" : "Thanh toán đơn hàng"}</h3>
        <div className="sales-total"><span>Tạm tính</span><strong>{money(order.totalGrossAmount)}</strong></div>
        {Number(order.discountAmount) > 0 && <div className="sales-total"><span>{order.promotionSnapshot?.name || "Khuyến mãi"}</span><strong>−{money(order.discountAmount)}</strong></div>}
        <div className="sales-total"><span>{completed ? "Đã thu" : "Tổng cần thu"}</span><strong>{money(order.totalNetAmount)}</strong></div>
        {writable ? <><ErrorBox error={shift.error} />{shift.loading ? <p className="purchase-hint">Đang kiểm tra ca bán…</p> : !matchingShift && <ErrorBox error="Đơn cần thanh toán trong ca gốc đang mở của người tạo. Kiểm tra lại ca trước khi thu tiền." />}
          <form onSubmit={e => { e.preventDefault(); void action.run(async () => {
            if (!confirmed || !matchingShift || !cashValid) throw new Error("Kiểm tra ca, số tiền khách đưa và xác nhận đã nhận đủ tiền.");
            if (!freeOrder && method === "CASH") validateMoney(received);
            // Only the order total is collected; customer tender/change is a local calculator.
            await salesApi.pay(id, method, order.totalNetAmount, method === "BANK_TRANSFER" ? reference : "");
            refresh();
          }); }}><fieldset disabled={action.busy}>
            {!freeOrder && <><div className="sales-methods">{([["CASH", "Tiền mặt", Banknote], ["BANK_TRANSFER", "Chuyển khoản", CreditCard]] as const).map(([value, label, Icon]) => <button type="button" key={value} aria-pressed={method === value} className={method === value ? "selected" : ""} onClick={() => { setMethod(value); setConfirmed(false); }}><Icon size={21} />{label}</button>)}</div>
            {method === "CASH" ? <><Field label="Tiền khách đưa (đ)"><MoneyInput required value={received} min={order.totalNetAmount} max="9999999999.99" onValueChange={value => { setReceived(value); setConfirmed(false); }} placeholder="Nhập số tiền đã nhận" /></Field><div className="sales-cash-shortcuts"><button type="button" onClick={() => { setReceived(order.totalNetAmount); setConfirmed(false); }}>Đủ tiền</button>{[50000, 100000, 200000, 500000].filter(v => v > Number(order.totalNetAmount)).slice(0, 3).map(v => <button type="button" key={v} onClick={() => { setReceived(String(v)); setConfirmed(false); }}>{money(v)}</button>)}</div><div className="sales-change" aria-live="polite"><span>Tiền trả lại khách</span><strong>{change === null ? "—" : money(change)}</strong></div>{received && change === null && <p className="sales-out">Tiền khách đưa chưa đủ hoặc không hợp lệ.</p>}<p className="purchase-hint">Tiền khách đưa và tiền thừa chỉ hỗ trợ tính tại quầy; hệ thống ghi nhận đúng tổng đơn.</p></> : <><Field label="Mã giao dịch (nếu có)"><input maxLength={100} value={reference} onChange={e => { setReference(e.target.value); setConfirmed(false); }} placeholder="Nhập mã giao dịch ngân hàng" /></Field><p className="purchase-hint">Kiểm tra tiền đã vào tài khoản. Chuyển khoản được xác nhận thủ công tại quầy.</p></>}</>}
            {freeOrder && <p className="purchase-hint">Khuyến mãi thanh toán toàn bộ đơn hàng. Không cần thu tiền.</p>}
            <label className="sales-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>{freeOrder ? "Tôi xác nhận hoàn tất đơn được giảm 100%." : <>Tôi đã kiểm tra và nhận đủ <strong>{money(order.totalNetAmount)}</strong> từ khách.</>}</span></label>
            <button className="purchase-primary sales-full" disabled={!confirmed || !matchingShift || !cashValid}>{action.busy ? "Đang xử lý…" : freeOrder ? "Xác nhận đơn miễn phí" : "Xác nhận thanh toán"}</button><p className="purchase-hint">Xác nhận sẽ hoàn tất đơn và trừ kho.</p>
            <button className="purchase-danger sales-full" type="button" onClick={() => setCancel(true)}>Hủy đơn nháp</button>
          </fieldset></form>
          {cancel && <div className="purchase-confirm" role="region" aria-label="Xác nhận hủy đơn"><p>Hủy đơn {order.orderCode}? Đơn chưa thanh toán sẽ không trừ kho.</p><div className="purchase-actions"><button disabled={action.busy} onClick={() => setCancel(false)}>Quay lại</button><button className="purchase-danger" disabled={action.busy} onClick={() => void action.run(async () => { await salesApi.cancel(id); setCancel(false); refresh(); })}>Xác nhận hủy</button></div></div>}
        </> : <p className="purchase-hint">{order.status === "DRAFT" ? "Chỉ người tạo đơn có quyền bán hàng mới được thanh toán hoặc hủy đơn nháp." : completed ? "Đơn đã hoàn tất và ghi nhận đủ tiền." : "Đơn đã hủy, không phát sinh thu tiền hoặc xuất kho."}</p>}
      </aside>
    </div>
  </div>;
}
