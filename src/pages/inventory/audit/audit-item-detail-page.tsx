import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { Label } from '../../../components/ui/label';
import { Spinner } from '../../../components/ui/spinner';
import { PermissionGate } from '../../../components/common/permission-gate';
import { AuditItemStatusBadge, CountAgreementBadge } from './components/audit-item-list';
import { AuditCountGallery } from './components/audit-count-gallery';
import { AuditHistoryGallery } from './components/audit-history-gallery';
import { useAudit } from './hooks/use-audit';
import { useStaffMembers } from './audit-rows';
import { CatalogHeader } from '../../products/catalog-header';
import { auditApi } from '../../../api/audit';
import type { AuditItemHistory, StockAuditItem } from '../../../types/audit';

const MAX_REJECT_REASON = 1000;

const formatDateTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

const formatDate = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

/** What the owner did with a row, as shown in the history. */
const HISTORY_ACTION_LABELS: Record<AuditItemHistory['action'], string> = {
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  RECOUNT: 'Yêu cầu đếm lại',
};

/** Compares two dates by calendar day. */
const sameDay = (a?: string | Date | null, b?: string | Date | null) =>
  (a ? new Date(a).toISOString().slice(0, 10) : '') === (b ? new Date(b).toISOString().slice(0, 10) : '');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-gray-900 mt-1">{children}</div>
    </div>
  );
}

/**
 * The row's counters: the employee it was assigned to and the second counter.
 *
 * Both people are always listed, even when one of them has not counted yet. A staff member
 * receives only their own count from the server, so the other person shows without numbers —
 * which keeps the second count blind.
 */
function counterRows(item: StockAuditItem) {
  const people = [
    { id: item.assignedTo?.id, name: item.assignedTo?.name ?? '—' },
    { id: item.secondCounter?.id, name: item.secondCounter?.name ?? '—' },
  ].filter((person) => person.id);

  return people.map((person) => {
    const count = item.counts?.find((c) => c.counterUserId === person.id);
    return {
      id: person.id,
      name: person.name,
      countedQty: count?.countedQty,
      countedDamagedQty: count?.countedDamagedQty,
      discrepancyReason: count?.discrepancyReason,
      submittedAt: count?.submittedAt,
    };
  });
}

/**
 * One audit item in detail. The owner reviews the counted quantity and the employee's
 * discrepancy reason here, then approves the item or sends it back with a reason.
 */
