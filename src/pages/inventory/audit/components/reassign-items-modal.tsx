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
/** Filter value for the rows nobody has been put on yet (a row the scope generated). */
const NO_ASSIGNEE = '__none__';
/** How many rows one assignment request carries. The server accepts up to 500. */
const BATCH_SIZE = 200;

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
 * Owner dialog: put an employee on the rows of the audit.
 *
 * It does two jobs at once, and that is why the dialog looks the way it does:
 *   - phân công mới: a row the scope generated has no employee yet, so someone has to be put
 *     on it before the counting can start;
 *   - phân công lại: a row already sits with an employee who quit or is off work, so the row
 *     has to move to someone else.
 *
 * The dialog only ever rewrites the two counters of a row. Which employee the row sat with
 * before only decides which rows are shown, never what is written to them.
 */
export function ReassignItemsModal({ auditId, onClose, onReassigned }: ReassignItemsModalProps) {
  const { members, loading: membersLoading, error: membersError } = useStaffMembers();
  const [items, setItems] = useState<StockAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourceUserId, setSourceUserId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [secondCounterUserId, setSecondCounterUserId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const loaded = await loadInProgressItems(auditId);
      setItems(loaded);
      // The rows a scope generated have nobody on them yet, so the dialog opens on them: that is
      // the job the owner came here for.
      setSourceUserId((current) =>
        current === '' && loaded.some((item) => !item.assignedTo) ? NO_ASSIGNEE : current,
      );
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

  // The employees that currently hold at least one row still being counted. A row the scope
  // generated has none, so it never shows up here and is reached through the "chưa gán người" filter.
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

  // The filter only narrows the list of rows. It never decides what is written to them: a row
  // without anyone and a row that sits with someone else are both given the two chosen people.
  const visible = useMemo(() => {
    if (!sourceUserId) return items;
    if (sourceUserId === NO_ASSIGNEE) return items.filter((item) => !item.assignedTo);
    return items.filter((item) => item.assignedTo?.id === sourceUserId);
  }, [items, sourceUserId]);

  const targetOptions = members.filter((member) => member.user.id !== sourceUserId);
  // Every row is counted by two people, so the second counter must differ from the first.
  const secondCounterOptions = members.filter((member) => member.user.id !== targetUserId);
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));

  const changeSource = (value: string) => {
    setSourceUserId(value);
    setSelected(new Set());
    if (value === targetUserId) setTargetUserId('');
    if (value === secondCounterUserId) setSecondCounterUserId('');
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
    // Every row is counted by two people, so the second counter is required.
    if (!secondCounterUserId) {
      setError('Chọn người kiểm kê thứ hai.');
      return;
    }
    if (secondCounterUserId === targetUserId) {
      setError('Người kiểm kê thứ hai phải khác người được giao.');
      return;
    }
    const ids = visible.filter((item) => selected.has(item.id)).map((item) => item.id);

    let moved = 0;
    try {
      setSubmitting(true);
      setError(null);
      setProgress(0);
      // The rows are assigned in one request, in chunks the server accepts. A full store audit
      // can hold hundreds of rows, so one request per row would be far too slow.
      for (let index = 0; index < ids.length; index += BATCH_SIZE) {
        const chunk = ids.slice(index, index + BATCH_SIZE);
        await auditApi.reassignItems(auditId, chunk, targetUserId, secondCounterUserId);
        moved += chunk.length;
        setProgress(moved);
      }
      onReassigned(moved);
    } catch (err) {
      setError(
        `${moved > 0 ? `Đã gán ${moved}/${ids.length} dòng. ` : ''}${err instanceof Error ? err.message : 'Không gán được nhân viên cho dòng kiểm kê'
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
    ? `Đang gán ${progress}/${selected.size}…`
    : selected.size > 0
      ? `Gán ${selected.size} dòng`
      : 'Gán dòng';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-lg">
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gán nhân viên cho dòng kiểm kê</h2>
            <p className="text-sm text-gray-600 mt-1">
              Dùng cho cả hai việc: gán người cho dòng chưa có ai (dòng mới sinh ra từ phạm vi
              kiểm kê), và chuyển dòng sang nhân viên khác khi người phụ trách đã nghỉ việc hoặc
              không có mặt hôm nay.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Chỉ các dòng đang đếm mới gán lại được. Mỗi dòng cần hai người đếm độc lập.
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
              Không còn dòng nào đang đếm để gán nhân viên
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
                    Lọc theo người đang giữ
                  </label>
                  <select
                    id="reassign-source"
                    value={sourceUserId}
                    disabled={submitting}
                    onChange={(e) => changeSource(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả dòng ({items.length})</option>
                    {hasUnassigned && (
                      <option value={NO_ASSIGNEE}>
                        Dòng chưa gán người ({items.filter((item) => !item.assignedTo).length})
                      </option>
                    )}
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name}
                        {activeIds.has(assignee.id) ? '' : ' (không còn hoạt động)'}
                      </option>
                    ))}

                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Ô này chỉ lọc danh sách dòng bên dưới. Dòng chưa gán ai và dòng đang giao cho
                    nhân viên khác đều được gán lại giống nhau.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700" htmlFor="reassign-target">
                    Giao cho <span className="text-red-600">*</span>
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-700" htmlFor="reassign-second-counter">
                    Người kiểm kê thứ hai <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="reassign-second-counter"
                    value={secondCounterUserId}
                    disabled={submitting}
                    onChange={(e) => setSecondCounterUserId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Chọn người kiểm kê thứ hai</option>
                    {secondCounterOptions.map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.fullName}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Hai người kiểm kê độc lập. Nếu hai số khác nhau, chủ cửa hàng quyết định có kiểm kê
                    lại hay không.
                  </p>
                </div>
                <div className="flex items-end">
                  <p className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                    Cả hai người đều được đặt lại cho dòng được chọn, nên số đếm cũ (nếu có) không
                    còn dùng được.
                  </p>
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
                    Không có dòng nào đang đếm trong nhóm đã chọn
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
                            {item.assignedTo ? (
                              <>
                                Đang giao cho: {item.assignedTo.name}
                                {item.secondCounter
                                  ? ` • Kiểm kê thứ hai: ${item.secondCounter.name}`
                                  : ''}
                              </>
                            ) : (
                              <span className="font-medium text-amber-700">
                                Dòng mới — chưa gán ai
                              </span>
                            )}
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
                  disabled={
                    submitting || !targetUserId || !secondCounterUserId || selected.size === 0
                  }
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
