import { useState, useCallback, useEffect } from 'react';
import { auditApi } from '../../../../api/audit';
import type { StockAuditItem, UpdateAuditItemRequest } from '../../../../types/audit';

export interface UseAuditItemsState {
  items: StockAuditItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

export function useAuditItems(auditId: string | undefined, options: { mine?: boolean } = {}) {
  const mine = options.mine ?? false;
  const [state, setState] = useState<UseAuditItemsState>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: !auditId,
    error: null,
  });

  const [page, setPage] = useState(1);

  const fetchItems = useCallback(
    async (pageNum: number = 1) => {
      if (!auditId) return;

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const result = await auditApi.getAuditItems(auditId, pageNum, 20, mine);
        setState({
          items: result.items,
          total: result.pagination.total,
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalPages: result.pagination.totalPages,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to fetch items',
          loading: false,
        }));
      }
    },
    [auditId, mine]
  );

  const goToPage = useCallback(
    (pageNum: number) => {
      setPage(pageNum);
      fetchItems(pageNum);
    },
    [fetchItems]
  );

  // Load the first page on mount and whenever the audit or the "mine" filter changes
  useEffect(() => {
    if (!auditId) return;
    setPage(1);
    fetchItems(1);
  }, [auditId, fetchItems]);

  const updateItem = useCallback(
    async (
      itemId: string,
      countedQty: number,
      discrepancyReason?: string | null,
      lot?: Pick<
        UpdateAuditItemRequest,
        'lotItemId' | 'newLotNumber' | 'newLotExpirationDate' | 'newLotManufacturingDate'
      >
    ) => {
      if (!auditId) return;

      try {
        const updated = await auditApi.updateCount(auditId, itemId, {
          countedQty,
          discrepancyReason,
          ...lot,
        });

        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === itemId ? updated : item)),
        }));

        return updated;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to update item');
      }
    },
    [auditId]
  );

  const submitItem = useCallback(
    async (itemId: string) => {
      if (!auditId) return;

      try {
        const updated = await auditApi.submitAuditItem(auditId, itemId);
        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === itemId ? updated : item)),
        }));
        return updated;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to submit item');
      }
    },
    [auditId]
  );

  const recordCount = useCallback(
    async (variantId: string, countedQty: number, lotItemId?: string | null) => {
      if (!auditId) return;

      try {
        const item = await auditApi.recordCount(auditId, {
          variantId,
          countedQty,
          lotItemId,
        });

        setState((prev) => ({
          ...prev,
          items: [...prev.items, item],
          total: prev.total + 1,
        }));

        return item;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to record count');
      }
    },
    [auditId]
  );

  return {
    ...state,
    page,
    goToPage,
    updateItem,
    submitItem,
    recordCount,
    refetch: () => fetchItems(page),
  };
}
