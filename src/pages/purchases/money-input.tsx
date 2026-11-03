import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { formatMoneyInput, moneyInputError, parseMoneyInput } from "./purchase-input";

type Props = Omit<ComponentProps<"input">, "type" | "value" | "onChange" | "min" | "max" | "step"> & {
  value: string; onValueChange: (value: string) => void; min?: string; max?: string | number;
};

export function MoneyInput({ value, onValueChange, min = "0", max, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const element = input.current!;
    element.setCustomValidity(moneyInputError(value, min, max));
    if (caret.current !== null && document.activeElement === element) {
      let position = 0; let count = 0;
      while (position < element.value.length && count < caret.current) {
        if (element.value[position] !== ".") count++;
        position++;
      }
      element.setSelectionRange(position, position);
      caret.current = null;
    }
  });
  return <input {...props} ref={input} type="text" inputMode="decimal" value={formatMoneyInput(value)} onChange={(event) => {
    const raw = event.target.value;
    const parsed = parseMoneyInput(raw);
    if (parsed === undefined) return;
    const offset = event.target.selectionStart ?? raw.length;
    const significant = raw.slice(0, offset).replace(/\./g, "").length;
    const removedZeros = raw.replace(/\./g, "").length - formatMoneyInput(parsed).replace(/\./g, "").length;
    caret.current = Math.max(0, significant - Math.max(0, removedZeros));
    event.target.setCustomValidity(moneyInputError(parsed, min, max));
    onValueChange(parsed);
  }} />;
}
