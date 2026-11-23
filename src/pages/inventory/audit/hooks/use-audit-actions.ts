import { useState, useCallback } from 'react';
import { auditApi } from '../../../../api/audit';
import type { StockAudit, CreateAuditRequest } from '../../../../types/audit';

export interface UseAuditActionsState {
  loading: boolean;
  error: string | null;
}

/**
 * The audit-level actions of the owner: creating an audit and moving it through its lifecycle.
 * Closing an audit happens per item: approving the last item applies it to inventory on the server.
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
      const message = error instanceof Error ? error.message : 'Không tạo được đợt kiểm kê';
      setState({ loading: false, error: message });
      throw error;
    }
  }, []);

  /** Owner: start the counting of a draft. The SKUs are locked from this moment on. */
  const startAudit = useCallback(async (auditId: string): Promise<StockAudit> => {
    try {
      setState({ loading: true, error: null });
      const audit = await auditApi.startAudit(auditId);
      setState({ loading: false, error: null });
      return audit;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không bắt đầu được đợt kiểm kê';
      setState({ loading: false, error: message });
      throw error;
    }
  }, []);

  /** Owner: cancel a running audit. The locked SKUs are freed again. */
  const cancelAudit = useCallback(async (auditId: string): Promise<StockAudit> => {
    try {
      setState({ loading: true, error: null });
      const audit = await auditApi.cancelAudit(auditId);
      setState({ loading: false, error: null });
      return audit;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không huỷ được đợt kiểm kê';
      setState({ loading: false, error: message });
      throw error;
    }
  }, []);

  /** Owner: delete a draft. A running audit can only be cancelled. */
  const deleteAudit = useCallback(async (auditId: string): Promise<void> => {
    try {
      setState({ loading: true, error: null });
      await auditApi.deleteAudit(auditId);
      setState({ loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không xoá được đợt kiểm kê';
      setState({ loading: false, error: message });
      throw error;
    }
  }, []);

  /** Owner: remove one row from a draft. */
  const deleteAuditItem = useCallback(async (auditId: string, itemId: string): Promise<void> => {
    try {
      setState({ loading: true, error: null });
      await auditApi.deleteAuditItem(auditId, itemId);
      setState({ loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không xoá được dòng kiểm kê';
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
    startAudit,
    cancelAudit,
    deleteAudit,
    deleteAuditItem,
    clearError,
  };
}
