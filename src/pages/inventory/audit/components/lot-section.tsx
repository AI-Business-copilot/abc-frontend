import { useState } from 'react';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import type { AuditType, StockAuditItem, UpdateAuditItemRequest } from '../../../../types/audit';

export type LotSelection = Pick<
  UpdateAuditItemRequest,
  'lotItemId' | 'newLotNumber' | 'newLotExpirationDate' | 'newLotManufacturingDate'
>;

const toDateInput = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

interface LotSectionProps {
  item: StockAuditItem;
  /** A new-lot audit makes the employee type a lot; a re-audit keeps the lot the owner assigned. */
  auditType: AuditType;
  disabled?: boolean;
  /** Called whenever the lot or one of its dates changes. `systemQty` is the quantity on hand for that lot. */
  onChange: (selection: LotSelection, systemQty: number) => void;
}

/**
 * Lot section for the count page. The audit type decides the whole group:
 * - New-lot audit: the row is a lot that does not exist yet, so the employee types the number and expiry.
 * - Re-audit: the lot was chosen by the owner and is fixed. Only its dates can be corrected.
 */
export function LotSection({ auditType, ...props }: LotSectionProps) {
  return auditType === 'RE_AUDIT' ? <FixedLot {...props} /> : <NewLot {...props} />;
}

type ModeProps = Omit<LotSectionProps, 'auditType'>;

/** New lot: number and expiry typed by the employee; the lot is created when the owner applies the audit. */
function NewLot({ item, disabled, onChange }: ModeProps) {
  const [number, setNumber] = useState(item.lotNumber ?? '');
  const [expiry, setExpiry] = useState(toDateInput(item.expirationDate));
  const [mfg, setMfg] = useState(toDateInput(item.newLotManufacturingDate));

  const emit = (nextNumber: string, nextExpiry: string, nextMfg: string) =>
    onChange(
      {
        lotItemId: null,
        newLotNumber: nextNumber.trim() || null,
        newLotExpirationDate: nextExpiry || null,
        newLotManufacturingDate: nextMfg || null,
      },
      0
    );

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs text-amber-800">
        Đây là lô mới chưa có trong hệ thống. Lô sẽ được tạo khi chủ cửa hàng áp dụng đợt kiểm kê.
      </p>
      <div>
        <Label htmlFor="new-lot-number" className="text-xs font-medium">
          Số lô <span className="text-red-600">*</span>
        </Label>
        <Input
          id="new-lot-number"
          value={number}
          disabled={disabled}
          maxLength={100}
          onChange={(e) => {
            setNumber(e.target.value);
            emit(e.target.value, expiry, mfg);
          }}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="new-lot-expiry" className="text-xs font-medium">
            Hạn sử dụng <span className="text-red-600">*</span>
          </Label>
          <Input
            id="new-lot-expiry"
            type="date"
            value={expiry}
            disabled={disabled}
            onChange={(e) => {
              setExpiry(e.target.value);
              emit(number, e.target.value, mfg);
            }}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="new-lot-mfg" className="text-xs font-medium">
            Ngày sản xuất (không bắt buộc)
          </Label>
          <Input
            id="new-lot-mfg"
            type="date"
            value={mfg}
            disabled={disabled}
            onChange={(e) => {
              setMfg(e.target.value);
              emit(number, expiry, e.target.value);
            }}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

/** Existing lot assigned by the owner: the number is fixed, the dates may be corrected. */
function FixedLot({ item, disabled, onChange }: ModeProps) {
  const [expiry, setExpiry] = useState(toDateInput(item.expirationDate));
  const [mfg, setMfg] = useState(toDateInput(item.manufacturingDate));

  const emit = (nextExpiry: string, nextMfg: string) =>
    onChange(
      {
        lotItemId: item.lotItemId ?? undefined,
        newLotExpirationDate: nextExpiry || null,
        newLotManufacturingDate: nextMfg || null,
      },
      item.snapshotQty
    );

  const expiryChanged = expiry !== toDateInput(item.lotExpirationDate);
  const mfgChanged = mfg !== toDateInput(item.lotManufacturingDate);
  const dateOrderInvalid = Boolean(expiry && mfg && mfg > expiry);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label className="text-xs font-medium">Số lô</Label>
          <Input value={item.lotNumber ?? ''} readOnly disabled className="mt-1 bg-gray-100" />
        </div>
        <div>
          <Label htmlFor="lot-expiry" className="text-xs font-medium">
            Hạn sử dụng <span className="text-red-600">*</span>
          </Label>
          <Input
            id="lot-expiry"
            type="date"
            value={expiry}
            disabled={disabled}
            onChange={(e) => {
              setExpiry(e.target.value);
              emit(e.target.value, mfg);
            }}
            className="mt-1"
          />
          {expiryChanged && (
            <p className="mt-1 text-xs text-amber-700">Hệ thống: {toDateInput(item.lotExpirationDate)}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lot-mfg" className="text-xs font-medium">
            Ngày sản xuất
          </Label>
          <Input
            id="lot-mfg"
            type="date"
            value={mfg}
            disabled={disabled}
            onChange={(e) => {
              setMfg(e.target.value);
              emit(expiry, e.target.value);
            }}
            className="mt-1"
          />
          {mfgChanged && (
            <p className="mt-1 text-xs text-amber-700">
              Hệ thống: {toDateInput(item.lotManufacturingDate) || 'chưa có'}
            </p>
          )}
        </div>
      </div>
      {item.lotItemId ? (
        <p className="text-xs text-gray-600">
          Lô đã được chủ cửa hàng chỉ định và không thể thay đổi. Bạn vẫn có thể sửa ngày của lô.
        </p>
      ) : (
        <p className="text-xs text-red-600">Dòng này chưa được gán lô. Hãy báo chủ cửa hàng xử lý.</p>
      )}
      {(expiryChanged || mfgChanged) && !dateOrderInvalid && (
        <p className="text-xs text-amber-800">
          Ngày của lô sẽ được cập nhật khi chủ cửa hàng áp dụng đợt kiểm kê.
        </p>
      )}
      {dateOrderInvalid && (
        <p className="text-xs text-red-600">
          Ngày sản xuất không được sau hạn sử dụng.
        </p>
      )}
    </div>
  );
}
