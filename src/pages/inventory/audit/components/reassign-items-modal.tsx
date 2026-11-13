import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Spinner } from '../../../../components/ui/spinner';
import { Alert } from '../../../../components/ui/alert';
import { auditApi } from '../../../../api/audit';
import type { StockAuditItem } from '../../../../types/audit';
import { useStaffMembers } from '../audit-rows';

/** The backend caps pageSize at 200, so a large audit needs a few requests. */
const PAGE_SIZE = 200;
/** Filter value for rows that have no assignee left (for example a deleted account). */
const NO_ASSIGNEE = '__none__';

interface ReassignItemsModalProps {
  auditId: string;
  onClose: () => void;
  onReassigned: (count: number) => void;
}

/** Every row of the audit that is still being counted, across all pages. */
async function loadInProgressItems(auditId: string): Promise<StockAuditItem[]> {
  const first = await auditApi.getAuditItems(auditId, 1, PAGE_SIZE);
  const all = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const next = await auditApi.getAuditItems(auditId, page, PAGE_SIZE);
    all.push(...next.items);
  }
  return all.filter((item) => item.itemStatus === 'IN_PROGRESS');
}

/**
 * Owner dialog: move rows that are still being counted from one employee to another.
 * Used when the assignee quit or is off work.
 */
export function ReassignItemsModal({ auditId, onClose, onReassigned }: ReassignItemsModalProps) {
  const { members, loading: membersLoading, error: membersError } = useStaffMembers();
  const [items, setItems] = useState<StockAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourceUserId, setSourceUserId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setItems(await loadInProgressItems(auditId));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách dòng kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  // The employees that currently hold at least one row still being counted
  const assignees = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!item.assignedTo) continue;
      seen.set(item.assignedTo.id, item.assignedTo.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  const activeIds = useMemo(() => new Set(members.map((member) => member.user.id)), [members]);
  const hasUnassigned = items.some((item) => !item.assignedTo);

  const visible = useMemo(() => {
    if (!sourceUserId) return items;
    if (sourceUserId === NO_ASSIGNEE) return items.filter((item) => !item.assignedTo);
    return items.filter((item) => item.assignedTo?.id === sourceUserId);
  }, [items, sourceUserId]);

  const targetOptions = members.filter((member) => member.user.id !== sourceUserId);
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));

  const changeSource = (value: string) => {
    setSourceUserId(value);
    setSelected(new Set());
    if (value === targetUserId) setTargetUserId('');
    setError(null);
  };

  const toggleItem = (itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((item) => next.delete(item.id));
      else visible.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!targetUserId || selected.size === 0) return;
    const ids = visible.filter((item) => selected.has(item.id)).map((item) => item.id);

    let moved = 0;
    try {
      setSubmitting(true);
      setError(null);
      setProgress(0);
      for (const itemId of ids) {
        await auditApi.reassignItem(auditId, itemId, targetUserId);
        moved += 1;
        setProgress(moved);
      }
      onReassigned(moved);
    } catch (err) {
      setError(
        `${moved > 0 ? `Đã chuyển ${moved}/${ids.length} dòng. ` : ''}${
          err instanceof Error ? err.message : 'Không đổi được người phụ trách'
        }`
      );
      // Rows moved before the failure are saved on the server, so refresh the list to match it
      if (moved > 0) await reload();
    } finally {
      setSubmitting(false);
    }
  };

  const busy = loading || membersLoading;
  const submitLabel = submitting
    ? `Đang chuyển ${progress}/${selected.size}…`
    : selected.size > 0
      ? `Chuyển ${selected.size} dòng`
      : 'Chuyển dòng';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-lg">
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Phân công lại dòng kiểm kê</h2>
            <p className="text-sm text-gray-600 mt-1">
              Chuyển các dòng còn đang đếm sang nhân viên khác khi người phụ trách đã nghỉ việc hoặc
              không có mặt hôm nay. Chỉ các dòng đang đếm mới chuyển được.
            </p>
          </div>

          {(error || loadError || membersError) && (
            <Alert className="bg-red-50 border-red-200 text-red-700 text-sm">
              {error || loadError || membersError}
            </Alert>
          )}

          {busy ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Không còn dòng nào đang đếm để phân công lại
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Không có nhân viên nào đang hoạt động để nhận dòng kiểm kê
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-700" htmlFor="reassign-source">
                    Từ nhân viên
                  </label>
                  <select
                    id="reassign-source"
                    value={sourceUserId}
                    disabled={submitting}
                    onChange={(e) => changeSource(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả nhân viên</option>
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name}
                        {activeIds.has(assignee.id) ? '' : ' (không còn hoạt động)'}
                      </option>
                    ))}
                    {hasUnassigned && <option value={NO_ASSIGNEE}>Chưa có người phụ trách</option>}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700" htmlFor="reassign-target">
                    Giao cho
                  </label>
                  <select
                    id="reassign-target"
                    value={targetUserId}
                    disabled={submitting}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      Chọn nhân viên
                    </option>
                    {targetOptions.map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.fullName}
                      </option>
                    ))}
                  </select>
                  {targetOptions.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Không còn nhân viên nào khác để nhận các dòng này.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={allVisibleSelected}
                      disabled={submitting || visible.length === 0}
                      onChange={toggleAll}
                    />
                    Chọn tất cả ({visible.length} dòng)
                  </label>
                  <span className="text-xs text-gray-500">Đã chọn {selected.size}</span>
                </div>

                {visible.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Nhân viên này không có dòng nào đang đếm
                  </p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {visible.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-start gap-3 rounded border border-gray-200 p-2"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={selected.has(item.id)}
                          disabled={submitting}
                          onChange={() => toggleItem(item.id)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {item.productName}
                          </span>
                          <span className="block truncate font-mono text-xs text-gray-500">
                            {item.sku}
                            {item.lotNumber ? ` • Lô ${item.lotNumber}` : ''}
                          </span>
                          <span className="block text-xs text-gray-500">
                            Hiện giao cho: {item.assignedTo?.name ?? '—'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t pt-4">
                <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
                  Đóng
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !targetUserId || selected.size === 0}
                  className="flex-1 bg-[#0f4c3a] hover:bg-[#0a3528] text-white"
                >
                  {submitLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
