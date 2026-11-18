import { MoneyInput } from "./money-input";
import { PurchaseForm } from "./purchase-form";
import { PurchaseDialog } from "./purchase-dialog";
import { useEffect, useState, type FormEvent } from "react";
import { purchasesApi, type Draft, type Order } from "@/api/purchases";
import { code, ErrorBox, Field, Heading, money, total, useAction, useLoad, validateMoney } from "./shared";
import { buildReceiptPayload, type CountLine } from "./purchase-input";

export function ShiftPanel() {
  const shift = useLoad(purchasesApi.shift, []); const action = useAction(); const [opening, setOpening] = useState("0");
  return <div className="purchase-shift"><div><strong>Ca thanh toán</strong><p>{shift.loading ? "Đang kiểm tra ca…" : shift.data ? "Ca của bạn đang mở · Có thể ghi khoản chi NCC." : "Chưa có ca mở. Mở ca trước khi ghi khoản thanh toán lớn hơn 0."}</p></div><ErrorBox error={shift.error || action.error} />
    {!shift.loading && !shift.data && <PurchaseForm onSubmit={(event) => { event.preventDefault(); void action.run(async () => { await purchasesApi.openShift(validateMoney(opening)); shift.reload(); }); }}><fieldset disabled={action.busy}><Field label="Tiền đầu ca (đ)"><MoneyInput required min="0" max="9999999999.99" value={opening} onValueChange={(value) => setOpening(value)} /></Field><button type="submit">{action.busy ? "Đang mở…" : "Mở / lấy ca hiện có"}</button></fieldset></PurchaseForm>}
    <button type="button" disabled={shift.loading || action.busy} onClick={shift.reload}>Kiểm tra lại ca</button>
  </div>;
}

export function ReceiveForm({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved: (id: string) => void }) {
  const action = useAction();
  const [receiptCode, setCode] = useState(() => code("PR")); const [paid, setPaid] = useState("0"); const [draft, setDraft] = useState<Draft | null>(null); const [now, setNow] = useState(Date.now());
  const [lines, setLines] = useState<CountLine[]>(() => order.purchaseOrderItems.filter((item) => item.remainingQty > 0).map((item) => ({ key: crypto.randomUUID(), poItemId: item.id, qty: "0", price: item.unitPrice, lot: "", expiration: "", manufacturing: "" })));
  useEffect(() => { if (!draft) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [draft]);
  const expired = draft ? now >= new Date(draft.expiresAt).getTime() : false;
  const sum = total(lines); const change = (key: string, patch: Partial<CountLine>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void action.run(async () => { const body = buildReceiptPayload(order, receiptCode, paid, lines); const preview = await purchasesApi.preview(order.id, body); setNow(Date.now()); setDraft(preview); });
  };
  return <PurchaseDialog title="Kiểm đếm & nhận hàng" description={`${order.poCode} · ${order.supplier.name}`} busy={action.busy} onClose={onClose}><section className="purchase-panel"><Heading title="Nhận hàng từ nhà cung cấp" description="Nhập số lượng và giá thực nhận. Để số lượng 0 cho hàng chưa giao. Bạn có thể nhận hàng nhiều đợt." /><p className="purchase-hint">Chưa trả tiền? Giữ số tiền trả ngay là 0. Sau khi nhận hàng, bạn có thể mở phiếu để thanh toán bất cứ lúc nào.</p>{Number(paid) > 0 && <ShiftPanel />}
    <ErrorBox error={action.error} />{action.error && <p className="purchase-hint">Nếu mất kết nối lúc xác nhận, tra cứu mã phiếu {receiptCode} trong danh sách phiếu nhận trước khi thử lại.</p>}
    <PurchaseForm onSubmit={submit}><fieldset disabled={action.busy || !!draft}><div className="purchase-grid"><Field label="Mã phiếu nhận *"><input required maxLength={50} value={receiptCode} onChange={(e) => setCode(e.target.value)} /></Field><Field label="Trả ngay NCC (đ)"><MoneyInput required min="0" max={sum} value={paid} onValueChange={(value) => setPaid(value)} /></Field></div>
      <div className="purchase-counts">{lines.map((line) => { const item = order.purchaseOrderItems.find((item) => item.id === line.poItemId)!; return <div className="purchase-count" key={line.key}><div className="purchase-heading"><div><strong>{item.variant.sku} · {item.variant.template.name}</strong><p>Còn thiếu: {item.remainingQty} {item.variant.template.unitOfMeasure || ""}</p></div><button type="button" onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}>Bỏ dòng</button></div><div className="purchase-grid"><Field label="Số lượng thực nhận"><input required aria-label={`Thực nhận ${item.variant.sku}`} type="number" min="0" max={item.remainingQty} step="1" value={line.qty} onChange={(e) => change(line.key, { qty: e.target.value })} /></Field><Field label="Giá nhận thực tế (đ)"><MoneyInput required min="0" max="9999999999.99" value={line.price} onValueChange={(value) => change(line.key, { price: value })} /></Field>{item.variant.template.hasLotTracking && <><Field label="Số lô"><input required={Number(line.qty) > 0} maxLength={100} value={line.lot} onChange={(e) => change(line.key, { lot: e.target.value })} /></Field><Field label="Hạn sử dụng"><input required={Number(line.qty) > 0} type="date" value={line.expiration} onChange={(e) => change(line.key, { expiration: e.target.value })} /></Field><Field label="Ngày sản xuất"><input type="date" max={line.expiration || undefined} value={line.manufacturing} onChange={(e) => change(line.key, { manufacturing: e.target.value })} /></Field></>}</div></div>; })}</div>
      <div className="purchase-actions">{order.purchaseOrderItems.filter((item) => item.remainingQty > 0).map((item) => <button type="button" key={item.id} onClick={() => setLines((current) => [...current, { key: crypto.randomUUID(), poItemId: item.id, qty: "0", price: item.unitPrice, lot: "", expiration: "", manufacturing: "" }])}>+ Dòng {item.variant.sku}</button>)}</div>
      <div className="purchase-summary"><span>Tiền hàng thực nhận</span><strong>{money(sum)}</strong><span>Còn nợ sau khi nhận: {money(Math.max(0, Number(sum) - Number(paid)))}</span></div><div className="purchase-actions"><button className="purchase-primary" type="submit">Tiếp tục: kiểm tra phiếu nhận</button></div><p className="purchase-hint">Bạn sẽ kiểm tra lại hàng và số tiền trước khi xác nhận nhập kho.</p>
    </fieldset></PurchaseForm>
    {draft && <div className="purchase-confirm"><h3>Xác nhận phiếu {draft.receipt.receiptCode}</h3><p>{draft.receipt.items.length} dòng · Tiền hàng {money(draft.totalAmount)} · Trả ngay {money(draft.receipt.paidAmount)} · Còn nợ {money(draft.debtAmount)}</p><p>{expired ? "Bản kiểm đếm đã hết hạn. Quay lại để kiểm tra lại." : `Còn ${Math.ceil((new Date(draft.expiresAt).getTime() - now) / 60000)} phút để xác nhận.`}</p><div className="purchase-actions"><button disabled={action.busy} onClick={() => setDraft(null)}>Quay lại kiểm đếm</button><button disabled={action.busy || expired} className="purchase-primary" onClick={() => void action.run(async () => { const saved = await purchasesApi.confirm(order.id, draft.draftToken); onSaved(saved.id); })}>{action.busy ? "Đang ghi nhận…" : "Xác nhận nhập kho & thanh toán"}</button></div></div>}
  </section></PurchaseDialog>;
}
