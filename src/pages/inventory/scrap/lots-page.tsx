import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PermissionGate } from "@/components/common/permission-gate";
import { usePermissions } from "@/hooks/use-permissions";
import { CatalogHeader } from "@/pages/products/catalog-header";
import type { ExpiringLot, LotStatus } from "@/types/scrap";
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

export function LotsPage() {
  const navigate = useNavigate();
  const { can, isStaff } = usePermissions();
  const [keyword, setKeyword] = useState("");
  const [quarantineLot, setQuarantineLot] = useState<ExpiringLot | null>(null);
  const [scrapLot, setScrapLot] = useState<ExpiringLot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const {
    lots, total, summary, pendingOrderByLot, status, page, totalPages,
    loading, error, changeStatus, goToPage, refetch,
  } = useExpiringLots();

  // Only staff act on lots; the Owner reviews scrap orders instead.
  const canAct = isStaff && can("inventory.scrap.create");
  const needle = keyword.trim().toLowerCase();
  const visible = needle
    ? lots.filter((lot) =>
        `${lot.variant.template.name} ${lot.variant.sku} ${lot.lotNumber}`.toLowerCase().includes(needle))
    : lots;

  const cards = [
    { label: "Sắp hết hạn", value: summary.warning, tone: "text-amber-700" },
    { label: "Không dùng được", value: summary.unusable, tone: "text-rose-700" },
    { label: "Đang cách ly", value: summary.quarantined, tone: "text-violet-700" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-5 px-5 py-5">
        <PermissionGate permission="inventory.lot.read">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Theo dõi lô hàng & hạn sử dụng</h1>
            <p className="mt-1 text-slate-600">Các lô cần xử lý, sắp xếp theo hạn sử dụng gần nhất.</p>
          </div>

          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map((card) => (
              <Card className="p-5" key={card.label}>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}</p>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
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
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#eef3ff] text-slate-500">
                <tr>
                  {["Sản phẩm", "Số lô", "Hạn sử dụng", "Tồn trong lô", "Trạng thái", "Thao tác"].map((head) => (
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
                  visible.map((lot) => {
                    const pendingOrderId = pendingOrderByLot[lot.id];
                    const blocked = lot.effectiveStatus === "SCRAPPED";
                    return (
                      <tr className="border-t border-slate-100" key={lot.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{lot.variant.template.name}</div>
                          <div className="font-mono text-xs text-slate-500">{lot.variant.sku}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{lot.lotNumber}</td>
                        <td className="px-4 py-3">
                          <div>{formatDate(lot.expirationDate)}</div>
                          <div className={lot.daysUntilExpiry < 0 ? "text-xs text-rose-600" : "text-xs text-slate-500"}>
                            {formatDaysLeft(lot.daysUntilExpiry)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {lotStock(lot)}
                          {lot.effectiveStatus === "QUARANTINED" && lot.quarantineQty ? (
                            <div className="text-xs text-violet-700">Cách ly: {lot.quarantineQty}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3"><LotStatusBadge status={lot.effectiveStatus} /></td>
                        <td className="px-4 py-3">
                          {pendingOrderId ? (
                            <Link className="font-semibold text-violet-700 hover:underline" to={`/inventory/scrap/${pendingOrderId}`}>
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
