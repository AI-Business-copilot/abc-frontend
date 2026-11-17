import { Check, ShoppingBag, ListChecks, Users, CreditCard } from "lucide-react";

const steps = [
  { label: "Chọn sản phẩm", description: "Thêm hàng vào giỏ", Icon: ShoppingBag },
  { label: "Số lượng", description: "Kiểm tra sản phẩm", Icon: ListChecks },
  { label: "Khách hàng", description: "Thông tin người mua", Icon: Users },
  { label: "Thanh toán", description: "Xác nhận và hoàn tất", Icon: CreditCard },
];

export function SaleCheckoutSteps({ step, onBack, busy = false }: { step: number; onBack: (step: number) => void; busy?: boolean }) {
  return <nav className="sales-checkout-steps" aria-label="Các bước bán hàng"><ol>{steps.map(({ label, description, Icon }, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-complete" : ""} aria-current={index === step ? "step" : undefined}>
    <button type="button" disabled={busy || index >= step} onClick={() => onBack(index)}><span className="sales-step-number">{index < step ? <Check size={18} /> : <Icon size={18} />}</span><span><strong>{index + 1}. {label}</strong><small>{description}</small></span></button>
  </li>)}</ol></nav>;
}
