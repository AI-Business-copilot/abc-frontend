import type { ReceiptWidth } from "./sale-receipt";

const key = "abc.receipt-preferences.v1";
export type ReceiptPreferences = { automatic: boolean; width: ReceiptWidth };
export function readReceiptPreferences(): ReceiptPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return { automatic: value?.automatic === true, width: value?.width === "58" ? "58" : "80" };
  } catch { return { automatic: false, width: "80" }; }
}
export function saveReceiptPreferences(value: ReceiptPreferences) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Record before submitting: reloading, React StrictMode and history navigation must not print twice.
// A failed/uncertain request requires an explicit reprint, never an automatic retry.
export function claimAutomaticReceipt(scope: string, orderId: string) {
  const key = `abc.receipt-request.v1:${scope}:${orderId}`;
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, "requested");
  return true;
}
