import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { Label } from '../../../components/ui/label';
import { Spinner } from '../../../components/ui/spinner';
import { PermissionGate } from '../../../components/common/permission-gate';
import { AuditItemStatusBadge } from './components/audit-item-list';
import { useAudit } from './hooks/use-audit';
import { CatalogHeader } from '../../products/catalog-header';
import { auditApi } from '../../../api/audit';
import type { StockAuditItem } from '../../../types/audit';

const MAX_REJECT_REASON = 1000;

const formatDateTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

const formatDate = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

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

  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

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
  // A new lot is not in the system yet, so there is no system quantity or difference to show
  const isNewLot = Boolean(item.isNewLot);
  const canReview = audit?.status === 'IN_PROGRESS' && item.itemStatus === 'PENDING_APPROVAL';
  const wasRejected = item.itemStatus === 'IN_PROGRESS' && Boolean(item.rejectionReason);

  return pageFrame(
    <div className="space-y-6">
      {header}

      {actionError && (
        <Alert className="bg-red-50 border-red-200 text-red-700">{actionError}</Alert>
      )}

      <Card className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{item.productName}</h2>
              <AuditItemStatusBadge status={item.itemStatus} />
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Lô">
            {item.lotNumber ? (
              <>
                {item.lotNumber}
                {item.isNewLot && <span className="ml-2 text-xs text-amber-700">lô mới</span>}
              </>
            ) : (
              <span className="text-amber-700">Chưa chọn</span>
            )}
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
        </div>

        <div
          className={`grid gap-4 rounded-lg bg-gray-50 p-4 text-center ${isNewLot ? 'grid-cols-1' : 'grid-cols-3'}`}
        >
          {!isNewLot && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Số Lượng hàng trong hệ thống</p>
              <p className="text-2xl font-semibold text-gray-900">{item.snapshotQty}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Số Lượng Hàng Sử Dụng Được</p>
            <p className="text-2xl font-semibold text-gray-900">{item.countedQty}</p>
          </div>
          {!isNewLot && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Chênh lệch</p>
              <p className={`text-2xl font-semibold ${hasDiff ? 'text-red-600' : 'text-green-600'}`}>
                {diff > 0 ? '+' : ''}
                {diff}
              </p>
            </div>
          )}
        </div>

        {item.datesCorrected && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Nhân viên đã sửa ngày của lô này. Ngày sẽ được ghi vào lô khi đợt kiểm kê được áp dụng.
          </p>
        )}

        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {!isNewLot && hasDiff ? `Lý do chênh lệch ${diff > 0 ? '+' : ''}${diff}` : 'Lý do kiểm kê'}
          </p>
          <p className="text-sm text-amber-800 mt-1 whitespace-pre-wrap">
            {item.discrepancyReason || 'Không có lý do nào được nhập.'}
          </p>
        </div>

        {wasRejected && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">
              Bị trả lại để đếm lại
              {item.rejectedBy ? ` bởi ${item.rejectedBy.name}` : ''} lúc {formatDateTime(item.rejectedAt)}
            </p>
            <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap">{item.rejectionReason}</p>
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
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
    </div>,
  );
}
