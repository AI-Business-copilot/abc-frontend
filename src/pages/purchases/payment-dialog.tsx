import { PurchaseForm } from "./purchase-form";
import { MoneyInput } from "./money-input";
import { useState } from "react";
import { purchasesApi, type ReceiptDetail } from "@/api/purchases";
import { PurchaseDialog } from "./purchase-dialog";
import { ShiftPanel } from "./receive-form";
import { paymentTotal } from "./purchase-input";
import { Empty, ErrorBox, Field, Heading, money, useAction, useLoad } from "./shared";

export function PaymentDialog({ receiptId, onClose, onSaved }: { receiptId: string; onClose: () => void; onSaved: () => void }) {
  const result = useLoad(() => purchasesApi.receipt(receiptId), [receiptId]);
  const action = useAction();
  return <PurchaseDialog compact title="Thanh toán nhà cung cấp" busy={action.busy} onClose={onClose}>
    {result.loading ? <Empty>Đang tải phiếu nhận...</Empty> : result.error ? <><ErrorBox error={result.error} /><button onClick={result.reload}>Thử lại</button></> : result.data?.status === "RECEIVED" ? <PaymentForm receipt={result.data} action={action} onSaved={onSaved} /> : <ErrorBox error="Phiếu này không thể thanh toán." />}
  </PurchaseDialog>;
}

function PaymentForm({ receipt, onSaved, action }: { receipt: ReceiptDetail; onSaved: () => void; action: ReturnType<typeof useAction> }) {
  const [amount, setAmount] = useState(""); const [review, setReview] = useState<string | null>(null);
  const settled = Number(receipt.debtAmount) <= 0;
  return <section className="purchase-panel purchase-payment-panel"><Heading title={settled ? "Đã thanh toán đủ" : "Thanh toán nhà cung cấp"} description={settled ? "Phiếu nhận này không còn khoản phải trả." : `Thanh toán cho ${receipt.supplier.name} · Phiếu ${receipt.receiptCode}. Có thể trả một phần hoặc toàn bộ số còn nợ.`} />
    {!settled && <><div className="purchase-payment-balance"><span>Còn phải trả</span><strong>{money(receipt.debtAmount)}</strong></div><ErrorBox error={action.error} />
    <PurchaseForm onSubmit={(event) => { event.preventDefault(); void action.run(async () => { setReview(paymentTotal(receipt.paidAmount, amount, receipt.totalAmount)); }); }}><fieldset disabled={action.busy || review !== null}><div className="purchase-filters"><Field label="Số tiền trả lần này (đ)"><MoneyInput required min="0.01" max={receipt.debtAmount} placeholder="Nhập số tiền muốn trả" value={amount} onValueChange={(value) => setAmount(value)} /></Field><button type="button" onClick={() => setAmount(receipt.debtAmount)}>Trả hết {money(receipt.debtAmount)}</button><button className="purchase-primary" type="submit" disabled={Number(amount) <= 0}>Tiếp tục thanh toán</button></div></fieldset></PurchaseForm>
    {review && <div className="purchase-confirm"><h3>Kiểm tra khoản thanh toán</h3><p>Trả <strong>{money(amount)}</strong> cho {receipt.supplier.name}. Sau lần này còn nợ <strong>{money(Math.max(0, Number(receipt.totalAmount) - Number(review)))}</strong>.</p><ShiftPanel /><div className="purchase-actions"><button disabled={action.busy} onClick={() => setReview(null)}>Sửa số tiền</button><button className="purchase-primary" disabled={action.busy} onClick={() => void action.run(async () => { await purchasesApi.pay(receipt.id, review); onSaved(); })}>{action.busy ? "Đang thanh toán…" : `Xác nhận trả ${money(amount)}`}</button></div></div>}</>}
  </section>;
}

