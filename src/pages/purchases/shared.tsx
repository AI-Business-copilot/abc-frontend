import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Page } from "@/api/purchases";
export { total, validateMoney, validateQty } from "./purchase-input";

export const money = (value: string | number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(Number(value));
export const date = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(new Date(value)) : "—";
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const code = (prefix: string) => `${prefix}-${today().replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
export const statuses: Record<string, string> = { ORDERED: "Đã đặt mua", PARTIALLY_RECEIVED: "Nhận một phần", COMPLETED: "Đã nhận đủ", CLOSED_SHORT: "Đóng phần thiếu", CANCELLED: "Đã hủy", RECEIVED: "Đã nhận" };
export function Status({ value }: { value: string }) { return <span className={`purchase-status ${value.toLowerCase()}`}>{statuses[value] || value}</span>; }
export function ErrorBox({ error }: { error: string }) { return error ? <div role="alert" className="purchase-error">{error}</div> : null; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="purchase-field"><span>{label}</span>{children}</label>; }
export function Heading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) { return <div className="purchase-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><div className="purchase-actions">{children}</div></div>; }
export function Empty({ children = "Chưa có dữ liệu phù hợp." }: { children?: ReactNode }) { return <div className="purchase-empty">{children}</div>; }
export function Back({ to = "/purchases", children = "Danh sách đơn đặt mua" }: { to?: string; children?: ReactNode }) { return <Link className="purchase-back" to={to}>← {children}</Link>; }
export function Pager({ data, page, setPage }: { data: Page<unknown>; page: number; setPage: (page: number) => void }) { return <div className="purchase-pager"><span>{data.pagination.total} kết quả · Trang {page}/{Math.max(1, data.pagination.totalPages)}</span><div className="purchase-actions"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Sau</button></div></div>; }

// The caller supplies the dependencies of the read; late responses never replace a newer view.
export function useLoad<T>(read: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setData(undefined);
    read().then((value) => { if (active) setData(value); }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Không thể tải dữ liệu."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [...deps, revision]);
  return { data, error, loading, reload: () => setRevision((value) => value + 1) };
}

export function useAction() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : "Thao tác không thành công."); }
    finally { locked.current = false; setBusy(false); }
  };
  return { busy, error, run, setError };
}

