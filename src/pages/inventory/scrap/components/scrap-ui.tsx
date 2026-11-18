import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { LotStatus, ScrapStatus } from "@/types/scrap";

const lotStatusStyle: Record<LotStatus, { label: string; className: string }> = {
  HEALTHY: { label: "Bình thường", className: "bg-emerald-100 text-emerald-800" },
  WARNING: { label: "Sắp hết hạn", className: "bg-amber-100 text-amber-800" },
  UNUSABLE: { label: "Không dùng được", className: "bg-rose-100 text-rose-800" },
  QUARANTINED: { label: "Đang cách ly", className: "bg-amber-100 text-amber-900 border border-amber-200" },
  SCRAPPED: { label: "Đã hủy", className: "bg-slate-200 text-slate-700" },
};

const scrapStatusStyle: Record<ScrapStatus, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-amber-100 text-amber-800" },
  COMPLETED: { label: "Đã duyệt", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Bị từ chối", className: "bg-rose-100 text-rose-800" },
  CANCELLED: { label: "Đã hủy bỏ", className: "bg-slate-200 text-slate-700" },
};

const badgeClass = "inline-block rounded-full px-3 py-1 text-xs font-semibold";

export function LotStatusBadge({ status }: { status: LotStatus }) {
  const style = lotStatusStyle[status] ?? lotStatusStyle.HEALTHY;
  return <span className={`${badgeClass} ${style.className}`}>{style.label}</span>;
}

export function ScrapStatusBadge({ status }: { status: ScrapStatus }) {
  const style = scrapStatusStyle[status] ?? scrapStatusStyle.PENDING;
  return <span className={`${badgeClass} ${style.className}`}>{style.label}</span>;
}

export const rejectionReasonLabel: Record<string, string> = {
  WRONG_QUANTITY: "Số lượng không đúng",
  PHOTO_UNCLEAR: "Ảnh không rõ ràng",
  NOT_REMOVED_FROM_SHELF: "Hàng chưa được gỡ khỏi kệ",
  OTHER: "Lý do khác",
};

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(Number(value))} đ`;
}

export function formatDaysLeft(days: number) {
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Hết hạn hôm nay";
  return `Còn ${days} ngày`;
}

/** Simple accessible dialog: closes on Escape and when the backdrop is clicked. */
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <Button aria-label="Đóng" disabled={busy} onClick={onClose} size="sm" type="button" variant="ghost">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
