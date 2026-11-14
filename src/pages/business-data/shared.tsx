import type { ReactNode } from "react";
import type { Store } from "lucide-react";

import { date, money } from "@/pages/purchases/shared";

export const PAGE_SIZES = [10, 20, 50];

export function defaultFrom() {
  const value = new Date();
  value.setDate(value.getDate() - 29);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function displayDate(value: string | null | undefined) {
  return value ? date(value) : "—";
}

export function getAmount(value: string | number) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export function PaginationSize({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="bd-page-size">
      <span>Số dòng/trang</span>
      <select aria-label="Số dòng mỗi trang" onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="bd-filter-field"><span>{label}</span>{children}</label>;
}

export function SummaryCard({ label, value, detail, icon: Icon }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Store;
}) {
  return (
    <article className="bd-summary-card">
      <span className="bd-summary-icon"><Icon size={18} /></span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function DetailLine({ label, value, amount = false }: { label: string; value: ReactNode; amount?: boolean }) {
  return (
    <div className="bd-detail-line">
      <span>{label}</span>
      <strong className={amount && typeof value === "number" && value < 0 ? "bd-negative" : ""}>
        {amount && typeof value === "number" ? money(value) : value}
      </strong>
    </div>
  );
}
