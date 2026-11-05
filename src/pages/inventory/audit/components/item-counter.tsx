import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';

interface ItemCounterProps {
  snapshotQty: number;
  initialCountedQty?: number;
  onCountChange: (countedQty: number) => void;
  disabled?: boolean;
  /** A new lot does not exist in the system yet, so only the count is shown. */
  isNewLot?: boolean;
}

export function ItemCounter({
  snapshotQty,
  initialCountedQty = 0,
  onCountChange,
  disabled = false,
  isNewLot = false,
}: ItemCounterProps) {
  const [countedQty, setCountedQty] = useState(initialCountedQty);
  const diffQty = countedQty - snapshotQty;
  const hasDiscrepancy = diffQty !== 0;
  const showSystemQty = !isNewLot;

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
      <div className={`flex items-center ${showSystemQty ? 'justify-between' : 'justify-center'}`}>
        {showSystemQty && (
          <div>
            <Label className="text-sm font-medium">Số Lượng hàng trong hệ thống</Label>
            <p className="text-lg font-semibold text-gray-900">{snapshotQty}</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <Label htmlFor="counted-qty" className="text-sm font-medium">
            Số Lượng Hàng Sử Dụng Được
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

        {showSystemQty && (
          <div>
            <Label className="text-sm font-medium">Chênh lệch</Label>
            <p
              className={`text-lg font-semibold ${hasDiscrepancy ? 'text-red-600' : 'text-green-600'
                }`}
            >
              {diffQty >= 0 ? '+' : ''}
              {diffQty}
            </p>
          </div>
        )}
      </div>

      {showSystemQty && hasDiscrepancy && (
        <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-700">
          Có chênh lệch so với Số Lượng hàng trong hệ thống. Vui lòng nhập lý do.
        </div>
      )}
    </div>
  );
}
