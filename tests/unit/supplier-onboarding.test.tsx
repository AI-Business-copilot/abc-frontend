import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SupplierImport } from "@/pages/purchases/supplier-import";
import { SupplierForm } from "@/pages/purchases/supplier-form";
import type { Supplier } from "@/api/purchases";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), confirm: vi.fn(), lookup: vi.fn() }));
vi.mock("@/api/purchases", () => ({ purchasesApi: { previewSupplierImport: mocks.preview, confirmSupplierImport: mocks.confirm, lookupSupplierTax: mocks.lookup } }));
vi.mock("@/pages/purchases/purchase-dialog", () => ({ PurchaseDialog: ({ children, footer }: { children: ReactNode; footer?: ReactNode }) => <div>{children}{footer}</div> }));
const supplier = { id: "supplier", name: "Supplier", taxCode: null, isActive: true } as Supplier;
const preview = { headers: ["SKU", "Name", "Price"], mapping: { sku: 1, name: 2, price: 3 }, issues: [], digest: "digest", valid: true,
  items: [{ row: 2, sku: "001", name: "Milk", price: "12500", action: "create", currentName: null }] };
beforeEach(() => { mocks.preview.mockReset().mockResolvedValue(preview); mocks.confirm.mockReset().mockResolvedValue({ created: 1, linked: 0, updated: 0, total: 1 }); mocks.lookup.mockReset(); });
afterEach(() => vi.useRealTimers());

it("uploads for preview and requires revalidation after column mapping changes", async () => {
  const onSaved = vi.fn();
  render(<SupplierImport supplier={supplier} onClose={vi.fn()} onSaved={onSaved} />);
  const file = new File(["SKU,Name,Price\n001,Milk,12500"], "products.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("File danh sách sản phẩm"), { target: { files: [file] } });
  const button = await screen.findByRole("button", { name: "Nhập 1 sản phẩm" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.change(screen.getByLabelText("SKU nội bộ *"), { target: { value: "2" } });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra và xem trước lại" }));
  await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole("button", { name: "Nhập 1 sản phẩm" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Nhập 1 sản phẩm" }));
  await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith("supplier", file, preview));
  expect(onSaved).toHaveBeenCalledWith(expect.stringContaining("1 mới"));
});
it("does not allow importing a preview containing errors", async () => {
  mocks.preview.mockResolvedValue({ ...preview, valid: false, items: [{ ...preview.items[0], error: "Giá không hợp lệ" }] });
  render(<SupplierImport supplier={supplier} onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("File danh sách sản phẩm"), { target: { files: [new File(["bad"], "bad.csv")] } });
  expect(await screen.findByText("Giá không hợp lệ")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Nhập 1 sản phẩm" })).toBeDisabled();
  expect(mocks.confirm).not.toHaveBeenCalled();
});
it("shows the current import stage and disables repeat submission while saving", async () => {
  let resolvePreview!: (value: typeof preview) => void;
  let resolveConfirm!: (value: { created: number; linked: number; updated: number; total: number }) => void;
  mocks.preview.mockImplementationOnce(() => new Promise(resolve => { resolvePreview = resolve; }));
  mocks.confirm.mockImplementationOnce(() => new Promise(resolve => { resolveConfirm = resolve; }));
  const onSaved = vi.fn();
  render(<SupplierImport supplier={supplier} onClose={vi.fn()} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText("File danh sách sản phẩm"), { target: { files: [new File(["SKU,Name,Price\n001,Milk,12500"], "products.csv")] } });
  expect(screen.getByRole("status")).toHaveTextContent("Đang đọc file và kiểm tra sản phẩm");
  expect(screen.getByRole("button", { name: "Đang kiểm tra…" })).toBeDisabled();
  await act(async () => { resolvePreview(preview); });
  fireEvent.click(screen.getByRole("button", { name: "Nhập 1 sản phẩm" }));
  expect(screen.getByRole("status")).toHaveTextContent("Đang lưu 1 sản phẩm");
  const saving = screen.getByRole("button", { name: "Đang nhập 1 sản phẩm…" });
  expect(saving).toBeDisabled();
  fireEvent.click(saving);
  expect(mocks.confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("File danh sách sản phẩm")).toBeDisabled();
  await act(async () => { resolveConfirm({ created: 1, linked: 0, updated: 0, total: 1 }); });
  expect(onSaved).toHaveBeenCalledWith(expect.stringContaining("1 mới"));
});
it("debounces tax lookup and discards a response for a previous tax code", async () => {
  vi.useFakeTimers();
  let resolveFirst!: (value: unknown) => void;
  mocks.lookup.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
    .mockResolvedValueOnce({ name: "Second company", address: "Second address", source: "Casso" });
  render(<SupplierForm onSaved={vi.fn()} onClose={vi.fn()} />);
  const input = screen.getByLabelText("Mã số thuế");
  fireEvent.change(input, { target: { value: "0316794479" } });
  await act(async () => { await vi.advanceTimersByTimeAsync(800); });
  expect(mocks.lookup).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: "0316794480" } });
  await act(async () => { resolveFirst({ name: "Old company", address: "Old address", source: "Casso" }); await vi.advanceTimersByTimeAsync(800); });
  expect(screen.getByLabelText("Tên nhà cung cấp *")).toHaveValue("Second company");
  expect(screen.getByLabelText("Địa chỉ")).toHaveValue("Second address");
});
