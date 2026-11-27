import type { StockAuditItem } from '../../../types/audit';

/**
 * The difference between the counted quantity and the system quantity of an audit row, or null
 * when the row has no settled number yet.
 *
 * A row only carries a real figure once the number is agreed:
 *   - AGREED / PENDING_APPROVAL / APPROVED - the number the owner approves.
 *   - SINGLE - the one employee's own number, but only once they saved it.
 *   - NOT_STARTED / PENDING / CONFLICT - the counters have not settled on a number, so the
 *     row's counted quantity is still the empty starting value. Comparing it with the snapshot
 *     would report a difference that nobody measured.
 */
export function resolveAuditDiff(item: StockAuditItem): number | null {
  if (!hasAgreedCount(item)) return null;
  return item.countedQty - item.snapshotQty;
}

/** True when the row carries a number that can be compared with the snapshot. */
export function hasAgreedCount(item: StockAuditItem): boolean {
  if (item.itemStatus === 'PENDING_APPROVAL' || item.itemStatus === 'APPROVED') return true;
  if (item.countAgreement === 'AGREED') return true;
  if (item.countAgreement === 'NOT_STARTED' || item.countAgreement === 'PENDING' || item.countAgreement === 'CONFLICT') {
    return false;
  }
  // SINGLE: the row shows the one employee's number once they saved it. A staff member only
  // receives their own count, so the list is enough to tell the row was counted.
  return (item.counts?.length ?? 0) > 0;
}

/** Formats a difference for display, or a dash when the row has no number yet. */
export function formatAuditDiff(diff: number | null): string {
  if (diff === null) return '—';
  return `${diff >= 0 ? '+' : ''}${diff}`;
}
