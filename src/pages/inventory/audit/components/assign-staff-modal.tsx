import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Spinner } from '../../../../components/ui/spinner';
import { Alert } from '../../../../components/ui/alert';
import { auditApi } from '../../../../api/audit';
import type { AuditType, StockAuditItem } from '../../../../types/audit';
import { AuditRowEditor } from './audit-row-editor';
import {
  emptyRow,
  rowsToAssignments,
  useStaffMembers,
  validateRows,
  type AuditRowDraft,
} from '../audit-rows';

interface AssignStaffModalProps {
  auditId: string;
  /** The audit type decides which lots a new row may point at. */
  auditType: AuditType;
  /** Items already in the audit, used to reject duplicate SKU + lot rows early. */
  existingItems?: StockAuditItem[];
  onClose: () => void;
  onAssignSuccess?: () => void;
}

/** Owner dialog: add employee + SKU (+ lot on a re-audit) rows to an audit. */
export function AssignStaffModal({
  auditId,
  auditType,
  existingItems = [],
  onClose,
  onAssignSuccess,
}: AssignStaffModalProps) {
  const { members, loading, error: membersError } = useStaffMembers();
  const [rows, setRows] = useState<AuditRowDraft[]>(() => [emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    const rowsError = validateRows(rows, auditType);
    if (rowsError) {
      setError(rowsError);
      return;
    }

    const taken = new Set(
      existingItems.filter((item) => item.lotItemId).map((item) => `${item.variantId}:${item.lotItemId}`)
    );
    const clash = rows.find((row) => row.lotItemId && taken.has(`${row.variant!.id}:${row.lotItemId}`));
    if (clash) {
      setError(`${clash.variant!.sku} với lô này đã có trong đợt kiểm kê.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await auditApi.addItems(auditId, rowsToAssignments(rows));
      onAssignSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được dòng kiểm kê');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-lg">
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Thêm dòng kiểm kê</h2>
            <p className="text-sm text-gray-600 mt-1">
              {auditType === 'RE_AUDIT'
                ? 'Mỗi dòng là một SKU giao cho một nhân viên, kèm một lô có sẵn do bạn chọn ngay bây giờ. Nhân viên giữ nguyên lô đó khi đếm và chỉ có thể sửa ngày của lô và nhập số lượng.'
                : 'Mỗi dòng là một SKU giao cho một nhân viên. Mọi dòng đều là lô mới: nhân viên nhập số lô và hạn sử dụng khi đếm.'}
            </p>
          </div>

          {(error || membersError) && (
            <Alert className="bg-red-50 border-red-200 text-red-700 text-sm">
              {error || membersError}
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Không có nhân viên nào đang hoạt động</p>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Dòng mới</h3>
                <AuditRowEditor
                  rows={rows}
                  onChange={setRows}
                  members={members}
                  auditType={auditType}
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
                  Đóng
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={submitting}
                  className="flex-1 bg-[#0f4c3a] hover:bg-[#0a3528] text-white"
                >
                  {submitting ? 'Đang thêm...' : 'Thêm dòng'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
