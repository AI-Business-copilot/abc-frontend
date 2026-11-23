import { useState } from "react";
import { ErrorBox } from "@/pages/purchases/shared";
import { readReceiptPreferences, saveReceiptPreferences, type ReceiptPreferences } from "./receipt-preferences";

export function ReceiptSettings() {
  const [settings, setSettings] = useState(readReceiptPreferences);
  const [error, setError] = useState("");
  const update = (value: ReceiptPreferences) => {
    try { saveReceiptPreferences(value); setSettings(value); setError(""); }
    catch { setError("Không thể lưu cấu hình in trong trình duyệt. Kiểm tra quyền lưu dữ liệu của trang."); }
  };
  return <section className="sales-printer-settings sales-no-print" aria-label="Cài đặt in hóa đơn">
    <label><input type="checkbox" checked={settings.automatic} onChange={e => update({ ...settings, automatic: e.target.checked })} /> Tự in bill sau thanh toán</label>
    <label>Khổ giấy <select aria-label="Khổ giấy hóa đơn" value={settings.width} onChange={e => update({ ...settings, width: e.target.value === "58" ? "58" : "80" })}><option value="80">80 mm</option><option value="58">58 mm</option></select></label>
    <p>Mở bằng trình khởi chạy “ABC Quầy thu ngân” để in thẳng tới Epson. Chrome thông thường vẫn hỏi chọn máy in. Cấu hình được lưu trên trình duyệt này.</p>
    <ErrorBox error={error} />
  </section>;
}
