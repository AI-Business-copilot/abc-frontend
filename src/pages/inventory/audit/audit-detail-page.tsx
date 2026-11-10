import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Alert } from '../../../components/ui/alert';
import { Spinner } from '../../../components/ui/spinner';
import { PermissionGate } from '../../../components/common/permission-gate';
import { AuditStatusBadge, AUDIT_STATUS_LABELS } from './components/audit-status-badge';
import { AuditItemList } from './components/audit-item-list';
import { AssignStaffModal } from './components/assign-staff-modal';
import { ReassignItemsModal } from './components/reassign-items-modal';
import { useAudit } from './hooks/use-audit';
import { useAuditItems } from './hooks/use-audit-items';
import { useAuth } from '../../../hooks/use-auth';
import { usePermissions } from '../../../hooks/use-permissions';
import { CatalogHeader } from '../../products/catalog-header';
import type { StockAuditItem } from '../../../types/audit';

export function AuditDetailPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const { profile } = useAuth();
  const { can, isOwner, isStaff } = usePermissions();
  // Staff only count the items assigned to them, so they can filter the list down to those.
  const [onlyMine, setOnlyMine] = useState(isStaff);
  const { audit, loading: auditLoading, error: auditError, refetch: refetchAudit } = useAudit(auditId);
  const {
    items,
    total,
    page,
    totalPages,
    loading: itemsLoading,
    error: itemsError,
    goToPage,
    refetch: refetchItems,
  } = useAuditItems(auditId, { mine: onlyMine });

  // Right after an audit is created, the create page sends the owner here with openAddItems set
  const location = useLocation();
  const navState = location.state as { message?: string; openAddItems?: boolean } | null;

  const [actionMessage, setActionMessage] = useState<string | null>(navState?.message ?? null);
  const [showAssignModal, setShowAssignModal] = useState(Boolean(navState?.openAddItems));
  const [showReassignModal, setShowReassignModal] = useState(false);

  if (auditLoading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
        <CatalogHeader active="stock-audit" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
        <main className="mx-auto max-w-[1580px] px-5 py-5">
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        </main>
      </div>
    );
  }

  if (!audit || auditError) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
        <CatalogHeader active="stock-audit" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
        <main className="mx-auto max-w-[1580px] space-y-4 px-5 py-5">
          <Button variant="outline" onClick={() => navigate('/inventory/audit')}>
            ← Quay lại danh sách
          </Button>
          <Alert className="bg-red-50 border-red-200 text-red-700">
            {auditError || 'Không tìm thấy đợt kiểm kê'}
          </Alert>
        </main>
      </div>
    );
  }

  // Counting happens per item: the assigned employee (or the owner) can count an item that is still in progress
  const canCountItem = (item: StockAuditItem) =>
    audit.status === 'IN_PROGRESS' &&
    item.itemStatus === 'IN_PROGRESS' &&
    can('inventory.audit.count') &&
    (isOwner || item.assignedTo?.id === profile?.user.id);

  // Older audits may not have a type; they behave like new-lot audits.
  const auditType = audit.auditType ?? 'NEW_LOTS';

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="stock-audit" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-6 px-5 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/inventory/audit')}>
              ← Quay lại
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{audit.auditCode}</h1>
                <AuditStatusBadge status={audit.status} />
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {auditType === 'RE_AUDIT' ? 'Kiểm kê lại - lô có sẵn' : 'Lô mới'}
                </span>
              </div>
              <p className="text-gray-600">
                Số dòng: {audit.itemCount} | Bắt đầu: {new Date(audit.countStartAt).toLocaleDateString('vi-VN')}
                {audit.createdBy ? ` | Người tạo: ${audit.createdBy.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {audit.status === 'IN_PROGRESS' && (
              <PermissionGate permission="inventory.audit.create" fallback={null}>
                <Button onClick={() => setShowAssignModal(true)}>Thêm dòng</Button>
              </PermissionGate>
            )}
          </div>
        </div>

        {itemsError && (
          <Alert className="bg-red-50 border-red-200 text-red-700">
            {itemsError}
          </Alert>
        )}

        {actionMessage && (
          <Alert className="bg-green-50 border-green-200 text-green-700">
            {actionMessage}
          </Alert>
        )}

        {audit.status === 'IN_PROGRESS' && can('inventory.audit.approve_item') && (
          <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-sm">
            Duyệt từng dòng bên dưới. Đợt kiểm kê sẽ được áp dụng vào tồn kho ngay khi dòng cuối cùng được
            duyệt, sau đó chuyển sang trạng thái Hoàn thành.
          </Alert>
        )}

        {showAssignModal && auditId && (
          <AssignStaffModal
            auditId={auditId}
            auditType={auditType}
            existingItems={items}
            onClose={() => setShowAssignModal(false)}
            onAssignSuccess={() => {
              setActionMessage('Đã cập nhật phân công');
              setTimeout(() => setActionMessage(null), 3000);
              refetchItems();
              refetchAudit();
            }}
          />
        )}

        {showReassignModal && auditId && (
          <ReassignItemsModal
            auditId={auditId}
            onClose={() => setShowReassignModal(false)}
            onReassigned={(count) => {
              setShowReassignModal(false);
              setActionMessage(`Đã chuyển ${count} dòng sang người phụ trách mới`);
              setTimeout(() => setActionMessage(null), 3000);
              refetchItems();
              refetchAudit();
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Trạng thái</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {AUDIT_STATUS_LABELS[audit.status]}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Số dòng</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{audit.itemCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Bắt đầu</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {new Date(audit.countStartAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
          {audit.completedAt && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Hoàn thành</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {new Date(audit.completedAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">Dòng kiểm kê</h2>
            {isStaff && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={onlyMine}
                  onChange={(e) => setOnlyMine(e.target.checked)}
                />
                Chỉ dòng của tôi ({total})
              </label>
            )}
          </div>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center space-y-3">
                  <p className="text-gray-700 font-medium">
                    {onlyMine ? 'Bạn chưa được giao dòng nào trong đợt kiểm kê này' : 'Chưa có dòng nào'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {onlyMine
                      ? 'Bỏ chọn "Chỉ dòng của tôi" để xem toàn bộ đợt kiểm kê.'
                      : 'Thêm các SKU cần kiểm kê và giao từng dòng cho nhân viên. Đợt kiểm kê lô mới không cần lô, còn kiểm kê lại cần một lô có sẵn cho mỗi SKU.'}
                  </p>
                  {audit.status === 'IN_PROGRESS' && !onlyMine && (
                    <PermissionGate permission="inventory.audit.create" fallback={null}>
                      <Button onClick={() => setShowAssignModal(true)}>Thêm dòng</Button>
                    </PermissionGate>
                  )}
                </div>
              ) : (
                <AuditItemList
                  items={items}
                  onItemClick={(item) =>
                    navigate(`/inventory/audit/${auditId}/count?itemId=${item.id}`)
                  }
                  canEditItem={canCountItem}
                  actionLabel="Đếm"
                  onViewDetails={
                    can('inventory.audit.approve_item')
                      ? (item) => navigate(`/inventory/audit/${auditId}/items/${item.id}`)
                      : undefined
                  }
                />
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                  >
                    Trước
                  </Button>
                  <span className="text-sm text-gray-600">
                    Trang {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
