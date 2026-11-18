import { useCallback, useEffect, useRef, useState } from "react";

import { scrapApi } from "@/api/scrap";
import type { ScrapOrderDetail } from "@/types/scrap";

/**
 * One scrap order with its photos. Photo links expire after 5 minutes, so the order is
 * reloaded quietly whenever the tab becomes visible again and on demand when an image fails to load.
 */
export function useScrapOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<ScrapOrderDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      if (!orderId) return;
      const current = ++requestId.current;
      if (!quiet) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await scrapApi.getScrapOrder(orderId);
        // Ignore a slower earlier response so it cannot overwrite newer data.
        if (current === requestId.current) setOrder(result);
      } catch (err) {
        if (current === requestId.current && !quiet) {
          setError(err instanceof Error ? err.message : "Không thể tải phiếu hủy.");
        }
      } finally {
        if (current === requestId.current && !quiet) setLoading(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return {
    order,
    loading,
    error,
    refetch: () => load(false),
    refreshQuietly: () => load(true),
  };
}
