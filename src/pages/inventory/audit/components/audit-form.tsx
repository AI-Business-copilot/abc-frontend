import React, { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Card } from '../../../../components/ui/card';
import { Spinner } from '../../../../components/ui/spinner';
import type { CreateAuditRequest, AuditType } from '../../../../types/audit';

interface AuditFormProps {
  onSubmit: (data: CreateAuditRequest) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
}

/** Audit header only. Items (employee + SKU + lot) are added afterwards on the audit detail page. */
export function AuditForm({
  onSubmit,
  loading = false,
  error = null,
  submitLabel = 'Create Audit',
}: AuditFormProps) {
  const [auditType, setAuditType] = useState<AuditType>('NEW_LOTS');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    try {
      await onSubmit({
        auditType,
        note: note.trim() || undefined,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create audit');
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {(error || localError) && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
            {error || localError}
          </div>
        )}

        <div>
          <Label htmlFor="auditType" className="font-semibold">
            Audit Type <span className="text-red-600">*</span>
          </Label>
          <select
            id="auditType"
            value={auditType}
            onChange={(e) => setAuditType(e.target.value as AuditType)}
            disabled={loading}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="RE_AUDIT">Re-audit (existing lots only)</option>
            <option value="NEW_LOTS">New lots (every item is a new lot)</option>
          </select>
        </div>

        <div>
          <Label htmlFor="note" className="font-semibold">
            Note (Optional)
          </Label>
          <textarea
            id="note"
            placeholder="e.g., Monthly inventory check"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}
