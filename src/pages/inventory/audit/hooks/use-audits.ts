import { useState, useEffect, useCallback } from 'react';
import { auditApi } from '../../../../api/audit';
import type { StockAudit, AuditFilter } from '../../../../types/audit';

export interface UseAuditsState {
  audits: StockAudit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

export function useAudits(initialFilter?: AuditFilter) {
  const [state, setState] = useState<UseAuditsState>({
    audits: [],
    total: 0,
    page: initialFilter?.page ?? 1,
    pageSize: initialFilter?.pageSize ?? 10,
    totalPages: 0,
    loading: true,
    error: null,
  });

  const [filter, setFilter] = useState<AuditFilter>({
    status: initialFilter?.status,
    page: initialFilter?.page ?? 1,
    pageSize: initialFilter?.pageSize ?? 10,
  });

  const fetchAudits = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const result = await auditApi.listAudits(
        filter.status,
        filter.page ?? 1,
        filter.pageSize ?? 10
      );
      setState((prev) => ({
        ...prev,
        audits: result.items,
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalPages: result.pagination.totalPages,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch audits',
        loading: false,
      }));
    }
  }, [filter]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const updateFilter = useCallback(
    (newFilter: Partial<AuditFilter>) => {
      setFilter((prev) => ({
        ...prev,
        ...newFilter,
        page: newFilter.page ?? (newFilter.status !== undefined ? 1 : prev.page),
      }));
    },
    []
  );

  const goToPage = useCallback((page: number) => {
    setFilter((prev) => ({ ...prev, page }));
  }, []);

  return {
    ...state,
    filter,
    updateFilter,
    goToPage,
    refetch: fetchAudits,
  };
}
