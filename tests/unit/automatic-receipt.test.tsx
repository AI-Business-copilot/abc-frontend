import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleDetail } from "@/pages/sales/sale-detail";
import { saveReceiptPreferences } from "@/pages/sales/receipt-preferences";
import { printSaleReceiptInFrame } from "@/pages/sales/sale-receipt";

const { order } = vi.hoisted(() => ({ order: {
  id: "order-1", orderCode: "ORD-001", status: "COMPLETED", cashierId: "cashier", shiftId: "shift", createdAt: "2026-11-20T02:30:00Z",
  totalGrossAmount: "100000", discountAmount: "10000", totalNetAmount: "90000", customer: null, promotionId: null, promotionSnapshot: null,
  orderItems: [], orderPayments: [], inventoryLedger: [],
} }));
vi.mock("@/api/sales", () => ({ salesApi: { order: vi.fn(async () => order), shift: vi.fn(async () => null) } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ profile: { business: { id: "shop-1" }, user: { id: "cashier" } } }) }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock("@/pages/sales/sale-receipt", () => ({ printSaleReceipt: vi.fn(), printSaleReceiptInFrame: vi.fn(async () => undefined) }));

function openOrder(afterCheckout: boolean) {
  return render(<MemoryRouter initialEntries={[{ pathname: "/sales/order-1", state: { autoPrintReceipt: afterCheckout } }]}><Routes><Route path="/sales/:id" element={<SaleDetail />} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); vi.mocked(printSaleReceiptInFrame).mockClear();
  vi.mocked(printSaleReceiptInFrame).mockResolvedValue(undefined);
  saveReceiptPreferences({ automatic: true, width: "58" });
});

describe("automatic receipt after checkout", () => {
  it("prints the completed checkout once, including across reloads and history visits", async () => {
    const first = openOrder(true);
    await waitFor(() => expect(printSaleReceiptInFrame).toHaveBeenCalledTimes(1));
    expect(printSaleReceiptInFrame).toHaveBeenCalledWith(order, "58");
    fireEvent.click(screen.getByRole("button", { name: /Tải lại/ }));
    await screen.findByRole("button", { name: /In hóa đơn/ });
    expect(printSaleReceiptInFrame).toHaveBeenCalledTimes(1);
    first.unmount();
    openOrder(true);
    await screen.findByRole("button", { name: /In hóa đơn/ });
    expect(printSaleReceiptInFrame).toHaveBeenCalledTimes(1);
  });

  it("does not auto print when opening an existing order", async () => {
    openOrder(false);
    await screen.findByRole("button", { name: /In hóa đơn/ });
    expect(printSaleReceiptInFrame).not.toHaveBeenCalled();
  });

  it("respects the off setting", async () => {
    saveReceiptPreferences({ automatic: false, width: "80" });
    openOrder(true);
    await screen.findByRole("button", { name: /In hóa đơn/ });
    expect(printSaleReceiptInFrame).not.toHaveBeenCalled();
  });

  it("shows print failures and only retries on an explicit reprint", async () => {
    vi.mocked(printSaleReceiptInFrame).mockRejectedValueOnce(new Error("Kiểm tra máy in"));
    openOrder(true);
    expect(await screen.findByRole("alert")).toHaveTextContent("Kiểm tra máy in");
    expect(printSaleReceiptInFrame).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /In hóa đơn/ }));
    await waitFor(() => expect(printSaleReceiptInFrame).toHaveBeenCalledTimes(2));
  });
});