export function AuditItemDetailPage() {
  const { auditId, itemId } = useParams<{ auditId: string; itemId: string }>();
  const navigate = useNavigate();
  const { audit, refetch: refetchAudit } = useAudit(auditId);
  const [keyword, setKeyword] = useState('');

  const [item, setItem] = useState<StockAuditItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The row's history. Only the owner may read it, so a staff member simply gets an empty list.
  const [histories, setHistories] = useState<AuditItemHistory[]>([]);

  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [recounting, setRecounting] = useState(false);
  const [recountReason, setRecountReason] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { members, loading: membersLoading, error: membersError } = useStaffMembers();
  const [targetUserId, setTargetUserId] = useState('');
  const [secondCounterUserId, setSecondCounterUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!auditId || !itemId) return;
    try {
      setLoading(true);
      setLoadError(null);
      setItem(await auditApi.getAuditItem(auditId, itemId));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được dòng kiểm kê');
    } finally {
      setLoading(false);
    }
  }, [auditId, itemId]);

  // The history is a separate read because only the owner may have it: a staff member gets a
  // 403, which simply means there is nothing to show them.
  const loadHistory = useCallback(async () => {
    if (!auditId || !itemId) return;
    try {
      setHistories(await auditApi.getAuditItemHistory(auditId, itemId));
    } catch {
      setHistories([]);
    }
  }, [auditId, itemId]);

  useEffect(() => {
    void loadItem();
    void loadHistory();
  }, [loadItem, loadHistory]);

  const backToAudit = (message?: string) =>
    navigate(`/inventory/audit/${auditId}`, message ? { state: { message } } : undefined);

  const handleApprove = async () => {
    if (!auditId || !item) return;
    try {
      setActing(true);
      setActionError(null);
      const result = await auditApi.approveAuditItem(auditId, item.id);
      backToAudit(
        result.auditAutoApplied
          ? `${item.sku} đã được duyệt. Tất cả dòng đã được duyệt nên đợt kiểm kê đã được áp dụng vào tồn kho.`
          : `${item.sku} đã được duyệt`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không duyệt được dòng kiểm kê');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!auditId || !item) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError('Vui lòng nhập lý do để nhân viên biết cần đếm lại gì.');
      return;
    }
    try {
      setActing(true);
      setActionError(null);
      await auditApi.rejectAuditItem(auditId, item.id, reason);
      backToAudit(`${item.sku} đã được trả lại cho ${item.assignedTo?.name ?? 'nhân viên'} để đếm lại`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không trả lại được dòng kiểm kê');
    } finally {
      setActing(false);
    }
  };

  // The two counters disagree: send the row back to both of them for another count.
  const handleRecount = async () => {
    if (!auditId || !item) return;
    const reason = recountReason.trim();
    if (!reason) {
      setActionError('Vui lòng nhập lý do để cả hai người kiểm kê biết cần đếm lại gì.');
      return;
    }
    try {
      setActing(true);
      setActionError(null);
      await auditApi.requestRecount(auditId, item.id, reason);
      backToAudit(
        `${item.sku} đã được yêu cầu kiểm kê lại bởi cả ${item.assignedTo?.name ?? 'nhân viên'} và ${item.secondCounter?.name ?? 'người kiểm kê thứ hai'
        }`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không yêu cầu kiểm kê lại được');
    } finally {
      setActing(false);
    }
  };

  // Hand this row to another employee when the assignee quit or is off work
  const handleReassign = async () => {
    if (!auditId || !item || !targetUserId) return;
    // Every row is counted by two people, so the second counter is required.
    if (!secondCounterUserId) {
      setActionError('Chọn người kiểm kê thứ hai.');
      return;
    }
    if (secondCounterUserId === targetUserId) {
      setActionError('Người kiểm kê thứ hai phải khác người được giao.');
      return;
    }
    try {
      setReassigning(true);
      setActionError(null);
      const updated = await auditApi.reassignItem(
        auditId,
        item.id,
        targetUserId,
        secondCounterUserId,
      );
      setItem(updated);
      setTargetUserId('');
      setSecondCounterUserId('');
      setNotice(
        `Đã giao ${updated.sku} cho ${updated.assignedTo?.name ?? 'nhân viên mới'} và ${updated.secondCounter?.name ?? 'người kiểm kê thứ hai'}`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không đổi được người phụ trách');
    } finally {
      setReassigning(false);
    }
  };

  // Keep the audit header in sync when the page is reopened
  useEffect(() => {
    refetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const header = (
    <div className="flex items-center gap-4">
      <Button variant="outline" onClick={() => backToAudit()}>
        ← Quay lại kiểm kê
      </Button>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chi tiết dòng kiểm kê</h1>
        {audit && <p className="text-gray-600 mt-1">Đợt kiểm kê {audit.auditCode}</p>}
      </div>
    </div>
  );

  const pageFrame = (content: React.ReactNode) => (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="stock-audit" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] px-5 py-5">
        {content}
      </main>
    </div>
  );

  if (loading) {
    return pageFrame(
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </div>,
    );
  }

  if (loadError || !item) {
    return pageFrame(
      <div className="space-y-6">
        {header}
        <Alert className="bg-red-50 border-red-200 text-red-700">{loadError || 'Không tìm thấy dòng kiểm kê'}</Alert>
      </div>,
    );
  }

  const diff = item.countedQty - item.snapshotQty;
  const hasDiff = diff !== 0;
  // The broken goods are counted separately from the usable quantity; the total is derived.
  const brokenQty = item.countedDamagedQty ?? 0;
  const totalQty = item.countedQty + brokenQty;
  const canReview = audit?.status === 'IN_PROGRESS' && item.itemStatus === 'PENDING_APPROVAL';
  const wasRejected = item.itemStatus === 'IN_PROGRESS' && Boolean(item.rejectionReason);
  // The two counters disagreed, so the owner decides whether the row is counted again.
  const canRecount = audit?.status === 'IN_PROGRESS' && item.countAgreement === 'CONFLICT';
  const firstCount = item.counts?.[0]
    ? item.counts[0].countedQty + (item.counts[0].countedDamagedQty ?? 0)
    : 0;
  const secondCount = item.counts?.[1]
    ? item.counts[1].countedQty + (item.counts[1].countedDamagedQty ?? 0)
    : 0;
  // A row still being counted can be handed to another employee; the current assignee is not an option.
  const canReassign = audit?.status === 'IN_PROGRESS' && item.itemStatus === 'IN_PROGRESS';
  const reassignOptions = members.filter((member) => member.user.id !== item.assignedTo?.id);
  // The second counter must be someone other than the primary assignee.
  const secondCounterOptions = members.filter(
    (member) => member.user.id !== item.assignedTo?.id && member.user.id !== targetUserId,
  );
  const assigneeInactive =
    !membersLoading &&
    Boolean(item.assignedTo) &&
    !members.some((member) => member.user.id === item.assignedTo?.id);

  return pageFrame(
    <div className="space-y-6">
      {header}

      {actionError && (
        <Alert className="bg-red-50 border-red-200 text-red-700">{actionError}</Alert>
      )}

      {notice && (
        <Alert className="bg-green-50 border-green-200 text-green-700">{notice}</Alert>
      )}

      <Card className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{item.productName}</h2>
              <AuditItemStatusBadge status={item.itemStatus} auditStatus={audit?.status} />
              <CountAgreementBadge agreement={item.countAgreement} />
            </div>
            <p className="text-gray-600 font-mono text-sm">SKU: {item.sku}</p>
            {item.attributeText && <p className="text-gray-600 text-sm">{item.attributeText}</p>}
          </div>
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="h-20 w-20 rounded-md object-cover border border-gray-200"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Field label="Lô">
            {item.lotNumber ?? <span className="text-amber-700">Chưa chọn</span>}
          </Field>
          <Field label="Hạn sử dụng">
            {formatDate(item.expirationDate)}
            {item.datesCorrected && sameDay(item.lotExpirationDate, item.expirationDate) === false && (
              <span className="block text-xs text-amber-700">
                Đã sửa từ {formatDate(item.lotExpirationDate)}
              </span>
            )}
          </Field>
          <Field label="Ngày sản xuất">
            {formatDate(item.manufacturingDate)}
            {item.datesCorrected &&
              sameDay(item.lotManufacturingDate, item.manufacturingDate) === false && (
                <span className="block text-xs text-amber-700">
                  Đã sửa từ {formatDate(item.lotManufacturingDate)}
                </span>
              )}
          </Field>
          <Field label="Giao cho">{item.assignedTo?.name ?? '—'}</Field>
          <Field label="Người kiểm kê thứ hai">{item.secondCounter?.name ?? '—'}</Field>
        </div>

        <div className="grid gap-4 rounded-lg bg-gray-50 p-4 text-center grid-cols-5">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Số Lượng hàng trong hệ thống</p>
            <p className="text-2xl font-semibold text-gray-900">{item.snapshotQty}</p>
          </div>          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Số Lượng Hàng Đếm Được</p>
            <p className="text-2xl font-semibold text-gray-900">{item.countedQty}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Số Lượng Hàng Hỏng</p>
            <p className="text-2xl font-semibold text-gray-900">{brokenQty}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tổng số lượng bàn giao</p>
            <p className="text-2xl font-semibold text-gray-900">{totalQty}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Chênh lệch</p>
            <p className={`text-2xl font-semibold ${hasDiff ? 'text-red-600' : 'text-green-600'}`}>
              {diff > 0 ? '+' : ''}
              {diff}
            </p>
          </div>
        </div>

        {item.countAgreement && item.countAgreement !== 'SINGLE' && (
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900">Hai người kiểm kê độc lập</p>
            <p className="mt-1 text-xs text-gray-600">
              Mỗi người đếm riêng và không ai thấy số của người kia. Nếu hai số khác nhau, chủ cửa
              hàng quyết định có yêu cầu kiểm kê lại hay không.
            </p>
            {counterRows(item).length > 0 ? (
              <div className="mt-3 space-y-3">
                <div className="overflow-hidden rounded-md border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Người kiểm kê</th>
                        <th className="px-3 py-2">Số dùng được</th>
                        <th className="px-3 py-2">Hàng hỏng</th>
                        <th className="px-3 py-2">Tổng</th>
                        <th className="px-3 py-2">Đã nộp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {counterRows(item).map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-900">{row.name}</td>
                          <td className="px-3 py-2">{row.countedQty ?? '—'}</td>
                          <td className="px-3 py-2">{row.countedDamagedQty ?? '—'}</td>
                          <td className="px-3 py-2 font-semibold">
                            {row.countedQty === undefined ? '—' : row.countedQty + (row.countedDamagedQty ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {row.submittedAt ? formatDateTime(row.submittedAt) : 'Chưa nộp'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* The reasons are written freely, so they get their own full-width block instead
                    of a table column that would squeeze the numbers. */}
                {counterRows(item)
                  .filter((row) => row.discrepancyReason)
                  .map((row) => (
                    <div key={row.id} className="rounded-md border border-gray-200 p-3">
                      <p className="text-xs font-semibold text-gray-700">
                        Lý do chênh lệch của {row.name}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">
                        {row.discrepancyReason}
                      </p>
                    </div>
                  ))}

                {/* The photos each counter took of the broken goods, so the owner can judge the row. */}
                {(item.counts ?? []).some((count) => (count.images?.length ?? 0) > 0) && (
                  <div className="space-y-4 rounded-md border border-gray-200 p-3">
                    {(item.counts ?? [])
                      .filter((count) => (count.images?.length ?? 0) > 0)
                      .map((count) => (
                        <div key={count.id}>
                          <p className="mb-2 text-xs font-semibold text-gray-700">
                            Ảnh hàng hỏng của {count.counter?.name ?? 'người kiểm kê'}
                          </p>
                          <AuditCountGallery
                            auditId={auditId ?? ''}
                            countId={count.id}
                            images={count.images ?? []}
                            itemId={item.id}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">Chưa ai nộp số đếm.</p>
            )}
          </div>
        )}

        {item.datesCorrected && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Nhân viên đã sửa ngày của lô này. Ngày sẽ được ghi vào lô khi đợt kiểm kê được áp dụng.
          </p>
        )}

        {/* The row's own fields carry the first counter's reason; the other counter's reason and
            broken goods come from counterDetails, so every counter is shown here. */}
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {hasDiff ? `Lý do chênh lệch ${diff > 0 ? '+' : ''}${diff}` : 'Lý do kiểm kê'}
          </p>
          {(item.counterDetails ?? []).map((detail) => (
            <div key={detail.counterUserId} className="mt-2">
              <p className="text-sm font-semibold text-amber-900">
                {detail.counter?.name ?? 'Người kiểm kê'}
                {detail.countedDamagedQty > 0 && (
                  <span className="ml-1 font-normal">
                    · Hàng hỏng: {detail.countedDamagedQty} sản phẩm hư hỏng
                  </span>
                )}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-amber-800">
                {detail.discrepancyReason || 'Không có lý do nào được nhập.'}
              </p>
            </div>
          ))}
        </div>

        {wasRejected && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">
              Bị trả lại để đếm lại
              {item.rejectedBy ? ` bởi ${item.rejectedBy.name}` : ''} lúc {formatDateTime(item.rejectedAt)}
            </p>
            <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap break-words">
              {item.rejectionReason}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 border-t border-gray-200 pt-4">
          <Field label="Người tạo">{item.createdBy?.name ?? '—'}</Field>
          <Field label="Người gửi">
            {item.submittedBy ? `${item.submittedBy.name} · ${formatDateTime(item.submittedAt)}` : '—'}
          </Field>
          <Field label="Người duyệt">
            {item.approvedBy ? `${item.approvedBy.name} · ${formatDateTime(item.approvedAt)}` : '—'}
          </Field>
        </div>
      </Card>

      {/* The history of the row: what was counted each time the owner decided something. */}
      {histories.length > 0 && (
        <Card className="space-y-4 p-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lịch sử dòng</h3>
            <p className="mt-1 text-sm text-gray-600">
              Mỗi lần được duyệt, từ chối hoặc yêu cầu đếm lại đều được ghi lại kèm số của từng
              người kiểm kê.
            </p>
          </div>

          {histories.map((history) => (
            <div key={history.id} className="rounded-md border border-gray-200 p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {HISTORY_ACTION_LABELS[history.action]}
                </span>
                <span className="text-xs text-gray-500">
                  lần {history.revision} · {formatDateTime(history.createdAt)}
                  {history.actor ? ` · ${history.actor.name}` : ''}
                </span>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Số của dòng lúc đó: {history.countedQty} dùng được
                {history.countedDamagedQty > 0 && `, ${history.countedDamagedQty} hàng hỏng`}
                {history.snapshotQty !== undefined && ` (tồn khi bắt đầu: ${history.snapshotQty})`}
              </p>

              {(history.counts ?? []).length > 0 && (
                <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Người kiểm kê</th>
                        <th className="px-3 py-2">Số dùng được</th>
                        <th className="px-3 py-2">Hàng hỏng</th>
                        <th className="px-3 py-2">Lý do</th>
                        <th className="px-3 py-2">Đã nộp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(history.counts ?? []).map((count) => (
                        <tr key={count.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-900">
                            {count.counter?.name ?? '—'}
                          </td>
                          <td className="px-3 py-2">{count.countedQty}</td>
                          <td className="px-3 py-2">{count.countedDamagedQty}</td>
                          <td className="px-3 py-2 whitespace-pre-wrap break-words text-gray-700">
                            {count.discrepancyReason || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {count.submittedAt ? formatDateTime(count.submittedAt) : 'Chưa nộp'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* The photos taken at that moment, behind a button so the numbers stay readable. */}
              {(history.images ?? []).length > 0 && (
                <div className="mt-3">
                  <AuditHistoryGallery
                    counts={history.counts ?? []}
                    images={history.images ?? []}
                  />
                </div>
              )}

              {/* The reason sits below the numbers and the photos. */}
              {history.reason && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-900">
                    Lý do {HISTORY_ACTION_LABELS[history.action].toLowerCase()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-amber-800">
                    {history.reason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      <PermissionGate permission="inventory.audit.approve_item" fallback={null}>
        {canRecount && (
          <Card className="space-y-4 border-orange-300 bg-orange-50 p-6">
            <div>
              <h3 className="text-lg font-semibold text-orange-900">
                Hai người kiểm kê có số khác nhau
              </h3>
              <p className="mt-1 text-sm text-orange-800">
                {item.assignedTo?.name ?? 'Người kiểm kê'} đếm {firstCount},{' '}
                {item.secondCounter?.name ?? 'người kiểm kê thứ hai'} đếm {secondCount}. Bạn có thể yêu
                cầu cả hai kiểm kê lại dòng này; khi đó hai số cũ sẽ bị xóa và bắt đầu đếm lại từ đầu.
              </p>
            </div>

            {recounting ? (
              <div className="space-y-3">
                <Label htmlFor="recountReason" className="font-semibold">
                  Vì sao cần kiểm kê lại? <span className="text-red-600">*</span>
                </Label>
                <textarea
                  id="recountReason"
                  value={recountReason}
                  onChange={(e) => setRecountReason(e.target.value.slice(0, MAX_REJECT_REASON))}
                  disabled={acting}
                  rows={3}
                  placeholder="Ví dụ: hai số lệch nhau 5, vui lòng kiểm kê lại kệ B2."
                  className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {recountReason.length} / {MAX_REJECT_REASON}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={acting}
                      onClick={() => {
                        setRecounting(false);
                        setActionError(null);
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={handleRecount}
                      disabled={acting}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {acting ? 'Đang yêu cầu...' : 'Yêu cầu kiểm kê lại'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setRecounting(true)}
                disabled={acting}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Yêu cầu kiểm kê lại
              </Button>
            )}
          </Card>
        )}
      </PermissionGate>

      <PermissionGate permission="inventory.audit.approve_item" fallback={null}>
        {canReview && (
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Duyệt dòng kiểm kê</h3>

            {rejecting ? (
              <div className="space-y-3">
                <Label htmlFor="rejectReason" className="font-semibold">
                  Vì sao trả lại kết quả đếm này? <span className="text-red-600">*</span>
                </Label>
                <textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value.slice(0, MAX_REJECT_REASON))}
                  disabled={acting}
                  rows={3}
                  placeholder="Ví dụ: vui lòng đếm lại kệ B2, số lượng có vẻ quá thấp."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {rejectReason.length} / {MAX_REJECT_REASON}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={acting}
                      onClick={() => {
                        setRejecting(false);
                        setActionError(null);
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={acting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {acting ? 'Đang trả lại...' : 'Trả lại để đếm lại'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={acting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {acting ? 'Đang duyệt...' : 'Duyệt'}
                </Button>
                <Button variant="outline" disabled={acting} onClick={() => setRejecting(true)}>
                  Từ chối
                </Button>
              </div>
            )}
          </Card>
        )}
      </PermissionGate>

      <PermissionGate permission="inventory.audit.create" fallback={null}>
        {canReassign && (
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Phân công lại</h3>
              <p className="text-sm text-gray-600 mt-1">
                Chuyển dòng này cho nhân viên khác khi người phụ trách đã nghỉ việc hoặc không có mặt
                hôm nay.
              </p>
            </div>

            {membersError && (
              <Alert className="bg-red-50 border-red-200 text-red-700 text-sm">{membersError}</Alert>
            )}

            {assigneeInactive && (
              <Alert className="bg-amber-50 border-amber-200 text-amber-800 text-sm">
                {item.assignedTo?.name} không còn là nhân viên đang hoạt động của cửa hàng. Hãy chuyển
                dòng này cho người khác.
              </Alert>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-64">
                <Label htmlFor="reassign-user" className="font-semibold">
                  Giao cho
                </Label>
                <select
                  id="reassign-user"
                  value={targetUserId}
                  disabled={reassigning || membersLoading}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100"
                >
                  <option value="" disabled>
                    Chọn nhân viên
                  </option>
                  {reassignOptions.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-64">
                <Label htmlFor="second-counter-user" className="font-semibold">
                  Người kiểm kê thứ hai <span className="text-red-600">*</span>
                </Label>
                <select
                  id="second-counter-user"
                  value={secondCounterUserId}
                  disabled={reassigning || membersLoading}
                  onChange={(e) => setSecondCounterUserId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100"
                >
                  <option value="">Chọn người kiểm kê thứ hai</option>
                  {secondCounterOptions.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleReassign}
                disabled={reassigning || !targetUserId || !secondCounterUserId}
                className="bg-[#0f4c3a] hover:bg-[#0a3528] text-white"
              >
                {reassigning ? 'Đang chuyển...' : 'Chuyển cho nhân viên này'}
              </Button>
            </div>

            {!membersLoading && reassignOptions.length === 0 && (
              <p className="text-sm text-amber-700">
                Không còn nhân viên nào khác đang hoạt động để nhận dòng này.
              </p>
            )}
          </Card>
        )}
      </PermissionGate>
    </div>,
  );
}
