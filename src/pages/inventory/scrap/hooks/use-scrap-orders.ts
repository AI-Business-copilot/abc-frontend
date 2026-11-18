import { useCallback, useEffect, useState } from "react";

import { scrapApi } from "@/api/scrap";
import type { ScrapOrderListItem, ScrapStatistics, ScrapStatus } from "@/types/scrap";

const PAGE_SIZE = 20;

export function useScrapOrders(initialStatus: ScrapStatus | undefined = "PENDING") {
  const [status, setStatus] = useState<ScrapStatus | undefined>(initialStatus);
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<ScrapOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState<ScrapStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, stats] = await Promise.all([
        scrapApi.listScrapOrders({ status, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        scrapApi.getScrapStatistics(),
      ]);
      setOrders(list.orders);
      setTotal(list.total);
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách phiếu hủy.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = useCallback((next: ScrapStatus | undefined) => {
    setStatus(next);
    setPage(1);
  }, []);

  return {
    orders,
    total,
    statistics,
    status,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    loading,
    error,
    changeStatus,
    goToPage: setPage,
    refetch: load,
  };
}
