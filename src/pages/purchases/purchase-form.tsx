import { useId, useState, type ComponentProps } from "react";
import { AlertCircle } from "lucide-react";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function validationMessage(control: Control) {
  const label = control.getAttribute("aria-label") || control.closest("label")?.querySelector("span")?.textContent?.replace(/\s*\*$/, "") || "Thông tin";
  const validity = control.validity;
  if (validity.customError) return `${label}: ${control.validationMessage}`;
  if (validity.badInput) return `${label}: vui lòng nhập số hợp lệ.`;
  if (validity.valueMissing) return `${label}: vui lòng nhập hoặc chọn thông tin này.`;
  if (control instanceof HTMLInputElement) {
    if (validity.rangeOverflow) return `${label}: không được vượt quá ${control.max}.`;
    if (validity.rangeUnderflow) return `${label}: phải từ ${control.min} trở lên.`;
    if (validity.stepMismatch) return `${label}: ${control.step === "1" ? "vui lòng nhập số nguyên" : "giá trị không đúng bước cho phép"}.`;
  }
  return `${label}: thông tin chưa hợp lệ, vui lòng kiểm tra lại.`;
}

// Keep HTML constraints while presenting errors in the same language and style as the form.
export function PurchaseForm({ onSubmit, children, ...props }: ComponentProps<"form">) {
  const errorId = useId();
  const [errors, setErrors] = useState<{ control: Control; message: string }[]>([]);
  const submit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    const controls = Array.from(event.currentTarget.elements).filter((element): element is Control => element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement);
    const invalid = controls.filter((control) => control.willValidate && !control.validity.valid);
    for (const control of controls) {
      if (invalid.includes(control)) {
        control.setAttribute("aria-invalid", "true");
        control.setAttribute("aria-errormessage", errorId);
      } else {
        control.removeAttribute("aria-invalid");
        control.removeAttribute("aria-errormessage");
      }
    }
    setErrors(invalid.map((control) => ({ control, message: validationMessage(control) })));
    if (invalid.length) {
      event.preventDefault();
      invalid[0].focus();
      return;
    }
    onSubmit?.(event);
  };
  return <form {...props} noValidate onSubmit={submit} onInputCapture={() => {
    setErrors((current) => current.filter(({ control }) => {
      if (control.isConnected && !control.validity.valid) return true;
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-errormessage");
      return false;
    }).map(({ control }) => ({ control, message: validationMessage(control) })));
  }}>
    {!!errors.length && <div id={errorId} className="purchase-validation" role="alert"><AlertCircle size={20} aria-hidden="true" /><div><strong>Vui lòng kiểm tra thông tin trước khi tiếp tục</strong><ul>{errors.map(({ control, message }, index) => <li key={index}><button type="button" onClick={() => control.focus()}>{message}</button></li>)}</ul></div></div>}
    {children}
  </form>;
}
