import { useCallback, useEffect, useState } from "react";

import { scrapApi } from "@/api/scrap";
import type { ExpiringLotsSummary, LotBatch, LotStatus } from "@/types/scrap";

const PAGE_SIZE = 20;
/** The scrap-order endpoint caps `take` at 100, so pending orders are collected page by page. */
const ORDER_PAGE_SIZE = 100;

const emptySummary: ExpiringLotsSummary = {
  healthy: 0,
  warning: 0,
  unusable: 0,
  quarantined: 0,
  scrapped: 0,
  total: 0,
};

/** Every PENDING scrap order, keyed by the lot item it will consume. */
async function loadPendingOrderMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (let skip = 0; ; skip += ORDER_PAGE_SIZE) {
    const result = await scrapApi.listScrapOrders({
      status: "PENDING",
      skip,
      take: ORDER_PAGE_SIZE,
    });
    for (const order of result.orders) {
      if (order.lotItemId) map[order.lotItemId] = order.id;
    }
    if (result.orders.length < ORDER_PAGE_SIZE || skip + ORDER_PAGE_SIZE >= result.total) break;
  }
  return map;
}

/**
 * Batches that need attention (WARNING, UNUSABLE, QUARANTINED by default), soonest expiry first.
 * One entry per lot number, each holding the variant items that matched the filter.
 * Also loads the PENDING scrap orders so a quarantined item can link to its open order.
 */
export function useExpiringLots() {
  const [status, setStatus] = useState<LotStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [lots, setLots] = useState<LotBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ExpiringLotsSummary>(emptySummary);
  const [pendingOrderByLot, setPendingOrderByLot] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lotResult, pendingOrderByLot] = await Promise.all([
        scrapApi.getExpiringBatches({ status, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        loadPendingOrderMap(),
      ]);
      setLots(lotResult.lots);
      setTotal(lotResult.total);
      setSummary(lotResult.summary);
      setPendingOrderByLot(pendingOrderByLot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách lô hàng.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = useCallback((next: LotStatus | undefined) => {
    setStatus(next);
    setPage(1);
  }, []);

  return {
    lots,
    total,
    summary,
    pendingOrderByLot,
    status,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    loading,
    error,
    changeStatus,
    goToPage: setPage,
    refetch: load,
  };
}
