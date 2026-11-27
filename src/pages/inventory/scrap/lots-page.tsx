import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PermissionGate } from "@/components/common/permission-gate";
import { usePermissions } from "@/hooks/use-permissions";
import { getPrimaryImage } from "@/lib/image-utils";
import { CatalogHeader } from "@/pages/products/catalog-header";
import {
  scrapStatusText,
  type ExpiringLot,
  type LotStatus,
  type ProductLotGroup,
  type ProductSkuLots,
} from "@/types/scrap";
import { CreateScrapDialog, QuarantineDialog, lotStock } from "./components/lot-dialogs";
import { AssignShelfDialog } from "./components/assign-shelf-dialog";
import { LotStatusBadge, formatDate, formatDaysLeft } from "./components/scrap-ui";
import { shelfLocationText } from "@/types/shelf";
import { useExpiringLots } from "./hooks/use-expiring-lots";

const filters: { value: LotStatus | undefined; label: string }[] = [
  { value: "HEALTHY", label: "Bình thường" },
  { value: undefined, label: "Cần xử lý" },
  { value: "WARNING", label: "Sắp hết hạn" },
  { value: "UNUSABLE", label: "Không dùng được" },
  { value: "QUARANTINED", label: "Đang cách ly" },
  { value: "SCRAPPED", label: "Đã hủy" },
];

/** Order of concern for a badge. SCRAPPED is terminal, so it is the least urgent. */
const severity: LotStatus[] = ["SCRAPPED", "HEALTHY", "WARNING", "QUARANTINED", "UNUSABLE"];

function worstStatus(items: ExpiringLot[]): LotStatus {
  let worst = 0;
  for (const item of items) {
    worst = Math.max(worst, severity.indexOf(item.effectiveStatus));
  }
  return severity[worst];
}

/** The SKU key is unique across products, because a SKU belongs to one product. */
function skuKey(product: ProductLotGroup, sku: ProductSkuLots) {
  return `${product.id}:${sku.id}`;
}

/** A product matches when its name, one of its SKUs or one of its lot numbers matches. */
function matches(product: ProductLotGroup, needle: string): boolean {
  if (product.name.toLowerCase().includes(needle)) return true;
  return product.skus.some(
    (sku) =>
      sku.sku.toLowerCase().includes(needle) ||
      sku.lots.some((lot) => lot.lotNumber.toLowerCase().includes(needle)),
  );
}

/**
 * True when the SKU itself matches the search, by its SKU code or by one of its lot numbers.
 *
 * The tree opens closed, so a search that only matches a lot number would find the product but
 * hide the lot that matched. Such a product is opened automatically when the staff searches.
 */
function skuMatches(sku: ProductSkuLots, needle: string): boolean {
  if (sku.sku.toLowerCase().includes(needle)) return true;
  return sku.lots.some((lot) => lot.lotNumber.toLowerCase().includes(needle));
}

