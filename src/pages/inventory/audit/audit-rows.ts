import { useEffect, useState } from 'react';
import { auditApi, type BusinessMember } from '../../../api/audit';
import type { AuditItemAssignment, AuditType, VariantOption } from '../../../types/audit';

/** One editable row in the owner's form: employee + variant (+ lot item on a re-audit). */
export interface AuditRowDraft {
  key: string;
  assignedToUserId: string;
  variant: VariantOption | null;
  /** Lot item id. Required by a re-audit and left empty by a new-lot audit, which the employee fills in later. */
  lotItemId: string;
}

let rowCounter = 0;

export function emptyRow(assignedToUserId = ''): AuditRowDraft {
  rowCounter += 1;
  return { key: `row-${rowCounter}`, assignedToUserId, variant: null, lotItemId: '' };
}

/** Returns an error message, or null when every row is complete and unique. */
export function validateRows(rows: AuditRowDraft[], auditType: AuditType): string | null {
  if (rows.length === 0) return 'Cần thêm ít nhất một dòng (nhân viên + SKU).';

  const seen = new Set<string>();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.assignedToUserId) return `Dòng ${i + 1}: hãy chọn nhân viên.`;
    if (!row.variant) return `Dòng ${i + 1}: hãy chọn SKU.`;
    if (auditType === 'RE_AUDIT' && !row.lotItemId) {
      return `Dòng ${i + 1}: hãy chọn một lô có sẵn. Kiểm kê lại giữ nguyên lô bạn chọn.`;
    }
    if (row.lotItemId) {
      const key = `${row.variant.id}:${row.lotItemId}`;
      if (seen.has(key)) return `Dòng ${i + 1}: trùng SKU và lô.`;
      seen.add(key);
    }
  }
  return null;
}

export function rowsToAssignments(rows: AuditRowDraft[]): AuditItemAssignment[] {
  return rows.map((row) => ({
    assignedToUserId: row.assignedToUserId,
    variantId: row.variant!.id,
    lotItemId: row.lotItemId || null,
  }));
}

/** Active STAFF members of the current business. */
export function useStaffMembers() {
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await auditApi.getMembers();
        if (cancelled) return;
        setMembers(data.members.filter((m) => m.role === 'STAFF' && m.status === 'ACTIVE'));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không tải được danh sách nhân viên');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { members, loading, error };
}
