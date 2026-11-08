import { Fragment, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PermissionGate } from "@/components/common/permission-gate";
import { usePermissions } from "@/hooks/use-permissions";
import { CatalogHeader } from "@/pages/products/catalog-header";
import type { ExpiringLot, LotBatch, LotStatus } from "@/types/scrap";
import { CreateScrapDialog, QuarantineDialog, lotStock } from "./components/lot-dialogs";
import { LotStatusBadge, formatDate, formatDaysLeft } from "./components/scrap-ui";
import { useExpiringLots } from "./hooks/use-expiring-lots";

const filters: { value: LotStatus | undefined; label: string }[] = [
  { value: undefined, label: "Cần xử lý" },
  { value: "WARNING", label: "Sắp hết hạn" },
  { value: "UNUSABLE", label: "Không dùng được" },
  { value: "QUARANTINED", label: "Đang cách ly" },
  { value: "HEALTHY", label: "Bình thường" },
  { value: "SCRAPPED", label: "Đã hủy" },
];

/** Order of concern for the batch header badge. SCRAPPED is terminal, so it is the least urgent. */
const severity: LotStatus[] = ["SCRAPPED", "HEALTHY", "WARNING", "QUARANTINED", "UNUSABLE"];

function worstStatus(items: ExpiringLot[]): LotStatus {
  let worst = 0;
  for (const item of items) {
    worst = Math.max(worst, severity.indexOf(item.effectiveStatus));
  }
  return severity[worst];
}

function soonestExpiry(items: ExpiringLot[]) {
  return items.reduce((min, item) => (item.expirationDate < min ? item.expirationDate : min), items[0].expirationDate);
}

