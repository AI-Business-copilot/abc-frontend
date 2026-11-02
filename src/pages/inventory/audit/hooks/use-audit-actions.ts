import { useState, useCallback } from 'react';
import { auditApi } from '../../../../api/audit';
import type { StockAudit, CreateAuditRequest } from '../../../../types/audit';

export interface UseAuditActionsState {
  loading: boolean;
  error: string | null;
}

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

  const approveAudit = useCallback(async (auditId: string): Promise<StockAudit> => {
    try {
      setState({ loading: true, error: null });
      const audit = await auditApi.approveAudit(auditId);
      setState({ loading: false, error: null });
      return audit;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve audit';
      setState({ loading: false, error: message });
      throw error;
    }
  }, []);

  const applyAudit = useCallback(async (auditId: string): Promise<StockAudit> => {
    try {
      setState({ loading: true, error: null });
      const audit = await auditApi.applyAudit(auditId);
      setState({ loading: false, error: null });
      return audit;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply audit';
      setState({ loading: false, error: message });
      throw error;
    }
  }, []);

  const deleteAudit = useCallback(async (auditId: string): Promise<void> => {
    try {
      setState({ loading: true, error: null });
      await auditApi.deleteAudit(auditId);
      setState({ loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete audit';
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
    approveAudit,
    applyAudit,
    deleteAudit,
    clearError,
  };
}
