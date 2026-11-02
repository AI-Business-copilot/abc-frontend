import { useCallback, useEffect, useState } from "react";

import { scrapApi } from "@/api/scrap";
import type { ExpiringLot, ExpiringLotsSummary, LotStatus } from "@/types/scrap";

const PAGE_SIZE = 20;

const emptySummary: ExpiringLotsSummary = {
  healthy: 0,
  warning: 0,
  unusable: 0,
  quarantined: 0,
  scrapped: 0,
  total: 0,
};

/**
 * Lots that need attention (WARNING, UNUSABLE, QUARANTINED by default), soonest expiry first.
 * Also loads the PENDING scrap orders so a quarantined lot can link to its open order.
 */
export function useExpiringLots() {
  const [status, setStatus] = useState<LotStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [lots, setLots] = useState<ExpiringLot[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ExpiringLotsSummary>(emptySummary);
  const [pendingOrderByLot, setPendingOrderByLot] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lotResult, pending] = await Promise.all([
        scrapApi.getExpiringLots({ status, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        scrapApi.listScrapOrders({ status: "PENDING", take: 100 }),
      ]);
      setLots(lotResult.lots);
      setTotal(lotResult.total);
      setSummary(lotResult.summary);
      const map: Record<string, string> = {};
      for (const order of pending.orders) {
        if (order.lotId) map[order.lotId] = order.id;
      }
      setPendingOrderByLot(map);
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
