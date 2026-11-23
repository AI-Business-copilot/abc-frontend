import { useCallback, useEffect, useState } from 'react';
import { auditApi } from '../../../../api/audit';
import type { AuditItemCountImage } from '../../../../types/audit';

export interface UseAuditCountImagesState {
  /** The photos of the count, with short-lived signed links. */
  images: AuditItemCountImage[];
  loading: boolean;
  error: string | null;
  /** Fetches the links again, needed when they expire. */
  refetch: () => void;
}

/**
 * The signed links of one counter's evidence photos.
 *
 * The item endpoint only returns the photos' metadata; the links themselves are signed by the
 * server and expire after a few minutes, so they are fetched separately and refreshed on demand.
 */
export function useAuditCountImages(
  auditId: string | undefined,
  itemId: string | undefined,
  countId: string | undefined,
  enabled = true,
): UseAuditCountImagesState {
  const [state, setState] = useState<UseAuditCountImagesState>({
    images: [],
    loading: false,
    error: null,
    refetch: () => {},
  });

  const fetchImages = useCallback(async () => {
    if (!auditId || !itemId || !countId || !enabled) {
      setState({ images: [], loading: false, error: null, refetch: () => {} });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const images = await auditApi.getAuditCountImages(auditId, itemId, countId);
      setState({ images, loading: false, error: null, refetch: () => {} });
    } catch (error) {
      setState({
        images: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Không tải được ảnh bằng chứng',
        refetch: () => {},
      });
    }
  }, [auditId, itemId, countId, enabled]);

  useEffect(() => {
    void fetchImages();
  }, [fetchImages]);

  return {
    ...state,
    refetch: () => {
      void fetchImages();
    },
  };
}
