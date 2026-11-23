import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Banknote, CheckCircle2, CreditCard, LockKeyhole, Minus, Plus, ShoppingBag, Trash2, UserRound, UserRoundPlus, Users } from "lucide-react";
import { salesApi, type Customer, type SaleVariant } from "@/api/sales";
import { MoneyInput } from "@/pages/purchases/money-input";
import { PurchaseForm } from "@/pages/purchases/purchase-form";
import { Empty, ErrorBox, Field, money, total, useAction, useLoad, validateMoney, validateQty } from "@/pages/purchases/shared";
import { cashChange } from "./sale-money";
import { submitSaleCheckout } from "./sale-checkout-submit";

export type CartLine = { variant: SaleVariant; qty: string };
type PromotionPreview = Awaited<ReturnType<typeof salesApi.promotionPreview>>;

export function SaleCheckout({ step, setStep, lines, setLines, orderCode, shiftId, shiftReady, preview, previewLoading, previewError, reloadPreview, onBusyChange }: {
  step: number; setStep: (step: number) => void; lines: CartLine[]; setLines: Dispatch<SetStateAction<CartLine[]>>;
  orderCode: string; shiftId?: string; shiftReady: boolean; preview: PromotionPreview | null | undefined; previewLoading: boolean; previewError: string; reloadPreview: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const navigate = useNavigate();
  const action = useAction();
  useEffect(() => { onBusyChange(action.busy); }, [action.busy, onBusyChange]);
  const heading = useRef<HTMLHeadingElement>(null);
  const [customerMode, setCustomerMode] = useState<"guest" | "existing" | "new">("guest");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [received, setReceived] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const customers = useLoad(() => step === 2 && customerMode === "existing" ? salesApi.customers({ search: term, pageSize: 50 }) : Promise.resolve({ items: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }), [term, step === 2, customerMode]);
  const gross = total(lines.map(l => ({ qty: l.qty, price: String(l.variant.basePrice) })));
  const due = preview?.totalNetAmount ?? gross;
  const freeOrder = Number(due) === 0;
  const change = cashChange(received, due);
  const invalidQty = !lines.length || lines.some(l => !/^\d+$/.test(l.qty) || Number(l.qty) < 1 || Number(l.qty) > Math.min(l.variant.onHand, 2147483647));
  const activeCustomer = customerMode === "guest" ? null : customer;
  const previewReady = !previewLoading && !previewError && !!preview;
  const cashValid = freeOrder || method !== "CASH" || change !== null;
  useEffect(() => { setConfirmed(false); heading.current?.focus(); action.setError(""); }, [step]);
  useEffect(() => { setConfirmed(false); }, [due, previewLoading, shiftReady]);
  if (step === 0) return null;
  const changeQty = (id: string, qty: string) => setLines(current => current.map(l => l.variant.id === id ? { ...l, qty } : l));
  const back = () => { if (!action.busy) setStep(step - 1); };
  const titles = ["", "Kiểm tra sản phẩm & số lượng", "Thông tin khách hàng", "Phương thức thanh toán"];
  const descriptions = ["", "Điều chỉnh số lượng và kiểm tra đơn hàng trước khi tiếp tục.", "Chọn khách hàng đã lưu, thêm hồ sơ mới hoặc bán cho khách vãng lai.", "Kiểm tra số tiền, chọn cách thu tiền và xác nhận hoàn tất đơn hàng."];

  return <div className="sales-checkout-layout">
    <PurchaseForm className="purchase-panel sales-checkout-main" onSubmit={e => {
      e.preventDefault();
      void action.run(async () => {
        if (invalidQty) throw new Error("Kiểm tra số lượng: nhập số nguyên dương và không vượt tồn kho.");
        if (step === 1) { setStep(2); return; }
        if (step === 2) {
          if (customerMode === "new") {
            if (!name.trim() || !phone.trim()) throw new Error("Nhập tên và số điện thoại khách hàng.");
            const saved = await salesApi.createCustomer(name, phone);
            setCustomer(saved); setCustomerMode("existing");
          } else if (customerMode === "existing" && !customer) throw new Error("Vui lòng chọn khách hàng hoặc chuyển sang khách vãng lai.");
          setStep(3); return;
        }
        if (!shiftReady || !shiftId) throw new Error("Ca bán chưa sẵn sàng. Kiểm tra và mở ca trước khi thanh toán.");
        if (!previewReady || !confirmed || !cashValid) throw new Error("Kiểm tra tổng tiền và xác nhận đã nhận đủ tiền trước khi tiếp tục.");
        validateMoney(due);
        if (!freeOrder && method === "CASH") validateMoney(received);
        const result = await submitSaleCheckout(salesApi, {
          orderCode, shiftId, ...(activeCustomer ? { customerId: activeCustomer.id } : {}),
          items: lines.map(l => ({ variantId: l.variant.id, quantity: validateQty(l.qty) })),
        }, { method, expectedAmount: due, reference: method === "BANK_TRANSFER" ? reference : "" });
        navigate(`/sales/${result.id}`, { replace: true, state: { checkoutNotice: result.notice, autoPrintReceipt: !result.notice } });
      });
    }}>
      <fieldset disabled={action.busy}>
        <div className="sales-checkout-heading"><span className="sales-checkout-eyebrow">BƯỚC {step + 1} / 4</span><h2 ref={heading} tabIndex={-1}>{titles[step]}</h2><p>{descriptions[step]}</p></div>
        <ErrorBox error={action.error} />
        {action.error && step === 3 && <p className="purchase-hint">Nếu lỗi xảy ra khi tạo đơn, hãy <a href={`/sales?search=${encodeURIComponent(orderCode)}`}>tra cứu mã {orderCode}</a> trước khi gửi lại.</p>}
        {step === 1 && <>
          {!lines.length ? <Empty>Giỏ hàng trống. Quay lại để chọn sản phẩm.</Empty> : <div className="sales-review-lines">{lines.map(l => <div className="sales-review-line" key={l.variant.id}>
            <span className="sales-review-art">{l.variant.imageUrl ? <img src={l.variant.imageUrl} alt="" /> : <ShoppingBag size={25} />}</span>
            <div className="sales-review-product"><strong>{l.variant.productName}</strong><small>{l.variant.sku} · {l.variant.unit}</small><span>{money(l.variant.basePrice)}</span><small className="sales-stock">Tồn hiện tại: {l.variant.onHand}</small></div>
            <div className="sales-quantity"><button type="button" aria-label={`Giảm ${l.variant.sku}`} disabled={Number(l.qty) <= 1} onClick={() => changeQty(l.variant.id, String(Number(l.qty) - 1))}><Minus size={14} /></button><input required aria-label={`Số lượng ${l.variant.sku}`} type="number" min="1" max={Math.min(l.variant.onHand, 2147483647)} step="1" value={l.qty} onChange={e => changeQty(l.variant.id, e.target.value)} /><button type="button" aria-label={`Tăng ${l.variant.sku}`} disabled={Number(l.qty) >= l.variant.onHand} onClick={() => changeQty(l.variant.id, String((Number(l.qty) || 0) + 1))}><Plus size={14} /></button></div>
            <div className="sales-review-end"><strong>{money(total([{ qty: l.qty, price: String(l.variant.basePrice) }]))}</strong><button type="button" aria-label={`Xóa ${l.variant.sku}`} onClick={() => setLines(current => current.filter(row => row.variant.id !== l.variant.id))}><Trash2 size={16} /></button></div>
          </div>)}</div>}
          {invalidQty && <ErrorBox error="Chọn ít nhất một sản phẩm. Số lượng phải là số nguyên dương và không vượt tồn hiển thị." />}
          <div className="sales-checkout-info"><CheckCircle2 size={18} /><p>Giá và khuyến mãi được tính lại theo số lượng. Tồn bán được sẽ được kiểm tra khi hoàn tất đơn.</p></div>
        </>}
        {step === 2 && <>
          <div className="sales-customer-modes">{([
            ["guest", "Khách vãng lai", "Không lưu hồ sơ", UserRound],
            ["existing", "Khách đã có", "Tìm trong danh sách", Users],
            ["new", "Khách mới", "Lưu thông tin liên hệ", UserRoundPlus],
          ] as const).map(([value, label, hint, Icon]) => <button type="button" key={value} aria-pressed={customerMode === value} className={customerMode === value ? "selected" : ""} onClick={() => { setCustomerMode(value); action.setError(""); }}><Icon size={22} /><strong>{label}</strong><small>{hint}</small></button>)}</div>
          {customerMode === "guest" && <div className="sales-customer-guest"><UserRound size={36} /><h3>Bán cho khách vãng lai</h3><p>Bạn có thể tiếp tục thanh toán mà không cần nhập thông tin khách hàng.</p></div>}
          {customerMode === "existing" && <div className="sales-customer-fields"><Field label="Tìm khách hàng"><input maxLength={255} placeholder="Nhập tên hoặc số điện thoại…" value={search} onChange={e => setSearch(e.target.value)} /></Field><ErrorBox error={customers.error} />{customers.error && <button type="button" onClick={customers.reload}>Tải lại khách hàng</button>}
            <Field label="Khách hàng của đơn *"><select required value={customer?.id ?? ""} onChange={e => setCustomer(customers.data?.items.find(c => c.id === e.target.value) ?? null)}><option value="">{customers.loading ? "Đang tìm khách hàng…" : "Chọn khách hàng"}</option>{customer && !customers.data?.items.some(c => c.id === customer.id) && <option value={customer.id}>{customer.name} · {customer.phone}</option>}{customers.data?.items.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></Field>
            {customer && <div className="sales-selected-customer"><CheckCircle2 size={20} /><div><strong>{customer.name}</strong><small>{customer.phone}</small></div></div>}
            {!customers.loading && !customers.error && !customers.data?.items.length && <p className="purchase-hint">Không tìm thấy khách hàng. Chọn “Khách mới” để thêm hồ sơ.</p>}
          </div>}
          {customerMode === "new" && <div className="sales-customer-fields"><div className="sales-checkout-field-grid"><Field label="Tên khách hàng *"><input required maxLength={150} value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Nhập họ và tên" /></Field><Field label="Số điện thoại *"><input required type="tel" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" placeholder="Nhập số điện thoại" /></Field></div><p className="purchase-hint">Hồ sơ khách hàng sẽ được lưu khi bạn bấm “Lưu khách & tiếp tục”.</p></div>}
        </>}
        {step === 3 && <>
          <div className="sales-payment-due"><span>Tổng tiền cần thu</span><strong>{money(due)}</strong><small>{activeCustomer ? `${activeCustomer.name} · ${activeCustomer.phone}` : "Khách vãng lai"}</small></div>
          {!freeOrder ? <>
            <div className="sales-methods sales-checkout-methods">{([["CASH", "Tiền mặt", "Nhận tiền tại quầy", Banknote], ["BANK_TRANSFER", "Chuyển khoản", "Xác nhận tiền vào tài khoản", CreditCard]] as const).map(([value, label, hint, Icon]) => <button type="button" key={value} aria-pressed={method === value} className={method === value ? "selected" : ""} onClick={() => { setMethod(value); setConfirmed(false); }}><Icon size={25} /><strong>{label}</strong><small>{hint}</small></button>)}</div>
            {method === "CASH" ? <><Field label="Tiền khách đưa (đ) *"><MoneyInput required value={received} min={due} max="9999999999.99" onValueChange={value => { setReceived(value); setConfirmed(false); }} placeholder="Nhập số tiền đã nhận" /></Field><div className="sales-cash-shortcuts"><button type="button" onClick={() => { setReceived(due); setConfirmed(false); }}>Đủ tiền</button>{[50000, 100000, 200000, 500000].filter(v => v > Number(due)).slice(0, 3).map(v => <button type="button" key={v} onClick={() => { setReceived(String(v)); setConfirmed(false); }}>{money(v)}</button>)}</div><div className="sales-change" aria-live="polite"><span>Tiền trả lại khách</span><strong>{change === null ? "—" : money(change)}</strong></div>{received && change === null && <p className="sales-out">Tiền khách đưa chưa đủ hoặc không hợp lệ.</p>}</> : <><Field label="Mã giao dịch (nếu có)"><input maxLength={100} value={reference} onChange={e => { setReference(e.target.value); setConfirmed(false); }} placeholder="Nhập mã giao dịch ngân hàng" /></Field><p className="purchase-hint">Kiểm tra tiền đã vào tài khoản trước khi xác nhận. Hệ thống ghi nhận chuyển khoản thủ công tại quầy.</p></>}
          </> : <div className="sales-checkout-info"><CheckCircle2 size={20} /><p>Khuyến mãi thanh toán toàn bộ đơn hàng. Không cần thu tiền.</p></div>}
          {!shiftReady && <ErrorBox error="Ca bán chưa sẵn sàng. Kiểm tra lại ca trước khi thanh toán." />}
          <label className="sales-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>{freeOrder ? "Tôi xác nhận hoàn tất đơn được giảm 100%." : <>Tôi đã kiểm tra và nhận đủ <strong>{money(due)}</strong> từ khách.</>}</span></label>
        </>}
        <div className="sales-checkout-actions"><button type="button" onClick={back}><ArrowLeft size={16} />{step === 1 ? "Chọn thêm sản phẩm" : "Quay lại"}</button><button type="submit" className="purchase-primary" disabled={invalidQty || (step === 3 && (!confirmed || !cashValid || !shiftReady || !previewReady))}>{action.busy ? "Đang xử lý…" : step === 1 ? <>Thông tin khách hàng <ArrowRight size={16} /></> : step === 2 ? <>{customerMode === "new" ? "Lưu khách & tiếp tục" : "Chọn thanh toán"}<ArrowRight size={16} /></> : <><CheckCircle2 size={17} />{freeOrder ? "Hoàn tất đơn miễn phí" : "Xác nhận thanh toán"}</>}</button></div>
      </fieldset>
    </PurchaseForm>
    <aside className="purchase-panel sales-checkout-summary"><div className="sales-section-title"><div><h3>Tóm tắt đơn hàng</h3><p>{lines.length} SKU · {lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0)} sản phẩm</p></div><ShoppingBag size={21} /></div><div className="sales-order-code"><LockKeyhole size={13} /><span>{orderCode}</span><small>Tự động</small></div>
      <div className="sales-summary-products">{lines.map(l => <div key={l.variant.id}><div><strong>{l.variant.productName}</strong><small>{l.qty || "0"} × {money(l.variant.basePrice)}</small></div><span>{money(total([{ qty: l.qty, price: String(l.variant.basePrice) }]))}</span></div>)}</div>
      <div className="sales-summary-totals"><div><span>Tạm tính</span><strong>{money(preview?.totalGrossAmount ?? gross)}</strong></div>{preview && Number(preview.discountAmount) > 0 && <div className="sales-summary-discount"><span>{preview.promotion?.name || "Khuyến mãi"}</span><strong>−{money(preview.discountAmount)}</strong></div>}<div className="sales-summary-grand"><span>Tổng cần thu</span><strong>{money(due)}</strong></div></div>
      {previewLoading && <p className="purchase-hint" role="status">Đang tính khuyến mãi…</p>}<ErrorBox error={previewError} />{previewError && <button type="button" disabled={action.busy} onClick={reloadPreview}>Tính lại khuyến mãi</button>}
      {step === 3 && <div className="sales-summary-customer"><Users size={17} /><div><strong>{activeCustomer?.name || "Khách vãng lai"}</strong><small>{activeCustomer?.phone || "Không lưu thông tin liên hệ"}</small></div></div>}
      <p className="purchase-hint">Đơn hàng chỉ được hoàn tất và trừ kho sau khi xác nhận thanh toán.</p>
    </aside>
  </div>;
}
