export function dayOffset(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function posMoney(value: string) {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(value);
  if (!match) throw new Error("Giá trị tiền không hợp lệ trong phân tích POS.");
  const fraction = match[3].replace(/0+$/, "");
  const whole = new Intl.NumberFormat("vi-VN").format(BigInt(match[2]));
  return `${match[1]}${whole}${fraction ? `,${fraction}` : ""} ₫`;
}
