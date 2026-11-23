import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';

interface ItemCounterProps {
  snapshotQty: number;
  initialCountedQty?: number;
  initialCountedDamagedQty?: number;
  onCountChange: (countedQty: number) => void;
  onDamagedCountChange?: (countedDamagedQty: number) => void;
  disabled?: boolean;
}

export function ItemCounter({
  snapshotQty,
  initialCountedQty = 0,
  initialCountedDamagedQty = 0,
  onCountChange,
  onDamagedCountChange,
  disabled = false,
}: ItemCounterProps) {
  const [countedQty, setCountedQty] = useState(initialCountedQty);
  const [countedDamagedQty, setCountedDamagedQty] = useState(initialCountedDamagedQty);
  // The total is derived, never typed: usable + broken.
  const totalQty = countedQty + countedDamagedQty;
  const diffQty = countedQty - snapshotQty;
  const hasDiscrepancy = diffQty !== 0;

  useEffect(() => {
    setCountedQty(initialCountedQty);
  }, [initialCountedQty]);

  useEffect(() => {
    setCountedDamagedQty(initialCountedDamagedQty);
  }, [initialCountedDamagedQty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setCountedQty(value);
    onCountChange(value);
  };

  const handleDamagedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setCountedDamagedQty(value);
    onDamagedCountChange?.(value);
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

  const incrementDamaged = () => {
    const newValue = countedDamagedQty + 1;
    setCountedDamagedQty(newValue);
    onDamagedCountChange?.(newValue);
  };

  const decrementDamaged = () => {
    const newValue = Math.max(0, countedDamagedQty - 1);
    setCountedDamagedQty(newValue);
    onDamagedCountChange?.(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Số Lượng hàng trong hệ thống</Label>
          <p className="text-lg font-semibold text-gray-900">{snapshotQty}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Label htmlFor="counted-qty" className="text-sm font-medium">
            Số Lượng Hàng Đếm Được
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
          <Label className="text-sm font-medium">Chênh lệch</Label>
          <p
            className={`text-lg font-semibold ${hasDiscrepancy ? 'text-red-600' : 'text-green-600'
              }`}
          >
            {diffQty >= 0 ? '+' : ''}
            {diffQty}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col items-center gap-2">
            <Label htmlFor="counted-damaged-qty" className="text-sm font-medium">
              Số Lượng Hàng Hỏng
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={decrementDamaged}
                disabled={disabled || countedDamagedQty === 0}
                className="h-8 w-8 p-0"
              >
                −
              </Button>
              <Input
                id="counted-damaged-qty"
                type="number"
                min="0"
                value={countedDamagedQty}
                onChange={handleDamagedChange}
                disabled={disabled}
                className="w-20 text-center text-lg font-semibold"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={incrementDamaged}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Label className="text-sm font-medium">Tổng số lượng bàn giao</Label>
            <p className="text-lg font-semibold text-gray-900">{totalQty}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          Tổng số lượng = số lượng sử dụng được + số lượng hàng hỏng. Tổng được tính tự động, không cần nhập.
        </p>
      </div>

      {hasDiscrepancy && (
        <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-700">
          Có chênh lệch so với Số Lượng hàng trong hệ thống. Vui lòng nhập lý do.
        </div>
      )}
    </div>
  );
}