export function LotsPage() {
  const navigate = useNavigate();
  const { can, isStaff } = usePermissions();
  const [keyword, setKeyword] = useState("");
  const [quarantineLot, setQuarantineLot] = useState<ExpiringLot | null>(null);
  const [scrapLot, setScrapLot] = useState<ExpiringLot | null>(null);
  const [shelfLot, setShelfLot] = useState<ExpiringLot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // The tree opens closed: the staff sees the products, then opens the one they need. This
  // records the explicit toggles, per product and per SKU.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const {
    lots, total, summary, status, page, totalPages,
    loading, error, changeStatus, goToPage, refetch,
  } = useExpiringLots();

  // Only staff act on lots; the Owner reviews scrap orders instead.
  const canAct = isStaff && can("inventory.scrap.create");
  const needle = keyword.trim().toLowerCase();

  // Matching drops the products that hold no match; the SKUs inside a match stay whole.
  const visible = needle ? lots.filter((product) => matches(product, needle)) : lots;

  // The tree opens closed, so a product shows only itself. Clicking it reveals the SKUs, and
  // clicking a SKU reveals its lots. An explicit toggle always wins over the search auto-open.
  const toggle = (key: string, open: boolean) =>
    setExpanded((current) => ({ ...current, [key]: !open }));

  /**
   * Whether a product shows its SKUs.
   *
   * A search opens the products that match, because the tree is closed by default and the
   * matching lot would otherwise stay hidden.
   */
  const productOpen = (product: ProductLotGroup) =>
    expanded[product.id] ?? (needle !== "" && matches(product, needle));

  /** Whether a SKU shows its lots. Same rule: a search opens the SKU that matched. */
  const skuOpen = (product: ProductLotGroup, sku: ProductSkuLots) =>
    expanded[skuKey(product, sku)] ?? (needle !== "" && skuMatches(sku, needle));

  const setAllExpanded = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const product of visible) {
      next[product.id] = open;
      for (const sku of product.skus) next[skuKey(product, sku)] = open;
    }
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
              Theo mặt hàng, rồi tới SKU và từng lô, sắp xếp theo hạn sử dụng gần nhất.
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

          {loading ? (
            <Card className="p-8 text-center text-slate-500">Đang tải…</Card>
          ) : visible.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">Không có lô hàng nào.</Card>
          ) : (
            <div className="space-y-4">
              {visible.map((product) => {
                const productLots = product.skus.flatMap((sku) => sku.lots);
                const productQty = productLots.reduce((sum, lot) => sum + lotStock(lot), 0);
                const image = getPrimaryImage(product.imageUrl);
                const open = productOpen(product);
                return (
                  <Card className="overflow-hidden" key={product.id}>
                    {/* The whole box opens the product: the staff clicks the picture or the name. */}
                    <button
                      aria-expanded={open}
                      className="flex w-full gap-4 p-4 text-left transition hover:bg-slate-50"
                      onClick={() => toggle(product.id, open)}
                      type="button"
                    >
                      {image ? (
                        <img
                          alt={product.name}
                          className="h-28 w-28 shrink-0 rounded-lg border border-slate-200 object-cover"
                          loading="lazy"
                          src={image}
                        />
                      ) : (
                        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                          Chưa có ảnh
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-3 text-slate-500">{open ? "▾" : "▸"}</span>
                          <h2 className="text-lg font-bold text-slate-900">{product.name}</h2>
                          <LotStatusBadge status={worstStatus(productLots)} />
                          <span className="text-sm text-slate-500">
                            {product.skus.length} SKU · {productLots.length} lô · tồn {productQty}
                          </span>
                        </div>
                      </div>
                    </button>

                    {open && (
                      <div className="space-y-3 px-4 pb-4">
                        {product.skus.map((sku) => {
                          const key = skuKey(product, sku);
                          const skuExpanded = skuOpen(product, sku);
                          return (
                            <div className="rounded-lg border border-slate-200" key={key}>
                              <button
                                aria-expanded={skuExpanded}
                                className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2 text-left"
                                onClick={() => toggle(key, skuExpanded)}
                                type="button"
                              >
                                <span className="w-3 text-slate-500">{skuExpanded ? "▾" : "▸"}</span>
                                <span className="font-mono text-sm font-semibold">{sku.sku}</span>
                                <span className="text-xs text-slate-500">{sku.lots.length} lô</span>
                                <span className="ml-auto">
                                  <LotStatusBadge status={worstStatus(sku.lots)} />
                                </span>
                              </button>

                              {skuExpanded && (
                                <div className="divide-y divide-slate-100">
                                  {sku.lots.map((lot) => {
                                    const scrapOrder = lot.scrapOrder;
                                    const blocked = lot.effectiveStatus === "SCRAPPED";
                                    // A settled order (rejected or cancelled) does not block a new one,
                                    // so the staff can file a fresh order while the previous one stays
                                    // as the trail.
                                    const settledOrder =
                                      scrapOrder?.status === "REJECTED" || scrapOrder?.status === "CANCELLED";
                                    const canCreateNew =
                                      settledOrder && canAct && !blocked && lot.effectiveStatus === "QUARANTINED";
                                    return (
                                      <div
                                        className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
                                        key={lot.id}
                                      >
                                        <span className="font-mono font-semibold text-slate-700">
                                          Lô {lot.lotNumber}
                                        </span>
                                        <span className="text-slate-600">{formatDate(lot.expirationDate)}</span>
                                        <span
                                          className={
                                            lot.daysUntilExpiry < 0
                                              ? "text-xs text-rose-600"
                                              : "text-xs text-slate-500"
                                          }
                                        >
                                          {formatDaysLeft(lot.daysUntilExpiry)}
                                        </span>
                                        <span className="font-semibold">{lotStock(lot)}</span>
                                        <span
                                          className={
                                            lot.shelfCell
                                              ? "text-xs text-slate-500"
                                              : "text-xs text-amber-700"
                                          }
                                        >
                                          {shelfLocationText(lot.shelfCell)}
                                        </span>
                                        {lot.effectiveStatus === "QUARANTINED" && lot.quarantineQty ? (
                                          <span className="text-xs text-amber-700">Cách ly: {lot.quarantineQty}</span>
                                        ) : null}
                                        <LotStatusBadge status={lot.effectiveStatus} />

                                        <span className="ml-auto flex items-center gap-2">
                                          {canAct && !blocked && (
                                            <Button
                                              onClick={() => setShelfLot(lot)}
                                              size="sm"
                                              variant="outline"
                                            >
                                              {lot.shelfCell ? "Đổi vị trí" : "Gán vị trí"}
                                            </Button>
                                          )}
                                          {scrapOrder ? (
                                            <div className="flex items-center gap-2">
                                              {canCreateNew && (
                                                <Button onClick={() => setScrapLot(lot)} size="sm">
                                                  Tạo phiếu hủy hàng
                                                </Button>
                                              )}
                                              <Link
                                                className="font-semibold text-[#0f4c3a] hover:underline"
                                                to={`/inventory/scrap/${scrapOrder.id}`}
                                              >
                                                Xem phiếu {scrapOrder.scrapCode}
                                              </Link>
                                              <span className="text-xs text-slate-500">
                                                {scrapOrder.status === "PENDING"
                                                  ? "Đang chờ duyệt"
                                                  : `Trạng thái: ${scrapStatusText(scrapOrder.status)}`}
                                              </span>
                                            </div>
                                          ) : canAct && !blocked ? (
                                            lot.effectiveStatus === "QUARANTINED" ? (
                                              <Button onClick={() => setScrapLot(lot)} size="sm">
                                                Tạo phiếu hủy hàng
                                              </Button>
                                            ) : (
                                              <Button
                                                onClick={() => setQuarantineLot(lot)}
                                                size="sm"
                                                variant="outline"
                                              >
                                                Cách ly
                                              </Button>
                                            )
                                          ) : (
                                            <span className="text-slate-400">—</span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{total} sản phẩm · trang {page}/{totalPages}</span>
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
      {shelfLot && (
        <AssignShelfDialog
          lot={shelfLot}
          onClose={() => setShelfLot(null)}
          onDone={() => {
            setShelfLot(null);
            setMessage("Đã gán vị trí cho lô hàng.");
            void refetch();
          }}
        />
      )}
    </div>
  );
}