export function LotsPage() {
  const navigate = useNavigate();
  const { can, isStaff } = usePermissions();
  const [keyword, setKeyword] = useState("");
  const [quarantineLot, setQuarantineLot] = useState<ExpiringLot | null>(null);
  const [scrapLot, setScrapLot] = useState<ExpiringLot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Batches default to expanded only when they hold a single variant; this records explicit toggles.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const {
    lots, total, summary, pendingOrderByLot, status, page, totalPages,
    loading, error, changeStatus, goToPage, refetch,
  } = useExpiringLots();

  // Only staff act on lots; the Owner reviews scrap orders instead.
  const canAct = isStaff && can("inventory.scrap.create");
  const needle = keyword.trim().toLowerCase();

  // Matching narrows the variants inside each batch; batches with no match are dropped.
  const visible = needle
    ? lots
        .map((batch) => ({
          ...batch,
          items: batch.items.filter((item) =>
            `${item.variant.template.name} ${item.variant.sku} ${item.lotNumber}`.toLowerCase().includes(needle)),
        }))
        .filter((batch) => batch.items.length > 0)
    : lots;

  const isExpanded = (batch: LotBatch) => expanded[batch.id] ?? batch.items.length <= 1;
  const setAllExpanded = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const batch of visible) next[batch.id] = open;
    setExpanded(next);
  };

  const cards = [
    { label: "SKU bình thường", value: summary.healthy, tone: "text-emerald-700" },
    { label: "SKU sắp hết hạn", value: summary.warning, tone: "text-amber-700" },
    { label: "SKU không dùng được", value: summary.unusable, tone: "text-rose-700" },
    { label: "SKU đang cách ly", value: summary.quarantined, tone: "text-amber-700" },
    { label: "SKU đã hủy", value: summary.scrapped, tone: "text-slate-600" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="lots" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-5 px-5 py-5">
        <PermissionGate permission="inventory.lot.read">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Theo dõi lô hàng & hạn sử dụng</h1>
            <p className="mt-1 text-slate-600">
              Các lô cần xử lý, sắp xếp theo hạn sử dụng gần nhất. Mỗi lô gồm nhiều SKU.
            </p>
          </div>

          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <Card className="p-5" key={card.label}>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}</p>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <Button
                key={filter.label}
                onClick={() => changeStatus(filter.value)}
                size="sm"
                variant={status === filter.value ? "default" : "outline"}
              >
                {filter.label}
              </Button>
            ))}
            <div className="ml-auto flex gap-2">
              <Button onClick={() => setAllExpanded(true)} size="sm" variant="ghost">Mở rộng tất cả</Button>
              <Button onClick={() => setAllExpanded(false)} size="sm" variant="ghost">Thu gọn tất cả</Button>
            </div>
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#eef3ff] text-slate-500">
                <tr>
                  {["Lô hàng", "Số SKU", "Hạn gần nhất", "Tồn trong lô", "Trạng thái", "Thao tác"].map((head) => (
                    <th className="px-4 py-3 font-semibold" key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>Đang tải…</td></tr>
                ) : visible.length === 0 ? (
                  <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>Không có lô hàng nào.</td></tr>
                ) : (
                  visible.map((batch) => {
                    const open = isExpanded(batch);
                    const batchQty = batch.items.reduce((sum, item) => sum + lotStock(item), 0);
                    const expiry = soonestExpiry(batch.items);
                    return (
                      <Fragment key={batch.id}>
                        <tr className="border-t border-slate-200 bg-slate-50/70">
                          <td className="px-4 py-3">
                            <Button
                              aria-expanded={open}
                              className="w-full justify-start gap-2 font-semibold"
                              onClick={() => setExpanded((current) => ({ ...current, [batch.id]: !open }))}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              <span className="w-3 text-slate-500">{open ? "▾" : "▸"}</span>
                              <span className="font-mono">{batch.lotNumber}</span>
                            </Button>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{batch.items.length} SKU</td>
                          <td className="px-4 py-3">{formatDate(expiry)}</td>
                          <td className="px-4 py-3 font-semibold">{batchQty}</td>
                          <td className="px-4 py-3"><LotStatusBadge status={worstStatus(batch.items)} /></td>
                          <td className="px-4 py-3 text-slate-400">—</td>
                        </tr>
                        {open && batch.items.map((lot) => {
                          const pendingOrderId = pendingOrderByLot[lot.id];
                          const blocked = lot.effectiveStatus === "SCRAPPED";
                          return (
                            <tr className="border-t border-slate-100" key={lot.id}>
                              <td className="px-4 py-3 pl-12">
                                <div className="font-semibold">{lot.variant.template.name}</div>
                                <div className="font-mono text-xs text-slate-500">{lot.variant.sku}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-400">—</td>
                              <td className="px-4 py-3">
                                <div>{formatDate(lot.expirationDate)}</div>
                                <div className={lot.daysUntilExpiry < 0 ? "text-xs text-rose-600" : "text-xs text-slate-500"}>
                                  {formatDaysLeft(lot.daysUntilExpiry)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {lotStock(lot)}
                                {lot.effectiveStatus === "QUARANTINED" && lot.quarantineQty ? (
                                  <div className="text-xs text-amber-700">Cách ly: {lot.quarantineQty}</div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3"><LotStatusBadge status={lot.effectiveStatus} /></td>
                              <td className="px-4 py-3">
                                {pendingOrderId ? (
                                  <Link className="font-semibold text-[#0f4c3a] hover:underline" to={`/inventory/scrap/${pendingOrderId}`}>
                                    Xem phiếu đang chờ duyệt
                                  </Link>
                                ) : canAct && !blocked ? (
                                  <div className="flex gap-2">
                                    {lot.effectiveStatus === "QUARANTINED" ? (
                                      <Button onClick={() => setScrapLot(lot)} size="sm">Tạo phiếu hủy</Button>
                                    ) : (
                                      <Button onClick={() => setQuarantineLot(lot)} size="sm" variant="outline">Cách ly</Button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{total} lô · trang {page}/{totalPages}</span>
              <div className="flex gap-2">
                <Button disabled={page <= 1} onClick={() => goToPage(page - 1)} size="sm" variant="outline">Trước</Button>
                <Button disabled={page >= totalPages} onClick={() => goToPage(page + 1)} size="sm" variant="outline">Sau</Button>
              </div>
            </div>
          )}
        </PermissionGate>
      </main>

      {quarantineLot && (
        <QuarantineDialog
          lot={quarantineLot}
          onClose={() => setQuarantineLot(null)}
          onDone={() => {
            setQuarantineLot(null);
            setMessage("Đã cách ly lô hàng. Bạn có thể tạo phiếu hủy cho lô này.");
            void refetch();
          }}
        />
      )}
      {scrapLot && (
        <CreateScrapDialog
          lot={scrapLot}
          onClose={() => setScrapLot(null)}
          onCreated={(orderId) => navigate(`/inventory/scrap/${orderId}`)}
        />
      )}
    </div>
  );
}
