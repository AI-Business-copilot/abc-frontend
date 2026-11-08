import { useState, useEffect, useCallback } from 'react';
import { auditApi } from '../../../../api/audit';
import type { StockAudit } from '../../../../types/audit';

export interface UseAuditState {
  audit: StockAudit | null;
  loading: boolean;
  error: string | null;
}

export function useAudit(auditId: string | undefined) {
  const [state, setState] = useState<UseAuditState>({
    audit: null,
    loading: !auditId,
    error: null,
  });

  const fetchAudit = useCallback(async () => {
    if (!auditId) {
      setState({ audit: null, loading: false, error: null });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const audit = await auditApi.getAuditDetails(auditId);
      setState({ audit, loading: false, error: null });
    } catch (error) {
      setState({
        audit: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Không tải được đợt kiểm kê',
      });
    }
  }, [auditId]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const refetch = useCallback(() => {
    fetchAudit();
  }, [fetchAudit]);

  return {
    ...state,
    refetch,
  };
}
