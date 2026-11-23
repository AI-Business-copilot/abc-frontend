import { describe, expect, it, vi } from "vitest";
import type { SaleDetail } from "@/api/sales";
import { printSaleReceipt, renderSaleReceipt } from "@/pages/sales/sale-receipt";

function sale(): SaleDetail {
  return {
    id: "order-1", orderCode: "ORD-001", status: "COMPLETED", cashierId: "cashier", shiftId: "shift", createdAt: "2026-11-20T02:30:00Z",
    totalGrossAmount: "100000", discountAmount: "10000", totalNetAmount: "90000", customer: null, promotionId: null, promotionSnapshot: null,
    orderItems: [{ id: "line-1", variantId: "variant", quantity: 2, unitPrice: "50000", discountAmount: "10000", subtotal: "100000", variant: { sku: "SKU-01", template: { name: "Sữa tươi có đường" } }, lotItem: null }],
    orderPayments: [{ id: "payment", paymentMethod: "CASH", amount: "90000", paymentReference: null, createdAt: "2026-11-20T02:35:00Z" }], inventoryLedger: [],
  };
}

describe("thermal sales receipt", () => {
  it("keeps gross items, discount, final total and payment together on the bill", () => {
    const doc = document.implementation.createHTMLDocument();
    renderSaleReceipt(doc, sale(), "80");
    const receipt = doc.querySelector("main")!;
    expect(receipt.textContent).toContain("Sữa tươi có đường");
    expect(receipt.querySelector(".items")?.textContent).toContain("100.000");
    expect(receipt.querySelector(".totals")?.textContent).toContain("−10.000");
    expect(receipt.querySelector(".grand")?.textContent).toContain("90.000");
    expect(receipt.querySelector(".payments")?.textContent).toContain("Tiền mặt90.000");
    expect(receipt.textContent).toContain("09:35");
    expect(receipt.textContent).not.toContain("undefined");
  });

  it("prints names as text without interpreting markup", () => {
    const order = sale();
    order.customer = { id: "customer", name: '<img src=x onerror="alert(1)">', phone: "0901234567" };
    order.orderItems[0].variant!.template.name = "<script>alert(1)</script>";
    const doc = document.implementation.createHTMLDocument();
    renderSaleReceipt(doc, order, "58");
    expect(doc.querySelector("img, script")).toBeNull();
    expect(doc.body.textContent).toContain(order.customer.name);
    expect(doc.body.textContent).toContain("<script>alert(1)</script>");
    expect(doc.head.textContent).toContain("width: 50mm");
  });

  it.each(["DRAFT", "CANCELLED"] as const)("does not open a print window for %s orders", status => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    expect(() => printSaleReceipt({ ...sale(), status }, "80")).toThrow("đã thanh toán");
    expect(open).not.toHaveBeenCalled();
  });

  it("explains how to recover when the browser blocks the popup", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(() => printSaleReceipt(sale(), "80")).toThrow("Cho phép cửa sổ bật lên");
  });
});
