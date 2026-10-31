import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';

interface ItemCounterProps {
  snapshotQty: number;
  initialCountedQty?: number;
  onCountChange: (countedQty: number) => void;
  disabled?: boolean;
}

export function ItemCounter({
  snapshotQty,
  initialCountedQty = 0,
  onCountChange,
  disabled = false,
}: ItemCounterProps) {
  const [countedQty, setCountedQty] = useState(initialCountedQty);
  const diffQty = countedQty - snapshotQty;
  const hasDiscrepancy = diffQty !== 0;

  useEffect(() => {
    setCountedQty(initialCountedQty);
  }, [initialCountedQty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setCountedQty(value);
    onCountChange(value);
  };

  const increment = () => {
    const newValue = countedQty + 1;
    setCountedQty(newValue);
    onCountChange(newValue);
  };

  const decrement = () => {
    const newValue = Math.max(0, countedQty - 1);
    setCountedQty(newValue);
    onCountChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">System Qty</Label>
          <p className="text-lg font-semibold text-gray-900">{snapshotQty}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Label htmlFor="counted-qty" className="text-sm font-medium">
            Counted Qty
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={decrement}
              disabled={disabled || countedQty === 0}
              className="h-8 w-8 p-0"
            >
              −
            </Button>
            <Input
              id="counted-qty"
              type="number"
              min="0"
              value={countedQty}
              onChange={handleChange}
              disabled={disabled}
              className="w-20 text-center text-lg font-semibold"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={increment}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              +
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Difference</Label>
          <p
            className={`text-lg font-semibold ${
              hasDiscrepancy ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {diffQty >= 0 ? '+' : ''}
            {diffQty}
          </p>
        </div>
      </div>

      {hasDiscrepancy && (
        <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-700">
          Discrepancy detected. Please provide a reason.
        </div>
      )}
    </div>
  );
}
