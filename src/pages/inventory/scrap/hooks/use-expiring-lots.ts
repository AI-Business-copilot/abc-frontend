import { useCallback, useEffect, useState } from "react";

import { scrapApi } from "@/api/scrap";
import type { ExpiringLotsSummary, LotBatch, LotStatus } from "@/types/scrap";

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
 * Batches that need attention (WARNING, UNUSABLE, QUARANTINED by default), soonest expiry first.
 * One entry per lot number, each holding the variant items that matched the filter.
 * Each item carries the scrap order it already has, so the page can point at it instead of
 * offering to create a second one.
 */
export function useExpiringLots() {
  const [status, setStatus] = useState<LotStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [lots, setLots] = useState<LotBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ExpiringLotsSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lotResult = await scrapApi.getExpiringBatches({
        status,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });
      setLots(lotResult.lots);
      setTotal(lotResult.total);
      setSummary(lotResult.summary);
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
