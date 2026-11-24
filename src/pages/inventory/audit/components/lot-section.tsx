import { useState } from 'react';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import type { StockAuditItem, UpdateAuditItemRequest } from '../../../../types/audit';

export type LotSelection = Pick<
  UpdateAuditItemRequest,
  'lotItemId' | 'newLotExpirationDate' | 'newLotManufacturingDate'
>;

const toDateInput = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

interface LotSectionProps {
  item: StockAuditItem;
  disabled?: boolean;
  industryType?: string | null;
  /** Called whenever one of the lot's dates changes. `systemQty` is the quantity on hand for that lot. */
  onChange: (selection: LotSelection, systemQty: number) => void;
}

/**
 * Lot section for the count page. The lot was chosen by the owner and is fixed: the employee counts
 * it and may correct its dates. The number is never typed here.
 */
export function LotSection({ item, disabled, industryType, onChange }: LotSectionProps) {
  const [expiry, setExpiry] = useState(toDateInput(item.expirationDate));
  const [mfg, setMfg] = useState(toDateInput(item.manufacturingDate));

  const isFashion = industryType === "FASHION";
  const isCosmetics = industryType === "COSMETICS";

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
            Hạn sử dụng {isCosmetics ? "(bắt buộc)" : "(không bắt buộc)"}
          </Label>
          {isCosmetics && (
            <>
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
              <p className="mt-1 text-xs text-gray-600">
                Mỹ phẩm bắt buộc nhập hạn sử dụng của lô.
              </p>
            </>
          )}
          {isFashion && (
            <p className="mt-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-1 text-xs text-blue-800">
              Thời trang không cần nhập hạn sử dụng
            </p>
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
