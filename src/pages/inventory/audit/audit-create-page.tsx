import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Alert } from '../../../components/ui/alert';
import { AuditForm } from './components/audit-form';
import { useAuditActions } from './hooks/use-audit-actions';
import { CatalogHeader } from '../../products/catalog-header';
import type { CreateAuditRequest } from '../../../types/audit';

export function AuditCreatePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const { loading, error, createAudit, clearError } = useAuditActions();

  const handleSubmit = async (data: CreateAuditRequest) => {
    try {
      const newAudit = await createAudit(data);
      navigate(`/inventory/audit/${newAudit.id}`, {
        state: { message: 'Audit created. Add items to start counting.', openAddItems: true },
      });
    } catch (err) {
      // Error is handled by the form
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-6 px-5 py-5">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/inventory/audit')}
        >
          ← Back to Audits
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Audit</h1>
          <p className="text-gray-600 mt-1">Start a new inventory audit</p>
        </div>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-700">
          <button
            onClick={clearError}
            className="absolute right-4 top-4 text-red-600 hover:text-red-800"
          >
            ×
          </button>
          {error}
        </Alert>
      )}

      <AuditForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        submitLabel={loading ? 'Creating...' : 'Create Audit'}
      />

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">Before creating an audit:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Create the audit first, then add items on its detail page</li>
          <li>
            The audit type decides the lots: New lots means every item is a new lot the employee types
            in; Re-audit means every item uses an existing lot you pick when adding it
          </li>
          <li>On a re-audit the employee keeps that lot and can still correct its dates and enter the count</li>
          <li>A lot that does not exist yet is created when you apply the audit</li>
        </ul>
      </div>
      </main>
    </div>
  );
}
