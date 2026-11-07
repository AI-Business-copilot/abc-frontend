// Work in cents so decimal amounts from the API retain their exact value.
export function cashChange(received: string, due: string): string | null {
  const cents = (value: string) => {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  };
  const paid = cents(received), amount = cents(due);
  if (paid === null || amount === null || paid < amount) return null;
  const difference = paid - amount;
  return `${difference / 100n}.${String(difference % 100n).padStart(2, "0")}`;
}
