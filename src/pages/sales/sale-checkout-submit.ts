import type { salesApi } from "@/api/sales";
import { cashChange } from "./sale-money";

type CheckoutApi = Pick<typeof salesApi, "create" | "pay">;

// Keep the created draft recoverable if prices change or payment cannot be confirmed.
export async function submitSaleCheckout(api: CheckoutApi, input: Parameters<CheckoutApi["create"]>[0], payment: { method: "CASH" | "BANK_TRANSFER"; expectedAmount: string; reference: string }) {
  const order = await api.create(input);
  if (cashChange(order.totalNetAmount, payment.expectedAmount) !== "0.00") {
    return { id: order.id, notice: "Giá hoặc khuyến mãi đã thay đổi. Vui lòng kiểm tra tổng tiền mới và xác nhận lại trước khi thu tiền." };
  }
  try {
    await api.pay(order.id, payment.method, order.totalNetAmount, payment.reference);
    return { id: order.id, notice: "" };
  } catch {
    return { id: order.id, notice: "Đơn đã được tạo nhưng chưa xác định được kết quả thanh toán. Vui lòng kiểm tra trạng thái đơn và tiền đã nhận trước khi thử lại." };
  }
}
