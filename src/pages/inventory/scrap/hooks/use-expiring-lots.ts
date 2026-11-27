import { useCallback, useEffect, useState } from "react";

import { scrapApi } from "@/api/scrap";
import type { ExpiringLotsSummary, LotStatus, ProductLotGroup } from "@/types/scrap";

/** Products shown per page. The server pages over products, so this is the page size. */
const PAGE_SIZE = 12;

const emptySummary: ExpiringLotsSummary = {
  healthy: 0,
  warning: 0,
  unusable: 0,
  quarantined: 0,
  scrapped: 0,
  total: 0,
};

/**
 * Products of one status, soonest expiry first. The page opens on HEALTHY; the "Cần xử lý" tab
 * leaves the status unset, which asks the server for WARNING, UNUSABLE and QUARANTINED.
 * One entry per product, each holding its SKUs and the lot items of each SKU.
 * Each lot item carries the scrap order it already has, so the page can point at it instead of
 * offering to create a second one.
 */
export function useExpiringLots() {
  const [status, setStatus] = useState<LotStatus | undefined>("HEALTHY");
  const [page, setPage] = useState(1);
  const [lots, setLots] = useState<ProductLotGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ExpiringLotsSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lotResult = await scrapApi.getExpiringProducts({
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
