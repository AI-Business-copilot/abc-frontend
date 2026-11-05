import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { PermissionGate } from '../../../components/common/permission-gate';
import { AuditStatusBadge } from './components/audit-status-badge';
import { useAudits } from './hooks/use-audits';
import { CatalogHeader } from '../../products/catalog-header';
import type { AuditStatus } from '../../../types/audit';

export function AuditListPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | undefined>(undefined);
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

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-6 px-5 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Audit</h1>
          <p className="text-gray-600 mt-1">Manage inventory audits</p>
        </div>
        <PermissionGate permission="inventory.audit.create">
          <Button onClick={() => navigate('/inventory/audit/create')}>
            + New Audit
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
          All ({total})
        </Button>
        <Button
          variant={statusFilter === 'IN_PROGRESS' ? 'default' : 'outline'}
          onClick={() => handleStatusChange('IN_PROGRESS')}
        >
          In Progress
        </Button>
        <Button
          variant={statusFilter === 'PENDING_APPROVAL' ? 'default' : 'outline'}
          onClick={() => handleStatusChange('PENDING_APPROVAL')}
        >
          Pending Approval
        </Button>
        <Button
          variant={statusFilter === 'DONE' ? 'default' : 'outline'}
          onClick={() => handleStatusChange('DONE')}
        >
          Done
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : audits.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600">No audits found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <Card key={audit.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{audit.auditCode}</h3>
                    <AuditStatusBadge status={audit.status} />
                  </div>
                  <div className="text-sm text-gray-600 space-x-3">
                    <span>Scope: {audit.scopeType}</span>
                    <span>•</span>
                    <span>Items: {audit.itemCount}</span>
                    <span>•</span>
                    <span>Started: {new Date(audit.countStartAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAudit(audit.id)}
                  >
                    View Details
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
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
      </main>
    </div>
  );
}
