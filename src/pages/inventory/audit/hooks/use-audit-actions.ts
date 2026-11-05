import { useState, useCallback } from 'react';
import { auditApi } from '../../../../api/audit';
import type { StockAudit, CreateAuditRequest } from '../../../../types/audit';

export interface UseAuditActionsState {
  loading: boolean;
  error: string | null;
}

/**
 * Creating an audit is the only audit-level action left. Closing an audit happens per item:
 * approving the last item applies it to inventory on the server.
 */
export function useAuditActions() {
  const [state, setState] = useState<UseAuditActionsState>({
    loading: false,
    error: null,
  });

  const createAudit = useCallback(async (payload: CreateAuditRequest): Promise<StockAudit> => {
    try {
      setState({ loading: true, error: null });
      const audit = await auditApi.createAudit(payload);
      setState({ loading: false, error: null });
      return audit;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create audit';
      setState({ loading: false, error: message });
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createAudit,
    clearError,
  };
}
