import type { SaleDetail } from "@/api/sales";

export type ReceiptWidth = "80" | "58";

const money = (value: string) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(Number(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));

// Populate a separate document so navigation, payment controls and other print styles cannot leak into the bill.
export function renderSaleReceipt(doc: Document, order: SaleDetail, width: ReceiptWidth) {
  if (order.status !== "COMPLETED") throw new Error("Chỉ in hóa đơn của đơn đã thanh toán.");
  doc.documentElement.lang = "vi";
  doc.title = `Hóa đơn ${order.orderCode}`;
  doc.head.replaceChildren();
  doc.body.replaceChildren();
  const meta = doc.createElement("meta");
  meta.setAttribute("charset", "utf-8");
  const style = doc.createElement("style");
  style.textContent = `
    @page { size: auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #000; background: #fff; font: 12px/1.45 Arial, sans-serif; }
    .receipt { width: ${width === "58" ? "50" : "72"}mm; max-width: 100%; margin: 0 auto; overflow-wrap: anywhere; }
    h1 { text-align: center; font-size: 17px; margin: 10px 0; }
    p { margin: 4px 0; }
    .line { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 5px 0; }
    .line > :last-child { flex-shrink: 0; text-align: right; }
    .items, .totals, .payments { border-top: 1px dashed #000; margin-top: 10px; padding-top: 6px; }
    .item { padding: 5px 0; break-inside: avoid; }
    .sku { font-size: 10px; }
    .grand { font-size: 15px; font-weight: bold; }
    footer { text-align: center; border-top: 1px dashed #000; margin-top: 12px; padding: 10px 0; }
    .toolbar { padding: 12px; background: #f3f4f6; text-align: center; font: 13px/1.5 Arial, sans-serif; }
    button { padding: 8px 18px; cursor: pointer; }
    @media print { .toolbar { display: none; } }
  `;
  doc.head.append(meta, style);
  const element = (tag: string, text = "", className = "") => {
    const node = doc.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  };
  const row = (label: string, value: string, className = "line") => {
    const node = element("div", "", className);
    node.append(element("span", label), element("span", value));
    return node;
  };
  const toolbar = element("div", "", "toolbar");
  const print = element("button", "In hóa đơn") as HTMLButtonElement;
  print.type = "button";
  print.addEventListener("click", () => { doc.defaultView?.focus(); doc.defaultView?.print(); });
  toolbar.append(element("p", `Chọn máy in Epson, giấy ${width} mm, tỷ lệ 100% và tắt đầu/chân trang trong hộp thoại in.`), print);
  const receipt = element("main", "", "receipt");
  receipt.append(element("h1", "HÓA ĐƠN BÁN HÀNG"), element("p", `Mã đơn: ${order.orderCode}`), element("p", `Ngày tạo: ${dateTime(order.createdAt)}`), element("p", `Khách hàng: ${order.customer?.name || "Khách vãng lai"}`));
  if (order.customer?.phone) receipt.append(element("p", `Điện thoại: ${order.customer.phone}`));
  const items = element("section", "", "items");
  for (const item of order.orderItems) {
    const line = element("div", "", "item");
    line.append(element("strong", item.variant?.template.name || "Sản phẩm"), element("div", item.variant?.sku || item.variantId, "sku"), row(`${item.quantity} × ${money(item.unitPrice)}`, money(item.subtotal)));
    items.append(line);
  }
  const totals = element("section", "", "totals");
  totals.append(row("Tiền hàng", money(order.totalGrossAmount)));
  if (Number(order.discountAmount) > 0) totals.append(row(order.promotionSnapshot?.name || "Giảm giá", `−${money(order.discountAmount)}`));
  totals.append(row("TỔNG THANH TOÁN", money(order.totalNetAmount), "line grand"));
  const payments = element("section", "", "payments");
  for (const payment of order.orderPayments) {
    const label = payment.paymentMethod === "CASH" ? "Tiền mặt" : payment.paymentMethod === "PROMOTION" ? "Khuyến mãi thanh toán" : "Chuyển khoản";
    payments.append(row(label, money(payment.amount)), element("p", `Thanh toán: ${dateTime(payment.createdAt)}`));
  }
  receipt.append(items, totals, payments, element("footer", "Cảm ơn quý khách!"));
  doc.body.append(toolbar, receipt);
}

export function printSaleReceipt(order: SaleDetail, width: ReceiptWidth) {
  if (order.status !== "COMPLETED") throw new Error("Chỉ in hóa đơn của đơn đã thanh toán.");
  const popup = window.open("", "_blank", "popup,width=460,height=720");
  if (!popup) throw new Error("Trình duyệt đang chặn cửa sổ in. Cho phép cửa sổ bật lên cho trang này rồi bấm In hóa đơn lại.");
  renderSaleReceipt(popup.document, order, width);
  // Keep the preview open for retry/cancel; opening a print dialog does not confirm a physical print.
  popup.focus();
  popup.print();
}

// Chrome launched with --kiosk-printing submits this frame to the configured printer.
// A regular browser will still show its print dialog. No popup permission is needed.
export function printSaleReceiptInFrame(order: SaleDetail, width: ReceiptWidth): Promise<void> {
  if (order.status !== "COMPLETED") return Promise.reject(new Error("Chỉ in hóa đơn của đơn đã thanh toán."));
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "Hóa đơn gửi máy in";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:400px;height:600px;border:0";
    let started = false;
    const timeout = window.setTimeout(() => {
      frame.remove();
      reject(new Error("Chưa xác định được kết quả gửi in. Kiểm tra máy in trước khi in lại."));
    }, 120_000);
    frame.onload = async () => {
      if (started) return;
      started = true;
      try {
        if (!frame.contentDocument || !frame.contentWindow) throw new Error("Không thể tạo bản in.");
        renderSaleReceipt(frame.contentDocument, order, width);
        await frame.contentDocument.fonts.ready;
        await new Promise<void>(ready => requestAnimationFrame(() => requestAnimationFrame(() => ready())));
        if (!frame.isConnected) return;
        frame.contentWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
        frame.contentWindow.focus();
        frame.contentWindow.print();
        window.clearTimeout(timeout);
        // Fallback for browsers that omit afterprint. Keep the document available while spooling.
        window.setTimeout(() => frame.remove(), 120_000);
        resolve();
      } catch (error) {
        window.clearTimeout(timeout);
        frame.remove();
        reject(error);
      }
    };
    document.body.append(frame);
  });
}
