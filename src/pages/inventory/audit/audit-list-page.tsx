import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { PermissionGate } from '../../../components/common/permission-gate';
import { AuditStatusBadge } from './components/audit-status-badge';
import { useAudits } from './hooks/use-audits';
import { CatalogHeader } from '../../products/catalog-header';
import type { AuditScopeType, AuditStatus } from '../../../types/audit';

export function AuditListPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | undefined>(undefined);
  const SCOPE_LABELS: Record<AuditScopeType, string> = {
    FULL_STORE: 'Toàn cửa hàng',
    CATEGORY: 'Theo danh mục',
    SHELF: 'Theo kệ',
  };

  const { audits, total, page, totalPages, loading, error, goToPage, updateFilter } = useAudits({
    status: statusFilter,
  });

  const handleStatusChange = (status: AuditStatus | undefined) => {
    setStatusFilter(status);
    updateFilter({ status });
  };

  const handleViewAudit = (auditId: string) => {
    navigate(`/inventory/audit/${auditId}`);
  };

  // The backend has no text search, so the header box narrows the loaded page.
  const needle = keyword.trim().toLowerCase();
  const visible = needle
    ? audits.filter((audit) => audit.auditCode.toLowerCase().includes(needle))
    : audits;

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="stock-audit" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-6 px-5 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kiểm kê tồn kho</h1>
          <p className="text-gray-600 mt-1">Quản lý các đợt kiểm kê tồn kho</p>
        </div>
        <PermissionGate permission="inventory.audit.create">
          <Button onClick={() => navigate('/inventory/audit/create')}>
            + Tạo đợt kiểm kê
          </Button>
        </PermissionGate>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-700">
          {error}
        </Alert>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === undefined ? 'default' : 'outline'}
          onClick={() => handleStatusChange(undefined)}
        >
          Tất cả ({total})
        </Button>
        <Button
          variant={statusFilter === 'IN_PROGRESS' ? 'default' : 'outline'}
          onClick={() => handleStatusChange('IN_PROGRESS')}
        >
          Đang thực hiện
        </Button>
        <Button
          variant={statusFilter === 'PENDING_APPROVAL' ? 'default' : 'outline'}
          onClick={() => handleStatusChange('PENDING_APPROVAL')}
        >
          Chờ duyệt
        </Button>
        <Button
          variant={statusFilter === 'DONE' ? 'default' : 'outline'}
          onClick={() => handleStatusChange('DONE')}
        >
          Hoàn thành
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600">Không có đợt kiểm kê nào</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((audit) => (
            <Card key={audit.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{audit.auditCode}</h3>
                    <AuditStatusBadge status={audit.status} />
                  </div>
                  <div className="text-sm text-gray-600 space-x-3">
                    <span>Phạm vi: {SCOPE_LABELS[audit.scopeType]}</span>
                    <span>•</span>
                    <span>Số dòng: {audit.itemCount}</span>
                    <span>•</span>
                    <span>Bắt đầu: {new Date(audit.countStartAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                <div className="flex gap-2">

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAudit(audit.id)}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => goToPage(page - 1)}
            disabled={page === 1 || loading}
          >
            Trước
          </Button>
          <span className="text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages || loading}
          >
            Sau
          </Button>
        </div>
      )}
      </main>
    </div>
  );
}
