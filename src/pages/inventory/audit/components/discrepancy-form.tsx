import React, { useState, useEffect } from 'react';
import { Label } from '../../../../components/ui/label';
import { AlertCircle } from 'lucide-react';

interface DiscrepancyFormProps {
  diffQty: number | null;
  initialReason?: string | null;
  onReasonChange: (reason: string | null) => void;
  disabled?: boolean;
}

const MAX_REASON_LENGTH = 1000;

export function DiscrepancyForm({
  diffQty,
  initialReason = '',
  onReasonChange,
  disabled = false,
}: DiscrepancyFormProps) {
  const [reason, setReason] = useState(initialReason || '');
  const hasDiscrepancy = diffQty !== null && diffQty !== 0;
  const isRequired = hasDiscrepancy;
  const charCount = reason.length;
  // const isOver = charCount > MAX_REASON_LENGTH;

  useEffect(() => {
    setReason(initialReason || '');
  }, [initialReason]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_REASON_LENGTH) {
      setReason(value);
      onReasonChange(value || null);
    }
  };

  if (!hasDiscrepancy) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <Label className="text-sm font-semibold text-amber-900">
            Discrepancy Reason {isRequired && <span className="text-red-600">*</span>}
          </Label>
          <p className="text-xs text-amber-800 mt-1">
            A difference of {diffQty} unit{Math.abs(diffQty) !== 1 ? 's' : ''} was found.
            Please explain the reason.
          </p>
        </div>
      </div>

      <textarea
        value={reason}
        onChange={handleChange}
        disabled={disabled}
        placeholder="e.g., Found 1 damaged item in corner, 2 missing tags..."
        maxLength={MAX_REASON_LENGTH}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 resize-none"
        rows={3}
      />

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {charCount} / {MAX_REASON_LENGTH}
        </div>
        {isRequired && !reason && (
          <div className="text-xs text-red-600 font-medium">This field is required</div>
        )}
        {reason && !isRequired && (
          <div className="text-xs text-green-600 font-medium">✓</div>
        )}
      </div>
    </div>
  );
}
