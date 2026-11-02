import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Alert } from '../../../components/ui/alert';
import { Spinner } from '../../../components/ui/spinner';
import { PermissionGate } from '../../../components/common/permission-gate';
import { AuditStatusBadge } from './components/audit-status-badge';
import { AuditItemList } from './components/audit-item-list';
import { AssignStaffModal } from './components/assign-staff-modal';
import { useAudit } from './hooks/use-audit';
import { useAuditItems } from './hooks/use-audit-items';
import { useAuditActions } from './hooks/use-audit-actions';
import { useAuth } from '../../../hooks/use-auth';
import { usePermissions } from '../../../hooks/use-permissions';
import { CatalogHeader } from '../../products/catalog-header';
import type { StockAuditItem } from '../../../types/audit';

export function AuditDetailPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const { audit, loading: auditLoading, error: auditError, refetch: refetchAudit } = useAudit(auditId);
  const {
    items,
    page,
    totalPages,
    loading: itemsLoading,
    error: itemsError,
    goToPage,
    refetch: refetchItems,
  } = useAuditItems(auditId);
  const { loading: actionLoading, approveAudit, applyAudit } = useAuditActions();
  const { profile } = useAuth();
  const { can, isOwner } = usePermissions();

  // Right after an audit is created, the create page sends the owner here with openAddItems set
  const location = useLocation();
  const navState = location.state as { message?: string; openAddItems?: boolean } | null;

  const [actionMessage, setActionMessage] = useState<string | null>(navState?.message ?? null);
  const [showAssignModal, setShowAssignModal] = useState(Boolean(navState?.openAddItems));

  const handleApprove = async () => {
    if (!auditId) return;
    try {
      await approveAudit(auditId);
      setActionMessage('Audit approved successfully');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleApply = async () => {
    if (!auditId) return;
    if (!confirm('Apply this audit? This will update inventory and create ledger entries.')) {
      return;
    }
    try {
      await applyAudit(auditId);
      setActionMessage('Audit applied successfully');
      setTimeout(() => {
        navigate('/inventory/audit', {
          state: { message: 'Audit applied successfully' },
        });
      }, 2000);
    } catch (err) {
      // Error handled by hook
    }
  };

  if (auditLoading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
        <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
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
        <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
        <main className="mx-auto max-w-[1580px] space-y-4 px-5 py-5">
          <Button variant="outline" onClick={() => navigate('/inventory/audit')}>
            ← Back to Audits
          </Button>
          <Alert className="bg-red-50 border-red-200 text-red-700">
            {auditError || 'Audit not found'}
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

  const canApprove = audit.status === 'IN_PROGRESS';
  const canApply = audit.status === 'PENDING_APPROVAL';

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-6 px-5 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/inventory/audit')}>
            ← Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{audit.auditCode}</h1>
              <AuditStatusBadge status={audit.status} />
            </div>
            <p className="text-gray-600">
              Items: {audit.itemCount} | Started: {new Date(audit.countStartAt).toLocaleDateString()}
              {audit.createdBy ? ` | Created by: ${audit.createdBy.name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {audit.status === 'IN_PROGRESS' && (
            <PermissionGate permission="inventory.audit.create" fallback={null}>
              <Button onClick={() => setShowAssignModal(true)}>Add items</Button>
            </PermissionGate>
          )}
          <PermissionGate permission="inventory.audit.approve" fallback={null}>
            {canApprove && (
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {actionLoading ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {canApply && (
              <Button
                onClick={handleApply}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading ? 'Applying...' : 'Apply Audit'}
              </Button>
            )}
          </PermissionGate>
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

      {showAssignModal && auditId && (
        <AssignStaffModal
          auditId={auditId}
          existingItems={items}
          onClose={() => setShowAssignModal(false)}
          onAssignSuccess={() => {
            setActionMessage('Assignments updated');
            setTimeout(() => setActionMessage(null), 3000);
            refetchItems();
            refetchAudit();
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {audit.status.replace(/_/g, ' ')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Items</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{audit.itemCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Started</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {new Date(audit.countStartAt).toLocaleDateString()}
          </p>
        </div>
        {audit.completedAt && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {new Date(audit.completedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Audit Items</h2>
        {itemsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center space-y-3">
                <p className="text-gray-700 font-medium">No items yet</p>
                <p className="text-sm text-gray-500">
                  Add the SKUs to count, assign each one to an employee, and optionally pick a lot.
                </p>
                {audit.status === 'IN_PROGRESS' && (
                  <PermissionGate permission="inventory.audit.create" fallback={null}>
                    <Button onClick={() => setShowAssignModal(true)}>Add items</Button>
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
                actionLabel="Count"
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
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
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
